import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ourday.app',
  appName: 'Ourday',
  webDir: 'out',
  server: {
    // Vercel URL을 WebView로 로드 → SSR/API/DB 모두 그대로 작동
    // git push → Vercel 배포 → 앱도 자동 반영 (앱 업데이트 불필요)
    url: 'https://ourday-rust.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'automatic',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#FAF8F5',
      showSpinner: false,
    },
  },
};

export default config;
