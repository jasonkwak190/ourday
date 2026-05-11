'use client';

import { useEffect, useState } from 'react';
import { BookOpen, MessageSquare } from 'lucide-react';
import PageLoader from '@/components/PageLoader';
import { useCouple } from '@/lib/useCouple';
import BottomNav from '@/components/BottomNav';
import InvitationTab from '@/components/InvitationTab';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';

export default function InvitationPage() {
  const { coupleId, loading: authLoading } = useCouple('couple_id');

  const [invitationId, setInvitationId] = useState(null);
  const [guestbook, setGuestbook] = useState([]);
  const [loadingGB, setLoadingGB] = useState(true);

  // 방명록 로드 — 청첩장(invitation)이 있을 때만
  useEffect(() => {
    if (authLoading || !coupleId) { setLoadingGB(false); return; }
    let cancelled = false;
    (async () => {
      const { data: inv } = await supabase
        .from('invitations').select('id').eq('couple_id', coupleId).maybeSingle();
      const invId = inv?.id || null;
      if (cancelled) return;
      setInvitationId(invId);
      if (invId) {
        const { data: gb } = await supabase
          .from('invitation_guestbook')
          .select('id, name, message, created_at')
          .eq('invitation_id', invId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (!cancelled) setGuestbook(gb || []);
      }
      setLoadingGB(false);
    })();
    return () => { cancelled = true; };
  }, [authLoading, coupleId]);

  if (authLoading) return <PageLoader />;

  return (
    <div className="page-wrapper">
      <div className="mb-4">
        <h1 style={{ fontFamily: 'var(--font-serif-ko)', fontWeight: 500, fontSize: 20, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>
          모바일 청첩장
        </h1>
        <p style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 12, color: 'var(--champagne-2)', margin: '2px 0 0', letterSpacing: '0.04em' }}>
          our wedding invitation
        </p>
      </div>

      <InvitationTab coupleId={coupleId} />

      {/* ── 방명록 섹션 — 청첩장 받은 하객의 메시지 모음 ── */}
      <div className="mt-8 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} color="var(--rose)" />
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            방명록
            {guestbook.length > 0 && (
              <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--rose-light)', color: 'var(--rose)' }}>
                {guestbook.length}
              </span>
            )}
          </p>
        </div>

        {loadingGB ? (
          <div className="card">
            <p className="text-sm text-center py-2" style={{ color: 'var(--stone)' }}>
              방명록 불러오는 중...
            </p>
          </div>
        ) : !invitationId ? (
          <div className="card">
            <p className="text-sm text-center py-2" style={{ color: 'var(--stone)' }}>
              청첩장을 먼저 만들어야 방명록이 생겨요
            </p>
          </div>
        ) : guestbook.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={MessageSquare}
              title="아직 방명록 메시지가 없어요"
              description="청첩장 링크를 받은 하객이 남기는 축하 메시지가 여기에 모여요"
              compact
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {guestbook.map(msg => (
              <div key={msg.id} className="card" style={{ padding: '14px 16px' }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    {msg.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                    {new Date(msg.created_at).toLocaleDateString('ko-KR', {
                      month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
                <p className="text-sm" style={{ color: 'var(--stone)', lineHeight: 1.6 }}>
                  &ldquo;{msg.message}&rdquo;
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="invitation" />
    </div>
  );
}
