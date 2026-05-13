// dDay 함수를 REGEXEXTRACT 기반으로 교체 (트레일링 점 처리)
import { google } from 'googleapis';
import path from 'path';

const SHEET_ID = '1qwBAJZ70BO8jniAsw-6VBOscr_sm5m6mL1WBC8wnVZA';
const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve('secrets/sheets-key.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

// 백슬래시는 시트 함수에서는 그대로 \d로 들어가야 함.
// JS 문자열에서 \\d → 시트에 \d로 저장.
const dDayFormula = '=ARRAYFORMULA(IF(ROW(G:G)=1,"dDay",IF(G:G="","",IFERROR(DATE(YEAR(TODAY()),VALUE(REGEXEXTRACT(G:G,"^(\\d+)")),VALUE(REGEXEXTRACT(G:G,"\\.(\\d+)\\.?$")))-TODAY(),""))))';
const statusFormula = '=ARRAYFORMULA(IF(ROW(G:G)=1,"상태",IF(G:G="","",IF(I:I="","",IF(I:I>=0,"대출 중","연체 ("&ABS(I:I)&"일)")))))';

await sheets.spreadsheets.values.update({
  spreadsheetId: SHEET_ID, range: 'loans!I1',
  valueInputOption: 'USER_ENTERED', requestBody: { values: [[dDayFormula]] },
});
await sheets.spreadsheets.values.update({
  spreadsheetId: SHEET_ID, range: 'loans!J1',
  valueInputOption: 'USER_ENTERED', requestBody: { values: [[statusFormula]] },
});

console.log('✅ 함수 교체 완료');

// 검증
const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'loans!A1:J20' });
console.log('');
(r.data.values || []).slice(1).forEach((row, i) => {
  console.log(`행${i+2}: 반납=${row[6]}, dDay=${row[8]}, 상태=${row[9]}`);
});
