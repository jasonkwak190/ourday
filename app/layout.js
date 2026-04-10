import { DM_Serif_Display, DM_Sans } from 'next/font/google';
import './globals.css';

const dmSerif = DM_Serif_Display({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-dm-serif',
  display: 'swap',
});

const dmSans = DM_Sans({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata = {
  title: 'Ourday · 우리의 날',
  description: '결혼을 앞둔 커플이 함께 결혼 준비를 관리하는 웹앱',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className={`${dmSerif.variable} ${dmSans.variable}`}>
        {children}
      </body>
    </html>
  );
}
