import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 서버 사이드 트레이싱: 에러만 (성능 오버헤드 최소화)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0,

  enabled: process.env.NODE_ENV === 'production',

  // 개인정보: IP 수집 안 함
  sendDefaultPii: false,

  ignoreErrors: [
    'NetworkError',
    'ECONNRESET',
    'ETIMEDOUT',
  ],
});
