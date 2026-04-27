'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function SentryInit() {
  useEffect(() => {
    console.log('[SentryInit] useEffect fired, DSN:', process.env.NEXT_PUBLIC_SENTRY_DSN ? 'SET' : 'UNDEFINED');
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      enabled: true,
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
    // 초기화 확인용 테스트 (확인 후 제거)
    Sentry.captureMessage('[Test] Sentry init check ' + new Date().toISOString());
  }, []);
  return null;
}
