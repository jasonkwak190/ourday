// Google Play 정책: 계정 보유 앱은 앱 없이 접근 가능한 공개 계정 삭제
// 안내 URL을 Play Console에 등록해야 합니다.

export const metadata = {
  title: '계정 삭제 안내 · Ourday',
  description: '계정 및 데이터 삭제 방법을 안내합니다.',
};

export default function AccountDeletionPage() {
  return (
    <main className="page-wrapper">
      <header className="mb-6">
        <h1 style={{ fontFamily: 'var(--font-serif-ko)', fontWeight: 500, fontSize: 22, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>
          계정 및 데이터 삭제 안내
        </h1>
        <p style={{ fontFamily: 'var(--font-serif-en)', fontStyle: 'italic', fontSize: 12, color: 'var(--champagne-2)', margin: '4px 0 0', letterSpacing: '0.04em' }}>
          account &amp; data deletion
        </p>
      </header>

      <section className="card mb-4" style={{ padding: '20px 18px' }}>
        <h2 className="mb-2" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>1) 앱에서 직접 삭제 (권장)</h2>
        <ol className="text-sm" style={{ color: 'var(--ink-2)', lineHeight: 1.8, paddingLeft: 20 }}>
          <li>Ourday 앱 실행 후 로그인</li>
          <li>하단 메뉴 → <strong>더보기 → 설정</strong></li>
          <li>화면 하단의 <strong>계정 삭제</strong> 버튼 탭</li>
          <li>확인 절차 진행 → 즉시 처리</li>
        </ol>
      </section>

      <section className="card mb-4" style={{ padding: '20px 18px' }}>
        <h2 className="mb-2" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>2) 앱을 사용할 수 없는 경우 (이메일 요청)</h2>
        <p className="text-sm mb-2" style={{ color: 'var(--ink-2)', lineHeight: 1.7 }}>
          기기 분실, 계정 접근 불가, 기타 사유로 앱에서 직접 삭제할 수 없으면 아래 이메일로 요청해주세요.
        </p>
        <p className="text-sm" style={{ color: 'var(--ink)' }}>
          담당자 이메일: <a href="mailto:jasonkwak201@gmail.com" style={{ color: 'var(--champagne-2)', textDecoration: 'underline' }}>jasonkwak201@gmail.com</a>
        </p>
        <p className="text-xs mt-3" style={{ color: 'var(--ink-3)' }}>
          요청 시 가입 이메일·이름을 함께 보내주시면 본인 확인 후 즉시 처리합니다.
          본인 확인 자료(가입 시 사용한 이메일에서 발송)가 없는 경우 처리가 지연될 수 있습니다.
        </p>
      </section>

      <section className="card mb-4" style={{ padding: '20px 18px' }}>
        <h2 className="mb-2" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>삭제 대상 데이터</h2>
        <ul className="text-sm" style={{ color: 'var(--ink-2)', lineHeight: 1.8, paddingLeft: 20 }}>
          <li>가입 정보 (이메일·이름·OAuth 식별자)</li>
          <li>체크리스트·예산·업체·의사결정 데이터</li>
          <li>하객 명단·축의금·RSVP 응답</li>
          <li>모바일 청첩장·방명록</li>
          <li>커플 메모(우리 노트)·첨부 사진</li>
          <li>하객 사진(QR 업로드)·갤러리</li>
        </ul>
        <p className="text-xs mt-3" style={{ color: 'var(--ink-3)' }}>
          파트너가 같은 커플 계정으로 연결된 경우, 본인 계정만 분리(detach)되며 파트너의 데이터는
          파트너 동의 없이 삭제되지 않습니다. 파트너도 별도 요청 시 동일하게 삭제됩니다.
        </p>
      </section>

      <section className="card mb-4" style={{ padding: '20px 18px' }}>
        <h2 className="mb-2" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>처리 기간</h2>
        <p className="text-sm" style={{ color: 'var(--ink-2)', lineHeight: 1.7 }}>
          앱 내 삭제: 즉시 (수 초 이내).<br />
          이메일 요청: 영업일 기준 5일 이내 처리.
        </p>
      </section>

      <section className="card" style={{ padding: '20px 18px' }}>
        <h2 className="mb-2" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>관련 안내</h2>
        <p className="text-sm" style={{ color: 'var(--ink-2)', lineHeight: 1.7 }}>
          자세한 처리 방침은 <a href="/privacy" style={{ color: 'var(--champagne-2)', textDecoration: 'underline' }}>개인정보처리방침</a>을 참고해주세요.
        </p>
      </section>
    </main>
  );
}
