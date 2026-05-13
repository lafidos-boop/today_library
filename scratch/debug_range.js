import * as XLSX from 'xlsx';
import fetch from 'node-fetch';

const SHEET_ID = '1qwBAJZ70BO8jniAsw-6VBOscr_sm5m6mL1WBC8wnVZA';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;

async function debug() {
  try {
    const response = await fetch(SHEET_URL);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    
    ['새벽도서관', '달빛다락'].forEach(name => {
      const sheet = workbook.Sheets[name];
      console.log(`Sheet "${name}" Range:`, sheet['!ref']);
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      console.log(`Sheet "${name}" Rows:`, rows.length);
    });
  } catch (e) {
    console.error(e);
  }
}

debug();
