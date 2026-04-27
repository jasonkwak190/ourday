# MANUAL_TASKS.md — 사람이 직접 해야 하는 작업 목록

> Claude가 자동화할 수 없는 작업들. 출시 전 반드시 완료할 것.
> 마지막 업데이트: 2026-04-23

---

## 🔴 CRITICAL — 출시 전 필수

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

## 완료된 수동 작업 ✅

| 항목 | 완료일 | 비고 |
|------|--------|------|
| Supabase SUPABASE_SERVICE_ROLE_KEY 로컬 설정 | 2026-04-22 | `.env.local` |
| CRON_SECRET 로컬 생성 | 2026-04-22 | `.env.local` |
| **CRON_SECRET Vercel 등록** | 2026-04-23 | Vercel Dashboard |
| assetlinks.json 디버그 지문 입력 | 2026-04-23 | 로컬 테스트용 |
| Capacitor Android 플랫폼 추가 | 2026-04-20 | `android/` 폴더 |
| Capacitor iOS 플랫폼 추가 | 2026-04-20 | `ios/` 폴더 |
