import './globals.css';
import { Cormorant_Garamond } from 'next/font/google';
import BackButtonHandler from '@/components/BackButtonHandler';
import CookieBanner from '@/components/CookieBanner';
import NativeBridge from '@/components/NativeBridge';
import OfflineBanner from '@/components/OfflineBanner';

// Q-PERF: Cormorant는 next/font로 자체 호스팅 (Google Fonts CDN 라운드트립 제거)
//   - 라틴 위주 디스플레이 폰트 → next/font 최적화 효과 큼
//   - 사용 weight만 (4종) + display=swap + 자동 preload
//   - 폴백 메트릭 자동 매칭으로 CLS 0
// Noto Serif KR은 한글 글리프 크기 때문에 Google Fonts CDN 동적 subsetting 유지
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-cormorant-next',
});

export const metadata = {
  title: 'Ourday · 우리의 날',
  description: '결혼을 앞둔 커플이 함께 결혼 준비를 관리하는 웹앱',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ourday',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    siteName: 'Ourday',
    title: 'Ourday · 우리의 날',
    description: '결혼을 앞둔 커플이 함께 결혼 준비를 관리하는 웹앱',
    url: 'https://ourday-rust.vercel.app',
    images: [{ url: 'https://ourday-rust.vercel.app/opengraph-image', width: 1200, height: 630, alt: 'Ourday' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ourday · 우리의 날',
    description: '결혼을 앞둔 커플이 함께 결혼 준비를 관리하는 웹앱',
    images: ['https://ourday-rust.vercel.app/opengraph-image'],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1A1613',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={cormorant.variable}>
      <head>
        {/* DNS / TCP 사전 연결 — 폰트·API 첫 요청 LCP 단축 */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Supabase — 로그인 직후 첫 쿼리/Storage 다운로드를 위해 미리 연결 */}
        <link rel="preconnect" href="https://eapmagibtipjbagitqmf.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://eapmagibtipjbagitqmf.supabase.co" />

        {/* Pretendard — 본문 폰트 (dynamic subset, display=swap 내장) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* Noto Serif KR — 한글 디스플레이 (사용 weight 3종, dynamic subsetting) */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;700&display=swap"
        />
      </head>
      <body>
        {/* a11y: 키보드/스크린리더 사용자가 nav 건너뛰고 본문으로 바로 이동 */}
        <a href="#main-content" className="skip-link">본문 바로가기</a>
        <NativeBridge />
        <BackButtonHandler />
        <OfflineBanner />
        <main id="main-content">{children}</main>
        <CookieBanner />
      </body>
    </html>
  );
}
