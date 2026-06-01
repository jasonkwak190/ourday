# MANUAL_TASKS.md — 사람이 직접 해야 하는 작업 목록

> Claude가 자동화할 수 없는 작업들. 출시 전 반드시 완료할 것.
> 마지막 업데이트: 2026-05-11

---

## 🔴 CRITICAL — 출시 전 필수

### MT-018 · reports 테이블 생성 (UGC 신고 기능) ⚠️ 부분 완료 (2026-05-11)
**상태**: 테이블·rate limit·API 동작. **단, `for insert with check (true)` 정책이 실제 DB에 누락**(2026-06-01 라이브 검증 — QA_2026_05_11.md W1). `/api/report`가 service role로 인서트하므로 사용자 영향 0. 정합성 회복을 위해 아래 한 줄 SQL 실행 권장:
```sql
create policy "anyone can report" on public.reports for insert with check (true);
```
**이유**: Google Play 정책 — UGC(공개 방명록·RSVP 등)가 있는 앱은 신고 메커니즘이 반드시 제공되어야 함. 코드는 이미 배포되어 있고, 테이블만 생성하면 즉시 활성화됨.

**코드 준비됨**:
- `POST /api/report` — 비인증 신고 접수 (IP 15분당 5건 rate limit)
- 공개 방명록 페이지 `/i/[slug]` 각 메시지 옆에 "신고" 버튼 + 모달
- 커플 본인의 `/invitation` 페이지에서 부적절한 방명록 메시지 "삭제" 버튼 (`DELETE /api/guestbook?id=...`)

**graceful degrade**: 테이블이 없으면 신고 API가 500 응답을 내고 클라이언트에서 "잠시 후 다시 시도해주세요" 안내. 앱 자체는 정상 동작.

**Supabase Dashboard → SQL Editor에서 실행:**
```sql
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('guestbook','rsvp')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 5 and 500),
  reporter_name text,
  reporter_ip text,
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by uuid references public.users(id),
  handler_action text -- 'kept' | 'hidden' | 'deleted'
);

alter table public.reports enable row level security;

-- 신고는 누구나 (anon 포함) INSERT 가능
create policy "anyone can report"
  on public.reports
  for insert
  with check (true);

-- 조회·관리는 관리자만 (현재 RLS는 SELECT 차단; service role로만 접근)
-- 추후 admin 콘솔이 생기면 SELECT/UPDATE 정책을 별도 추가
```

**검토 워크플로** (콘솔 작성 전 임시):
1. Supabase Table Editor → `reports` 테이블 열기 (service role로 자동 표시)
2. `handled_at IS NULL` 항목 중심으로 검토
3. 부적절하면 `invitation_guestbook` / `rsvp_responses` 테이블에서 해당 `target_id` 직접 삭제
4. 처리 후 `reports.handled_at = now()`, `handler_action = 'hidden' | 'deleted' | 'kept'` 업데이트

완료 후 CLAUDE.md 보안 체크리스트에 "UGC 신고 기능 활성화" 항목 체크.

---

### MT-021 · invitation_guestbook anon INSERT GRANT 보정 ⭐ 선택 (정합성)
**상태**: 사용자 영향 없음 — `/api/guestbook` POST가 service role로 우회. 다만 SUPABASE.md L437 `for insert with check (true)` 정책 의도와 실제 DB가 불일치(라이브 검증 시 `permission denied for table` — QA_2026_05_11.md W2).

**선택 1**: 문서와 동일하게 만들기
```sql
grant insert on public.invitation_guestbook to anon;
-- 정책이 없다면 함께 실행:
create policy "누구나 방명록 작성" on public.invitation_guestbook
  for insert with check (true);
```
**선택 2**: SUPABASE.md L430~442를 "anon INSERT는 service-role API(/api/guestbook) 경유 only"로 수정. 권장 — 이미 정책 설계가 그렇게 되어 있음.

---

