import Link from 'next/link';

export const metadata = {
  title: '개인정보처리방침 | 우리의 날',
};

const EFFECTIVE_DATE = '2025년 1월 1일';
const UPDATED_DATE   = '2026년 4월 23일';
const SERVICE_NAME   = '우리의 날 (Ourday)';
const CONTACT_EMAIL  = 'jasonkwak201@gmail.com';

export default function PrivacyPage() {
  return (
    <div style={{
      maxWidth: 680, margin: '0 auto', padding: '40px 20px 80px',
      fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif",
      color: '#191f28', lineHeight: 1.8,
    }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 40 }}>
        <Link href="/" style={{ fontSize: 13, color: '#3182f6', textDecoration: 'none', fontWeight: 600 }}>
          ← 우리의 날
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 20, marginBottom: 8 }}>
          개인정보처리방침
        </h1>
        <p style={{ fontSize: 13, color: '#8b95a1' }}>
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
        <SubTitle>① 서비스 회원 (신랑·신부)</SubTitle>
        <Table rows={[
          ['수집 항목', '이메일 주소, 이름, 역할(신랑/신부)'],
          ['소셜 로그인 시 추가', 'Google/카카오 계정 식별자, 프로필 이름'],
          ['수집 방법', '회원가입 시 직접 입력 또는 소셜 로그인 연동'],
          ['수집 목적', '본인 확인, 서비스 제공, 커플 연동'],
        ]} />

        <SubTitle>② 참석 여부(RSVP) 작성자 (하객)</SubTitle>
        <Table rows={[
          ['필수 항목', '이름, 신랑측·신부측 구분, 참석 여부'],
          ['선택 항목', '연락처(휴대폰 번호), 방명록 메시지'],
          ['수집 방법', 'RSVP·방명록 페이지에서 직접 입력'],
          ['수집 목적', '참석 인원 파악, 좌석 배치, 방명록 보관'],
        ]} />

        <SubTitle>③ 하객 명단 (커플이 직접 등록)</SubTitle>
        <Table rows={[
          ['항목', '하객 이름, 연락처, 축의금 금액, 소속(신랑측·신부측)'],
          ['수집 방법', '커플 본인이 직접 입력'],
          ['수집 목적', '하객 관리, 축의금 기록'],
        ]} />
      </Section>

      <Section title="3. 개인정보 보유 및 이용 기간">
        <Table rows={[
          ['회원 정보', '회원 탈퇴 시까지 보유 후 즉시 파기'],
          ['RSVP / 방명록', '예식일로부터 1년 또는 커플 계정 삭제 시 파기'],
          ['하객 명단', '커플 계정 삭제 시 함께 파기'],
          ['법령 의무 보존', '전자상거래법 등 관련 법령에 따라 일부 항목 별도 보존'],
        ]} />
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
        <p style={{ marginTop: 12, padding: '12px 16px', backgroundColor: '#f8f9fa', borderRadius: 12, fontSize: 14 }}>
          <strong>커플 간 공유</strong>는 제3자 제공이 아닌 서비스의 핵심 기능으로,
          연동된 파트너에게 타임라인·예산·의사결정 등 서비스 이용 데이터가 공유됩니다.
          회원가입 시 이에 동의하는 것으로 간주합니다.
        </p>
      </Section>

      <Section title="5. 개인정보 처리 위탁">
        <p>서비스는 원활한 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
        <Table rows={[
          ['수탁업체', 'Supabase, Inc.'],
          ['위탁 내용', '클라우드 데이터베이스 운영 및 인증 서비스'],
          ['위탁 기간', '서비스 이용 계약 기간 동안'],
          ['소재지', '미국 (AWS us-east-1 리전)'],
        ]} />
        <p style={{ marginTop: 12, fontSize: 14, color: '#4e5968' }}>
          Supabase는 SOC 2 Type II 인증을 보유하며, GDPR 및 CCPA를 준수합니다.
          자세한 사항은{' '}
          <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer"
            style={{ color: '#3182f6' }}>
            Supabase 개인정보처리방침
          </a>
          을 참조하세요.
        </p>
      </Section>

      <Section title="6. 국외 이전">
        <p>
          수집된 개인정보는 Supabase의 미국 데이터 센터에 저장됩니다.
          이용자는 회원가입 시 이 사실에 동의하는 것으로 간주합니다.
        </p>
        <Table rows={[
          ['이전 국가', '미국'],
          ['이전 업체', 'Supabase, Inc.'],
          ['이전 목적', '서비스 제공을 위한 클라우드 인프라 운영'],
          ['보호 조치', 'SOC 2 Type II, 암호화 전송(TLS), 암호화 저장'],
        ]} />
      </Section>

      <Section title="7. 정보주체의 권리·의무">
        <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li><strong>열람 요구</strong>: 보유 중인 본인 개인정보 확인</li>
          <li><strong>정정·삭제 요구</strong>: 잘못된 정보 수정 또는 삭제 요청</li>
          <li><strong>처리 정지 요구</strong>: 특정 목적의 처리 중단 요청</li>
          <li><strong>동의 철회</strong>: 서비스 탈퇴를 통해 즉시 행사 가능 (설정 → 로그아웃 → 탈퇴)</li>
        </ul>
        <p style={{ marginTop: 12 }}>
          권리 행사는 아래 개인정보 보호 담당자에게 이메일로 요청하실 수 있으며,
          접수 후 <strong>10일 이내</strong> 처리 결과를 안내드립니다.
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
        <p style={{ marginTop: 12, fontSize: 14, color: '#4e5968' }}>
          개인정보 침해에 대한 신고·상담은 아래 기관에 문의하실 수 있습니다.
        </p>
        <ul style={{ paddingLeft: 20, marginTop: 8, fontSize: 14, color: '#4e5968' }}>
          <li>개인정보보호위원회: <a href="https://www.pipc.go.kr" target="_blank" rel="noopener noreferrer" style={{ color: '#3182f6' }}>www.pipc.go.kr</a> (국번 없이 182)</li>
          <li>개인정보침해신고센터: <a href="https://privacy.kisa.or.kr" target="_blank" rel="noopener noreferrer" style={{ color: '#3182f6' }}>privacy.kisa.or.kr</a> (국번 없이 118)</li>
        </ul>
      </Section>

      <div style={{
        marginTop: 40, padding: '20px 24px',
        backgroundColor: '#f8f9fa', borderRadius: 16,
        fontSize: 13, color: '#8b95a1', textAlign: 'center',
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
        paddingBottom: 8, borderBottom: '2px solid #f2f4f6',
        color: '#191f28',
      }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: '#4e5968' }}>{children}</div>
    </section>
  );
}

function SubTitle({ children }) {
  return (
    <p style={{ fontSize: 13, fontWeight: 700, color: '#191f28', marginTop: 16, marginBottom: 8 }}>
      {children}
    </p>
  );
}

function Table({ rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <tbody>
        {rows.map(([label, value], i) => (
          <tr key={i} style={{ borderBottom: '1px solid #f2f4f6' }}>
            <td style={{
              padding: '10px 12px', fontWeight: 600, color: '#191f28',
              backgroundColor: '#f8f9fa', whiteSpace: 'nowrap', width: '30%',
              borderRadius: i === 0 ? '8px 0 0 0' : i === rows.length - 1 ? '0 0 0 8px' : 0,
            }}>
              {label}
            </td>
            <td style={{ padding: '10px 12px', color: '#4e5968' }}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
