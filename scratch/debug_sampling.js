import * as XLSX from 'xlsx';
import fetch from 'node-fetch';

const SHEET_ID = '1qwBAJZ70BO8jniAsw-6VBOscr_sm5m6mL1WBC8wnVZA';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;

async function debug() {
  try {
    const response = await fetch(SHEET_URL);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const sheet = workbook.Sheets['새벽도서관'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    
    console.log("Total Rows:", rows.length);
    for (let i = 0; i < rows.length; i += 200) {
      console.log(`Row ${i}:`, JSON.stringify(rows[i]));
    }
    // Check around 880
    for (let i = 880; i < 900; i++) {
      console.log(`Row ${i}:`, JSON.stringify(rows[i]));
    }
  } catch (e) {
    console.error(e);
  }
}

debug();
