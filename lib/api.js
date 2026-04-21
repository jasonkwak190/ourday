/**
 * API 호출 헬퍼
 * 웹(Vercel): 상대경로 /api/...
 * 앱(Capacitor 정적 빌드): NEXT_PUBLIC_API_BASE가 Vercel URL로 설정됨
 */
export function apiUrl(path) {
  const base = process.env.NEXT_PUBLIC_API_BASE || '';
  return `${base}${path}`;
}
