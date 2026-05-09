import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/timeline',
  '/budget',
  '/decisions',
  '/guests',
  '/vendors',
  '/guide',
  '/connect',
  '/setup',
  '/setup-profile',
  '/settings',
  '/gallery',
  '/notes',
  '/invitation',
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isLanding = pathname === '/';

  // Q-PERF: 보호 라우트 + 랜딩 페이지에서만 미들웨어 작동 (다른 곳은 통과)
  if (!isProtected && !isLanding) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // 보호 라우트: 세션 없으면 랜딩으로
  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  // Q-PERF: 랜딩 페이지에 이미 로그인된 사용자 → 서버에서 즉시 /dashboard로
  // (기존: 클라이언트 useEffect에서 supabase SDK 로드 후 체크 → LCP 200~400ms 손실)
  if (isLanding && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/timeline/:path*',
    '/budget/:path*',
    '/decisions/:path*',
    '/guests/:path*',
    '/vendors/:path*',
    '/guide/:path*',
    '/connect/:path*',
    '/setup/:path*',
    '/setup-profile/:path*',
    '/settings/:path*',
    '/gallery/:path*',
    '/notes/:path*',
    '/invitation/:path*',
  ],
};
