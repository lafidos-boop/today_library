// 백엔드 REST API 래퍼.
// 단순 호출이 여러 화면에서 반복돼서 한 곳에 모음.
// 추후 인증 토큰/에러 인터셉터/JWT 만료 처리 등을 추가하기 좋은 자리.

import type { Book } from './types';

async function getJSON<T = any>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} failed: ${r.status}`);
  return r.json();
}

async function postJSON<T = any>(url: string, body: any, expectOk = true): Promise<{ ok: boolean; status: number; data: T }> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as T;
  if (expectOk && !r.ok) throw Object.assign(new Error(`POST ${url} failed: ${r.status}`), { status: r.status, data });
  return { ok: r.ok, status: r.status, data };
}

async function putJSON<T = any>(url: string, body: any): Promise<T> {
  const r = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PUT ${url} failed: ${r.status}`);
  return r.json();
}

async function del(url: string): Promise<void> {
  const r = await fetch(url, { method: 'DELETE' });
  if (!r.ok) throw new Error(`DELETE ${url} failed: ${r.status}`);
}

// === Public API ===

export const api = {
  // 인증
  login: (name: string, password: string) => postJSON('/api/login', { name, password }, false),

  // 도서
  listBooks: () => getJSON<Book[]>('/api/books'),
  saveBooks: (books: Book[]) => fetch('/api/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(books),
  }),

  // 회원
  listUsers: () => getJSON<any[]>('/api/users'),
  createUser: (user: any) => postJSON('/api/users', user),
  updateUser: (id: string, patch: any) => putJSON<any>(`/api/users/${id}`, patch),
  deleteUser: (id: string) => del(`/api/users/${id}`),

  // 가입 신청
  listApplications: () => getJSON<any[]>('/api/applications'),
  createApplication: (data: any) => postJSON('/api/applications', data, false),
  deleteApplication: (id: number) => del(`/api/applications/${id}`),

  // 대출
  listMyLoans: (userId: string) => getJSON<any[]>(`/api/loans/${userId}`),
  listAllLoans: () => getJSON<any[]>('/api/admin/loans'),
  createLoan: (loan: any) => postJSON('/api/loans', loan, false),
  updateLoan: (id: number, patch: any) => putJSON(`/api/loans/${id}`, patch),
  returnLoan: (id: number) => del(`/api/loans/${id}`),

  // 활동
  listActivities: () => getJSON<any[]>('/api/activities'),
};
