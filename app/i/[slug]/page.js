'use client';

import { useState, useEffect, use } from 'react';
import { MapPin, Clock, Copy, Check, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function InvitationViewPage({ params }) {
  const { slug } = use(params);
  const [inv, setInv]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('invitations').select('*').eq('slug', slug).single();
      setInv(data || null);
      setLoading(false);

      // 조회수 증가
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

  if (loading) {
    return (
      <div style={centered('#fff')}>
        <Heart size={32} color="#e8b4b8" fill="#e8b4b8" style={{ animation: 'pulse 1.2s infinite' }} />
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    );
  }

  if (!inv) {
    return (
      <div style={centered('#fff')}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>💌</p>
        <p style={{ fontSize: 16, color: '#4e5968', fontWeight: 600 }}>청첩장을 찾을 수 없어요</p>
        <p style={{ fontSize: 13, color: '#b0b8c1', marginTop: 6 }}>링크를 다시 확인해주세요</p>
      </div>
    );
  }

  if (inv.template === 'classic') return <ClassicTemplate inv={inv} copied={copied} copyUrl={copyUrl} showAccount={showAccount} setShowAccount={setShowAccount} />;
  if (inv.template === 'floral')  return <FloralTemplate  inv={inv} copied={copied} copyUrl={copyUrl} showAccount={showAccount} setShowAccount={setShowAccount} />;
  return <MinimalTemplate inv={inv} copied={copied} copyUrl={copyUrl} showAccount={showAccount} setShowAccount={setShowAccount} />;
}

// ─── 날짜 포매터 ────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

// ─── 공통 하단 버튼 ──────────────────────────────────────────────────────────
function BottomActions({ inv, copied, copyUrl, showAccount, setShowAccount, accentColor = '#3182f6' }) {
  return (
    <div style={{ padding: '0 24px 48px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 지도 */}
      {inv.venue_map_url && (
        <a href={inv.venue_map_url} target="_blank" rel="noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            height: 52, borderRadius: 14, textDecoration: 'none', fontWeight: 700, fontSize: 15,
            backgroundColor: accentColor, color: 'white',
          }}>
          <MapPin size={18} />
          지도 보기
        </a>
      )}

      {/* 계좌번호 토글 */}
      {(inv.account_groom || inv.account_bride) && (
        <button
          onClick={() => setShowAccount(v => !v)}
          style={{
            height: 52, borderRadius: 14, border: `1.5px solid ${accentColor}`,
            backgroundColor: 'transparent', color: accentColor,
            fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}>
          💳 마음 전하기 {showAccount ? '▲' : '▼'}
        </button>
      )}

      {showAccount && (
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e8eb' }}>
          {inv.account_groom && (
            <AccountRow label="신랑측" value={inv.account_groom} />
          )}
          {inv.account_bride && (
            <AccountRow label="신부측" value={inv.account_bride} />
          )}
        </div>
      )}

      {/* 링크 복사 */}
      <button
        onClick={copyUrl}
        style={{
          height: 52, borderRadius: 14, border: '1px solid #e5e8eb',
          backgroundColor: '#f8f9fa', color: '#4e5968',
          fontWeight: 700, fontSize: 15, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
        {copied ? <Check size={18} color="#27b97c" /> : <Copy size={18} />}
        {copied ? '복사됐어요!' : '청첩장 링크 복사'}
      </button>
    </div>
  );
}

function AccountRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const number = value.replace(/[^0-9\-]/g, '').trim() || value;
    await navigator.clipboard.writeText(number);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f2f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white' }}>
      <div>
        <p style={{ fontSize: 11, color: '#8b95a1', margin: 0 }}>{label}</p>
        <p style={{ fontSize: 14, color: '#191f28', fontWeight: 600, margin: '2px 0 0' }}>{value}</p>
      </div>
      <button onClick={copy} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e8eb', backgroundColor: copied ? '#eafaf3' : '#f8f9fa', color: copied ? '#27b97c' : '#4e5968', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        {copied ? '복사됨' : '복사'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 1. 미니멀 템플릿
// ═══════════════════════════════════════════════════════════════════
function MinimalTemplate({ inv, copied, copyUrl, showAccount, setShowAccount }) {
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#ffffff', fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif", maxWidth: 430, margin: '0 auto' }}>
      {/* 상단 헤더 */}
      <div style={{ padding: '64px 32px 48px', textAlign: 'center', borderBottom: '1px solid #f2f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ height: 1, flex: 1, backgroundColor: '#e5e8eb' }} />
          <Heart size={16} color="#c9d1d9" fill="#c9d1d9" />
          <div style={{ height: 1, flex: 1, backgroundColor: '#e5e8eb' }} />
        </div>

        <p style={{ fontSize: 13, letterSpacing: '0.15em', color: '#8b95a1', marginBottom: 20, textTransform: 'uppercase' }}>
          Wedding Invitation
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#191f28', margin: 0 }}>{inv.groom_name || '신랑'}</p>
            <p style={{ fontSize: 12, color: '#8b95a1', margin: '4px 0 0' }}>신랑</p>
          </div>
          <p style={{ fontSize: 24, color: '#c9d1d9', margin: '0 4px' }}>&</p>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#191f28', margin: 0 }}>{inv.bride_name || '신부'}</p>
            <p style={{ fontSize: 12, color: '#8b95a1', margin: '4px 0 0' }}>신부</p>
          </div>
        </div>

        {inv.wedding_date && (
          <p style={{ fontSize: 15, color: '#4e5968', fontWeight: 500, margin: 0 }}>
            {formatDate(inv.wedding_date)}
          </p>
        )}
        {inv.wedding_time && (
          <p style={{ fontSize: 14, color: '#8b95a1', margin: '6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Clock size={13} /> {inv.wedding_time}
          </p>
        )}
      </div>

      {/* 메시지 */}
      {inv.message && (
        <div style={{ padding: '40px 32px', textAlign: 'center', borderBottom: '1px solid #f2f4f6' }}>
          <p style={{ fontSize: 15, lineHeight: 2, color: '#4e5968', whiteSpace: 'pre-line', margin: 0 }}>
            {inv.message}
          </p>
        </div>
      )}

      {/* 장소 */}
      {(inv.venue_name || inv.venue_address) && (
        <div style={{ padding: '32px', borderBottom: '1px solid #f2f4f6' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.1em', color: '#8b95a1', marginBottom: 12, textTransform: 'uppercase' }}>Location</p>
          {inv.venue_name && <p style={{ fontSize: 17, fontWeight: 700, color: '#191f28', margin: '0 0 6px' }}>{inv.venue_name}</p>}
          {inv.venue_address && (
            <p style={{ fontSize: 13, color: '#8b95a1', margin: 0, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
              <MapPin size={13} style={{ flexShrink: 0, marginTop: 2 }} /> {inv.venue_address}
            </p>
          )}
        </div>
      )}

      <BottomActions inv={inv} copied={copied} copyUrl={copyUrl} showAccount={showAccount} setShowAccount={setShowAccount} accentColor="#191f28" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2. 클래식 템플릿
// ═══════════════════════════════════════════════════════════════════
function ClassicTemplate({ inv, copied, copyUrl, showAccount, setShowAccount }) {
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#fdf8f0', fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif", maxWidth: 430, margin: '0 auto' }}>
      {/* 상단 장식 */}
      <div style={{ textAlign: 'center', padding: '56px 32px 40px' }}>
        <p style={{ fontSize: 28, letterSpacing: '0.08em', marginBottom: 8 }}>✦ ✦ ✦</p>
        <p style={{ fontSize: 11, letterSpacing: '0.2em', color: '#9a8068', marginBottom: 32, textTransform: 'uppercase' }}>
          Marriage Invitation
        </p>

        {/* 이름 */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 28, fontWeight: 700, color: '#3d2b1f', margin: '0 0 4px', letterSpacing: '0.05em' }}>
            {inv.groom_name || '신랑'} · {inv.bride_name || '신부'}
          </p>
          <div style={{ height: 1, backgroundColor: '#c9a882', margin: '16px 32px' }} />
        </div>

        {/* 날짜 */}
        {inv.wedding_date && (
          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 16, color: '#5c3d2e', fontWeight: 600, margin: 0 }}>
              {formatDate(inv.wedding_date)}
            </p>
          </div>
        )}
        {inv.wedding_time && (
          <p style={{ fontSize: 14, color: '#9a8068', margin: '6px 0 0' }}>{inv.wedding_time}</p>
        )}
      </div>

      {/* 메시지 */}
      {inv.message && (
        <div style={{ margin: '0 24px 24px', padding: '28px 24px', backgroundColor: 'rgba(201,168,130,0.12)', borderRadius: 16, textAlign: 'center', border: '1px solid rgba(201,168,130,0.3)' }}>
          <p style={{ fontSize: 15, lineHeight: 2, color: '#5c3d2e', whiteSpace: 'pre-line', margin: 0 }}>
            {inv.message}
          </p>
        </div>
      )}

      {/* 장소 */}
      {(inv.venue_name || inv.venue_address) && (
        <div style={{ margin: '0 24px 24px', padding: '24px', backgroundColor: 'white', borderRadius: 16, border: '1px solid #e8ddd0' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.15em', color: '#9a8068', marginBottom: 10, textTransform: 'uppercase' }}>예 식 장</p>
          {inv.venue_name && <p style={{ fontSize: 17, fontWeight: 700, color: '#3d2b1f', margin: '0 0 6px' }}>{inv.venue_name}</p>}
          {inv.venue_address && (
            <p style={{ fontSize: 13, color: '#9a8068', margin: 0 }}>
              {inv.venue_address}
            </p>
          )}
        </div>
      )}

      <BottomActions inv={inv} copied={copied} copyUrl={copyUrl} showAccount={showAccount} setShowAccount={setShowAccount} accentColor="#7a5c40" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 3. 플라워 템플릿
// ═══════════════════════════════════════════════════════════════════
function FloralTemplate({ inv, copied, copyUrl, showAccount, setShowAccount }) {
  return (
    <div style={{ minHeight: '100dvh', fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif", maxWidth: 430, margin: '0 auto',
      background: 'linear-gradient(160deg, #fff5f7 0%, #fff9f5 50%, #f5f0ff 100%)' }}>

      {/* 상단 플라워 장식 */}
      <div style={{ textAlign: 'center', padding: '56px 32px 32px' }}>
        <p style={{ fontSize: 40, marginBottom: 4, lineHeight: 1 }}>🌸</p>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: '#d4879a', marginBottom: 28, textTransform: 'uppercase' }}>
          With Love
        </p>

        {/* 이름 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14,
            backgroundColor: 'white', borderRadius: 99, padding: '12px 28px',
            boxShadow: '0 4px 20px rgba(212,135,154,0.15)', marginBottom: 20 }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#3d1a25', margin: 0 }}>{inv.groom_name || '신랑'}</p>
            <Heart size={14} color="#d4879a" fill="#d4879a" />
            <p style={{ fontSize: 20, fontWeight: 700, color: '#3d1a25', margin: 0 }}>{inv.bride_name || '신부'}</p>
          </div>
        </div>

        {/* 날짜 */}
        {inv.wedding_date && (
          <p style={{ fontSize: 15, color: '#6b3549', fontWeight: 600, margin: '0 0 6px' }}>
            {formatDate(inv.wedding_date)}
          </p>
        )}
        {inv.wedding_time && (
          <p style={{ fontSize: 14, color: '#d4879a', margin: 0 }}>{inv.wedding_time}</p>
        )}
      </div>

      {/* 메시지 */}
      {inv.message && (
        <div style={{ margin: '0 20px 20px', padding: '28px 24px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,240,245,0.9))',
          borderRadius: 20, textAlign: 'center',
          boxShadow: '0 2px 16px rgba(212,135,154,0.1)',
          border: '1px solid rgba(212,135,154,0.15)' }}>
          <p style={{ fontSize: 13, marginBottom: 12 }}>🌿 🌸 🌿</p>
          <p style={{ fontSize: 15, lineHeight: 2, color: '#6b3549', whiteSpace: 'pre-line', margin: 0 }}>
            {inv.message}
          </p>
        </div>
      )}

      {/* 장소 */}
      {(inv.venue_name || inv.venue_address) && (
        <div style={{ margin: '0 20px 20px', padding: '24px',
          backgroundColor: 'white', borderRadius: 20,
          boxShadow: '0 2px 16px rgba(212,135,154,0.1)',
          border: '1px solid rgba(212,135,154,0.15)' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.12em', color: '#d4879a', marginBottom: 10 }}>📍 예 식 장</p>
          {inv.venue_name && <p style={{ fontSize: 17, fontWeight: 700, color: '#3d1a25', margin: '0 0 6px' }}>{inv.venue_name}</p>}
          {inv.venue_address && <p style={{ fontSize: 13, color: '#9c7080', margin: 0 }}>{inv.venue_address}</p>}
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
        <p style={{ fontSize: 20 }}>🌸 🤍 🌸</p>
      </div>

      <BottomActions inv={inv} copied={copied} copyUrl={copyUrl} showAccount={showAccount} setShowAccount={setShowAccount} accentColor="#c4617a" />
    </div>
  );
}

// 헬퍼
const centered = (bg) => ({
  position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', backgroundColor: bg,
  fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif",
});
