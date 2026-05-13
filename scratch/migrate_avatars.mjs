// users.json에 base64로 저장된 profileImage를 data/avatars/{id}.{ext} 파일로 분리.
// 실행: node scratch/migrate_avatars.mjs
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('.');
const USERS_PATH = path.join(ROOT, 'data', 'users.json');
const AVATARS_DIR = path.join(ROOT, 'data', 'avatars');

if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });

const text = fs.readFileSync(USERS_PATH, 'utf-8');
const users = JSON.parse(text);

// Backup
const backup = USERS_PATH + '.bak.avatars.' + Date.now();
fs.writeFileSync(backup, text, 'utf-8');
console.log(`backup → ${path.basename(backup)}`);

let migrated = 0, skipped = 0, missing = 0;
for (const u of users) {
  if (!u.profileImage) { missing++; continue; }
  if (typeof u.profileImage !== 'string') { skipped++; continue; }
  if (!u.profileImage.startsWith('data:image/')) {
    skipped++; continue; // 이미 URL 형태 (외부 picsum, 또는 /api/avatars/)
  }
  const m = /^data:image\/(\w+);base64,(.+)$/.exec(u.profileImage);
  if (!m) { skipped++; continue; }
  const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
  const buf = Buffer.from(m[2], 'base64');
  const fname = `${u.id}.${ext}`;
  fs.writeFileSync(path.join(AVATARS_DIR, fname), buf);
  u.profileImage = `/api/avatars/${fname}?v=${Date.now()}`;
  console.log(`  ${u.id} (${u.name}) → ${fname} (${(buf.length/1024).toFixed(1)} KB)`);
  migrated++;
}

const beforeSize = (text.length / 1024).toFixed(1);
const newJson = JSON.stringify(users, null, 2);
fs.writeFileSync(USERS_PATH, newJson, 'utf-8');
const afterSize = (newJson.length / 1024).toFixed(1);

console.log(`\nDONE: migrated=${migrated} skipped=${skipped} missing=${missing}`);
console.log(`users.json: ${beforeSize}KB → ${afterSize}KB`);
