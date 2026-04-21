import { redirect } from 'next/navigation';

// 업체 관리는 예산·업체 페이지로 통합됨
export default function VendorsRedirect() {
  redirect('/budget');
}
