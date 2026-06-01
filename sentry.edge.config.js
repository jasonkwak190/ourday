import * as Sentry from '@sentry/nextjs';

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0,
  // DSN 미설정 시 비활성화 (init이 invalid DSN으로 throw하는 것 방지)
  enabled: !!DSN && process.env.NODE_ENV === 'production',
  sendDefaultPii: false,
});
