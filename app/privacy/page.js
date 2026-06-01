import Link from 'next/link';

export const metadata = {
  title: '개인정보처리방침 | 우리의 날',
};

const EFFECTIVE_DATE = '2025년 1월 1일';
const UPDATED_DATE   = '2026년 5월 11일';
const SERVICE_NAME   = '우리의 날 (Ourday)';
const CONTACT_EMAIL  = 'jasonkwak201@gmail.com';
// TODO: Supabase Dashboard → Settings → Infrastructure 에서 실제 리전 확인 후 정정
// 현재 표기는 us-east-1로 두지만, 프로젝트 ID(eapmagibtipjbagitqmf) 기준으로 ap-northeast-1(도쿄)일 수도 있음
const SUPABASE_REGION = '미국 (AWS us-east-1 리전)';

export default function PrivacyPage() {
  return (
    <div style={{
      maxWidth: 680, margin: '0 auto', padding: '40px 20px 80px',
      fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif",
      color: 'var(--ink)', lineHeight: 1.8,
    }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 40 }}>
        <Link href="/" style={{ fontSize: 13, color: 'var(--champagne)', textDecoration: 'none', fontWeight: 600 }}>
          ← 우리의 날
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 20, marginBottom: 8 }}>
          개인정보처리방침
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>
          시행일: {EFFECTIVE_DATE} &nbsp;|&nbsp; 최종 수정: {UPDATED_DATE}
        </p>
      </div>

      <Section title="1. 개인정보처리방침 개요">
        <p>
          {SERVICE_NAME}(이하 "서비스")는 이용자의 개인정보를 중요하게 생각하며,
          「개인정보 보호법」 및 관련 법령을 준수합니다. 본 방침은 서비스가 어떤 개인정보를
          수집하고, 어떻게 이용·보관·파기하는지 안내합니다.
        </p>
      </Section>

      <Section title="2. 수집하는 개인정보 항목 및 수집 방법">
        <p style={{ marginBottom: 10, fontSize: 13, color: 'var(--ink-3)' }}>
          만 14세 이상만 회원으로 가입할 수 있으며, 가입 시 본인이 만 14세 이상임을 확인합니다(개인정보 보호법 제22조의2).
        </p>

        <SubTitle>① 서비스 회원 (신랑·신부)</SubTitle>
        <Table rows={[
          ['수집 항목', '이메일 주소, 이름, 역할(신랑/신부)'],
          ['소셜 로그인 시 추가', 'Google/카카오 계정 식별자(고유 ID), 프로필 이름'],
          ['수집 방법', '회원가입 시 직접 입력 또는 소셜 로그인 연동'],
          ['수집 목적', '본인 확인, 서비스 제공, 커플 연동'],
        ]} />

        <SubTitle>② 결혼식 정보 (커플이 직접 등록)</SubTitle>
        <Table rows={[
          ['항목', '결혼식 날짜·시간, 예식장 명·주소·좌표, 양가 부모 성함, 청첩장 문구, 입금 계좌(선택), 커버 사진'],
          ['수집 방법', '커플 본인이 직접 입력 또는 사진 업로드'],
          ['수집 목적', '청첩장 제작·공유, 일정 관리, 예식장 위치 안내'],
        ]} />

        <SubTitle>③ 하객 명단 (커플이 직접 등록)</SubTitle>
        <Table rows={[
          ['항목', '하객 이름, 연락처, 축의금 금액, 소속(신랑측·신부측), 메모'],
          ['수집 방법', '커플 본인이 직접 입력'],
          ['수집 목적', '하객 관리, 축의금 기록'],
        ]} />

        <SubTitle>④ 참석 여부(RSVP) 작성자 (하객)</SubTitle>
        <Table rows={[
          ['필수 항목', '이름, 신랑측·신부측 구분, 참석 여부, 식사 인원'],
          ['선택 항목', '연락처(휴대폰 번호)'],
          ['수집 방법', 'RSVP 페이지에서 직접 입력'],
          ['수집 목적', '참석 인원 파악, 좌석 배치'],
        ]} />

        <SubTitle>⑤ 청첩장 방명록 (하객이 직접 등록)</SubTitle>
        <Table rows={[
          ['항목', '이름, 메시지'],
          ['수집 방법', '청첩장 공개 페이지에서 직접 입력'],
          ['수집 목적', '방명록 보관 및 표시'],
        ]} />

        <SubTitle>⑥ 우리 노트 / 첨부 사진 / 하객 사진</SubTitle>
        <Table rows={[
          ['항목', '커플이 작성한 메모, 첨부 이미지, 하객 QR 업로드 사진'],
          ['수집 방법', '커플 또는 하객이 앱에 직접 입력·업로드'],
          ['수집 목적', '커플 간 정보 공유, 결혼식 사진 보관'],
        ]} />

        <SubTitle>⑦ 자동 수집</SubTitle>
        <Table rows={[
          ['항목', '로그인 세션 쿠키, 오류 발생 시 진단용 스택 트레이스(개인정보 제외)'],
          ['수집 방법', '서비스 이용 중 자동 수집'],
          ['수집 목적', '로그인 유지, 오류 모니터링·개선'],
        ]} />
      </Section>

      <Section title="3. 개인정보 보유 및 이용 기간">
        <Table rows={[
          ['회원 정보', '회원 탈퇴 시까지 보유 후 즉시 파기 (파트너가 같은 커플로 연결된 경우 본인 정보만 분리)'],
          ['결혼식 정보 / 청첩장 / 하객 명단 / 우리 노트 / 사진', '예식일로부터 1년 또는 커플 계정 삭제 시 파기'],
          ['RSVP / 방명록', '예식일로부터 1년 또는 커플 계정 삭제 시 파기'],
          ['업로드 사진 파일 (Storage)', '예식일로부터 1년 또는 커플 계정 삭제 시 함께 삭제'],
          ['법령 의무 보존', '전자상거래법 등 관련 법령에 따라 일부 항목 별도 보존'],
        ]} />
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-3)' }}>
          자동 파기는 매일 새벽 정기적으로 수행되며, 보유 기간 종료 후 5일 이내에 처리됩니다.
        </p>
      </Section>

      <Section title="4. 개인정보의 제3자 제공">
        <p>
          서비스는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
          단, 다음의 경우는 예외입니다.
        </p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>이용자가 사전에 동의한 경우</li>
          <li>법령에 따라 수사기관 등이 적법한 절차로 요청하는 경우</li>
        </ul>
        <p style={{ marginTop: 12, padding: '12px 16px', backgroundColor: 'var(--ivory-2)', borderRadius: 12, fontSize: 14 }}>
          <strong>커플 간 공유</strong>는 제3자 제공이 아닌 서비스의 핵심 기능으로,
          연동된 파트너에게 타임라인·예산·의사결정 등 서비스 이용 데이터가 공유됩니다.
          회원가입 시 이에 동의하는 것으로 간주합니다.
        </p>
      </Section>

      <Section title="5. 개인정보 처리 위탁">
        <p>서비스는 원활한 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>

        <SubTitle>① Supabase, Inc. (데이터베이스·인증·파일 저장소)</SubTitle>
        <Table rows={[
          ['위탁 내용', '회원 인증, 데이터베이스 운영, 사진 파일 저장(Storage)'],
          ['위탁 기간', '서비스 이용 계약 기간 동안'],
          ['소재지', SUPABASE_REGION],
          ['보호 조치', 'SOC 2 Type II, TLS 암호화 전송, 저장 시 암호화'],
        ]} />

        <SubTitle>② Vercel, Inc. (앱 호스팅·CDN)</SubTitle>
        <Table rows={[
          ['위탁 내용', '웹·앱 호스팅, 정적 자원 전송(CDN), 로그 처리'],
          ['위탁 기간', '서비스 이용 계약 기간 동안'],
          ['소재지', '미국'],
        ]} />

        <SubTitle>③ Sentry (Functional Software, Inc.) — 오류 모니터링</SubTitle>
        <Table rows={[
          ['위탁 내용', '오류·진단 정보 수집(스택 트레이스), 안정성 개선'],
          ['위탁 기간', '서비스 이용 계약 기간 동안'],
          ['소재지', '미국'],
          ['비고', '개인정보가 포함되지 않도록 IP 미수집(sendDefaultPii: false)'],
        ]} />

        <SubTitle>④ Google LLC — 소셜 로그인</SubTitle>
        <Table rows={[
          ['위탁 내용', 'Google 계정으로 회원가입·로그인 인증'],
          ['수집 항목', 'Google 계정 고유 식별자, 프로필 이름, 이메일'],
          ['소재지', '미국'],
          ['선택성', '사용자가 Google 로그인 선택 시에만 적용'],
        ]} />

        <SubTitle>⑤ Kakao Corp — 소셜 로그인</SubTitle>
        <Table rows={[
          ['위탁 내용', '카카오 계정으로 회원가입·로그인 인증'],
          ['수집 항목', '카카오 계정 고유 식별자, 프로필 이름, 이메일'],
          ['소재지', '대한민국'],
          ['선택성', '사용자가 카카오 로그인 선택 시에만 적용'],
        ]} />

        <p style={{ marginTop: 12, fontSize: 14, color: 'var(--ink-2)' }}>
          위탁업체 각사의 개인정보처리방침: {' '}
          <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--champagne)' }}>Supabase</a> ·{' '}
          <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--champagne)' }}>Vercel</a> ·{' '}
          <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--champagne)' }}>Sentry</a> ·{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--champagne)' }}>Google</a> ·{' '}
          <a href="https://www.kakao.com/policy/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--champagne)' }}>Kakao</a>
        </p>
      </Section>

      <Section title="6. 국외 이전">
        <p>
          서비스 제공을 위해 일부 개인정보가 국외에 보관·처리됩니다.
          이용자는 회원가입 시 이 사실에 동의하는 것으로 간주합니다.
        </p>
        <Table rows={[
          ['이전 국가', '미국 (Supabase·Vercel·Sentry·Google), 대한민국(Kakao)'],
          ['이전 항목', '5조 위탁업체별 수집 항목 참조'],
          ['이전 시점·방법', '서비스 이용 중 TLS 암호화 통신으로 실시간 전송'],
          ['보호 조치', 'SOC 2 Type II(Supabase), 암호화 전송·저장, IP 미수집(Sentry)'],
        ]} />
      </Section>

      <Section title="7. 정보주체의 권리·의무">
        <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li><strong>열람 요구</strong>: 보유 중인 본인 개인정보 확인</li>
          <li><strong>정정·삭제 요구</strong>: 잘못된 정보 수정 또는 삭제 요청</li>
          <li><strong>처리 정지 요구</strong>: 특정 목적의 처리 중단 요청</li>
          <li><strong>동의 철회 / 계정 삭제</strong>: 앱 내 설정 → 계정 삭제, 또는{' '}
            <Link href="/account-deletion" style={{ color: 'var(--champagne)', textDecoration: 'underline' }}>
              계정 삭제 안내 페이지
            </Link>{' '}참조
          </li>
        </ul>
        <p style={{ marginTop: 12 }}>
          권리 행사는 아래 개인정보 보호 담당자에게 이메일로 요청하실 수 있으며,
          접수 후 <strong>10일 이내</strong> 처리 결과를 안내드립니다.
        </p>
        <p style={{ marginTop: 12, padding: '10px 14px', backgroundColor: 'var(--ivory-2)', borderRadius: 10, fontSize: 13 }}>
          <strong>파트너 보호:</strong> 커플로 연결된 상태에서 계정 삭제를 요청하시면,
          파트너가 함께 사용하던 데이터(타임라인·예산·청첩장 등)는 파트너 동의 없이 삭제되지 않습니다.
          본인의 사용자 정보만 분리(detach)되며, 파트너가 별도로 삭제를 요청해야 공유 데이터가 완전히 파기됩니다.
        </p>
      </Section>

      <Section title="8. 개인정보 파기 절차 및 방법">
        <Table rows={[
          ['파기 사유', '보유 기간 만료, 회원 탈퇴, 서비스 종료'],
          ['전자 파일', '복구 불가능한 방법으로 영구 삭제'],
          ['파기 기한', '보유 기간 종료 후 5일 이내'],
        ]} />
      </Section>

      <Section title="9. 개인정보 자동 수집 (쿠키 등)">
        <p>
          서비스는 Supabase 인증을 위해 세션 쿠키를 사용합니다.
          이 쿠키는 로그인 상태 유지 목적으로만 사용되며,
          브라우저 설정에서 삭제할 수 있습니다. 단, 삭제 시 자동 로그아웃됩니다.
        </p>
      </Section>

      <Section title="10. 개인정보 보호 담당자">
        <Table rows={[
          ['담당자', '곽재혁'],
          ['이메일', CONTACT_EMAIL],
          ['처리 기간', '이메일 접수 후 10일 이내'],
        ]} />
        <p style={{ marginTop: 12, fontSize: 14, color: 'var(--ink-2)' }}>
          개인정보 침해에 대한 신고·상담은 아래 기관에 문의하실 수 있습니다.
        </p>
        <ul style={{ paddingLeft: 20, marginTop: 8, fontSize: 14, color: 'var(--ink-2)' }}>
          <li>개인정보보호위원회: <a href="https://www.pipc.go.kr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--champagne)' }}>www.pipc.go.kr</a> (국번 없이 182)</li>
          <li>개인정보침해신고센터: <a href="https://privacy.kisa.or.kr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--champagne)' }}>privacy.kisa.or.kr</a> (국번 없이 118)</li>
        </ul>
      </Section>

      <div style={{
        marginTop: 40, padding: '20px 24px',
        backgroundColor: 'var(--ivory-2)', borderRadius: 16,
        fontSize: 13, color: 'var(--ink-3)', textAlign: 'center',
      }}>
        본 방침은 {UPDATED_DATE}부터 적용됩니다.<br />
        이전 방침은 문의 이메일로 요청 시 제공합니다.
      </div>
    </div>
  );
}

/* ── 공통 컴포넌트 ────────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{
        fontSize: 16, fontWeight: 700, marginBottom: 12,
        paddingBottom: 8, borderBottom: '2px solid var(--rule)',
        color: 'var(--ink)',
      }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>{children}</div>
    </section>
  );
}

function SubTitle({ children }) {
  return (
    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginTop: 16, marginBottom: 8 }}>
      {children}
    </p>
  );
}

function Table({ rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <tbody>
        {rows.map(([label, value], i) => (
          <tr key={i} style={{ borderBottom: '1px solid var(--rule)' }}>
            <td style={{
              padding: '10px 12px', fontWeight: 600, color: 'var(--ink)',
              backgroundColor: 'var(--ivory-2)', whiteSpace: 'nowrap', width: '30%',
              borderRadius: i === 0 ? '8px 0 0 0' : i === rows.length - 1 ? '0 0 0 8px' : 0,
            }}>
              {label}
            </td>
            <td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
