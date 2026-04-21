'use client';

import { useState, useEffect, use } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { InvitationRenderer } from '@/components/InvitationTemplates';

const FONT = "'Pretendard Variable','Pretendard',-apple-system,sans-serif";

export default function InvitationViewPage({ params }) {
  const { slug } = use(params);
  const [inv,         setInv]         = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [copied,      setCopied]      = useState(false);
  const [showAccount, setShowAccount] = useState(false);

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
        <p style={{ fontSize: 32, marginBottom: 12 }}>💌</p>
        <p style={{ fontSize: 16, color: '#4e5968', fontWeight: 600 }}>청첩장을 찾을 수 없어요</p>
        <p style={{ fontSize: 13, color: '#b0b8c1', marginTop: 6 }}>링크를 다시 확인해주세요</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT }}>
      <InvitationRenderer
        inv={inv}
        copied={copied}
        copyUrl={copyUrl}
        showAccount={showAccount}
        setShowAccount={setShowAccount}
      />

      {/* 참석 여부 전달 CTA */}
      {inv.couple_id && (
        <div style={{
          maxWidth: 430, margin: '0 auto',
          padding: '0 20px 48px',
          backgroundColor: '#f8f9fa',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 24,
            padding: '24px 20px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 20, marginBottom: 8 }}>💌</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#191f28', marginBottom: 4 }}>
              참석 여부를 알려주세요
            </p>
            <p style={{ fontSize: 13, color: '#8b95a1', marginBottom: 20, lineHeight: 1.6 }}>
              신랑신부가 자리를 미리 준비할 수 있도록<br />참석 여부를 남겨주세요 🙏
            </p>
            <a
              href={`/rsvp/${inv.couple_id}`}
              style={{
                display: 'block',
                height: 52, borderRadius: 16,
                backgroundColor: '#6b3549',
                color: 'white', textDecoration: 'none',
                fontSize: 15, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              🎉 참석 여부 전달하기
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

const centered = {
  position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  fontFamily: FONT,
};
