'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body style={{ margin: 0, background: '#FAF8F5', fontFamily: 'sans-serif' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100dvh', padding: '24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>😓</div>
          <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1A1613', marginBottom: 8 }}>
            앱을 불러오지 못했어요
          </h2>
          <p style={{ fontSize: 14, color: '#6E6459', marginBottom: 24 }}>
            잠시 후 다시 시도해주세요.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '14px 32px', borderRadius: 28, background: '#1A1613',
              color: '#FAF8F5', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
