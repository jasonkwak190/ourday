import { redirect } from 'next/navigation';

// 갤러리는 하객 관리 탭으로 통합됨
export default function GalleryRedirect() {
  redirect('/guests');
}
