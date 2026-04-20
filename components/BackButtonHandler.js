'use client';

import { useEffect } from 'react';

export default function BackButtonHandler() {
  useEffect(() => {
    let removeListener = null;

    async function setup() {
      try {
        const { App } = await import('@capacitor/app');

        const listener = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            // 앱 내 페이지 히스토리 있으면 뒤로가기
            window.history.back();
          } else {
            // 히스토리 없으면 앱 종료 (홈으로)
            App.exitApp();
          }
        });

        removeListener = () => listener.remove();
      } catch {
        // 웹 브라우저 환경에서는 무시
      }
    }

    setup();

    return () => {
      if (removeListener) removeListener();
    };
  }, []);

  return null;
}
