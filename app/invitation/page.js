import { redirect } from 'next/navigation';

// 모바일 청첩장은 하객 페이지 내 탭으로 통합됨
export default function InvitationRedirect() {
  redirect('/guests');
}
