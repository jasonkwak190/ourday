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
  '/invitation',
  '/notes',
  '/calendar',
];

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) return NextResponse.next();

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

  if (!session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
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
    '/invitation/:path*',
    '/notes/:path*',
    '/calendar/:path*',
  ],
};
