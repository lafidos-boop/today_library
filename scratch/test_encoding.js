import * as XLSX from 'xlsx';
import fetch from 'node-fetch';
import fs from 'fs/promises';

const SHEET_ID = '1qwBAJZ70BO8jniAsw-6VBOscr_sm5m6mL1WBC8wnVZA';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;

async function test() {
  try {
    const response = await fetch(SHEET_URL);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const sheet = workbook.Sheets['새벽도서관'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const firstBook = rows[1]; // "쓰기 교수-학습론"
    console.log("Original Title:", firstBook[4]);
    
    const books = [{ title: firstBook[4] }];
    await fs.writeFile('test_encoding.json', JSON.stringify(books, null, 2), 'utf8');
    
    const readBack = await fs.readFile('test_encoding.json', 'utf8');
    console.log("Read Back Title:", JSON.parse(readBack)[0].title);
  } catch (e) {
    console.error(e);
  }
}

test();