### MT-017 · couple_notes.image_url 컬럼 추가 ✅ 완료 (2026-05-11)
**상태**: 완료 — SQL 실행됨, 사진 첨부 즉시 동작
~~다음 SQL을 실행해야 우리 노트 사진 첨부가 동작함~~
**준비됨**: `note-images` Storage 버킷(public) 생성 완료, `/api/notes/upload` 라우트·UI 구현 완료

**Supabase Dashboard → SQL Editor에서 실행:**
```sql
alter table couple_notes add column if not exists image_url text;
```
- 컬럼 없으면 사진 전송 시 "DB 컬럼 추가 필요" 알림 뜨고 텍스트만 저장됨 (graceful degrade)
- 컬럼 추가 후 즉시 사진 업로드·표시 동작 (재배포 불필요)

---

### MT-007 · rsvp_responses.message 컬럼 DROP ✅ 완료 (2026-05-11)
**상태**: 완료 — SQL 실행됨, 컬럼 제거.
~~RSVP 폼에서 message 필드 제거됨, 방명록으로 통합~~
**MT-006과 동일 작업** (중복 항목 통합).

```sql
alter table rsvp_responses drop column if exists message;
```

---

### MT-008 · Sentry DSN 등록 ⭐ 10분
**상태**: 미완료  
**코드 준비**: `@sentry/nextjs` 설치 완료, `sentry.client.config.js` / `sentry.server.config.js` / `sentry.edge.config.js` 생성됨  
**남은 것**: DSN 환경변수 1개만 등록하면 즉시 활성화

**절차**:
1. https://sentry.io/signup → GitHub 계정으로 가입
2. **Create Project** → Platform: **Next.js** → 이름: `ourday` → Create
3. 생성 후 화면에서 DSN 복사 (형식: `https://abc123@o12345.ingest.sentry.io/67890`)
   - 못 찾으면: Settings → Projects → ourday → Client Keys (DSN)
4. https://vercel.com → ourday 프로젝트 → **Settings → Environment Variables**
   - Key: `NEXT_PUBLIC_SENTRY_DSN`
   - Value: 복사한 DSN
   - Environment: Production + Preview + Development **모두 체크**
   - Save
5. 재배포 트리거:
   ```bash
   git commit --allow-empty -m "chore: activate sentry" && git push
   ```
6. 프로덕션 URL 접속 → Sentry Issues 탭에서 이벤트 수신 확인

완료 후 CLAUDE.md 체크리스트 체크 (`Sentry DSN 등록`)

---

### MT-009 · Lighthouse 성능 측정 ⭐ 5분
**상태**: 미완료  
**목적**: 앱 출시 전 Core Web Vitals 실측 확인

**측정 방법**:
1. Chrome에서 https://ourday-rust.vercel.app 접속
2. DevTools(`F12`) → **Lighthouse** 탭
3. Mode: **Navigation** / Device: **Mobile** / Categories: 전체 체크
4. "Analyze page load" 클릭 → 결과 확인

**목표 수치**:
| 지표 | 목표 | 의미 |
|------|------|------|
| LCP | < 2.5초 | 최대 콘텐츠 렌더링 시간 |
| CLS | < 0.1 | 레이아웃 흔들림 없음 |
| INP | < 200ms | 터치 반응 속도 |
| Performance | > 80 | 종합 점수 |

**문제 발생 시**: 결과 스크린샷을 새 Claude 세션에 공유 → 원인 분석 + 수정 가능

완료 후 CLAUDE.md 체크리스트 체크 (`Lighthouse 측정`)

---

### MT-005 · Sentry DSN 등록 (2026-04-27 추가)
**코드 준비**: `@sentry/nextjs` 설치 완료, 설정 파일 3개 생성됨  
**남은 것**: DSN만 등록하면 즉시 활성화

**절차**:
1. https://sentry.io 가입 (무료 플랜으로 충분)
2. **New Project** → Platform: **Next.js** → 프로젝트명: `ourday`
3. 생성 후 나오는 DSN 값 복사 (형식: `https://xxxxx@oyyy.ingest.sentry.io/zzzzz`)
4. Vercel Dashboard → Settings → Environment Variables:
   - Key: `NEXT_PUBLIC_SENTRY_DSN`
   - Value: 복사한 DSN
   - Environment: Production + Preview
