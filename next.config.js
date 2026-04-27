/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const SUPABASE_URL = 'https://eapmagibtipjbagitqmf.supabase.co';
const SUPABASE_WS  = 'wss://eapmagibtipjbagitqmf.supabase.co';

// Content Security Policy
// - 'unsafe-inline' in style-src: Tailwind + Next.js inline style 필수
// - 'unsafe-eval' 제거: Next.js 프로덕션 빌드에서 불필요
const CSP = [
  `default-src 'self'`,
  // 스크립트: 자신 + 카카오 SDK
  `script-src 'self' 'unsafe-inline' https://t1.kakaocdn.net`,
  // 스타일: 자신 + Google Fonts + JSDelivr (Pretendard)
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net`,
  // 폰트: Google Fonts + JSDelivr
  `font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net`,
  // API 통신: Supabase (REST + Realtime WebSocket)
  `connect-src 'self' ${SUPABASE_URL} ${SUPABASE_WS} https://t1.kakaocdn.net`,
  // 이미지: 자신 + Supabase Storage + data URI + blob + 외부 OG 이미지 (link preview 썸네일)
  `img-src 'self' ${SUPABASE_URL} data: blob: https:`,
  // 프레임: 카카오 지도 iframe 허용
  `frame-src https://map.kakao.com`,
  // 폼: 자신만
  `form-action 'self'`,
  // base-uri: 자신만
  `base-uri 'self'`,
  // 업그레이드 인시큐어 요청
  `upgrade-insecure-requests`,
].join('; ');

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Content Security Policy
          { key: 'Content-Security-Policy', value: CSP },
          // 클릭재킹 방지
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // MIME 스니핑 방지
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrer 정책
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // XSS 필터 (구형 브라우저용)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // HTTPS 강제 (Vercel은 자동으로 하지만 명시)
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // 권한 정책 (불필요한 브라우저 기능 제한)
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = withSentryConfig(withBundleAnalyzer(nextConfig), {
  org: 'ourday',
  project: 'ourday-nextjs',
  silent: true,
  // 소스맵은 프로덕션 빌드에서만 업로드
  sourcemaps: {
    disable: process.env.NODE_ENV !== 'production',
  },
  hideSourceMaps: true,
  // v10 방식으로 업데이트
  webpack: {
    treeshake: { removeDebugLogging: true },
  },
});
