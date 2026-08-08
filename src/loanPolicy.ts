// 대출 정책 — 기간이 여러 화면에 흩어져 있으면 한쪽만 고쳐져 어긋나기 쉬워 여기 모아 둔다.

/** 최초 대출 기간(일). 2주 → 4주로 변경. */
export const LOAN_DAYS = 28;

/** 기준일로부터 days일 뒤 */
export function addDays(days: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
