import * as Sentry from '@sentry/nextjs';

console.log('[instrumentation-client] loading, DSN:', process.env.NEXT_PUBLIC_SENTRY_DSN ? 'SET' : 'MISSING');

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // 진단용: 강제 활성화 + 디버그 로그
    enabled: true,
    debug: true,

    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    sendDefaultPii: false,
  });

  console.log('[instrumentation-client] Sentry.init done, sending test message...');
  Sentry.captureMessage('[instrumentation-client] init verification ' + new Date().toISOString());
  Sentry.flush(5000).then((ok) => {
    console.log('[instrumentation-client] flush result:', ok);
  });
}
