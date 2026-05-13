// Vercel Serverless Function 진입점.
// vercel.json의 rewrite로 모든 /api/* 요청이 여기로 라우팅되고,
// Express 앱이 그대로 처리한다 (코드 변경 최소화).
import app from '../server';
export default app;
