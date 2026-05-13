// Google Sheets를 DB처럼 사용하는 얇은 추상화 레이어.
// - 로컬 개발: secrets/sheets-key.json 파일에서 자격증명 로드
// - 프로덕션(Vercel): 환경변수 GOOGLE_SERVICE_ACCOUNT_JSON 에 JSON 내용 그대로 저장
//
// 사용 예:
//   const users = await listAll('users');
//   await append('loans', { id: Date.now(), userId: 'M-001', ... });
//   await updateById('users', 'M-001', { password: 'newhash' });
//   await deleteById('applications', 1234567890);

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SHEET_ID = '1qwBAJZ70BO8jniAsw-6VBOscr_sm5m6mL1WBC8wnVZA';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function buildAuth() {
  // 1) Vercel/프로덕션: 환경변수에서 자격증명 JSON 로드
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
  }
  // 2) 로컬 개발: 키 파일
  const keyFile = path.resolve(__dirname, 'secrets/sheets-key.json');
  if (!fs.existsSync(keyFile)) {
    throw new Error(
      `Sheets 자격증명을 찾을 수 없습니다. ${keyFile} 또는 GOOGLE_SERVICE_ACCOUNT_JSON 환경변수가 필요합니다.`,
    );
  }
  return new google.auth.GoogleAuth({ keyFile, scopes: SCOPES });
}

const auth = buildAuth();
const sheets = google.sheets({ version: 'v4', auth });

// === 캐시 ===
// 헤더는 거의 변하지 않음 → 영구 캐시
const headerCache: Record<string, string[]> = {};
// 시트 gid (탭 ID) — deleteRow에 필요
const sheetGidCache: Record<string, number> = {};

// === 컬럼 타입 매핑 (숫자로 파싱할 컬럼들) ===
const NUMBER_COLS: Record<string, Set<string>> = {
  users: new Set(['loans']),
  applications: new Set(['id']),
  loans: new Set(['id', 'progress', 'dDay']),
  activities: new Set(),
};

// 시트 함수로 자동 계산되는 컬럼 (append/update 시 건드리지 않음 → ARRAYFORMULA 스필 유지)
const FORMULA_COLS: Record<string, Set<string>> = {
  loans: new Set(['dDay', '상태']),
};

async function getHeaders(tab: string): Promise<string[]> {
  if (headerCache[tab]) return headerCache[tab];
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A1:Z1`,
  });
  headerCache[tab] = (r.data.values?.[0] || []).map(String);
  return headerCache[tab];
}

async function getSheetGid(tab: string): Promise<number> {
  if (sheetGidCache[tab] !== undefined) return sheetGidCache[tab];
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  for (const s of meta.data.sheets || []) {
    if (s.properties?.title) sheetGidCache[s.properties.title] = s.properties.sheetId!;
  }
  if (sheetGidCache[tab] === undefined) throw new Error(`탭 없음: ${tab}`);
  return sheetGidCache[tab];
}

function rowToObject(row: any[], headers: string[], numberCols: Set<string>): any {
  const obj: any = {};
  for (let i = 0; i < headers.length; i++) {
    const raw = row[i];
    const h = headers[i];
    if (raw === undefined || raw === '') {
      obj[h] = numberCols.has(h) ? null : '';
    } else if (numberCols.has(h)) {
      const n = Number(raw);
      obj[h] = isNaN(n) ? raw : n;
    } else {
      obj[h] = String(raw);
    }
  }
  return obj;
}

function objectToRow(obj: any, headers: string[]): string[] {
  return headers.map((h) => {
    const v = obj[h];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });
}

// === Public API ===

/** 탭의 모든 행을 객체 배열로 반환 (헤더 제외) */
export async function listAll(tab: string): Promise<any[]> {
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A1:Z`,
  });
  const rows = r.data.values || [];
  if (rows.length === 0) return [];
  const headers = rows[0].map(String);
  headerCache[tab] = headers;
  if (rows.length < 2) return [];
  const numberCols = NUMBER_COLS[tab] || new Set<string>();
  return rows.slice(1).map((r) => rowToObject(r, headers, numberCols));
}

/** 새 행을 마지막에 추가 (시트 함수 컬럼은 건너뜀 → ARRAYFORMULA 자동 적용) */
export async function append(tab: string, obj: any): Promise<void> {
  const headers = await getHeaders(tab);
  const formulaCols = FORMULA_COLS[tab] || new Set<string>();
  // 마지막 비함수 컬럼 인덱스까지만 쓰기 → 그 이후 컬럼은 빈 셀로 두어 ARRAYFORMULA 스필 허용
  let lastDataColIdx = -1;
  for (let i = 0; i < headers.length; i++) {
    if (!formulaCols.has(headers[i])) lastDataColIdx = i;
  }
  const cutHeaders = headers.slice(0, lastDataColIdx + 1);
  const row = objectToRow(obj, cutHeaders);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

/** id 컬럼이 일치하는 행을 찾아 patch 적용 (없으면 throw) */
export async function updateById(tab: string, id: string | number, patch: any): Promise<void> {
  const all = await listAll(tab);
  const idx = all.findIndex((o) => String(o.id) === String(id));
  if (idx === -1) throw new Error(`${tab}: id=${id} 없음`);
  const headers = await getHeaders(tab);
  const merged = { ...all[idx], ...patch };
  const row = objectToRow(merged, headers);
  const sheetRow = idx + 2; // header(1) + 0-based to 1-based(+1)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

/** id 컬럼이 일치하는 행 삭제 */
export async function deleteById(tab: string, id: string | number): Promise<void> {
  const all = await listAll(tab);
  const idx = all.findIndex((o) => String(o.id) === String(id));
  if (idx === -1) throw new Error(`${tab}: id=${id} 없음`);
  const gid = await getSheetGid(tab);
  const startIndex = idx + 1; // 시트 0-based: 헤더가 0, 첫 데이터가 1
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: gid,
              dimension: 'ROWS',
              startIndex,
              endIndex: startIndex + 1,
            },
          },
        },
      ],
    },
  });
}

/** id 일치 행 1건 반환 (없으면 null) */
export async function findById(tab: string, id: string | number): Promise<any | null> {
  const all = await listAll(tab);
  return all.find((o) => String(o.id) === String(id)) || null;
}
