import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // 샘플링: 프로덕션 10%, 개발 0%
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,

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
