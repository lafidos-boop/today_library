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
    
    console.log("Total Rows in '새벽도서관':", rows.length);
    
    // Check rows around the Section B transition
    for (let i = 1140; i < 1160; i++) {
      if (rows[i]) {
        console.log(`Row ${i}:`, JSON.stringify(rows[i]));
      } else {
        console.log(`Row ${i}: UNDEFINED`);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

debug();
