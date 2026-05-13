// loans 탭의 dDay/상태 컬럼을 ARRAYFORMULA로 설정.
// 헤더 셀(I1, J1)에 함수를 넣어두면 새 행이 추가될 때 자동으로 계산됨.
//
// 동작:
//   I1: =ARRAYFORMULA(IF(ROW(G:G)=1,"dDay", IF(G:G="","", DATE(YEAR(TODAY()),VALUE(LEFT(G:G,2)),VALUE(RIGHT(G:G,2)))-TODAY())))
//   J1: =ARRAYFORMULA(IF(ROW(G:G)=1,"상태", IF(G:G="","", IF(I:I>=0,"대출 중","연체 ("&ABS(I:I)&"일)"))))
//
// 시트에서 I1을 보면 "dDay"로 표시되지만 I2 이하는 자동 계산. J도 동일.

import { google } from 'googleapis';
import path from 'path';

const SHEET_ID = '1qwBAJZ70BO8jniAsw-6VBOscr_sm5m6mL1WBC8wnVZA';
const KEY_PATH = path.resolve('secrets/sheets-key.json');

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // 기존 헤더+데이터 영역(I, J) 모두 비우기
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: 'loans!I:J',
  });
  console.log('I, J 컬럼 비우기 완료');

  // 헤더(I1, J1)에 ARRAYFORMULA 입력 (전체 컬럼 자동 계산)
  const dDayFormula = '=ARRAYFORMULA(IF(ROW(G:G)=1,"dDay",IF(G:G="","",DATE(YEAR(TODAY()),VALUE(LEFT(G:G,2)),VALUE(RIGHT(G:G,2)))-TODAY())))';
  const statusFormula = '=ARRAYFORMULA(IF(ROW(G:G)=1,"상태",IF(G:G="","",IF(I:I>=0,"대출 중","연체 ("&ABS(I:I)&"일)"))))';

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'loans!I1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[dDayFormula]] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'loans!J1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[statusFormula]] },
  });
  console.log('✅ ARRAYFORMULA 적용 완료');
  console.log('   이제 새 대출이 추가되면 자동으로 dDay/상태가 계산됩니다.');
}

main().catch(e => { console.error(e); process.exit(1); });
