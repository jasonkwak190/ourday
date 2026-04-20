'use client';

import { useState, useEffect, use } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { InvitationRenderer } from '@/components/InvitationTemplates';

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

  return (
    <InvitationRenderer
      inv={inv}
      copied={copied}
      copyUrl={copyUrl}
      showAccount={showAccount}
      setShowAccount={setShowAccount}
    />
  );
}

const centered = (bg) => ({
  position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', backgroundColor: bg,
  fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif",
});
