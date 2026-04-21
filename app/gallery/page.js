'use client';
import BottomNav from '@/components/BottomNav';
import GalleryTab from '@/components/GalleryTab';

export default function GalleryPage() {
  return (
    <div className="page-wrapper">
      <h1 className="text-xl font-semibold mb-4" style={{ color: 'var(--toss-text-primary)' }}>
        📷 웨딩 사진
      </h1>
      <GalleryTab />
      <BottomNav active="gallery" />
    </div>
  );
}
