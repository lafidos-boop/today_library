import * as XLSX from 'xlsx';
import fetch from 'node-fetch';

const SHEET_ID = '1qwBAJZ70BO8jniAsw-6VBOscr_sm5m6mL1WBC8wnVZA';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;

async function test() {
    try {
        const response = await fetch(SHEET_URL);
        const buffer = await response.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        
        const name = "새벽도서관";
        const sheet = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        
        console.log(`--- Sheet: ${name} ---`);
        console.log("Row 1 (Header?):", JSON.stringify(rows[0]));
        console.log("Row 2 (Data?):", JSON.stringify(rows[1]));
        console.log("Row 3 (Data?):", JSON.stringify(rows[2]));
        console.log("Row 4 (Data?):", JSON.stringify(rows[3]));
        console.log("...");
        console.log("Row 1147 (Section B Header?):", JSON.stringify(rows[1146]));
        console.log("Row 1148 (Section B Data?):", JSON.stringify(rows[1147]));
        
    } catch (e) {
        console.error(e);
    }
}

test();
