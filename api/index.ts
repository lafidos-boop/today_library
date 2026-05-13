// 오늘책방 백엔드 — Vercel Serverless Function + 로컬 개발 양쪽에서 모두 동작.
//
// 이전에는 server.ts, sheetsDb.ts가 root에 분리되어 있었으나,
// Vercel의 ESM 컴파일러가 .js 확장자를 stripping해 import 모듈을 못 찾는 이슈가 있어
// 모든 코드를 이 한 파일에 inline 통합.
//
// - 로컬:  `npx tsx api/index.ts`  → app.listen(3001)
// - Vercel: 자동으로 default export된 app을 사용 (listen 호출 안 함)

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
// __dirname은 /api 폴더 → ISBN 캐시는 ../data/isbn_cache.json
const ISBN_CACHE_PATH = path.join(__dirname, '..', 'data', 'isbn_cache.json');
const AVATARS_DIR = path.join(__dirname, '..', 'data', 'avatars');

app.use(express.json({ limit: '50mb' }));

// =============================================================================
// sheetsDb — Google Sheets를 DB처럼 사용하는 추상화 레이어
// =============================================================================
const SHEET_ID = '1qwBAJZ70BO8jniAsw-6VBOscr_sm5m6mL1WBC8wnVZA';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function buildAuth() {
  // 1) Vercel/프로덕션: 환경변수에서 자격증명 JSON 로드
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
  }
  // 2) 로컬 개발: 키 파일
  const keyFile = path.resolve(__dirname, '..', 'secrets', 'sheets-key.json');
  return new google.auth.GoogleAuth({ keyFile, scopes: SCOPES });
}

const auth = buildAuth();
const sheets = google.sheets({ version: 'v4', auth });

const headerCache: Record<string, string[]> = {};
const sheetGidCache: Record<string, number> = {};

const NUMBER_COLS: Record<string, Set<string>> = {
  users: new Set(['loans']),
  applications: new Set(['id']),
  loans: new Set(['id', 'progress', 'dDay']),
  activities: new Set(),
};

const FORMULA_COLS: Record<string, Set<string>> = {
  loans: new Set(['dDay', '상태']),
};

async function getHeaders(tab: string): Promise<string[]> {
  if (headerCache[tab]) return headerCache[tab];
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A1:Z1`,
  });
  headerCache[tab] = (r.data.values?.[0] || []).map(String);
  return headerCache[tab];
}

async function getSheetGid(tab: string): Promise<number> {
  if (sheetGidCache[tab] !== undefined) return sheetGidCache[tab];
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  for (const s of meta.data.sheets || []) {
    if (s.properties?.title) sheetGidCache[s.properties.title] = s.properties.sheetId!;
  }
  if (sheetGidCache[tab] === undefined) throw new Error(`탭 없음: ${tab}`);
  return sheetGidCache[tab];
}

function rowToObject(row: any[], headers: string[], numberCols: Set<string>): any {
  const obj: any = {};
  for (let i = 0; i < headers.length; i++) {
    const raw = row[i];
    const h = headers[i];
    if (raw === undefined || raw === '') {
      obj[h] = numberCols.has(h) ? null : '';
    } else if (numberCols.has(h)) {
      const n = Number(raw);
      obj[h] = isNaN(n) ? raw : n;
    } else {
      obj[h] = String(raw);
    }
  }
  return obj;
}

function objectToRow(obj: any, headers: string[]): string[] {
  return headers.map((h) => {
    const v = obj[h];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });
}

const sheetsDb = {
  async listAll(tab: string): Promise<any[]> {
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A1:Z`,
    });
    const rows = r.data.values || [];
    if (rows.length === 0) return [];
    const headers = rows[0].map(String);
    headerCache[tab] = headers;
    if (rows.length < 2) return [];
    const numberCols = NUMBER_COLS[tab] || new Set<string>();
    return rows.slice(1).map((r) => rowToObject(r, headers, numberCols));
  },

  async append(tab: string, obj: any): Promise<void> {
    const headers = await getHeaders(tab);
    const formulaCols = FORMULA_COLS[tab] || new Set<string>();
    let lastDataColIdx = -1;
    for (let i = 0; i < headers.length; i++) {
      if (!formulaCols.has(headers[i])) lastDataColIdx = i;
    }
    const cutHeaders = headers.slice(0, lastDataColIdx + 1);
    const row = objectToRow(obj, cutHeaders);
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });
  },

  async updateById(tab: string, id: string | number, patch: any): Promise<void> {
    const all = await this.listAll(tab);
    const idx = all.findIndex((o) => String(o.id) === String(id));
    if (idx === -1) throw new Error(`${tab}: id=${id} 없음`);
    const headers = await getHeaders(tab);
    const merged = { ...all[idx], ...patch };
    const row = objectToRow(merged, headers);
    const sheetRow = idx + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A${sheetRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });
  },

  async deleteById(tab: string, id: string | number): Promise<void> {
    const all = await this.listAll(tab);
    const idx = all.findIndex((o) => String(o.id) === String(id));
    if (idx === -1) throw new Error(`${tab}: id=${id} 없음`);
    const gid = await getSheetGid(tab);
    const startIndex = idx + 1;
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: { sheetId: gid, dimension: 'ROWS', startIndex, endIndex: startIndex + 1 },
            },
          },
        ],
      },
    });
  },

  async findById(tab: string, id: string | number): Promise<any | null> {
    const all = await this.listAll(tab);
    return all.find((o) => String(o.id) === String(id)) || null;
  },
};

