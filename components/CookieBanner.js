'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'ourday_cookie_consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage 접근 불가 시 배너 미표시
    }
  }, []);

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* 무시 */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="쿠키 및 개인정보 동의"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 'calc(88px + env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        zIndex: 60,
        padding: '0 12px 8px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        backgroundColor: 'var(--ink)',
        borderRadius: 20,
        padding: '16px 20px',
        boxShadow: '0 8px 32px rgba(26,22,19,0.28)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>🍪</span>
          <p style={{
            fontSize: 13, lineHeight: 1.6,
            color: 'rgba(250,248,245,0.85)',
            margin: 0,
          }}>
            서비스 이용을 위해 로그인 세션 쿠키를 사용합니다.{' '}
            <Link
              href="/privacy"
              style={{ color: 'var(--champagne)', fontWeight: 600, textDecoration: 'underline' }}
            >
              개인정보처리방침
            </Link>
            {' '}및{' '}
            <Link
              href="/terms"
              style={{ color: 'var(--champagne)', fontWeight: 600, textDecoration: 'underline' }}
            >
              이용약관
            </Link>
            을 확인하세요.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={accept}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'var(--champagne)',
              color: 'var(--ink)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          >
            확인하고 계속하기
          </button>
        </div>
      </div>
    </div>
  );
}