5. (선택) 소스맵 업로드를 위해:
   - Sentry → Settings → Auth Tokens → 새 토큰 생성
   - Vercel에 `SENTRY_AUTH_TOKEN` 추가
6. `git push` → 배포 후 Sentry Issues 탭에서 에러 수신 확인

**확인 방법**: 배포 후 의도적으로 존재하지 않는 페이지 접근 → Sentry에 이벤트 수신되면 성공

---

### MT-006 · `rsvp_responses.message` 컬럼 DROP ✅ 완료 (2026-05-11)
**상태**: 완료 — MT-007과 동일 작업 (중복 항목으로 통합 완료).
```sql
alter table rsvp_responses drop column if exists message;
```

---

### MT-001 · assetlinks.json — 프로덕션 SHA-256 지문 추가
**파일**: `public/.well-known/assetlinks.json`
**현재 상태**: 디버그 키스토어 지문 입력 완료 (로컬 테스트용) ⚠️ **프로덕션 지문 추가 필요**

**현재 등록된 지문**
```
D6:4A:2F:E4:79:7A:C6:03:4C:96:E6:25:A5:5D:39:43:D7:C7:F3:F9:CB:24:96:52:4E:E8:BD:98:19:E0:40:C7
```
→ 이 값은 로컬 디버그 빌드(`~/.android/debug.keystore`)용. Android Studio에서 실행 시 App Links 테스트 가능.

**Google Play 배포 전에 해야 할 것**:
1. Google Play Console → 해당 앱 → **릴리즈 > 앱 서명**
2. "앱 서명 인증서" 섹션에서 **SHA-256 인증서 지문** 복사
3. `public/.well-known/assetlinks.json`의 `sha256_cert_fingerprints` 배열에 **추가** (기존 디버그 값 유지, 프로덕션 값 추가):
```json
"sha256_cert_fingerprints": [
  "D6:4A:2F:...(디버그, 그대로 유지)",
  "XX:XX:XX:...(Play Console에서 복사한 프로덕션 값)"
]
```
4. `git push` → Vercel 배포 확인: `https://ourday-rust.vercel.app/.well-known/assetlinks.json`
5. 검증: `adb shell am start -a android.intent.action.VIEW -d "https://ourday-rust.vercel.app/auth/callback" com.ourday.app`

**왜 필요한가**: Google Play App Signing은 업로드 키와 다른 서명 키를 사용함. 프로덕션 지문이 없으면 배포된 앱에서 OAuth 콜백이 앱으로 돌아오지 않음.

---

### ~~MT-002 · Vercel 환경변수에 CRON_SECRET 등록~~ ✅ 완료
**완료일**: 2026-04-23
Vercel Dashboard에 `CRON_SECRET` 등록 완료. 매일 KST 03:00 자동 파기 작동 중.

---

### MT-003 · Vercel 환경변수에 SUPABASE_SERVICE_ROLE_KEY 확인
**현재 상태**: 로컬 `.env.local`에 있지만 Vercel에도 있는지 확인 필요

**방법**:
1. Vercel Dashboard → Settings > Environment Variables
2. `SUPABASE_SERVICE_ROLE_KEY` 존재 확인
3. 없으면 Supabase Dashboard → **Settings > API > service_role** 키 복사 후 추가

---

### MT-004 · Google Play Console — 데이터 보안 양식 작성
**위치**: Play Console → 앱 콘텐츠 → 데이터 보안

아래 내용으로 작성:

