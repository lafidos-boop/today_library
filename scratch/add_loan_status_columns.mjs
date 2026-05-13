// loans 탭에 'dDay'와 '상태' 컬럼을 추가하고 시트 함수로 자동 계산되게 설정.
// 실행: node scratch/add_loan_status_columns.mjs
//
// 동작:
//   - loans 탭에 컬럼 I(dDay), J(상태) 추가 (이미 있으면 건너뜀)
//   - 각 셀에 함수 입력:
//       I열: =IF(F2="","",IFERROR(VALUE(LEFT(F2,2))*100+VALUE(RIGHT(F2,2))-TEXT(TODAY(),"MMDD")*1,""))
//       J열: =IF(F2="","",IF(I2>=0,"대출 중","연체 ("&ABS(I2)&"일)"))
//   - F열 = returnDate ("MM.DD" 형식)
//
// 비고: returnDate가 'MM.DD' 형식이므로 같은 해 기준으로만 계산. 연도 넘기는 경우는 무시 (작은 도서관 시나리오에선 충분).

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

  // 1) 현재 헤더 확인
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'loans!A1:Z1',
  });
  const headers = (r.data.values?.[0] || []).map(String);
  console.log('현재 헤더:', headers);

  let needToWriteHeaders = false;
  const newHeaders = [...headers];
  if (!newHeaders.includes('dDay')) { newHeaders.push('dDay'); needToWriteHeaders = true; }
  if (!newHeaders.includes('상태')) { newHeaders.push('상태'); needToWriteHeaders = true; }

  if (needToWriteHeaders) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'loans!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [newHeaders] },
    });
    console.log('✅ 헤더 추가:', newHeaders);
  } else {
    console.log('ℹ️  컬럼 이미 존재');
  }

  // 2) 데이터 행 개수 확인
  const dataResp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'loans!A2:A',
  });
  const dataRows = (dataResp.data.values || []).length;
  console.log(`데이터 ${dataRows}건`);

  if (dataRows === 0) {
    console.log('데이터 없음. 함수만 헤더에 추가됐습니다.');
    return;
  }

  // 3) 컬럼 인덱스 찾기 (returnDate F? dDay I? 상태 J?)
  const colLetter = (idx) => String.fromCharCode(65 + idx); // 0→A
  const returnDateColIdx = newHeaders.indexOf('returnDate');
  const dDayColIdx = newHeaders.indexOf('dDay');
  const statusColIdx = newHeaders.indexOf('상태');
  const returnDateCol = colLetter(returnDateColIdx);
  const dDayCol = colLetter(dDayColIdx);
  const statusCol = colLetter(statusColIdx);

  console.log(`returnDate=${returnDateCol}, dDay=${dDayCol}, 상태=${statusCol}`);

  // 4) 각 데이터 행에 함수 입력
  // dDay 함수: 반납일(MM.DD) - 오늘(MM.DD) 차이 (간단 버전)
  //   F열 "05.16" → 05*100+16 = 516
  //   오늘 "05.13" → 513
  //   513-516 = -3 → 3일 남음 (음수 = 미래)
  //   사용자 컨벤션은 "D-3"이 3일 남음, "D+5"가 5일 연체
  //   여기서는 시트엔 "양수면 남은 일수, 음수면 연체 일수" 형태로 직관 표시
  const formulasD = [];
  const formulasS = [];
  for (let i = 0; i < dataRows; i++) {
    const row = i + 2; // 시트 행 (헤더 다음부터)
    const F = `${returnDateCol}${row}`;
    // 함수 — 반납일까지 며칠 남았는지. MM.DD를 일자로 변환해서 오늘과 비교
    // returnDate "MM.DD" → DATE(YEAR(TODAY()), VALUE(LEFT(F,2)), VALUE(RIGHT(F,2)))
    formulasD.push([
      `=IF(${F}="","",DATE(YEAR(TODAY()),VALUE(LEFT(${F},2)),VALUE(RIGHT(${F},2)))-TODAY())`,
    ]);
    const D = `${dDayCol}${row}`;
    formulasS.push([
      `=IF(${D}="","",IF(${D}>=0,"대출 중","연체 ("&ABS(${D})&"일)"))`,
    ]);
  }

  // dDay 컬럼에 함수 일괄 입력
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `loans!${dDayCol}2:${dDayCol}${dataRows + 1}`,
    valueInputOption: 'USER_ENTERED', // 함수가 평가되도록
    requestBody: { values: formulasD },
  });
  // 상태 컬럼
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `loans!${statusCol}2:${statusCol}${dataRows + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: formulasS },
  });

  console.log(`✅ ${dataRows}건에 함수 적용 완료`);
  console.log('   시트를 열어보면 "dDay"와 "상태" 컬럼에 자동 계산된 값이 보입니다.');
}

main().catch(e => { console.error(e); process.exit(1); });
