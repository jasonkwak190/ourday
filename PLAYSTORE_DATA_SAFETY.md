# PLAYSTORE_DATA_SAFETY.md — Google Play 데이터 보안 양식 인벤토리

> 2026-04-30 작성. Google Play Console → 앱 콘텐츠 → 데이터 보안에 입력할 항목.
> Supabase 스키마([SUPABASE.md](SUPABASE.md)) 기준 전수조사 결과.
>
> ⚠️ Google이 요구하는 정확한 항목 카테고리에 매핑되어 있어 그대로 옮겨 적으면 됩니다.
> 거짓 신고 시 영구 정지 가능 — 변경 사항 있으면 이 문서부터 갱신.

---

## ⓪ 전체 답변 한 줄 요약

- **데이터 수집**: 예 (앱 기능 수행 위해 필수)
- **제3자 공유**: 아니오 (Supabase·Vercel·Sentry는 처리 위탁이지 공유 아님)
- **전송 중 암호화**: 예 (HTTPS/TLS)
- **저장 시 암호화**: 예 (Supabase AES-256)
- **사용자 삭제 요청**: 예 (앱 내 회원 탈퇴 + 자동 파기 정책)

---

## ① 수집하는 데이터 카테고리별 매핑

### 1.1 개인정보 (Personal info)

| 데이터 종류 | 수집? | 필수/선택 | 목적 | 저장 위치 |
|---|---|---|---|---|
| **이름 (Name)** | 예 | 필수 | 앱 기능 (커플 식별) | `users.name`, `guests.name`, `rsvp_responses.name`, `guestbook.name` |
| **이메일 주소** | 예 | 필수 | 계정 관리, 로그인 | `auth.users.email`, `users.email` |
| **사용자 ID** | 예 | 필수 | 계정 식별 | `auth.users.id` (Supabase 자체 발급 UUID) |
| **전화번호** | 예 | 선택 | 하객 관리 (사용자가 직접 입력) | `guests.phone`, `rsvp_responses.phone` |
| **주소** | 아니오 | - | 수집 안 함 (지역 단위만) | - |
| **인종/민족** | 아니오 | - | - | - |
| **정치적·종교적 견해** | 아니오 | - | - | - |
| **성적 지향** | 아니오 | - | - | - |
| **기타 정보** | 예 | 필수 | 앱 기능 | 결혼 날짜(`couples.wedding_date`), 결혼 지역(`couples.wedding_region`, 도시 단위), 신랑/신부 역할(`users.role`) |

**Google 양식 답변**: ✅ Personal info → Name, Email address, User IDs, Phone number, Other info

---

### 1.2 금융 정보 (Financial info)

| 데이터 | 수집? | 비고 |
|---|---|---|
| **사용자 결제 정보** | 아니오 | 앱 내 결제 없음 |
| **구매 내역** | 아니오 | - |
| **신용 점수** | 아니오 | - |
| **기타 금융 정보** | 예 | 사용자가 직접 입력한 결혼 예산(`couples.total_budget`), 업체 계약금/잔금(`vendors.contract_amount`, `vendors.balance_due`), 축의금(`guests.gift_amount`). 만 원 단위 정수만. **계좌번호·카드번호 일체 수집 안 함** |

**Google 양식 답변**: ✅ Financial info → Other financial info (자기 결혼 비용 기록용, 외부 결제 없음)

---

### 1.3 위치 (Location)

| 데이터 | 수집? | 비고 |
|---|---|---|
| **정확한 위치** | 아니오 | - |
| **대략적인 위치** | 예 | 사용자가 직접 입력한 결혼 지역(`couples.wedding_region`, 예: "서울 강남"). GPS·디바이스 위치 일체 수집 안 함 |

**Google 양식 답변**: ✅ Location → Approximate location

---

### 1.4 메일·이메일 (Mail/Email)
**수집 안 함** — 사용자 본인 이메일은 인증용이지 메일 본문 수집은 없음.

---

### 1.5 사진 및 동영상 (Photos and videos)

