'use client';

import { useOnline } from '@/lib/useOnline';
import { WifiOff } from 'lucide-react';

/**
 * 오프라인 상태 시 화면 상단 고정 배너.
 * 사용자가 즉시 인지 → 변경사항이 저장 안 됨을 안내.
 */
export default function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top)',
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: 'var(--ink)',
        color: 'white',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontSize: 13,
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,.18)',
      }}
    >
      <WifiOff size={14} strokeWidth={2.5} />
      <span>오프라인 — 변경사항이 저장되지 않습니다</span>
    </div>
  );
}
