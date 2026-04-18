import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// OAuth 로그인 후 리다이렉트 처리
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // users 테이블에 프로필이 있는지 확인
        const { data: userProfile } = await supabase
          .from('users')
          .select('id, couple_id, name, role')
          .eq('id', session.user.id)
          .single();

        if (!userProfile || !userProfile.name) {
          // 신규 OAuth 유저 → 이름·역할 수집 페이지로
          return NextResponse.redirect(`${origin}/setup-profile`);
        }

        if (!userProfile.couple_id) {
          // 프로필은 있는데 커플 연동 안 됨
          return NextResponse.redirect(`${origin}/connect`);
        }

        // 모두 완료 → 대시보드
        return NextResponse.redirect(`${origin}/dashboard`);
      }
    }
  }

  // 실패 시 홈으로
  return NextResponse.redirect(`${origin}/`);
}
