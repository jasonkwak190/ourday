'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100dvh', padding: '24px', textAlign: 'center',
      background: 'var(--ivory, #FAF8F5)',
    }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>😓</div>
      <h2 style={{
        fontFamily: 'var(--font-serif-ko, "Noto Serif KR"), serif',
        fontSize: 18, fontWeight: 500, color: 'var(--ink, #1A1613)', marginBottom: 8,
      }}>
        문제가 발생했어요
      </h2>
      <p style={{ fontSize: 14, color: 'var(--stone, #6E6459)', marginBottom: 24 }}>
        일시적인 오류입니다. 다시 시도해주세요.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '14px 32px', borderRadius: 28, background: 'var(--ink, #1A1613)',
          color: '#FAF8F5', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
        }}
      >
        다시 시도
      </button>
    </div>
  );
}
