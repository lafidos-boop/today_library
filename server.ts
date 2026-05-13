import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
// bcrypt(native binding) → bcryptjs(순수 JS)로 교체.
// Vercel serverless 환경에서 native module이 안정적이지 않아 compare가 false 반환하는 이슈 해결.
import bcrypt from 'bcryptjs';
// 데이터 저장소: 로컬 JSON 파일 → 구글시트 (4개 탭)로 마이그레이션됨
// (Vercel ESM 환경에서는 import에 .js 확장자가 필요. tsx는 로컬에서 그대로 처리.)
import * as sheetsDb from './sheetsDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
// 도서 캐시는 메모리에만 보관 (구글시트 새벽도서관/별빛책방 탭이 source of truth)
const ISBN_CACHE_PATH = path.join(__dirname, 'data', 'isbn_cache.json');
const AVATARS_DIR = path.join(__dirname, 'data', 'avatars');

app.use(express.json({ limit: '50mb' }));

// 아바타 정적 파일 서빙
app.get('/api/avatars/:filename', async (req, res) => {
  try {
    const safeName = path.basename(req.params.filename); // path traversal 방지
    const filePath = path.join(AVATARS_DIR, safeName);
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch {
    res.status(404).json({ error: 'avatar not found' });
  }
});

// 구글 시트 설정 (탭 이름 = 열람실 이름. 도서코드 prefix는 SHEET_PREFIX에서 매핑.)
const TARGET_SHEETS = ['새벽도서관', '별빛책방'];
const SHEET_PREFIX: { [key: string]: string } = {
  '새벽도서관': 'X',
  '별빛책방': 'Y',
};

// 활동 기록 저장 함수 — activities 탭에 append
async function logActivity(activity: { type: string; user?: string; book?: string; action?: string }) {
  try {
    await sheetsDb.append('activities', {
      time: new Date().toISOString(),
      type: activity.type,
      user: activity.user || '',
      book: activity.book || '',
      action: activity.action || '',
    });
  } catch (error) {
    console.error('Log error:', error);
  }
}

// 데이터 폴더가 없으면 생성
async function ensureDir() {
  const dir = path.join(__dirname, 'data');
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir);
  }
}

async function ensureAvatarsDir() {
  try { await fs.access(AVATARS_DIR); }
  catch { await fs.mkdir(AVATARS_DIR, { recursive: true }); }
}

// data:image/png;base64,XXX → 파일로 저장 후 상대 URL 반환
async function saveAvatarBase64(userId: string, dataUrl: string): Promise<string | null> {
  try {
    const m = /^data:image\/(\w+);base64,(.+)$/.exec(dataUrl);
    if (!m) return null;
    const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
    const buf = Buffer.from(m[2], 'base64');
    await ensureAvatarsDir();
    // 같은 유저의 이전 아바타 파일 정리 (다른 확장자였을 수 있으니 모두 정리)
    try {
      const files = await fs.readdir(AVATARS_DIR);
      await Promise.all(
        files
          .filter((f) => f.startsWith(userId + '.'))
          .map((f) => fs.unlink(path.join(AVATARS_DIR, f)).catch(() => {}))
      );
    } catch {}
    const fname = `${userId}.${ext}`;
    await fs.writeFile(path.join(AVATARS_DIR, fname), buf);
    return `/api/avatars/${fname}?v=${Date.now()}`; // 캐시 무효화용 쿼리
  } catch (e) {
    console.error('saveAvatarBase64 error:', e);
    return null;
  }
}

let cachedBooks: any[] = [];
let isSyncing = false;
let lastSyncAt = 0;
const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5분: 동일 시간 내 반복 sync 차단

