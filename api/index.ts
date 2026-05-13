// Vercel Serverless Function 진입점.
// vercel.json의 rewrite로 모든 /api/* 요청이 여기로 라우팅되고,
// Express 앱이 그대로 처리한다 (코드 변경 최소화).
// 참고: Vercel ESM 환경에서는 import에 .js 확장자가 필요. tsx는 로컬에서 그대로 처리.
import app from '../server.js';
export default app;
