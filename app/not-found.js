'use client';

import { useRouter } from 'next/navigation';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--ivory)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        maxWidth: 430,
        margin: '0 auto',
      }}
    >
      {/* 모노그램 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
        <span style={{ fontFamily: 'var(--font-serif-en)', fontSize: 56, fontWeight: 500, color: 'var(--ink)', lineHeight: 1 }}>O</span>
        <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'var(--champagne)', flexShrink: 0, marginTop: 4 }} />
        <span style={{ fontFamily: 'var(--font-serif-en)', fontSize: 56, fontWeight: 500, color: 'var(--ink)', lineHeight: 1 }}>D</span>
      </div>

      {/* 404 숫자 */}
      <p style={{
        fontFamily: 'var(--font-serif-en)',
        fontSize: 96,
        fontWeight: 600,
        color: 'var(--champagne)',
        lineHeight: 1,
        letterSpacing: '-0.02em',
        marginBottom: 16,
        opacity: 0.35,
      }}>
        404
      </p>

      {/* 플러리시 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <span style={{ display: 'block', width: 32, height: 1, backgroundColor: 'var(--champagne)', opacity: 0.5 }} />
        <span style={{ display: 'block', width: 5, height: 5, borderRadius: '50%', backgroundColor: 'var(--champagne)', opacity: 0.5 }} />
        <span style={{ display: 'block', width: 32, height: 1, backgroundColor: 'var(--champagne)', opacity: 0.5 }} />
      </div>

      <h1 style={{
        fontFamily: 'var(--font-serif-ko)',
        fontSize: 20,
        fontWeight: 500,
        color: 'var(--ink)',
        letterSpacing: '-0.01em',
        marginBottom: 8,
        textAlign: 'center',
      }}>
        페이지를 찾을 수 없어요
      </h1>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        color: 'var(--ink-3)',
        textAlign: 'center',
        lineHeight: 1.6,
        marginBottom: 40,
      }}>
        링크가 잘못되었거나 페이지가 삭제되었어요.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280 }}>
        <button
          onClick={() => router.push('/dashboard')}
          className="btn-champagne"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Home size={18} strokeWidth={2} />
          홈으로 가기
        </button>
        <button
          onClick={() => router.back()}
          className="btn-outline"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <ArrowLeft size={18} strokeWidth={2} />
          이전으로
        </button>
      </div>
    </div>
  );
}
