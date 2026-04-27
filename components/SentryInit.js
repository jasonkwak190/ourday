'use client';

import { useEffect } from 'react';

export default function SentryInit() {
  useEffect(() => {
    // Turbopack 환경에서 withSentryConfig 자동 주입이 안 되므로 직접 초기화
    import('../sentry.client.config').catch(() => {});
  }, []);
  return null;
}
