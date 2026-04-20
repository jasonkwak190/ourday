import { redirect } from 'next/navigation';

// 캘린더는 타임라인에 통합됨
export default function CalendarRedirect() {
  redirect('/timeline');
}
