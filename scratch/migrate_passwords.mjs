// 기존 users.json / applications.json의 평문 비밀번호를 bcrypt 해시로 일괄 마이그레이션
// 실행: node scratch/migrate_passwords.mjs
// 안전: 이미 해시된 항목은 건드리지 않음. 백업 파일도 자동 생성.

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const ROUNDS = 10;
const ROOT = path.resolve('.');
const FILES = [
  path.join(ROOT, 'data', 'users.json'),
  path.join(ROOT, 'data', 'applications.json'),
];

function isHashed(s) {
  return typeof s === 'string' && /^\$2[aby]\$/.test(s);
}

async function migrateFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${filePath} (not found)`);
    return;
  }
  const text = fs.readFileSync(filePath, 'utf-8');
  if (!text.trim()) {
    console.log(`SKIP: ${filePath} (empty)`);
    return;
  }
  const data = JSON.parse(text);
  if (!Array.isArray(data)) {
    console.log(`SKIP: ${filePath} (not an array)`);
    return;
  }

  // Backup
  const backup = filePath + '.bak.' + Date.now();
  fs.writeFileSync(backup, text, 'utf-8');
  console.log(`backup → ${path.basename(backup)}`);

  let plainCount = 0, hashedCount = 0, missing = 0;
  for (const item of data) {
    if (!item.password) { missing++; continue; }
    if (isHashed(item.password)) { hashedCount++; continue; }
    item.password = await bcrypt.hash(item.password, ROUNDS);
    plainCount++;
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`${path.basename(filePath)}: hashed=${plainCount} alreadyHashed=${hashedCount} missing=${missing} total=${data.length}`);
}

async function main() {
  for (const f of FILES) {
    await migrateFile(f);
  }
  console.log('DONE');
}
main().catch(e => { console.error(e); process.exit(1); });
