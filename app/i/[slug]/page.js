'use client';

import { useState, useEffect, use } from 'react';
import { Heart, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { InvitationRenderer } from '@/components/InvitationTemplates';

const FONT = "'Pretendard Variable','Pretendard',-apple-system,sans-serif";

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export default function InvitationViewPage({ params }) {
  const { slug } = use(params);

  const [inv,         setInv]         = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [copied,      setCopied]      = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  // ── 방명록 + RSVP 공유 이름 ──────────────────────────────
  const [guestName, setGuestName] = useState('');

  // ── 인라인 RSVP 상태 ─────────────────────────────────────
  const [side,       setSide]       = useState(null);   // 'groom' | 'bride'
  const [attending,  setAttending]  = useState(null);   // true | false
  const [mealCount,  setMealCount]  = useState(1);
  const [phone,      setPhone]      = useState('');
  const [rsvpError,  setRsvpError]  = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rsvpDone,   setRsvpDone]   = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('invitations').select('*').eq('slug', slug).single();
      setInv(data || null);
      setLoading(false);

      if (data) {
        await supabase.rpc('increment_view_count', { invitation_slug: slug });
      }
    };
    load();
  }, [slug]);

  async function copyUrl() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRsvpSubmit() {
    setRsvpError('');
    if (!guestName.trim()) { setRsvpError('성함을 위의 방명록 이름란에 입력해주세요.'); return; }
    if (!side)             { setRsvpError('신랑측/신부측을 선택해주세요.'); return; }
    if (attending === null) { setRsvpError('참석 여부를 선택해주세요.'); return; }

    setSubmitting(true);
    const res = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couple_id:  inv.couple_id,
        name:       guestName.trim(),
        side,
        attending,
        meal_count: attending ? mealCount : 0,
        phone:      phone.trim() || null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) { setRsvpError('전송에 실패했어요. 잠시 후 다시 시도해주세요.'); return; }
    setRsvpDone(true);
  }

  // ── 로딩 / 오류 ──────────────────────────────────────────
  if (loading) {
    return (
      <div style={centered}>
        <Heart size={32} color="#e8b4b8" fill="#e8b4b8" style={{ animation: 'pulse 1.2s infinite' }} />
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    );
  }

  if (!inv) {
    return (
      <div style={centered}>
        <Heart size={28} color="#d4879a" />
        <p style={{ fontSize: 16, color: '#4e5968', fontWeight: 600, marginTop: 12 }}>청첩장을 찾을 수 없어요</p>
        <p style={{ fontSize: 13, color: '#b0b8c1', marginTop: 6 }}>링크를 다시 확인해주세요</p>
      </div>
    );
  }

  const groomName   = inv.groom_name || '신랑';
  const brideName   = inv.bride_name || '신부';
  const accentColor = inv.template === 'classic' ? '#7a5c40'
                    : inv.template === 'floral'  ? '#c4617a'
                    : '#191f28';

  return (
    <div style={{ fontFamily: FONT }}>
      {/* ── 청첩장 템플릿 + 방명록 ── */}
      <InvitationRenderer
        inv={inv}
        copied={copied}
        copyUrl={copyUrl}
        showAccount={showAccount}
        setShowAccount={setShowAccount}
        guestName={guestName}
        onGuestNameChange={setGuestName}
      />

      {/* ── 인라인 RSVP ─────────────────────────────────── */}
      {inv.couple_id && (
        <div style={{
          maxWidth: 430, margin: '0 auto',
          padding: '0 20px 64px',
          backgroundColor: inv.template === 'floral'
            ? 'transparent'
            : inv.template === 'classic' ? '#fdf8f0' : '#f8f9fa',
        }}>
          {/* 구분선 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, backgroundColor: '#f2f4f6' }} />
            <p style={{ fontSize: 12, letterSpacing: '0.1em', color: '#b0b8c1' }}>참석 여부</p>
            <div style={{ flex: 1, height: 1, backgroundColor: '#f2f4f6' }} />
          </div>

          {rsvpDone ? (
            /* ── 제출 완료 ── */
            <div style={{
              backgroundColor: 'white', borderRadius: 20, padding: '28px 20px',
              textAlign: 'center', boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
                backgroundColor: attending ? '#eaf4ff' : '#f2f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {attending
                  ? <Check size={30} color="#3182f6" strokeWidth={2.5} />
                  : <Heart size={28} color="#b0b8c1" />
                }
              </div>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#191f28', marginBottom: 8 }}>
                {attending ? '참석 확인 완료!' : '답변이 전달됐어요'}
              </p>
              <p style={{ fontSize: 14, color: '#8b95a1', lineHeight: 1.7 }}>
                {attending
                  ? `${guestName}님의 참석을 기다릴게요.\n소중한 자리에 함께해주셔서 감사해요.`
                  : `${guestName}님의 답변을 잘 받았어요.\n다음에 좋은 자리에서 뵙겠습니다.`
                }
              </p>
            </div>
          ) : (
            /* ── RSVP 폼 ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* 이름 안내 */}
              {guestName ? (
                <div style={{
                  padding: '12px 16px', borderRadius: 12,
                  backgroundColor: '#eaf4ff',
                  fontSize: 13, color: '#3182f6', fontWeight: 600,
                }}>
                  {guestName}님으로 참석 여부를 전달해요
                </div>
              ) : (
                <div style={{
                  padding: '12px 16px', borderRadius: 12,
                  backgroundColor: '#fff9e6',
                  fontSize: 13, color: '#b08a00',
                }}>
                  위의 방명록에서 이름을 먼저 입력하면 자동으로 연결돼요
                </div>
              )}

              {/* 신랑측 / 신부측 */}
              <RsvpSection title="어느 분 하객이세요?">
                <div style={{ display: 'flex', gap: 10 }}>
                  <SideBtn selected={side === 'groom'} onClick={() => setSide('groom')} label={`${groomName}측`} accent={accentColor} />
                  <SideBtn selected={side === 'bride'} onClick={() => setSide('bride')} label={`${brideName}측`} accent={accentColor} />
                </div>
              </RsvpSection>

              {/* 참석 여부 */}
              <RsvpSection title="참석 여부">
                <div style={{ display: 'flex', gap: 10 }}>
                  <AttendBtn
                    selected={attending === true} onClick={() => setAttending(true)}
                    label="참석할게요" color="#3182f6" bg="#eaf4ff"
                  />
                  <AttendBtn
                    selected={attending === false} onClick={() => setAttending(false)}
                    label="참석이 어려워요" color="#8b95a1" bg="#f2f4f6"
                  />
                </div>
              </RsvpSection>

              {/* 식사 인원 */}
              {attending === true && (
                <RsvpSection title="참석 인원 (식사 수)">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <CounterBtn onClick={() => setMealCount(c => Math.max(1, c - 1))} bg="#f2f4f6" color="#191f28">−</CounterBtn>
                    <span style={{ fontSize: 22, fontWeight: 700, color: '#191f28', minWidth: 32, textAlign: 'center' }}>
                      {mealCount}
                    </span>
                    <CounterBtn onClick={() => setMealCount(c => c + 1)} bg="#eaf4ff" color="#3182f6">+</CounterBtn>
                    <span style={{ fontSize: 13, color: '#8b95a1' }}>명</span>
                  </div>
                </RsvpSection>
              )}

              {/* 연락처 */}
              <RsvpSection title="연락처 (선택)">
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  maxLength={15}
                  style={{
                    width: '100%', height: 48, borderRadius: 12,
                    border: '1.5px solid #e5e8eb', padding: '0 16px',
                    fontSize: 15, color: '#191f28', outline: 'none',
                    boxSizing: 'border-box', fontFamily: FONT,
                  }}
                />
              </RsvpSection>

              {rsvpError && (
                <p style={{ fontSize: 13, color: '#ff4d4f', textAlign: 'center' }}>{rsvpError}</p>
              )}

              <button
                onClick={handleRsvpSubmit}
                disabled={submitting}
                style={{
                  height: 56, borderRadius: 16, border: 'none',
                  backgroundColor: submitting ? '#c9d1d9' : accentColor,
                  color: 'white', fontSize: 16, fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: FONT, transition: 'background-color 0.2s',
                }}
              >
                {submitting ? '전송 중...' : '참석 여부 전달하기'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 서브 컴포넌트들 ──────────────────────────────────────────────────

function RsvpSection({ title, children }) {
  return (
    <div style={{
      backgroundColor: 'white', borderRadius: 16,
      padding: '16px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#8b95a1', marginBottom: 10 }}>{title}</p>
      {children}
    </div>
  );
}

function SideBtn({ selected, onClick, label, accent }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, height: 52, borderRadius: 12,
      border: `2px solid ${selected ? accent : '#e5e8eb'}`,
      backgroundColor: selected ? `${accent}14` : '#f8f9fa',
      cursor: 'pointer', fontFamily: FONT,
      fontSize: 14, fontWeight: 700,
      color: selected ? accent : '#8b95a1',
      transition: 'all 0.15s',
    }}>
      {label}
    </button>
  );
}

function AttendBtn({ selected, onClick, label, color, bg }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, height: 68, borderRadius: 12,
      border: `2px solid ${selected ? color : '#e5e8eb'}`,
      backgroundColor: selected ? bg : '#f8f9fa',
      cursor: 'pointer', fontFamily: FONT,
      fontSize: 13, fontWeight: 700,
      color: selected ? color : '#8b95a1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s',
    }}>
      {label}
    </button>
  );
}

function CounterBtn({ onClick, bg, color, children }) {
  return (
    <button onClick={onClick} style={{
      width: 40, height: 40, borderRadius: 10,
      backgroundColor: bg, color, border: 'none',
      fontSize: 20, fontWeight: 700, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT,
    }}>
      {children}
    </button>
  );
}

const centered = {
  position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  fontFamily: FONT,
};
