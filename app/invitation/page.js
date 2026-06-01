'use client';

import { useEffect, useState } from 'react';
import { BookOpen, MessageSquare, Trash2 } from 'lucide-react';
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
  const [deletingId, setDeletingId] = useState(null);

  // 방명록 항목 삭제 (optimistic — 실패 시 롤백)
  async function deleteGuestbookEntry(entry) {
    if (deletingId) return;
    if (!confirm('이 메시지를 삭제할까요? 되돌릴 수 없어요.')) return;
    setDeletingId(entry.id);
    const prev = guestbook;
    setGuestbook(curr => curr.filter(e => e.id !== entry.id));
    try {
      const res = await fetch(`/api/guestbook?id=${encodeURIComponent(entry.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        // 롤백
        setGuestbook(prev);
        let msg = '삭제에 실패했어요.';
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch { /* ignore */ }
        alert(msg);
      }
    } catch {
      setGuestbook(prev);
      alert('네트워크 오류가 발생했어요.');
    } finally {
      setDeletingId(null);
    }
  }

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
      <div className="mb-3">
        <h1 style={{ fontFamily: 'var(--font-serif-ko)', fontWeight: 500, fontSize: 20, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>
          모바일 청첩장
        </h1>
        <p style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 12, color: 'var(--champagne-2)', margin: '2px 0 0', letterSpacing: '0.04em' }}>
          our wedding invitation
        </p>
      </div>

      {/* 가이드 deep-link — 청첩장 문구·예절 정보로 한 번에 점프 */}
      <a
        href="/guide"
        className="mb-3 flex items-center justify-between"
        style={{
          padding: '10px 14px',
          borderRadius: 10,
          backgroundColor: 'var(--paper)',
          border: '1px solid var(--rule)',
          textDecoration: 'none',
          color: 'var(--ink-2)',
          fontSize: 12.5,
        }}
      >
        <span>💡 청첩장 문구·발송 시기·예절 정보</span>
        <span style={{ color: 'var(--ink-4)', fontSize: 14 }}>→</span>
      </a>

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
                  <div className="flex items-center" style={{ gap: 10 }}>
                    <p className="text-xs" style={{ color: 'var(--ink-3)', margin: 0 }}>
                      {new Date(msg.created_at).toLocaleDateString('ko-KR', {
                        month: 'short', day: 'numeric',
                      })}
                    </p>
                    <button
                      type="button"
                      onClick={() => deleteGuestbookEntry(msg)}
                      disabled={deletingId === msg.id}
                      aria-label="이 메시지 삭제"
                      style={{
                        background: 'none', border: 'none', padding: 2,
                        cursor: deletingId === msg.id ? 'wait' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        color: 'var(--ink-4, #9a8f80)',
                        fontSize: 11, fontWeight: 500,
                      }}
                    >
                      <Trash2 size={12} strokeWidth={2} />
                      <span>{deletingId === msg.id ? '삭제 중…' : '삭제'}</span>
                    </button>
                  </div>
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
