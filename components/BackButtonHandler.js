'use client';

import { useEffect } from 'react';

export default function BackButtonHandler() {
  useEffect(() => {
    let removeBack = null;
    let removeUrl = null;

    async function setup() {
      try {
        const { App } = await import('@capacitor/app');

        // 1) 하드웨어 뒤로가기
        const backListener = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
        removeBack = () => backListener.remove();

        // 2) App Link 딥링크 — singleTask 모드에서 카카오/구글 OAuth 콜백,
        //    청첩장 링크 등이 들어왔을 때 WebView를 그 URL로 이동시킴
        //    (이게 없으면 콜백이 들어와도 WebView가 갱신 안 됨)
        const urlListener = await App.addListener('appUrlOpen', ({ url }) => {
          if (!url) return;
          try {
            const u = new URL(url);
            // pathname + search + hash만 WebView에 전달 (이미 같은 호스트에 있음)
            const target = u.pathname + u.search + u.hash;
            if (target && target !== window.location.pathname + window.location.search + window.location.hash) {
              window.location.href = target;
            }
          } catch {
            /* invalid URL — 무시 */
          }
        });
        removeUrl = () => urlListener.remove();
      } catch {
        // 웹 브라우저 환경에서는 무시
      }
    }

    setup();

    return () => {
      if (removeBack) removeBack();
      if (removeUrl) removeUrl();
    };
  }, []);

  return null;
}
