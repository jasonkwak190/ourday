import PageLoader from '@/components/PageLoader';

export default function Loading() {
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--ivory)' }}>
      <PageLoader />
    </div>
  );
}
