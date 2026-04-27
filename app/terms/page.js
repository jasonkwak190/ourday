import Link from 'next/link';

export const metadata = {
  title: '이용약관 | 우리의 날',
};

const EFFECTIVE_DATE = '2026년 4월 27일';
const SERVICE_NAME   = '우리의 날 (Ourday)';
const CONTACT_EMAIL  = 'jasonkwak201@gmail.com';

export default function TermsPage() {
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
          이용약관
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>
          시행일: {EFFECTIVE_DATE}
        </p>
      </div>

      <Section title="제1조 (목적)">
        <p>
          본 약관은 {SERVICE_NAME}(이하 "서비스")가 제공하는 결혼 준비 플래너 서비스의
          이용 조건 및 절차, 서비스 이용자(이하 "회원")와 서비스 간의 권리·의무 및
          책임 사항을 규정하는 것을 목적으로 합니다.
        </p>
      </Section>

      <Section title="제2조 (약관의 효력 및 변경)">
        <ol style={{ paddingLeft: 20 }}>
          <li>본 약관은 서비스를 이용하고자 하는 모든 회원에게 적용됩니다.</li>
          <li>
            서비스는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며,
            변경 시 앱 내 공지 또는 이메일로 7일 전에 고지합니다.
          </li>
          <li>
            회원이 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.
            변경 후 계속 이용하면 변경 약관에 동의한 것으로 봅니다.
          </li>
        </ol>
      </Section>

      <Section title="제3조 (서비스 이용 계약의 성립)">
        <ol style={{ paddingLeft: 20 }}>
          <li>서비스 이용 계약은 회원이 본 약관에 동의하고 회원 가입을 완료함으로써 성립합니다.</li>
          <li>
            회원 가입 시 이메일 주소, 이름, 역할(신랑/신부)을 제공해야 하며,
            Google·카카오 소셜 로그인으로도 가입할 수 있습니다.
          </li>
          <li>만 14세 미만은 서비스에 가입할 수 없습니다.</li>
        </ol>
      </Section>

      <Section title="제4조 (서비스의 내용)">
        <p>서비스는 결혼을 준비하는 커플에게 다음 기능을 제공합니다.</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>결혼 준비 체크리스트(타임라인) 공유 및 관리</li>
          <li>예산 관리 및 업체 정보 기록</li>
          <li>의사결정 보드 (신랑·신부 의견 공유)</li>
          <li>하객 명단 및 축의금 관리</li>
          <li>RSVP(참석 여부) 수집 기능</li>
          <li>커플 메모 및 정보 공유</li>
          <li>모바일 청첩장 제작 및 공유</li>
          <li>하객 사진 업로드 갤러리</li>
        </ul>
      </Section>

      <Section title="제5조 (서비스 이용 시간 및 중단)">
        <ol style={{ paddingLeft: 20 }}>
          <li>서비스는 원칙적으로 연중무휴 24시간 제공됩니다.</li>
          <li>
            서비스는 시스템 점검·장애·천재지변 등 불가피한 사유로 서비스를
            일시 중단할 수 있으며, 이 경우 사전 또는 사후에 공지합니다.
          </li>
          <li>
            서비스는 무료로 제공되며, 추후 유료 기능이 추가될 경우 별도 고지합니다.
          </li>
        </ol>
      </Section>

      <Section title="제6조 (회원의 의무)">
        <p>회원은 다음 행위를 하여서는 안 됩니다.</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>타인의 개인정보를 무단으로 수집·저장·공개하는 행위</li>
          <li>서비스를 이용하여 타인에게 불쾌감이나 피해를 주는 행위</li>
          <li>서비스의 정상적 운영을 방해하는 행위 (해킹, DoS 공격 등)</li>
          <li>서비스 내 정보를 허가 없이 상업적 목적으로 이용하는 행위</li>
          <li>기타 관련 법령을 위반하는 행위</li>
        </ul>
      </Section>

      <Section title="제7조 (커플 연동 및 데이터 공유)">
        <ol style={{ paddingLeft: 20 }}>
          <li>
            커플 연동은 초대 코드를 통해 이루어지며, 연동 완료 시 두 회원의
            서비스 이용 데이터(체크리스트, 예산, 의사결정, 하객 명단 등)가 상호 공유됩니다.
          </li>
          <li>
            회원은 커플 연동 전 상대방이 본 약관에 동의하였음을 확인해야 합니다.
          </li>
          <li>
            커플 중 한 명이 탈퇴하더라도 나머지 회원의 데이터는 보존됩니다.
            커플 데이터(체크리스트, 예산 등)는 마지막 회원이 탈퇴할 때 함께 삭제됩니다.
          </li>
        </ol>
      </Section>

      <Section title="제8조 (하객 RSVP 및 방명록 데이터)">
        <ol style={{ paddingLeft: 20 }}>
          <li>
            하객이 RSVP 또는 방명록을 통해 제출한 이름, 연락처, 메시지는
            해당 청첩장을 발송한 커플에게만 공개됩니다.
          </li>
          <li>
            하객은 별도 회원 가입 없이 RSVP를 제출할 수 있으며,
            제출 시 본 약관 및{' '}
            <Link href="/privacy" style={{ color: 'var(--champagne)', fontWeight: 600 }}>
              개인정보처리방침
            </Link>
            에 동의한 것으로 간주합니다.
          </li>
        </ol>
      </Section>

      <Section title="제9조 (서비스 제공자의 의무)">
        <ol style={{ paddingLeft: 20 }}>
          <li>서비스는 안정적이고 지속적인 서비스 제공을 위해 최선을 다합니다.</li>
          <li>서비스는 회원의 개인정보를 관련 법령에 따라 보호합니다.</li>
          <li>
            서비스는 회원이 동의하지 않은 영리 목적의 광고성 정보를 발송하지 않습니다.
          </li>
        </ol>
      </Section>

      <Section title="제10조 (저작권 및 지식재산권)">
        <ol style={{ paddingLeft: 20 }}>
          <li>
            서비스가 제공하는 콘텐츠(디자인, 텍스트, 아이콘 등)의 저작권은
            서비스 또는 해당 저작권자에게 귀속됩니다.
          </li>
          <li>
            회원이 서비스에 등록한 사진·글 등의 저작권은 해당 회원에게 귀속되며,
            서비스는 서비스 운영 범위 내에서만 이를 활용합니다.
          </li>
        </ol>
      </Section>

      <Section title="제11조 (면책 조항)">
        <ol style={{ paddingLeft: 20 }}>
          <li>
            서비스는 천재지변, 서버 장애, 제3자의 공격 등 불가항력으로 인한
            서비스 중단에 대해 책임을 지지 않습니다.
          </li>
          <li>
            서비스는 회원 간 또는 회원과 제3자 간의 분쟁에 개입하지 않으며,
            이로 인한 손해를 배상하지 않습니다.
          </li>
          <li>
            서비스에 등록된 정보의 정확성은 회원 본인이 책임지며,
            잘못된 정보로 인한 문제에 대해 서비스는 책임을 지지 않습니다.
          </li>
        </ol>
      </Section>

      <Section title="제12조 (회원 탈퇴 및 자격 상실)">
        <ol style={{ paddingLeft: 20 }}>
          <li>회원은 언제든지 설정 페이지에서 탈퇴를 신청할 수 있습니다.</li>
          <li>
            탈퇴 시 회원 계정 및 관련 데이터는 즉시 삭제되며, 복구할 수 없습니다.
            단, 파트너가 연동된 경우 커플 공유 데이터는 파트너 계정이 유지되는 동안 보존됩니다.
          </li>
          <li>
            서비스는 회원이 본 약관을 위반한 경우 사전 통보 후 이용을 제한하거나
            강제 탈퇴 조치를 취할 수 있습니다.
          </li>
        </ol>
      </Section>

      <Section title="제13조 (분쟁 해결 및 준거법)">
        <ol style={{ paddingLeft: 20 }}>
          <li>서비스 이용과 관련된 분쟁은 상호 협의를 통해 해결합니다.</li>
          <li>
            협의가 이루어지지 않을 경우 서비스 제공자의 주소지를 관할하는
            법원을 합의 관할로 합니다.
          </li>
          <li>본 약관은 대한민국 법률에 따라 해석·적용됩니다.</li>
        </ol>
      </Section>

      <Section title="제14조 (문의)">
        <p>
          약관 관련 문의사항은 아래 이메일로 연락해 주세요.
          이메일 접수 후 10일 이내에 답변드립니다.
        </p>
        <div style={{
          marginTop: 12, padding: '12px 16px',
          backgroundColor: 'var(--ivory-2)', borderRadius: 12, fontSize: 14,
        }}>
          <strong>이메일:</strong>{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--champagne)' }}>
            {CONTACT_EMAIL}
          </a>
        </div>
      </Section>

      <div style={{
        marginTop: 40, padding: '20px 24px',
        backgroundColor: 'var(--ivory-2)', borderRadius: 16,
        fontSize: 13, color: 'var(--ink-3)', textAlign: 'center',
      }}>
        본 약관은 {EFFECTIVE_DATE}부터 적용됩니다.
      </div>

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <Link href="/privacy" style={{ fontSize: 13, color: 'var(--champagne)', fontWeight: 600 }}>
          개인정보처리방침 →
        </Link>
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
