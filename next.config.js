/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
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

module.exports = nextConfig;
