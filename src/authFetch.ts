// 인증 토큰 저장/부착 헬퍼 — 로그인 시 발급된 JWT를 localStorage에 보관하고,
// 보호된 API 호출마다 Authorization 헤더로 실어 보낸다.

const TOKEN_KEY = 'authToken';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null | undefined) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...options, headers });
}
