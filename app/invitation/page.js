'use client';

import PageLoader from '@/components/PageLoader';
import { useCouple } from '@/lib/useCouple';
import BottomNav from '@/components/BottomNav';
import InvitationTab from '@/components/InvitationTab';

export default function InvitationPage() {
  const { coupleId, loading } = useCouple('couple_id');

  if (loading) return <PageLoader />;

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

      <BottomNav active="invitation" />
    </div>
  );
}
