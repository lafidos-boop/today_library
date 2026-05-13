import * as XLSX from 'xlsx';
import fetch from 'node-fetch';

const SHEET_ID = '1qwBAJZ70BO8jniAsw-6VBOscr_sm5m6mL1WBC8wnVZA';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;
const TARGET_SHEETS = ['새벽도서관', '달빛다락'];

async function test() {
  try {
    const response = await fetch(SHEET_URL);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    
    let allBooks = [];
    
    TARGET_SHEETS.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
      
      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const rowStr = JSON.stringify(rows[i]);
        if (rowStr.includes('제목') || rowStr.includes('도서코드')) {
          headerRowIdx = i;
          break;
        }
      }

      let colMap = { '위치': 0, '서가': 1, '행': 2, '열': 3, '제목': 4, '저자': 5, '출판사': 6, '장르': 7, '도서코드': 9, 'ISBN': 10, '표지': 11 };
      if (headerRowIdx !== -1) {
        const headers = rows[headerRowIdx].map(h => String(h).trim());
        headers.forEach((h, idx) => {
          if (h === '위치' || h === '위치(열람실)') colMap['위치'] = idx;
          if (h === '서가') colMap['서가'] = idx;
          if (h === '제목') colMap['제목'] = idx;
          if (h === '도서코드' || h === 'ID') colMap['도서코드'] = idx;
        });
      }

      const dataStartIdx = headerRowIdx === -1 ? 0 : headerRowIdx + 1;
      for (let i = dataStartIdx; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const title = String(row[colMap['제목']] || '').trim();
        const code = String(row[colMap['도서코드']] || '').trim();
        
        if (!title && !code) continue;
        if (title === '제목' && code === '도서코드') continue;
        
        if (i > 890 && i < 900) {
          console.log(`Processing Row ${i}: Title="${title}", Code="${code}", Shelf="${row[colMap['서가']]}"`);
        }
        
        allBooks.push({ title });
      }
    });
    console.log("Total mapped:", allBooks.length);
  } catch (e) {
    console.error(e);
  }
}

test();
