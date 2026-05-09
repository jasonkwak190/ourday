'use client';

import { useState, useEffect } from 'react';

/**
 * 네트워크 온라인 상태 감지 hook.
 * - 초기 SSR 단계에선 true (false로 두면 hydration 깜빡임)
 * - 마운트 후 navigator.onLine으로 보정 + online/offline 이벤트 구독
 *
 * 주의: navigator.onLine은 "물리 연결" 기준이라 캡티브 포털 / DNS 막힘은 못 잡음.
 *       치명적이지 않지만 정확도 보강하려면 fetch ping 추가 가능.
 */
export function useOnline() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator !== 'undefined') setOnline(navigator.onLine);
    const handleOn = () => setOnline(true);
    const handleOff = () => setOnline(false);
    window.addEventListener('online', handleOn);
    window.addEventListener('offline', handleOff);
    return () => {
      window.removeEventListener('online', handleOn);
      window.removeEventListener('offline', handleOff);
    };
  }, []);

  return online;
}