| 데이터 | 수집? | 목적 | 저장 위치 |
|---|---|---|---|
| **사진** | 예 | 청첩장 사진(`invitations.cover_url`, `invitations.photo_urls`), 하객 QR 업로드 사진(`guest_photos`), 업체 영수증·계약서(`vendors.attachments`) | Supabase Storage |
| **동영상** | 아니오 | - | - |

**Google 양식 답변**: ✅ Photos and videos → Photos

---

### 1.6 음성 (Audio)
**수집 안 함**

---

### 1.7 파일 및 문서 (Files and docs)

| 데이터 | 수집? | 비고 |
|---|---|---|
| **파일 및 문서** | 예 | 업체 영수증·계약서 PDF/이미지(`vendors.attachments`), 사용자 직접 업로드만 |

**Google 양식 답변**: ✅ Files and docs

---

### 1.8 캘린더 (Calendar)
**수집 안 함** — 디바이스 캘린더 접근 권한 없음. 앱 내부에 결혼 일정만 저장.

---

### 1.9 연락처 (Contacts)
**디바이스 연락처 접근 권한 없음** — 사용자가 직접 입력한 하객 정보만 (`guests.name`, `guests.phone`).

---

### 1.10 앱 활동 (App activity)

| 데이터 | 수집? | 비고 |
|---|---|---|
| **앱 상호작용** | 예 | Sentry 에러 모니터링 — 크래시 발생 시 스택 트레이스 + 사용자 ID(익명화 가능) |
| **앱 내 검색 기록** | 아니오 | - |
| **설치된 앱 목록** | 아니오 | - |
| **사용자 생성 콘텐츠** | 예 | 체크리스트(`checklist_items`), 의사결정 의견(`decisions.groom_opinion`, `bride_opinion`), 메모(`couple_notes.content`), 방명록(`guestbook_entries.message`) |
| **기타 사용자 생성 콘텐츠** | 예 | 청첩장 본문(`invitations.message`), 하객 메모(`guests.memo`) |

**Google 양식 답변**: ✅ App activity → App interactions, In-app search history (없음), Other user-generated content

---

### 1.11 웹 검색 기록 (Web browsing)
**수집 안 함**

---

### 1.12 앱 정보 및 성능 (App info and performance)

| 데이터 | 수집? | 비고 |
|---|---|---|
| **충돌 로그** | 예 | Sentry로 자동 수집 (앱 크래시 디버깅용) |
| **진단** | 예 | Sentry 성능 모니터링 (응답 시간 등) |
| **기타 앱 성능 데이터** | 아니오 | - |

**Google 양식 답변**: ✅ App info and performance → Crash logs, Diagnostics

---

### 1.13 기기 또는 기타 ID (Device or other IDs)
**수집 안 함** — Capacitor WebView 사용. ADID·디바이스 ID 추적 코드 일체 없음.

---

## ② 데이터 사용 목적 (Google 표준 카테고리)

각 데이터마다 다음 중 **하나 이상**을 선택해야 함:

- **App functionality**: 앱 기능 제공 ✅ (대부분 데이터)
- **Account management**: 계정 관리 ✅ (이메일, 사용자 ID)
- **Analytics**: 분석 ✅ (Sentry)
- **Developer communications**: 사용자에게 알림/공지 ❌
- **Advertising or marketing**: 광고/마케팅 ❌
- **Fraud prevention, security, and compliance**: 사기 방지·보안 ✅ (rate limit, RLS)
- **Personalization**: 개인화 ✅ (D-day별 추천 가이드)
- **Account management**: 계정 관리 ✅

---

## ③ 데이터 처리 위탁 (Sub-processors)

Google이 "제3자 공유"로 분류하지 않지만 양식에 명시 권장:

| 처리 위탁 업체 | 역할 | 위치 |
|---|---|---|
| **Supabase** | DB·인증·Storage | AWS ap-northeast-1 (도쿄) |
| **Vercel** | 호스팅·CDN·Cron | 글로벌 엣지 |
| **Sentry** | 에러 모니터링 | EU/US |
| **Google OAuth** | 소셜 로그인 (선택) | 글로벌 |
| **Kakao OAuth** | 소셜 로그인 (선택) | 한국 |

→ 개인정보처리방침([/privacy](app/privacy/page.js))에 위탁 업체 모두 명시되어야 법적 안전.

---

