'use client';
import BottomNav from '@/components/BottomNav';
import GalleryTab from '@/components/GalleryTab';
import Icon from '@/components/Icon';

export default function GalleryPage() {
  return (
    <div className="page-wrapper">
      <h1 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--toss-text-primary)' }}>
        <Icon name="camera" size={22} color="var(--ink)" />
        웨딩 사진
      </h1>
      <GalleryTab />
      <BottomNav active="gallery" />
    </div>
  );
}
