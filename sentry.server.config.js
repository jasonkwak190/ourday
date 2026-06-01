import * as Sentry from '@sentry/nextjs';

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: DSN,

  // 서버 사이드 트레이싱: 에러만 (성능 오버헤드 최소화)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0,

  // DSN 미설정 시 비활성화 (init이 invalid DSN으로 throw하는 것 방지)
  enabled: !!DSN && process.env.NODE_ENV === 'production',

  // 개인정보: IP 수집 안 함
  sendDefaultPii: false,

  ignoreErrors: [
    'NetworkError',
    'ECONNRESET',
    'ETIMEDOUT',
  ],
});
