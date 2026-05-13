// Phase 2 — 기존 data/*.json → 구글시트 탭으로 일회성 이관.
// 실행: node scratch/migrate_to_sheets.mjs
// 안전: 시트의 기존 데이터(헤더 행 외)는 모두 지우고 새로 씀.

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const SHEET_ID = '1qwBAJZ70BO8jniAsw-6VBOscr_sm5m6mL1WBC8wnVZA';
const KEY_PATH = path.resolve('secrets/sheets-key.json');

// 각 탭의 컬럼 순서 (시트 헤더와 정확히 일치해야 함)
const TAB_COLUMNS = {
  users: ['id', 'name', 'email', 'phone', 'password', 'level', 'joined', 'loans', 'profileImage'],
  applications: ['id', 'name', 'email', 'phone', 'password', 'date', 'status'],
  loans: ['id', 'userId', 'userName', 'bookId', 'bookTitle', 'borrowDate', 'returnDate', 'progress'],
  activities: ['time', 'type', 'user', 'book', 'action'],
};

const SOURCE_FILES = {
  users: 'data/users.json',
  applications: 'data/applications.json',
  loans: 'data/loans.json',
  activities: 'data/activities.json',
};

function rowFromObject(obj, columns) {
  return columns.map(c => {
    const v = obj[c];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v); // 안전망 (아바타 등)
    return String(v);
  });
}

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  for (const [tab, filePath] of Object.entries(SOURCE_FILES)) {
    const cols = TAB_COLUMNS[tab];
    let data = [];
    try {
      const txt = fs.readFileSync(filePath, 'utf-8');
      if (txt.trim()) data = JSON.parse(txt);
    } catch (e) {
      console.log(`⚠️  ${filePath}: 없거나 빈 파일 → 건너뜀`);
      continue;
    }

    if (!Array.isArray(data) || data.length === 0) {
      console.log(`ℹ️  ${tab}: 이관할 데이터 없음 (${data.length}건)`);
      continue;
    }

    // 1) 기존 행(2행 이하) 모두 삭제
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A2:Z`,
    });

    // 2) 데이터를 시트 행으로 변환 후 일괄 입력
    const rows = data.map(o => rowFromObject(o, cols));
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A2`,
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });

    console.log(`✅ ${tab}: ${rows.length}건 이관 완료`);
  }

  console.log('\n🎉 마이그레이션 완료. 시트에서 직접 확인해보세요.');
}

main().catch(e => { console.error('ERROR:', e); process.exit(1); });
