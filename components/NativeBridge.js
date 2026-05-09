'use client';

import { useEffect } from 'react';

/**
 * Q-006: Capacitor 네이티브 플러그인 초기화
 *  - StatusBar: 앱 컬러(Ink)에 맞춘 어두운 상태바 + 흰 텍스트
 *  - Keyboard: IME 올라올 때 입력창 가려지지 않도록 body 자동 리사이즈
 *  - Haptics: 별도 export — 체크/저장 등 명시적 호출 지점에서 사용
 *
 * 웹 브라우저(Capacitor 미감지) 환경에서는 import 자체가 throw하므로 try/catch로 무시.
 */
export default function NativeBridge() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        if (cancelled) return;

        // StatusBar — Ink(#1A1613) 배경 + Light 텍스트
        try {
          const { StatusBar, Style } = await import('@capacitor/status-bar');
          await StatusBar.setStyle({ style: Style.Light });
          if (Capacitor.getPlatform() === 'android') {
            await StatusBar.setBackgroundColor({ color: '#1A1613' });
          }
        } catch (e) { console.warn('[NativeBridge] StatusBar init 실패:', e?.message); }

        // Keyboard — IME 올라올 때 body resize, 입력창이 자동으로 보이게
        try {
          const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
          await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
          await Keyboard.setScroll({ isDisabled: false });
        } catch (e) { console.warn('[NativeBridge] Keyboard init 실패:', e?.message); }
      } catch {
        /* 웹 브라우저 환경 — 무시 */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return null;
}

/**
 * 햅틱 피드백 — UI 컴포넌트에서 onClick 등에서 호출.
 * 웹에서는 무시. 실패해도 throw하지 않음 (UX는 그대로).
 *
 * @param {'light'|'medium'|'heavy'} style - 강도
 */
export async function hapticImpact(style = 'light') {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: styleMap[style] || ImpactStyle.Light });
  } catch { /* 웹 또는 미지원 — 무시 */ }
}

/** 알림성 햅틱 (성공/경고/에러) */
export async function hapticNotify(type = 'success') {
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    const typeMap = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error:   NotificationType.Error,
    };
    await Haptics.notification({ type: typeMap[type] || NotificationType.Success });
  } catch { /* 웹 — 무시 */ }
}
