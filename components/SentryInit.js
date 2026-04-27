'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function SentryInit() {
  useEffect(() => {
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
  }, []);
  return null;
}
