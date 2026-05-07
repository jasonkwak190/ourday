'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Q-005 모바일 표준 — 화면 위에서 끌어내리면 새로고침.
 *
 * - touchstart at scrollY=0 → pull 시작
 * - touchmove의 deltaY > THRESHOLD → 인디케이터 점진 표시
 * - touchend의 deltaY > REFRESH_THRESHOLD → onRefresh 호출
 * - 호출 중에는 인디케이터 회전, 완료 후 자동 닫힘
 *
 * 데스크톱·iOS 사파리 자체 rubber-band와 충돌 없도록 0.4 마찰 적용.
 *
 * 사용:
 *   <PullToRefresh onRefresh={fetchData}>
 *     {pageContent}
 *   </PullToRefresh>
 */
const REFRESH_THRESHOLD = 70;
const MAX_PULL = 120;
const FRICTION = 0.45;

export default function PullToRefresh({ onRefresh, children, disabled }) {
  const containerRef = useRef(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (disabled) return;
    const el = containerRef.current;
    if (!el) return;

    function onStart(e) {
      if (window.scrollY > 0) return;
      pulling.current = true;
      startY.current = e.touches[0].clientY;
    }
    function onMove(e) {
      if (!pulling.current || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { setPull(0); return; }
      // window scroll이 도중에 위로 안 가도록
      const damped = Math.min(dy * FRICTION, MAX_PULL);
      setPull(damped);
      if (damped > 5) e.preventDefault?.(); // 일부 브라우저는 cancelable=false라 무시됨
    }
    async function onEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      const final = pull;
      if (final >= REFRESH_THRESHOLD && onRefresh) {
        setRefreshing(true);
        setPull(REFRESH_THRESHOLD);
        try { await onRefresh(); } catch {}
        setRefreshing(false);
      }
      setPull(0);
    }

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove',  onMove,  { passive: false });
    document.addEventListener('touchend',   onEnd);
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove',  onMove);
      document.removeEventListener('touchend',   onEnd);
    };
  }, [onRefresh, disabled, pull, refreshing]);

  const showIndicator = pull > 5 || refreshing;
  const opacity = Math.min(pull / REFRESH_THRESHOLD, 1);
  const indicatorTop = refreshing ? 24 : Math.max(0, pull - 32);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {showIndicator && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: indicatorTop,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            width: 36, height: 36,
            borderRadius: '50%',
            backgroundColor: 'var(--ivory)',
            border: '1px solid var(--rule-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,.12)',
            opacity: refreshing ? 1 : opacity,
            transition: refreshing ? 'top .18s' : 'none',
          }}
        >
          <Loader2
            size={16}
            color="var(--ink)"
            strokeWidth={2}
            style={{
              animation: refreshing ? 'pull-spin .8s linear infinite' : 'none',
              transform: refreshing ? 'none' : `rotate(${opacity * 270}deg)`,
            }}
          />
        </div>
      )}
      {children}
      <style jsx>{`
        @keyframes pull-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