## ④ 데이터 삭제·파기 정책

### 사용자 직접 요청
- 앱 내 **설정 → 회원 탈퇴** ([/api/delete-account](app/api/delete-account/route.js))
- 탈퇴 시 `auth.users` 삭제 → `couples`·`users` cascade delete → 모든 연관 데이터 자동 삭제

### 자동 파기 (Vercel Cron, KST 03:00)
- `vercel.json` Cron → [/api/cleanup](app/api/cleanup/route.js)
- 결혼식 + 1년 지난 커플의 `rsvp_responses`, `invitation_guestbook` 자동 삭제
- 방명록·RSVP는 결혼식 후 자료적 가치 적고 개인정보 비중 높아 적극 파기

### Storage 정책
- Supabase Storage RLS 적용
- 청첩장 사진은 청첩장 삭제 시 함께 삭제
- 하객 QR 사진은 photo_event 삭제 시 함께 삭제

**Google 양식 답변**: ✅ "데이터 삭제 요청 가능" 체크 + 절차 URL 입력 ([/privacy#data-deletion](app/privacy/page.js))

---

## ⑤ 보안 관행 (Security practices)

| 항목 | 답변 |
|---|---|
| **전송 중 데이터가 암호화되나요?** | 예 — 모든 통신 HTTPS/TLS 강제 (CSP `upgrade-insecure-requests`, Capacitor `cleartext: false`) |
| **사용자가 데이터 삭제를 요청할 수 있나요?** | 예 — 앱 내 회원 탈퇴 + cron 자동 파기 |
| **보안 표준을 준수하나요?** | 예 — Google Play의 Families/SDK 정책 준수, 보안 검토 통과 |
| **선택적 데이터를 거부할 수 있나요?** | 예 — 전화번호·메모 등은 선택 입력 |

추가 보안 보강 (이번 보안 검토에서 확인):
- Next.js Middleware로 보호 라우트 SSR 단계 인증 게이트
- Supabase RLS 모든 테이블 적용
- API Route 입력 검증 (UUID·short code·ISO timestamp)
- Rate limiter (브루트포스·DDoS 방어)
- AndroidManifest `allowBackup="false"` (adb 백업 차단)

---

## ⑥ 광고 ID·추적 (Advertising)

- **광고 SDK**: 사용 안 함
- **사용자 추적 (앱 외부)**: 사용 안 함
- **광고 ID 수집**: 사용 안 함
- **타사 광고 표시**: 사용 안 함

→ 향후 프리미엄·광고 모델 도입 시 ([BM.md](BM.md) 참조) 이 항목 갱신 필요.

---

## 🎯 Play Console 입력 순서 (체크리스트)

1. [ ] **데이터 수집·공유 전체 답변**: 수집 예 / 공유 아니오
2. [ ] **개인정보 4종**: Name, Email, User IDs, Phone (Phone은 선택)
3. [ ] **금융 정보**: Other financial info (사용자 입력 예산만)
4. [ ] **위치**: Approximate location (지역 텍스트만)
5. [ ] **사진/동영상**: Photos
6. [ ] **파일**: Files and docs (영수증)
7. [ ] **앱 활동**: App interactions, Other user-generated content
8. [ ] **앱 성능**: Crash logs, Diagnostics
9. [ ] **목적**: App functionality, Account management, Analytics, Security, Personalization
10. [ ] **암호화**: 전송·저장 모두 예
11. [ ] **삭제 요청**: 가능 + URL ([/privacy](app/privacy/page.js))
12. [ ] **개인정보처리방침 URL**: `https://ourday-rust.vercel.app/privacy`

---

## 🚨 주의 — 거짓 신고 방지

- **하객 정보(이름·전화번호)는 사용자가 입력하지만 본인 정보가 아님** → "User-generated content" 카테고리에 포함 + 개인정보처리방침에 "사용자가 제3자(하객) 정보를 입력 시 동의를 받아야 함" 명시 필요
- **축의금**은 금융 카테고리에 포함 (개인 사용 기록이지만 명목상 금융 정보)
- **사진 메타데이터(EXIF)**: 업로드 시 EXIF 위치 정보 제거 권장 (현재 미구현 — 추후 보강 권장)