| 질문 | 답변 |
|------|------|
| 사용자 데이터 수집·공유 여부 | 예 |
| **이름** | 수집 / 앱 기능 / 암호화 전송 / 삭제 요청 가능 |
| **이메일 주소** | 수집 / 계정 관리 / 암호화 전송 / 삭제 요청 가능 |
| **사진 및 동영상** | 수집 / 앱 기능(갤러리 업로드) / 암호화 전송 / 삭제 요청 가능 |
| 제3자 데이터 공유 | 예 — Supabase(처리 위탁, 미국 소재) |
| 전송 중 데이터 암호화 | 예 (HTTPS/TLS) |
| 데이터 삭제 요청 가능 여부 | 예 (이메일 요청) |
| 개인정보처리방침 URL | `https://ourday-rust.vercel.app/privacy` |

---

### MT-005 · Google Play Console — 앱 콘텐츠 등급 설문
**위치**: Play Console → 앱 콘텐츠 → 앱 등급

- 카테고리: **유틸리티**
- 폭력: 없음 / 성인: 없음 / 도박: 없음
- 예상 등급: **전체 이용가 (Everyone)**

---

## 🟡 IMPORTANT — 출시 직전

### MT-006 · Google OAuth — Supabase에서 프로덕션 설정
**현재 상태**: 개발용 OAuth Client만 설정되어 있을 수 있음

