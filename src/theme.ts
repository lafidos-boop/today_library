// 색상 토큰. tailwind 설정과 별개로 JS에서 참조할 때 사용.
// (대부분의 스타일은 tailwind 클래스로 처리하므로 직접 import 사용 빈도는 낮음.)
export const COLORS = {
  primary: '#476500',
  primaryContainer: '#5d7f13',
  onPrimary: '#ffffff',
  surface: '#fafaed',
  surfaceContainer: '#eeefe2',
  surfaceContainerLow: '#f4f5e7',
  error: '#ba1a1a',
  onSurface: '#1a1c15',
  onSurfaceVariant: '#444939',
} as const;