// ISBN 캐시 로드 (key = `${title}|${author}`)
async function loadIsbnCache(): Promise<{ [key: string]: { isbn: string; cover?: string } }> {
  try {
    const data = await fs.readFile(ISBN_CACHE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

const isbnKey = (title: string, author: string) => `${title.trim()}|${author.trim()}`;

// 구글 시트에서 도서 목록 가져오기 (Sheets API 사용)
// 이전엔 공개 XLSX export URL을 fetch했지만 대용량(6MB) + 한국에서 종종 timeout 발생.
// 이제 서비스 계정 인증으로 Sheets API를 직접 호출 → 빠르고 안정적.
async function fetchBooksFromGoogleSheet() {
  if (isSyncing) return cachedBooks;
  isSyncing = true;

  try {
    console.log('--- Google Sheets Sync Started (via Sheets API) ---');
    const isbnCache = await loadIsbnCache();
    console.log(`ISBN cache entries: ${Object.keys(isbnCache).length}`);

    let allBooks: any[] = [];
    let overallStats: { [key: string]: number } = {};

    for (const sheetName of TARGET_SHEETS) {
      let rows: any[];
      try {
        rows = await sheetsDb.listAll(sheetName);
      } catch (e) {
        console.warn(`탭 "${sheetName}" 읽기 실패:`, (e as Error).message);
        continue;
      }
      console.log(`Sheet "${sheetName}": ${rows.length} rows`);

      // Pass 1: 도서코드 max 번호 찾기 (prefix 별)
      const prefix = SHEET_PREFIX[sheetName] || sheetName.substring(0, 1);
      let maxCodeNum = 0;
      for (const r of rows) {
        const m = String(r['도서코드'] || '').match(new RegExp(`^${prefix}-?(\\d+)$`));
        if (m) maxCodeNum = Math.max(maxCodeNum, parseInt(m[1], 10));
      }
      let nextCodeNum = maxCodeNum + 1;

      // Pass 2: 매핑 + 누락 도서코드 자동 부여 + ISBN 캐시 머지
      let sheetBooks: any[] = [];
      let autoFilledCodes = 0;
      let isbnHits = 0;

      for (const r of rows) {
        const title = String(r['제목'] || '').trim();
        let code = String(r['도서코드'] || '').trim();
        const author = String(r['저자'] || '').trim();
        const shelf = String(r['서가'] || '-').trim();

        if (!title && !code) continue;
        if (title === '제목' || code === '도서코드') continue;

        if (!code && title) {
          code = `${prefix}-${String(nextCodeNum).padStart(5, '0')}`;
          nextCodeNum++;
          autoFilledCodes++;
        }

        let isbn = String(r['ISBN'] || '').trim();
        let cover = String(r['표지'] || '').trim();
        if (!isbn || !cover) {
          const cached = isbnCache[isbnKey(title, author)];
          if (cached) {
            if (!isbn && cached.isbn) { isbn = cached.isbn; isbnHits++; }
            if (!cover && cached.cover) cover = cached.cover;
          }
        }
        if (!cover) {
          cover = `https://picsum.photos/seed/${encodeURIComponent(title || Math.random())}/400/600`;
        }

        sheetBooks.push({
          id: code,
          isbn,
          title: title || '제목 없음',
          author: author || '저자 미상',
          publisher: String(r['출판사'] || '출판사 미상').trim(),
          genre: String(r['장르'] || '일반').trim(),
          cover,
          location: {
            shelf,
            row: String(r['행'] || '-').trim(),
            col: String(r['열'] || '-').trim(),
            room: sheetName,
          },
          status: 'available',
        });
        overallStats[shelf] = (overallStats[shelf] || 0) + 1;
      }

      console.log(`Sheet "${sheetName}": Mapped ${sheetBooks.length} books. Auto-filled codes: ${autoFilledCodes}. ISBN cache hits: ${isbnHits}.`);
      allBooks = allBooks.concat(sheetBooks);
    }

    console.log('Overall Shelf Statistics:', overallStats);
    console.log(`Total books synchronized: ${allBooks.length}`);

    if (allBooks.length > 0) {
      cachedBooks = allBooks;
    }
    lastSyncAt = Date.now();

    return allBooks;
  } catch (error) {
    console.error('Google Sheets sync error:', error);
    // 도서는 메모리 캐시만 유지. 동기화 실패 시 이전 캐시 반환.
    return cachedBooks;
  } finally {
    isSyncing = false;
  }
}

// 초기 동기화 실행
fetchBooksFromGoogleSheet();

// === 연체 자동 판정 유틸 ===
// returnDate는 'MM.DD' 형식으로 저장되어 있어 연도가 없음.
// 현재 연도 기준으로 파싱하되, 6개월 이상 차이가 나면 연도 보정.
function parseLoanDateMMDD(mmdd: string): Date | null {
  if (!mmdd) return null;
  const [mStr, dStr] = String(mmdd).split('.');
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);
  if (isNaN(m) || isNaN(d)) return null;
  const now = new Date();
  const candidate = new Date(now.getFullYear(), m - 1, d);
  const diffMonths = (candidate.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000);
  if (diffMonths < -6) candidate.setFullYear(now.getFullYear() + 1);
  else if (diffMonths > 6) candidate.setFullYear(now.getFullYear() - 1);
  return candidate;
}

function computeLoanStatus(returnDate: string): { dDay: number; isOverdue: boolean } {
  const ret = parseLoanDateMMDD(returnDate);
  if (!ret) return { dDay: 0, isOverdue: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  ret.setHours(0, 0, 0, 0);
  const days = Math.round((ret.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  // 컨벤션: 반납 전 → dDay 음수(예: D-14), 연체 → dDay 양수(예: D+5)
  return days >= 0
    ? { dDay: -days, isOverdue: false }
    : { dDay: -days, isOverdue: true };
}

function annotateLoan(loan: any) {
  const { dDay, isOverdue } = computeLoanStatus(loan.returnDate);
  return { ...loan, dDay, isOverdue };
}

// password 같은 민감 필드 제거
function stripSensitive(user: any) {
  if (!user || typeof user !== 'object') return user;
  const { password, ...rest } = user;
  return rest;
}

// === 비밀번호 해싱 유틸 (bcrypt) ===
const BCRYPT_ROUNDS = 10;

// bcrypt 해시는 항상 $2a$/$2b$/$2y$로 시작
function isHashed(pw: string): boolean {
  return typeof pw === 'string' && /^\$2[aby]\$/.test(pw);
}

async function hashIfPlain(pw: string | undefined | null): Promise<string | undefined> {
  if (!pw) return undefined;
  if (isHashed(pw)) return pw;
  return await bcrypt.hash(pw, BCRYPT_ROUNDS);
}

// 사용자가 입력한 평문 vs 저장된 값(평문이거나 해시) 비교.
// 마이그레이션 기간 동안 평문도 허용 → 일치하면 자동으로 해시로 교체.
async function verifyPassword(plain: string, stored: string): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (!plain || !stored) return { ok: false, needsRehash: false };
  if (isHashed(stored)) {
    const ok = await bcrypt.compare(plain, stored);
    return { ok, needsRehash: false };
  }
  // 마이그레이션 fallback: 평문 비교
  return { ok: plain === stored, needsRehash: plain === stored };
}


// 도서 목록 관련
app.get('/api/books', async (req, res) => {
  try {
    // 캐시된 데이터가 있으면 즉시 반환.
    // 백그라운드 sync는 마지막 동기화로부터 SYNC_COOLDOWN_MS 지났을 때만 트리거.
    if (cachedBooks.length > 0) {
      res.json(await mergeLoanStatus(cachedBooks));
      if (Date.now() - lastSyncAt > SYNC_COOLDOWN_MS) {
        fetchBooksFromGoogleSheet(); // Background sync (디바운스됨)
      }
      return;
    }

    // 캐시가 없으면 동기화 대기
    const books = await fetchBooksFromGoogleSheet();
    res.json(await mergeLoanStatus(books));
  } catch (error) {
    console.error('API /api/books error:', error);
    res.json([]);
  }
});

// 관리자: 강제 sync (5분 디바운스 무시) — Google Sheets 즉시 재동기화
app.post('/api/books/sync', async (req, res) => {
  try {
    const before = cachedBooks.length;
    const books = await fetchBooksFromGoogleSheet();
    res.json({
      ok: true,
      booksCount: books.length,
      added: books.length - before,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Force sync error:', error);
    res.status(500).json({ ok: false, error: '동기화에 실패했습니다.' });
  }
});

async function mergeLoanStatus(books: any[]) {
  let loans: any[] = [];
  try {
    loans = await sheetsDb.listAll('loans');
  } catch (e) {
    console.error('mergeLoanStatus: loans 읽기 실패', e);
  }
  const loanedBookIds = new Set(loans.map((l) => String(l.bookId)));
  // 위치(location) 정보는 항상 원본 그대로 유지.
  // 대출 여부는 status 필드와 UI 배지/버튼으로만 표시.
  return books.map((book: any) => ({
    ...book,
    status: loanedBookIds.has(String(book.id)) ? 'borrowed' : 'available',
  }));
}

app.post('/api/books', async (req, res) => {
  // 클라이언트가 도서 목록을 직접 저장하던 옛 경로. 시트 기반으로 전환된 후엔
  // 도서는 새벽도서관/별빛책방 탭이 source of truth이므로 이 엔드포인트는 no-op로 만든다.
  // (관리자 도서 업로드 기능은 추후 별도 엔드포인트로 재구성 예정)
  res.json({ success: true, note: 'Books are now sourced from Google Sheets; POST is a no-op.' });
});

// 가입 신청 관련
app.get('/api/applications', async (req, res) => {
  try {
    const apps = await sheetsDb.listAll('applications');
    res.json(apps);
  } catch (error) {
    console.error('GET /api/applications error:', error);
    res.json([]);
  }
});

app.post('/api/applications', async (req, res) => {
  try {
    // 가입 신청 단계에서 비밀번호 해싱 (admin 승인 시 그대로 users로 이동)
    const hashedPassword = await hashIfPlain(req.body.password);
    const newApp = {
      id: Date.now(),
      name: req.body.name || '',
      email: req.body.email || '',
      phone: req.body.phone || '',
      password: hashedPassword || '',
      date: new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, ''),
      status: 'pending',
    };
    await sheetsDb.append('applications', newApp);
    console.log('Successfully saved application:', newApp.email);
    res.json(newApp);
  } catch (error) {
    console.error('Save application error:', error);
    res.status(500).json({ error: 'Failed to save application', details: error instanceof Error ? error.message : String(error) });
  }
});

app.delete('/api/applications/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await sheetsDb.deleteById('applications', id);
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/applications error:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// 정식 회원 관련
app.get('/api/users', async (req, res) => {
  try {
    const users = await sheetsDb.listAll('users');
    // 보안: password를 응답에서 제거 (별도 /api/login 엔드포인트로 인증)
    res.json(users.map(stripSensitive));
  } catch (error) {
    console.error('GET /api/users error:', error);
    res.json([]);
  }
});

// 로그인 전용 엔드포인트 (bcrypt 검증 + 평문→해시 자동 마이그레이션)
app.post('/api/login', async (req, res) => {
  try {
    const { name, password } = req.body || {};
    if (!name || !password) {
      return res.status(400).json({ error: '이름과 비밀번호를 입력해 주세요.' });
    }
    const users = await sheetsDb.listAll('users');
    const user = users.find((u) => u.name === name);
    if (!user) {
      return res.status(401).json({ error: '이름 또는 비밀번호가 일치하지 않습니다.' });
    }
    const { ok, needsRehash } = await verifyPassword(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: '이름 또는 비밀번호가 일치하지 않습니다.' });
    }
    // 평문이었던 비밀번호를 로그인 성공 시 자동으로 해시로 교체
    if (needsRehash) {
      const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await sheetsDb.updateById('users', user.id, { password: hashed });
      console.log(`[login] auto-rehashed password for user "${name}"`);
    }
    res.json(stripSensitive(user));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    // 비밀번호는 평문이면 해싱, 이미 해시된 값이면 그대로 (applications에서 해시 상태로 넘어올 수 있음)
    const hashedPassword = await hashIfPlain(req.body.password);

    const newUser = {
      ...req.body,
      ...(hashedPassword ? { password: hashedPassword } : {}),
      id: req.body.id || `M-${Math.floor(Math.random() * 900) + 100}`,
      joined: new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, ''),
      loans: 0,
    };
    await sheetsDb.append('users', newUser);

    await logActivity({
      type: 'signup',
      user: newUser.name,
      action: '회원 가입 승인',
      book: req.body.level === '관리자' ? '관리자 권한' : '일반 회원',
    });

    res.json(newUser);
  } catch (error) {
    console.error('POST /api/users error:', error);
    res.status(500).json({ error: 'Failed to save user' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    // 비밀번호 갱신이 포함되면 해싱
    if (updateData.password) {
      updateData.password = await hashIfPlain(updateData.password);
    } else {
      // 빈 문자열/undefined는 아예 제거 → 기존 비밀번호 보존
      delete updateData.password;
    }
    // profileImage가 base64로 오면 파일로 저장하고 URL로 교체 (로컬 개발 전용; Vercel 배포 시 변경 예정)
    if (typeof updateData.profileImage === 'string' && updateData.profileImage.startsWith('data:image/')) {
      const url = await saveAvatarBase64(id, updateData.profileImage);
      if (url) updateData.profileImage = url;
    }
    await sheetsDb.updateById('users', id, updateData);
    res.json({ success: true, profileImage: updateData.profileImage });
  } catch (error) {
    console.error('PUT /api/users error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// 대출 기록 관련 (관리자용 전체 목록)
// dDay/isOverdue를 매 요청마다 동적으로 재계산해서 반환
app.get('/api/admin/loans', async (req, res) => {
  try {
    const loans = await sheetsDb.listAll('loans');
    res.json(loans.map(annotateLoan));
  } catch (error) {
    console.error('GET /api/admin/loans error:', error);
    res.json([]);
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await sheetsDb.deleteById('users', req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/users error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.get('/api/loans/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const loans = await sheetsDb.listAll('loans');
    // dDay/isOverdue 동적 재계산
    res.json(loans.filter((l) => l.userId === userId).map(annotateLoan));
  } catch (error) {
    console.error('GET /api/loans/:userId error:', error);
    res.json([]);
  }
});

app.post('/api/loans', async (req, res) => {
  try {
    const { bookId } = req.body;
    const loans = await sheetsDb.listAll('loans');

    // 이미 대출 중인 도서인지 중복 체크
    if (loans.some((l) => String(l.bookId) === String(bookId))) {
      return res.status(400).json({ error: 'Already borrowed' });
    }

    const newLoan = {
      id: Date.now(),
      ...req.body,
    };
    await sheetsDb.append('loans', newLoan);

    await logActivity({
      type: 'borrow',
      user: newLoan.userName || '회원',
      book: newLoan.bookTitle || '도서',
      action: '대출',
    });

    res.json(newLoan);
  } catch (error) {
    console.error('POST /api/loans error:', error);
    res.status(500).json({ error: 'Failed to save loan' });
  }
});

app.delete('/api/loans/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const loanToDelete = await sheetsDb.findById('loans', id);
    await sheetsDb.deleteById('loans', id);

    if (loanToDelete) {
      await logActivity({
        type: 'return',
        user: loanToDelete.userName || '회원',
        book: loanToDelete.bookTitle || '도서',
        action: '반납',
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/loans error:', error);
    res.status(500).json({ error: 'Failed to delete loan' });
  }
});

// 연기(연장) 처리
app.put('/api/loans/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { returnDate, dDay } = req.body;
    await sheetsDb.updateById('loans', id, { returnDate, dDay });
    res.json({ success: true });
  } catch (error) {
    console.error('PUT /api/loans error:', error);
    res.status(500).json({ error: 'Failed to update loan' });
  }
});

// 활동 기록 조회 — 최근 100건만, 시간 역순
app.get('/api/activities', async (req, res) => {
  try {
    const all = await sheetsDb.listAll('activities');
    // append만 하니까 시간순 → 역순 정렬 후 100건 자르기
    all.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
    res.json(all.slice(0, 100));
  } catch (error) {
    console.error('GET /api/activities error:', error);
    res.json([]);
  }
});

// Vercel serverless 환경에서는 listen을 호출하지 않고 app만 export.
// 로컬 개발에서는 process.env.VERCEL이 없으므로 listen을 호출.
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DB Server running at http://0.0.0.0:${PORT}`);
  });
}

export default app;

