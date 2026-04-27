'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function SentryInit() {
  useEffect(() => {
    console.log('[SentryInit] useEffect fired, DSN:', process.env.NEXT_PUBLIC_SENTRY_DSN ? 'SET' : 'UNDEFINED');
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    try {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        debug: true,
        tracesSampleRate: 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        enabled: true,
        sendDefaultPii: false,
      });
      console.log('[SentryInit] init() called');
      Sentry.captureMessage('[Test] Sentry init check ' + new Date().toISOString());
      console.log('[SentryInit] captureMessage() called');
      Sentry.flush(5000).then(() => console.log('[SentryInit] flush done'));
    } catch(e) {
      console.error('[SentryInit] ERROR:', e.message);
    }
  }, []);
  return null;
}
