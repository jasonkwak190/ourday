import './globals.css';
import BackButtonHandler from '@/components/BackButtonHandler';

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
  themeColor: '#3182f6',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard — 텍스트 폰트 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <BackButtonHandler />
        {children}
      </body>
    </html>
  );
}
