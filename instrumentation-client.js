import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // 성능 영향 큰 기능 OFF — 에러 추적만 활성화
    // tracing/replay는 페이지 로드 시 main thread 400ms+ 차단 → LCP·TBT 악화
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    enabled: process.env.NODE_ENV === 'production',

    sendDefaultPii: false,

    ignoreErrors: [
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      'ChunkLoadError',
      /^ResizeObserver loop/,
    ],

    beforeSend(event) {
      if (event.request?.url?.includes('/login') || event.request?.url?.includes('/signup')) {
        delete event.request.data;
      }
      return event;
    },
  });
}