**방법**:
1. [Google Cloud Console](https://console.cloud.google.com) → API 및 서비스 → 사용자 인증 정보
2. OAuth 2.0 클라이언트 ID → **승인된 리디렉션 URI** 확인:
   - `https://[your-supabase-project].supabase.co/auth/v1/callback` 포함 여부 확인
3. **OAuth 동의 화면** → 게시 상태가 "프로덕션"인지 확인 (테스트 모드면 100명 제한)
4. Supabase Dashboard → Authentication → Providers → Google → Client ID/Secret 최신값 확인

---

### MT-007 · 카카오 OAuth — 카카오 개발자 콘솔 설정
**방법**:
1. [developers.kakao.com](https://developers.kakao.com) → 앱 선택
2. **플랫폼** → Android → 패키지명 `com.ourday.app` 추가, 키 해시 등록
3. **카카오 로그인** → Redirect URI에 `https://[supabase-project].supabase.co/auth/v1/callback` 추가
4. **동의항목** → 닉네임, 프로필사진, 카카오계정(이메일) 설정

---

### MT-008 · Android 키스토어 백업
**현재 상태**: Google Play 앱 서명으로 관리 중 (권장)

**확인사항**:
- Play Console → 앱 서명에서 "Google Play가 앱을 서명합니다" 상태인지 확인
- 업로드 키(Upload Key) `.jks` 파일을 분실하면 앱 업데이트 불가 → 안전한 곳에 백업

---

### MT-015 · Android 릴리즈 키스토어 생성 + 서명 + assetlinks 갱신 ⭐ 출시 직전
**자동화 스크립트 준비 완료** (2026-04-29). 사용자 입력만 필요.

**절차** (10분):
```bash
# 1. 키스토어 생성 — 비밀번호 입력 (8자 이상, 절대 잊지 말 것!)
bash scripts/create-android-keystore.sh

# 2. 즉시 백업 (1Password 첨부 등)
cp android/app/ourday-release.jks ~/your-secure-backup/

# 3. android/app/keystore.properties 작성 (gitignored)
cat > android/app/keystore.properties <<EOF
storeFile=ourday-release.jks
storePassword=<위에서 입력한 비밀번호>
keyAlias=ourday
keyPassword=<별칭 비밀번호>
EOF

# 4. assetlinks.json 자동 갱신 (디버그 + 릴리즈 SHA-256 모두 등록)
bash scripts/update-assetlinks.sh

# 5. 커밋 + 푸시
git add public/.well-known/assetlinks.json
git commit -m "chore: assetlinks.json 프로덕션 SHA-256 추가"
git push origin main
```

**왜 자동화 스크립트로 만들었나**: 키스토어는 분실 시 같은 패키지명으로 스토어 재배포 영구 불가 → 한 번에 안전하게 처리. SHA-256 추출·assetlinks 갱신도 키스토어 비밀번호 1회로 끝남.

**완료 후 효과**:
- App Link 활성화 → 카카오톡으로 받은 청첩장 링크 클릭 시 앱 자동 오픈 (브라우저 안 거침)
- 릴리즈 빌드 (`./gradlew bundleRelease`) 자동 서명 → AAB 바로 업로드 가능

**다음 단계** (이 작업 후): MT-016 AAB 빌드·Google Play Console 업로드.

---

### MT-011 · Supabase 비밀번호 재설정 이메일 리디렉션 URL 설정
**필요 시점**: 비밀번호 재설정 기능 사용 전

**방법**:
1. [Supabase Dashboard](https://supabase.com) → 프로젝트 → **Authentication > URL Configuration**
2. **Redirect URLs** 목록에 아래 URL 추가:
   ```
   https://ourday-rust.vercel.app/reset-password/confirm
   ```
3. 저장

**왜 필요한가**: Supabase가 재설정 이메일의 링크를 해당 URL로 보내야 새 비밀번호 설정 페이지가 열림. 미설정 시 "Invalid redirect URL" 에러 발생.

---

## 🟢 OPTIONAL — 출시 후 개선

### MT-009 · 개인정보처리방침 — 담당자 이름 실명 입력 여부 검토
**파일**: `app/privacy/page.js`
**현재**: "개발팀" 으로 표기
**검토**: 개인정보보호법상 담당자 성명 명시 권장 → 본명 공개 여부 결정 후 수정

### MT-010 · Google Play 스토어 자산 준비
아래 파일을 직접 제작해서 Play Console에 업로드:
- **앱 아이콘**: 512×512 PNG (투명 배경 없음)
- **피처드 이미지**: 1024×500 PNG
- **스크린샷**: 최소 2장 (휴대전화용, 1080px 이상)
- **앱 소개 단문**: 80자 이내
- **앱 소개 장문**: 4000자 이내

---

### MT-013 · Supabase Storage — invitation-covers 버킷 생성 (필수)
**목적**: 청첩장 커버 사진 업로드를 위한 public Storage 버킷
**실행 위치**: Supabase Dashboard → Storage

1. **새 버킷 생성**:
   - 이름: `invitation-covers`
   - Public bucket: **ON** (공개 URL 필요)
   - File size limit: 10MB
   - Allowed MIME types: `image/jpeg, image/png, image/webp`

2. **RLS 정책** (SQL Editor에서 실행):
```sql
-- service role이 업로드하므로 RLS 정책 불필요
-- (API 라우트에서 service role key 사용)
-- 버킷 자체를 public으로 설정하면 됨
```

3. **완료 후 동작**: 청첩장 편집 → 커버 사진 섹션 → "갤러리에서 사진 선택" 버튼으로 업로드 가능

---

### MT-012 · 청첩장 — invitations 테이블 컬럼 추가 (DB 마이그레이션)
**목적**: 경쟁사 표준 필드 추가 (부모 성함, 공지사항, 다중 사진)
**실행 위치**: Supabase Dashboard → SQL Editor

```sql
-- 부모 성함 (한국 청첩장 표준)
alter table invitations
  add column if not exists groom_father text,
  add column if not exists groom_mother text,
  add column if not exists bride_father text,
  add column if not exists bride_mother text;

-- 공지사항 / 전세버스·주차 안내
alter table invitations
  add column if not exists notice text;

-- 사진 URLs (JSON 배열, 최대 10장)
alter table invitations
  add column if not exists photos jsonb default '[]'::jsonb;
```

**마이그레이션 후**: `InvitationTab.js` FIELDS 배열에 부모 성함·공지사항 섹션 추가 필요 (코드 준비 완료, 컬럼 생성 후 주석 해제)

---

### MT-013 · 체크리스트 — subtasks 컬럼 추가 (DB 마이그레이션)
**목적**: 큰 항목을 작은 단계로 쪼개기 (sub-tasks). 스케쥴링 편의 기능.
**실행 위치**: Supabase Dashboard → SQL Editor

```sql
alter table checklist_items
  add column if not exists subtasks jsonb default '[]'::jsonb;
```

**데이터 구조**: `[{ id: string, title: string, done: boolean }]`
**마이그레이션 후**: 체크리스트 항목 펼침 시 SubtaskList 즉시 동작.

---

### ~~MT-014 · 의사결정 — candidates 컬럼 추가~~ ✅ 완료 (2026-04-29)

---

### MT-019 · Supabase 리전 확인 ⭐ 출시 전 점검
**상태**: 미완료 (확인만 필요)
**목적**: 한국 사용자 latency 최적화 + 개인정보 국외이전 고지 정확성

**방법**:
1. Supabase Dashboard → Project Settings → General → **Region** 확인
2. 권장: `ap-northeast-2` (Seoul) 또는 `ap-northeast-1` (Tokyo)
3. 다른 리전이면 **마이그레이션 신청** (Supabase Pro 플랜 + 1회성 작업)
4. 현재 리전을 `app/privacy/page.js` 처리위탁 표 "데이터 보관 위치"란에 정확히 표기 (이미 미국으로 표기되어 있다면 갱신)

**왜 필요한가**: 개인정보 처리방침에 "국외이전 국가"를 정확히 명시해야 PIPA 의무 충족. 마케팅 효과: 한국 사용자 응답시간 50–150ms 개선.

---

### MT-020 · Vercel Pro 플랜 전환 (상업적 사용) ⭐ 매출 발생 직전
**상태**: 미완료 — 무료 Hobby 플랜으로 운영 중
**이유**: Vercel **Hobby 플랜은 비상업적 사용만 허용**. 청첩장 결제·광고·B2B 제휴 등 매출이 발생하는 순간부터 **Pro($20/월) 플랜 의무**.

**판단 기준** (Vercel ToS):
- 광고 노출 → Pro 필요
- 결제 모듈 도입 (청첩장 유료 템플릿 등) → Pro 필요
- B2B 제휴 트래킹 링크 → Pro 필요
- 순수 무료 서비스만 유지 → Hobby로 OK

**절차** (5분):
1. https://vercel.com → ourday 팀 → **Settings → Billing → Upgrade**
2. Pro 플랜 선택 → 카드 등록
3. 함께 활성화되는 혜택: 더 큰 함수 한도, Analytics, Password Protection, 우선 지원

완료 후 BM.md 매출 모델 섹션 — Vercel 고정비 $20/월 반영.

---

## 완료된 수동 작업 ✅

| 항목 | 완료일 | 비고 |
|------|--------|------|
| MT-018 reports 테이블 + RLS 생성 | 2026-05-11 | UGC 신고 API 활성화 |
| MT-017 couple_notes.image_url 컬럼 추가 | 2026-05-11 | 우리 노트 사진 첨부 |
| MT-007 / MT-006 rsvp_responses.message DROP | 2026-05-11 | 중복 항목 통합 후 처리 |
| invitations RLS — slug NOT NULL 조건 + 컬럼 grant | 2026-05-11 | 계좌·전화 anon 차단 |
| invitation_guestbook RLS — anon SELECT 차단 | 2026-05-11 | service role API로만 조회 |
| note-images Storage 버킷 생성 (public 15MB) | 2026-05-11 | 우리 노트 첨부 |
| MT-014 decisions.candidates jsonb 컬럼 추가 | 2026-04-29 | 3-way 비교 보드 활성화 |
| Supabase SUPABASE_SERVICE_ROLE_KEY 로컬 설정 | 2026-04-22 | `.env.local` |
| CRON_SECRET 로컬 생성 | 2026-04-22 | `.env.local` |
| **CRON_SECRET Vercel 등록** | 2026-04-23 | Vercel Dashboard |
| assetlinks.json 디버그 지문 입력 | 2026-04-23 | 로컬 테스트용 |
| Capacitor Android 플랫폼 추가 | 2026-04-20 | `android/` 폴더 |
| Capacitor iOS 플랫폼 추가 | 2026-04-20 | `ios/` 폴더 |
