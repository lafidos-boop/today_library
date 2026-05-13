// Kakao Books API로 ISBN 일괄 조회 후 data/isbn_cache.json에 저장
// 실행: node scratch/fetch_isbn.mjs
//
// 진행 상황을 표시하며, 중단 후 재실행 시 캐시된 항목은 건너뜀.
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const SHEET_ID = '1qwBAJZ70BO8jniAsw-6VBOscr_sm5m6mL1WBC8wnVZA';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;
const TARGET_SHEETS = ['새벽도서관', '별빛책방'];
const CACHE_PATH = path.resolve('data/isbn_cache.json');

// .env.local에서 키 읽기
function readEnv() {
  const txt = fs.readFileSync('.env.local', 'utf-8');
  const m = txt.match(/VITE_KAKAO_API_KEY\s*=\s*([^\s\r\n]+)/);
  return m ? m[1] : null;
}

const KAKAO_KEY = readEnv();
if (!KAKAO_KEY) { console.error('KAKAO API 키를 찾을 수 없습니다 (.env.local)'); process.exit(1); }

const isbnKey = (title, author) => `${(title || '').trim()}|${(author || '').trim()}`;

async function loadCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')); }
  catch { return {}; }
}
function saveCache(c) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(c, null, 2), 'utf-8');
}

async function kakaoSearch(title, author) {
  const url = `https://dapi.kakao.com/v3/search/book?target=title&query=${encodeURIComponent(title)}&size=5`;
  const r = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
  if (!r.ok) return null;
  const j = await r.json();
  const docs = j.documents || [];
  if (docs.length === 0) return null;
  // 저자 우선 매칭
  let pick = docs[0];
  if (author) {
    const found = docs.find(d => (d.authors || []).some(a => author.includes(a) || a.includes(author)));
    if (found) pick = found;
  }
  return {
    isbn: (pick.isbn || '').split(' ').pop() || '',
    cover: pick.thumbnail || '',
    publisher: pick.publisher || '',
  };
}

async function main() {
  console.log('Downloading sheet…');
  const buf = Buffer.from(await (await fetch(SHEET_URL)).arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });

  // 모든 책 수집
  const todos = [];
  for (const sheetName of TARGET_SHEETS) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const headers = rows[0].map(h => String(h).trim());
    const tI = headers.indexOf('제목');
    const aI = headers.indexOf('저자');
    const iI = headers.indexOf('ISBN');
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const title = String(row[tI] || '').trim();
      const author = String(row[aI] || '').trim();
      const isbn = String(row[iI] || '').trim();
      if (!title) continue;
      if (isbn) continue; // 시트에 ISBN 있으면 skip
      todos.push({ title, author });
    }
  }

  // 중복 제거 (제목+저자 같으면 1번만 조회)
  const uniqueMap = new Map();
  for (const t of todos) uniqueMap.set(isbnKey(t.title, t.author), t);
  const unique = Array.from(uniqueMap.values());
  console.log(`Total ISBN-missing books: ${todos.length}, unique queries: ${unique.length}`);

  const cache = await loadCache();
  let hits = 0, misses = 0, skipped = 0, errors = 0;

  for (let i = 0; i < unique.length; i++) {
    const { title, author } = unique[i];
    const k = isbnKey(title, author);
    if (cache[k] !== undefined) { skipped++; continue; }
    try {
      const result = await kakaoSearch(title, author);
      if (result && result.isbn) { cache[k] = result; hits++; }
      else { cache[k] = { isbn: '' }; misses++; } // 누락 표시 (재조회 방지)
    } catch (e) {
      errors++;
      console.error(`Error on "${title}":`, e.message);
    }
    if ((i + 1) % 50 === 0) {
      saveCache(cache);
      console.log(`[${i + 1}/${unique.length}] hits=${hits} misses=${misses} skipped=${skipped} errors=${errors}`);
    }
    // Kakao 분당 제한 회피용 짧은 sleep
    await new Promise(r => setTimeout(r, 80));
  }
  saveCache(cache);
  console.log(`DONE. hits=${hits} misses=${misses} skipped=${skipped} errors=${errors} total cache=${Object.keys(cache).length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