// =============================================================================
// 헬퍼 함수들
// =============================================================================
app.get('/api/avatars/:filename', async (req, res) => {
  try {
    const safeName = path.basename(req.params.filename);
    const filePath = path.join(AVATARS_DIR, safeName);
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch {
    res.status(404).json({ error: 'avatar not found' });
  }
});

const TARGET_SHEETS = ['새벽도서관', '별빛책방'];
const SHEET_PREFIX: { [key: string]: string } = { '새벽도서관': 'X', '별빛책방': 'Y' };

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

let cachedBooks: any[] = [];
let isSyncing = false;
let lastSyncAt = 0;
const SYNC_COOLDOWN_MS = 5 * 60 * 1000;

async function loadIsbnCache(): Promise<{ [key: string]: { isbn: string; cover?: string } }> {
  try {
    const data = await fs.readFile(ISBN_CACHE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

const isbnKey = (title: string, author: string) => `${title.trim()}|${author.trim()}`;

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
      try { rows = await sheetsDb.listAll(sheetName); }
      catch (e) { console.warn(`탭 "${sheetName}" 읽기 실패:`, (e as Error).message); continue; }
      console.log(`Sheet "${sheetName}": ${rows.length} rows`);

      const prefix = SHEET_PREFIX[sheetName] || sheetName.substring(0, 1);
      let maxCodeNum = 0;
      for (const r of rows) {
        const m = String(r['도서코드'] || '').match(new RegExp(`^${prefix}-?(\\d+)$`));
        if (m) maxCodeNum = Math.max(maxCodeNum, parseInt(m[1], 10));
      }
      let nextCodeNum = maxCodeNum + 1;

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
        if (!cover) cover = `https://picsum.photos/seed/${encodeURIComponent(title || Math.random())}/400/600`;

        sheetBooks.push({
          id: code, isbn,
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
      console.log(`Sheet "${sheetName}": Mapped ${sheetBooks.length} books. Auto-filled: ${autoFilledCodes}. ISBN cache: ${isbnHits}.`);
      allBooks = allBooks.concat(sheetBooks);
    }
    console.log('Overall Shelf Statistics:', overallStats);
    console.log(`Total books synchronized: ${allBooks.length}`);
    if (allBooks.length > 0) cachedBooks = allBooks;
    lastSyncAt = Date.now();
    return allBooks;
  } catch (error) {
    console.error('Google Sheets sync error:', error);
    return cachedBooks;
  } finally {
    isSyncing = false;
  }
}

// 초기 동기화는 로컬에서만 실행 (Vercel은 cold start마다 자동)
if (!process.env.VERCEL) fetchBooksFromGoogleSheet();

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
  return days >= 0 ? { dDay: -days, isOverdue: false } : { dDay: -days, isOverdue: true };
}
function annotateLoan(loan: any) {
  const { dDay, isOverdue } = computeLoanStatus(loan.returnDate);
  return { ...loan, dDay, isOverdue };
}
function stripSensitive(user: any) {
  if (!user || typeof user !== 'object') return user;
  const { password, ...rest } = user;
  return rest;
}

const BCRYPT_ROUNDS = 10;
function isHashed(pw: string): boolean { return typeof pw === 'string' && /^\$2[aby]\$/.test(pw); }
async function hashIfPlain(pw: string | undefined | null): Promise<string | undefined> {
  if (!pw) return undefined;
  if (isHashed(pw)) return pw;
  return await bcrypt.hash(pw, BCRYPT_ROUNDS);
}
async function verifyPassword(plain: string, stored: string): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (!plain || !stored) return { ok: false, needsRehash: false };
  if (isHashed(stored)) {
    const ok = await bcrypt.compare(plain, stored);
    return { ok, needsRehash: false };
  }
  return { ok: plain === stored, needsRehash: plain === stored };
}

async function mergeLoanStatus(books: any[]) {
  let loans: any[] = [];
  try { loans = await sheetsDb.listAll('loans'); }
  catch (e) { console.error('mergeLoanStatus: loans 읽기 실패', e); }
  const loanedBookIds = new Set(loans.map((l) => String(l.bookId)));
  return books.map((book: any) => ({ ...book, status: loanedBookIds.has(String(book.id)) ? 'borrowed' : 'available' }));
}

// =============================================================================
// API 엔드포인트
// =============================================================================
app.get('/api/books', async (req, res) => {
  try {
    if (cachedBooks.length > 0) {
      res.json(await mergeLoanStatus(cachedBooks));
      if (Date.now() - lastSyncAt > SYNC_COOLDOWN_MS) fetchBooksFromGoogleSheet();
      return;
    }
    const books = await fetchBooksFromGoogleSheet();
    res.json(await mergeLoanStatus(books));
  } catch (error) {
    console.error('API /api/books error:', error);
    res.json([]);
  }
});

app.post('/api/books/sync', async (req, res) => {
  try {
    const before = cachedBooks.length;
    const books = await fetchBooksFromGoogleSheet();
    res.json({ ok: true, booksCount: books.length, added: books.length - before, syncedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Force sync error:', error);
    res.status(500).json({ ok: false, error: '동기화에 실패했습니다.' });
  }
});

app.post('/api/books', async (req, res) => {
  res.json({ success: true, note: 'Books are now sourced from Google Sheets; POST is a no-op.' });
});

app.get('/api/applications', async (req, res) => {
  try { res.json(await sheetsDb.listAll('applications')); }
  catch (error) { console.error('GET /api/applications error:', error); res.json([]); }
});

app.post('/api/applications', async (req, res) => {
  try {
    const hashedPassword = await hashIfPlain(req.body.password);
    const newApp = {
      id: Date.now(),
      name: req.body.name || '', email: req.body.email || '', phone: req.body.phone || '',
      password: hashedPassword || '',
      date: new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, ''),
      status: 'pending',
    };
    await sheetsDb.append('applications', newApp);
    res.json(newApp);
  } catch (error) {
    console.error('Save application error:', error);
    res.status(500).json({ error: 'Failed to save application', details: error instanceof Error ? error.message : String(error) });
  }
});

app.delete('/api/applications/:id', async (req, res) => {
  try {
    await sheetsDb.deleteById('applications', parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/applications error:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await sheetsDb.listAll('users');
    res.json(users.map(stripSensitive));
  } catch (error) {
    console.error('GET /api/users error:', error);
    res.json([]);
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { name, password } = req.body || {};
    if (!name || !password) return res.status(400).json({ error: '이름과 비밀번호를 입력해 주세요.' });
    const users = await sheetsDb.listAll('users');
    const user = users.find((u) => u.name === name);
    if (!user) return res.status(401).json({ error: '이름 또는 비밀번호가 일치하지 않습니다.' });
    const { ok, needsRehash } = await verifyPassword(password, user.password);
    if (!ok) return res.status(401).json({ error: '이름 또는 비밀번호가 일치하지 않습니다.' });
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
    if (updateData.password) updateData.password = await hashIfPlain(updateData.password);
    else delete updateData.password;
    // 프로필 이미지: Vercel 환경에서는 디스크 저장 불가 → base64를 직접 시트에 저장 (작은 이미지만)
    // 로컬에서는 파일로 저장 후 URL로 교체
    if (typeof updateData.profileImage === 'string' && updateData.profileImage.startsWith('data:image/') && !process.env.VERCEL) {
      try {
        const m = /^data:image\/(\w+);base64,(.+)$/.exec(updateData.profileImage);
        if (m) {
          const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
          const buf = Buffer.from(m[2], 'base64');
          try { await fs.mkdir(AVATARS_DIR, { recursive: true }); } catch {}
          const fname = `${id}.${ext}`;
          await fs.writeFile(path.join(AVATARS_DIR, fname), buf);
          updateData.profileImage = `/api/avatars/${fname}?v=${Date.now()}`;
        }
      } catch (e) { console.error('avatar save error:', e); }
    }
    await sheetsDb.updateById('users', id, updateData);
    res.json({ success: true, profileImage: updateData.profileImage });
  } catch (error) {
    console.error('PUT /api/users error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

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
    if (loans.some((l) => String(l.bookId) === String(bookId))) {
      return res.status(400).json({ error: 'Already borrowed' });
    }
    const newLoan = { id: Date.now(), ...req.body };
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

app.get('/api/activities', async (req, res) => {
  try {
    const all = await sheetsDb.listAll('activities');
    all.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
    res.json(all.slice(0, 100));
  } catch (error) {
    console.error('GET /api/activities error:', error);
    res.json([]);
  }
});

// 로컬 개발에서만 listen, Vercel에서는 default export만 사용
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DB Server running at http://0.0.0.0:${PORT}`);
  });
}

export default app;
