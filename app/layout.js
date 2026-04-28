import './globals.css';
import { Cormorant_Garamond, Noto_Serif_KR } from 'next/font/google';
import BackButtonHandler from '@/components/BackButtonHandler';
import CookieBanner from '@/components/CookieBanner';

// 빌드 시 self-host — Google Fonts 외부 요청 제거, 자동 preload + display:swap
const fontEn = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const fontKo = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-serif-kr',
  display: 'swap',
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
    <html lang="ko" className={`${fontEn.variable} ${fontKo.variable}`}>
      <head>
        {/* Pretendard — 본문 폰트 (self-host 미지원 → CDN 유지) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
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
