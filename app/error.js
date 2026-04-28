'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect, useState } from 'react';

export default function Error({ error, reset }) {
  // Sentry event ID로 사용자 → 고객지원 연결 추적
  const [eventId, setEventId] = useState(null);

  useEffect(() => {
    const id = Sentry.captureException(error);
    setEventId(id);
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
      <p style={{ fontSize: 14, color: 'var(--stone, #6E6459)', marginBottom: 24, maxWidth: 320, lineHeight: 1.6 }}>
        일시적인 오류입니다. 다시 시도해주세요.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={reset}
          style={{
            padding: '14px 32px', borderRadius: 28, background: 'var(--ink, #1A1613)',
            color: '#FAF8F5', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
          }}
        >
          다시 시도
        </button>
        <a
          href="/"
          style={{
            padding: '14px 24px', borderRadius: 28, background: 'transparent',
            color: 'var(--ink-2, #3A332E)', fontSize: 14, fontWeight: 600,
            border: '1px solid var(--rule, #E2D9C9)', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center',
          }}
        >
          홈으로
        </a>
      </div>
      {/* 고객지원 추적용 ID — 작게 표시 */}
      {eventId && (
        <p style={{ fontSize: 11, color: 'var(--ink-4, #A79D90)', marginTop: 8, fontFamily: 'monospace' }}>
          오류 ID: {eventId.slice(0, 8)}
          <br />
          <span style={{ fontFamily: 'inherit' }}>문의 시 이 ID를 알려주세요</span>
        </p>
      )}
    </div>
  );
}
