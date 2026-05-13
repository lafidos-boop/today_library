// Phase 2 — 구글시트 접근 검증 + 데이터 탭 자동 생성.
// 실행: node scratch/setup_sheets.mjs
//
// 만들 탭: users, applications, loans, activities
// 기존 탭(새벽도서관, 별빛책방, 위치와 주제)은 그대로 둠.

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const SHEET_ID = '1qwBAJZ70BO8jniAsw-6VBOscr_sm5m6mL1WBC8wnVZA';
const KEY_PATH = path.resolve('secrets/sheets-key.json');

// 만들 탭과 첫 행(헤더) 정의
const TABS_TO_CREATE = {
  users: ['id', 'name', 'email', 'phone', 'password', 'level', 'joined', 'loans', 'profileImage'],
  applications: ['id', 'name', 'email', 'phone', 'password', 'date', 'status'],
  loans: ['id', 'userId', 'userName', 'bookId', 'bookTitle', 'borrowDate', 'returnDate', 'progress'],
  activities: ['time', 'type', 'user', 'book', 'action'],
};

async function main() {
  if (!fs.existsSync(KEY_PATH)) {
    console.error('❌ 키 파일을 찾을 수 없습니다:', KEY_PATH);
    process.exit(1);
  }

  // 인증
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // 1) 시트 메타데이터 읽어서 현재 탭 목록 확인
  console.log('1️⃣  시트에 접근 중...');
  let meta;
  try {
    meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  } catch (e) {
    console.error('❌ 시트 접근 실패. 서비스 계정이 편집자로 공유됐는지 확인하세요.');
    console.error('   상세:', e.message);
    process.exit(1);
  }

  const existingTabs = meta.data.sheets.map(s => s.properties.title);
  console.log('   현재 탭:', existingTabs);

  // 2) 누락된 탭 생성
  const missingTabs = Object.keys(TABS_TO_CREATE).filter(t => !existingTabs.includes(t));

  if (missingTabs.length === 0) {
    console.log('\n✅ 모든 탭이 이미 존재합니다. 헤더만 확인합니다.');
  } else {
    console.log('\n2️⃣  새 탭 생성:', missingTabs);
    const requests = missingTabs.map(title => ({
      addSheet: { properties: { title } },
    }));
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests },
    });
    console.log('   ✅ 탭 생성 완료');
  }

  // 3) 각 탭의 첫 행(헤더) 작성
  console.log('\n3️⃣  헤더 행 작성 중...');
  for (const [tab, headers] of Object.entries(TABS_TO_CREATE)) {
    // 현재 1행 읽어서 비어 있으면 헤더 작성
    const range = `${tab}!A1:Z1`;
    const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range });
    const current = r.data.values?.[0] || [];
    if (current.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${tab}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
      console.log(`   ✅ ${tab}: 헤더 작성 (${headers.length}컬럼)`);
    } else {
      console.log(`   ℹ️  ${tab}: 헤더 이미 있음 (${current.length}컬럼) → 건너뜀`);
    }
  }

  console.log('\n🎉 Phase 2 준비 완료!');
  console.log('   탭 4개가 시트에 추가되었습니다.');
  console.log('   다음 단계: 기존 JSON 데이터를 시트로 이관 (마이그레이션 스크립트)');
}

main().catch(e => { console.error('ERROR:', e); process.exit(1); });
