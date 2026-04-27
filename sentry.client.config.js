import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 샘플링: 프로덕션 10%, 개발 0%
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,

  // 개발 환경에서는 콘솔에만 출력
  enabled: process.env.NODE_ENV === 'production',

  // 개인정보 보호: 사용자 IP 수집 안 함
  sendDefaultPii: false,

  // 무시할 에러 (네트워크 일시 오류 등)
  ignoreErrors: [
    'NetworkError',
    'Failed to fetch',
    'Load failed',
    'ChunkLoadError',
    /^ResizeObserver loop/,
  ],

  beforeSend(event) {
    // 로그인 페이지 에러는 민감정보 제거
    if (event.request?.url?.includes('/login') || event.request?.url?.includes('/signup')) {
      delete event.request.data;
    }
    return event;
  },
});
