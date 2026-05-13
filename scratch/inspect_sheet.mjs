import * as XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('./scratch/sheet.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

console.log('=== Sheet names ===');
console.log(wb.SheetNames);

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`\n=== "${name}" — ${rows.length} rows ===`);
  // Print first 5 rows
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    console.log(`row ${i}:`, JSON.stringify(rows[i]).slice(0, 250));
  }
  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const s = JSON.stringify(rows[i]);
    if (s.includes('제목') || s.includes('도서코드')) { headerIdx = i; break; }
  }
  console.log(`headerIdx=${headerIdx}`);
  if (headerIdx >= 0) {
    console.log('headers:', rows[headerIdx]);
    // Stats: how many rows have 도서코드, ISBN, 제목
    const headers = rows[headerIdx].map(h => String(h).trim());
    const idx = (k) => headers.findIndex(h => h === k);
    const titleI = idx('제목');
    const codeI = headers.findIndex(h => h === '도서코드' || h === 'ID');
    const isbnI = idx('ISBN');
    let totalWithTitle = 0, missingCode = 0, missingIsbn = 0;
    const firstFew = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const title = String(r[titleI] || '').trim();
      if (!title) continue;
      totalWithTitle++;
      const code = String(r[codeI] || '').trim();
      const isbn = String(r[isbnI] || '').trim();
      if (!code) missingCode++;
      if (!isbn) missingIsbn++;
      if (firstFew.length < 5) firstFew.push({ row: i, title, code, isbn, raw: r });
    }
    console.log(`Books with title: ${totalWithTitle}`);
    console.log(`Missing 도서코드: ${missingCode}`);
    console.log(`Missing ISBN: ${missingIsbn}`);
    console.log(`Sample data rows:`, firstFew.slice(0, 3));
  }
}
