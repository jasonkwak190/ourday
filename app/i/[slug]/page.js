'use client';

import { useState, useEffect, use } from 'react';
import { Heart, Check, X, Send, Minus, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { InvitationRenderer } from '@/components/InvitationTemplates';

const FONT = "'Pretendard Variable','Pretendard',-apple-system,sans-serif";
const SERIF_EN = "'Cormorant Garamond', serif";

// ── 오프닝 커버 ──────────────────────────────────────────────────────
function InvitationCover({ inv, onOpen }) {
  const [sliding, setSliding] = useState(false);

  function handleTap() {
    if (sliding) return;
    setSliding(true);
    setTimeout(onOpen, 650);
  }

  // 날짜 포매터 (커버용: YYYY. MM. DD)
  function coverDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()} · ${String(d.getMonth() + 1).padStart(2, '0')} · ${String(d.getDate()).padStart(2, '0')}`;
  }

  return (
    <div
      onClick={handleTap}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        backgroundColor: '#1A1613',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transform: sliding ? 'translateY(-100%)' : 'translateY(0)',
        transition: 'transform 0.65s cubic-bezier(0.76, 0, 0.24, 1)',
        userSelect: 'none',
      }}
    >
      {/* 내부 코너 프레임 */}
      <div style={{
        position: 'absolute', inset: 20,
        border: '1px solid rgba(201,169,110,0.25)',
        borderRadius: 4, pointerEvents: 'none',
      }} />

      {/* O·D 모노그램 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
        <span style={{ fontFamily: SERIF_EN, fontSize: 80, fontWeight: 500, color: '#FAF8F5', lineHeight: 1, letterSpacing: '-0.03em' }}>O</span>
        <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#C9A96E', flexShrink: 0 }} />
        <span style={{ fontFamily: SERIF_EN, fontSize: 80, fontWeight: 500, color: '#FAF8F5', lineHeight: 1, letterSpacing: '-0.03em' }}>D</span>
      </div>

      {/* 커플명 */}
      <p style={{ fontFamily: SERIF_EN, fontStyle: 'italic', fontSize: 20, color: '#C9A96E', letterSpacing: '0.06em', margin: '0 0 10px', textAlign: 'center' }}>
        {inv.groom_name || '신랑'} &amp; {inv.bride_name || '신부'}
      </p>

      {/* 날짜 */}
      {inv.wedding_date && (
        <p style={{ fontFamily: SERIF_EN, fontSize: 12, color: 'rgba(201,169,110,0.55)', letterSpacing: '0.12em', margin: 0 }}>
          {coverDate(inv.wedding_date)}
        </p>
      )}

      {/* 탭 힌트 */}
      <div style={{
        position: 'absolute', bottom: 40,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        animation: 'tap-hint 1.8s ease-in-out infinite',
      }}>
        {/* 위 방향 화살표 */}
        <svg width="28" height="18" viewBox="0 0 28 18" fill="none">
          <polyline points="2,16 14,4 26,16" stroke="#C9A96E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {/* 알약 버튼 형태 */}
        <div style={{
          backgroundColor: 'rgba(201,169,110,0.18)',
          border: '1.5px solid rgba(201,169,110,0.7)',
          borderRadius: 99,
          padding: '10px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <p style={{
            fontFamily: "'Noto Serif KR', serif", fontSize: 15, fontWeight: 500,
            color: '#C9A96E', letterSpacing: '0.04em', margin: 0,
          }}>
            눌러서 열기
          </p>
          <p style={{
            fontFamily: SERIF_EN, fontStyle: 'italic', fontSize: 11,
            color: 'rgba(201,169,110,0.7)', letterSpacing: '0.1em', margin: 0,
          }}>
            tap to open
          </p>
        </div>
      </div>

      <style>{`
        @keyframes tap-hint {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

// ── 신랑 SVG (수트 실루엣) ───────────────────────────────────────────
function GroomSvg({ selected, accent }) {
  const fill = selected ? accent : '#c9d1d9';
  return (
    <svg width="48" height="52" viewBox="0 0 48 52" fill="none">
      {/* 머리 */}
      <circle cx="24" cy="14" r="9" fill={fill} />
      {/* 수트 */}
      <path d="M8 52 C8 38 16 32 24 32 C32 32 40 38 40 52H8Z" fill={fill} />
      {/* 왼쪽 라펠 */}
      <path d="M24 32 L19 38 L22 44 L24 41Z" fill={selected ? 'white' : '#f2f4f6'} opacity="0.9" />
      {/* 오른쪽 라펠 */}
      <path d="M24 32 L29 38 L26 44 L24 41Z" fill={selected ? 'white' : '#f2f4f6'} opacity="0.9" />
      {/* 넥타이 */}
      <path d="M23 32 L21.5 37 L24 40.5 L26.5 37 L25 32Z" fill={selected ? accent : '#b0b8c1'} opacity="0.7" />
    </svg>
  );
}

// ── 신부 SVG (드레스 실루엣) ─────────────────────────────────────────
function BrideSvg({ selected, accent }) {
  const fill = selected ? accent : '#c9d1d9';
  return (
    <svg width="48" height="52" viewBox="0 0 48 52" fill="none">
      {/* 베일 */}
      <path d="M15 12 Q24 4 33 12 L33 22 Q24 18 15 22Z" fill={fill} opacity="0.5" />
      {/* 머리 */}
      <circle cx="24" cy="14" r="9" fill={fill} />
      {/* 드레스 (A라인) */}
      <path d="M17 32 L8 52 H40 L31 32 Q27 36 24 36 Q21 36 17 32Z" fill={fill} />
      {/* 웨이스트 */}
      <rect x="18" y="30" width="12" height="5" rx="2" fill={fill} />
      {/* 드레스 하이라이트 */}
      <path d="M20 38 L14 52 H22 L26 38Z" fill={selected ? 'white' : '#f2f4f6'} opacity="0.2" />
    </svg>
  );
}

// ── 날짜 포매터 ──────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function InvitationViewPage({ params }) {
  const { slug } = use(params);

  const [inv,         setInv]         = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [copied,      setCopied]      = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [coverOpen,   setCoverOpen]   = useState(false); // 오프닝 애니메이션 완료 여부

  // ── 통합 폼 상태 ─────────────────────────────────────────────────
  const [name,      setName]      = useState('');
  const [side,      setSide]      = useState(null);   // 'groom' | 'bride'
  const [attending, setAttending] = useState(null);   // true | false
  const [mealCount, setMealCount] = useState(1);
  const [phone,     setPhone]     = useState('');
  const [message,   setMessage]   = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState('');

  // ── 방명록 목록 ──────────────────────────────────────────────────
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('invitations').select('*').eq('slug', slug).single();
      setInv(data || null);
      setLoading(false);

      if (data) {
        await supabase.rpc('increment_view_count', { invitation_slug: slug });

        // 방명록 목록 로드
        const res = await fetch(`/api/guestbook?invitation_id=${data.id}`);
        if (res.ok) {
          const json = await res.json();
          setEntries(json.data || []);
        }
      }
    };
    load();
  }, [slug]);

  async function copyUrl() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit() {
    setError('');
    if (!name.trim())      { setError('성함을 입력해주세요.'); return; }
    if (!side)             { setError('신랑측/신부측을 선택해주세요.'); return; }
    if (attending === null) { setError('참석 여부를 선택해주세요.'); return; }

    setSubmitting(true);

    // 1. RSVP 제출 (필수)
    const rsvpRes = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couple_id:  inv.couple_id,
        name:       name.trim(),
        side,
        attending,
        meal_count: attending ? mealCount : 0,
        phone:      phone.trim() || null,
      }),
    });

    // 2. 방명록 제출 (메시지 있을 때만)
    let newEntry = null;
    if (message.trim() && inv.id) {
      const gbRes = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitation_id: inv.id,
          name:          name.trim(),
          message:       message.trim(),
        }),
      });
      if (gbRes.ok) {
        const gbJson = await gbRes.json();
        newEntry = gbJson.data;
      }
    }

    setSubmitting(false);

    if (!rsvpRes.ok) {
      setError('전송에 실패했어요. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (newEntry) setEntries(prev => [newEntry, ...prev]);
    setDone(true);
  }

  // ── 로딩 / 없음 ──────────────────────────────────────────────────
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
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 500, color: '#1a1613', letterSpacing: '-0.04em', lineHeight: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>O</span>
          <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#c9a96e', display: 'inline-block', marginBottom: 4 }} />
          <span>D</span>
        </div>
        <p style={{ fontFamily: "'Noto Serif KR', serif", fontSize: 15, color: '#1a1613', fontWeight: 500, marginTop: 16 }}>청첩장을 찾을 수 없어요</p>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 12, color: '#b0935a', marginTop: 6 }}>링크를 다시 확인해주세요</p>
      </div>
    );
  }

  const groomName   = inv.groom_name || '신랑';
  const brideName   = inv.bride_name || '신부';
  const accentColor = inv.template === 'classic'   ? '#7a5c40'
                    : inv.template === 'floral'    ? '#c4617a'
                    : inv.template === 'editorial' ? '#C9A96E'
                    : '#3182f6';
  const sectionBg   = inv.template === 'classic'   ? '#fdf8f0'
                    : inv.template === 'floral'    ? '#fff8fa'
                    : inv.template === 'editorial' ? '#FAF8F5'
                    : '#f8f9fa';

  return (
    <div style={{ fontFamily: FONT, backgroundColor: sectionBg }}>

      {/* ── 오프닝 커버 ── */}
      {!coverOpen && (
        <InvitationCover inv={inv} onOpen={() => setCoverOpen(true)} />
      )}

      {/* ── 청첩장 템플릿 ── */}
      <InvitationRenderer
        inv={inv}
        copied={copied}
        copyUrl={copyUrl}
        showAccount={showAccount}
        setShowAccount={setShowAccount}
      />

      {/* ── 통합 참여 폼 ── */}
      {inv.couple_id && (
        <div style={{
          maxWidth: 430,
          margin: '0 auto',
          padding: '0 20px 64px',
          backgroundColor: sectionBg,
        }}>

          {/* 구분선 */}
          <Divider label="참여하기" />

          {done ? (
            /* ── 완료 화면 ── */
            <div style={{
              backgroundColor: 'white', borderRadius: 20,
              padding: '36px 24px', textAlign: 'center',
              boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            }}>
              <div style={{
                width: 68, height: 68, borderRadius: '50%', margin: '0 auto 20px',
                backgroundColor: attending ? '#eaf4ff' : '#f2f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {attending
                  ? <Check size={32} color="#3182f6" strokeWidth={2.5} />
                  : <X     size={28} color="#8b95a1" strokeWidth={2.5} />
                }
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#191f28', marginBottom: 10 }}>
                {attending ? '참석 확인 완료!' : '답변이 전달됐어요'}
              </p>
              <p style={{ fontSize: 14, color: '#8b95a1', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                {attending
                  ? `${name}님의 참석을 기다릴게요.\n소중한 자리에 함께해주셔서 감사해요.`
                  : `${name}님의 답변을 잘 받았어요.\n다음에 좋은 자리에서 뵙겠습니다.`
                }
              </p>
            </div>

          ) : (
            /* ── 폼 ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* 1. 이름 */}
              <FormCard>
                <FieldLabel required>성함</FieldLabel>
                <input
                  type="text"
                  placeholder="홍길동"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={20}
                  style={inputStyle}
                />
              </FormCard>

              {/* 2. 신랑측 / 신부측 */}
              <FormCard>
                <FieldLabel required>어느 분 하객이세요?</FieldLabel>
                <div style={{ display: 'flex', gap: 10 }}>

                  {/* 신랑측 */}
                  <button
                    onClick={() => setSide('groom')}
                    style={{
                      flex: 1, padding: '18px 8px 14px',
                      borderRadius: 14,
                      border: `2px solid ${side === 'groom' ? accentColor : '#e5e8eb'}`,
                      backgroundColor: side === 'groom' ? `${accentColor}12` : '#f8f9fa',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 8, fontFamily: FONT,
                      transition: 'all 0.15s',
                    }}
                  >
                    <GroomSvg selected={side === 'groom'} accent={accentColor} />
                    <span style={{
                      fontSize: 15, fontWeight: 700,
                      color: '#191f28',
                    }}>
                      {groomName}측
                    </span>
                  </button>

                  {/* 신부측 */}
                  <button
                    onClick={() => setSide('bride')}
                    style={{
                      flex: 1, padding: '18px 8px 14px',
                      borderRadius: 14,
                      border: `2px solid ${side === 'bride' ? accentColor : '#e5e8eb'}`,
                      backgroundColor: side === 'bride' ? `${accentColor}12` : '#f8f9fa',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 8, fontFamily: FONT,
                      transition: 'all 0.15s',
                    }}
                  >
                    <BrideSvg selected={side === 'bride'} accent={accentColor} />
                    <span style={{
                      fontSize: 15, fontWeight: 700,
                      color: '#191f28',
                    }}>
                      {brideName}측
                    </span>
                  </button>
                </div>
              </FormCard>

              {/* 3. 참석 여부 */}
              <FormCard>
                <FieldLabel required>참석 여부</FieldLabel>
                <div style={{ display: 'flex', gap: 10 }}>

                  {/* 참석 */}
                  <button
                    onClick={() => setAttending(true)}
                    style={{
                      flex: 1, padding: '16px 8px',
                      borderRadius: 14,
                      border: `2px solid ${attending === true ? '#3182f6' : '#e5e8eb'}`,
                      backgroundColor: attending === true ? '#eaf4ff' : '#f8f9fa',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 8, fontFamily: FONT,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      backgroundColor: attending === true ? '#3182f6' : '#e5e8eb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background-color 0.15s',
                    }}>
                      <Check size={18} color="white" strokeWidth={2.5} />
                    </div>
                    <span style={{
                      fontSize: 15, fontWeight: 700,
                      color: '#191f28',
                    }}>
                      참석할게요
                    </span>
                  </button>

                  {/* 불참 */}
                  <button
                    onClick={() => setAttending(false)}
                    style={{
                      flex: 1, padding: '16px 8px',
                      borderRadius: 14,
                      border: `2px solid ${attending === false ? '#8b95a1' : '#e5e8eb'}`,
                      backgroundColor: attending === false ? '#f2f4f6' : '#f8f9fa',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 8, fontFamily: FONT,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      backgroundColor: attending === false ? '#8b95a1' : '#e5e8eb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background-color 0.15s',
                    }}>
                      <X size={18} color="white" strokeWidth={2.5} />
                    </div>
                    <span style={{
                      fontSize: 15, fontWeight: 700,
                      color: '#191f28',
                    }}>
                      참석이 어려워요
                    </span>
                  </button>
                </div>
              </FormCard>

              {/* 4. 참석 인원 (참석 시에만) */}
              {attending === true && (
                <FormCard>
                  <FieldLabel>참석 인원 (식사 수)</FieldLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button
                      onClick={() => setMealCount(c => Math.max(1, c - 1))}
                      style={counterBtnStyle('#f2f4f6', '#191f28')}
                    >
                      <Minus size={16} strokeWidth={2.5} />
                    </button>
                    <span style={{ fontSize: 22, fontWeight: 700, color: '#191f28', minWidth: 36, textAlign: 'center' }}>
                      {mealCount}
                    </span>
                    <button
                      onClick={() => setMealCount(c => c + 1)}
                      style={counterBtnStyle('#eaf4ff', '#3182f6')}
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                    <span style={{ fontSize: 13, color: '#8b95a1' }}>명</span>
                  </div>
                </FormCard>
              )}

              {/* 5. 연락처 */}
              <FormCard>
                <FieldLabel optional>연락처</FieldLabel>
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  maxLength={15}
                  style={inputStyle}
                />
              </FormCard>

              {/* 6. 축하 메시지 */}
              <FormCard>
                <FieldLabel optional>축하 메시지</FieldLabel>
                <div style={{ position: 'relative' }}>
                  <textarea
                    placeholder="신랑신부에게 따뜻한 축하 메시지를 남겨주세요"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    maxLength={200}
                    rows={3}
                    style={{
                      width: '100%', borderRadius: 10,
                      border: '1.5px solid #e5e8eb', padding: '12px 14px',
                      fontSize: 14, color: '#191f28', outline: 'none',
                      resize: 'none', lineHeight: 1.6, boxSizing: 'border-box',
                      fontFamily: FONT, backgroundColor: '#f8f9fa',
                    }}
                  />
                  <p style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 11, color: '#c9d1d9', margin: 0 }}>
                    {message.length}/200
                  </p>
                </div>
              </FormCard>

              {/* 에러 */}
              {error && (
                <p style={{ fontSize: 13, color: '#ff4d4f', textAlign: 'center', padding: '0 4px', margin: 0 }}>
                  {error}
                </p>
              )}

              {/* 제출 버튼 */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  height: 56, borderRadius: 28, border: 'none',
                  backgroundColor: submitting ? '#c9d1d9' : 'var(--ink, #1a1613)',
                  color: 'var(--ivory, #faf8f5)', fontSize: 15, fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: FONT, transition: 'background-color 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginTop: 4, letterSpacing: '0.02em',
                }}
              >
                <Send size={15} />
                {submitting ? '전송 중...' : '참석 여부 전달하기'}
              </button>
            </div>
          )}

          {/* ── 방명록 목록 ── */}
          {entries.length > 0 && (
            <div style={{ marginTop: 36 }}>
              <Divider label={`축하 메시지 ${entries.length}개`} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {entries.map(entry => (
                  <div key={entry.id} style={{
                    backgroundColor: 'var(--paper, #f5f0e8)', borderRadius: 10,
                    padding: '14px 16px', border: '1px solid var(--rule, #e8e2d9)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 15, color: '#191f28', margin: 0 }}>
                        {entry.name}
                      </p>
                      <p style={{ fontFamily: FONT, fontSize: 12, color: '#8b95a1', margin: 0 }}>
                        {timeAgo(entry.created_at)}
                      </p>
                    </div>
                    <p style={{ fontFamily: FONT, fontSize: 14, color: '#4e5968', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {entry.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 공통 UI 컴포넌트 ────────────────────────────────────────────────

function FormCard({ children }) {
  return (
    <div style={{
      backgroundColor: 'white', borderRadius: 16,
      padding: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
    }}>
      {children}
    </div>
  );
}

function FieldLabel({ children, required, optional }) {
  return (
    <p style={{
      fontFamily: FONT, fontStyle: 'normal',
      fontSize: 15, fontWeight: 700, color: '#191f28',
      marginBottom: 10, margin: '0 0 10px',
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      {children}
      {required && <span style={{ color: '#ff4d4f', fontSize: 13, lineHeight: 1 }}>*</span>}
      {optional && <span style={{ color: '#b0b8c1', fontSize: 12, fontWeight: 400 }}>(선택)</span>}
    </p>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 20px' }}>
      <div style={{ flex: 1, height: 1, backgroundColor: '#e5e8eb' }} />
      <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#191f28', letterSpacing: '0.02em', margin: 0, whiteSpace: 'nowrap' }}>{label}</p>
      <div style={{ flex: 1, height: 1, backgroundColor: '#e5e8eb' }} />
    </div>
  );
}

const inputStyle = {
  width: '100%', height: 48, borderRadius: 10,
  border: '1.5px solid #e5e8eb', padding: '0 14px',
  fontSize: 15, color: '#191f28', outline: 'none',
  boxSizing: 'border-box', fontFamily: FONT, backgroundColor: '#f8f9fa',
};

const counterBtnStyle = (bg, color) => ({
  width: 40, height: 40, borderRadius: 10,
  backgroundColor: bg, color, border: 'none',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: FONT,
});

const centered = {
  position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  fontFamily: FONT,
};
