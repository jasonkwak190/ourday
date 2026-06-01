export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Service role client — admin 작업 전용
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// 인증된 사용자 세션 확인
async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* Server Component에서는 무시 */ }
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// DELETE /api/delete-account
// 인증된 사용자의 계정 및 연관 데이터를 삭제합니다.
export async function DELETE(request) {
  try {
    // 1. 인증 확인
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
    }

    const admin = adminClient();

    // 2. 이 사용자의 couple_id 조회
    const { data: userData } = await admin
      .from('users')
      .select('couple_id')
      .eq('id', user.id)
      .single();

    const coupleId = userData?.couple_id;

    if (coupleId) {
      // PIPA 준수: 파트너의 데이터를 본인 동의 없이 삭제 금지.
      // 파트너가 있으면 커플 row는 유지하고 본인의 users row만 정리(detach).
      // 파트너가 없을 때만 커플 전체와 연관 데이터 일괄 삭제.
      const { data: partners } = await admin
        .from('users')
        .select('id')
        .eq('couple_id', coupleId)
        .neq('id', user.id);

      if (partners && partners.length > 0) {
        // 파트너 있음 → 본인 users row만 우선 분리(요청자 데이터에서 단절)
        // auth.users 삭제 시 ON DELETE CASCADE로 users row가 자동 삭제될 수도 있지만
        // 명시적으로 couple_id를 NULL로 끊어 leftover 위험 제거.
        await admin.from('users').update({ couple_id: null }).eq('id', user.id);
      } else {
        // 파트너 없음 → 커플 전체와 CASCADE 데이터 삭제 가능
        await admin.from('couples').delete().eq('id', coupleId);
      }
    }

    // 5. Auth 계정 삭제 (→ users 테이블 CASCADE 삭제)
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('[delete-account] auth delete error:', deleteError.message);
      return NextResponse.json({ error: '계정 삭제에 실패했어요. 다시 시도해주세요.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[delete-account] unexpected error:', e.message);
    return NextResponse.json({ error: '서버 오류가 발생했어요.' }, { status: 500 });
  }
}
