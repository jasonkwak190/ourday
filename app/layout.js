import './globals.css';
import BackButtonHandler from '@/components/BackButtonHandler';
import CookieBanner from '@/components/CookieBanner';

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
    <html lang="ko">
      <head>
        {/* Pretendard — 본문 폰트 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* Cormorant Garamond — 영문 디스플레이 / Noto Serif KR — 한글 디스플레이 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Noto+Serif+KR:wght@400;500;600;700;900&display=swap"
        />
      </head>
      <body>
        <BackButtonHandler />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
