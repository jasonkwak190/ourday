# Ourday — Supabase 스키마 & 정책 정리

> 마지막 업데이트: 2026-04-21 (v2)  
> 총 13개 테이블 · **13개 전부 활성** · 보류 없음

---

## 목차
1. [활성 테이블 목록](#활성-테이블)
2. [보류/검토 테이블](#보류검토-테이블)
3. [RLS 정책 패턴](#rls-정책-패턴)
4. [공개 접근 API 정리](#공개-접근-api)
5. [정리 권장 사항](#정리-권장-사항)

---

## 활성 테이블

### 1. `couples`
커플의 핵심 정보. 대부분의 테이블이 이 테이블의 `id`를 `couple_id`로 참조한다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | gen_random_uuid() |
| invite_code | text UNIQUE | 커플 연동 초대 코드 (6자리) |
| wedding_date | date | 결혼식 날짜 |
| wedding_type | text | hall / hotel / outdoor / small |
| total_budget | integer | 총 예산 (만원 단위) |
| wedding_region | text | 결혼식 지역 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS**: 본인 커플만 읽기/쓰기
```sql
-- couples 테이블
alter table couples enable row level security;

create policy "커플 멤버만 조회" on couples
  for select using (
    id = (select couple_id from users where id = auth.uid())
  );

create policy "커플 멤버만 수정" on couples
  for update using (
    id = (select couple_id from users where id = auth.uid())
  );
```

---

### 2. `users`
`auth.users`를 확장하는 프로필 테이블.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | auth.users(id) 참조 |
| name | text NOT NULL | 이름 |
| role | text | groom / bride |
| couple_id | uuid | couples(id) 참조 (nullable, 연동 전) |
| email | text | 이메일 (표시용) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS**: 본인 레코드 + 같은 커플 파트너 읽기
```sql
alter table users enable row level security;

create policy "본인 프로필 조회/수정" on users
  for all using (id = auth.uid());

create policy "같은 커플 파트너 조회" on users
  for select using (
    couple_id = (select couple_id from users where id = auth.uid())
  );
```

---

### 3. `checklist_items`
월별 결혼 준비 체크리스트.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| couple_id | uuid | couples(id) 참조, cascade delete |
| title | text NOT NULL | 항목명 |
| due_months_before | numeric | 결혼식 N개월 전 |
| assigned_to | text | groom / bride / both |
| is_done | boolean | 완료 여부 (default false) |
| memo | text | 메모 |
| time_period | text | 시기 구분 (UI 필터용) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS**: 같은 couple_id 커플만
```sql
alter table checklist_items enable row level security;

create policy "커플만 체크리스트 접근" on checklist_items
  for all using (
    couple_id = (select couple_id from users where id = auth.uid())
  );
```

---

### 4. `budget_items`
예산 항목 관리.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| couple_id | uuid | couples(id) 참조, cascade delete |
| category | text | hall / dress / travel / hanbok / invite / other |
| name | text NOT NULL | 항목명 |
| estimated_amount | integer | 예상 금액 (만원, default 0) |
| actual_amount | integer | 실제 금액 (만원, null = 미결제) |
| memo | text | 메모 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS**: 같은 couple_id 커플만
```sql
alter table budget_items enable row level security;

create policy "커플만 예산 접근" on budget_items
  for all using (
    couple_id = (select couple_id from users where id = auth.uid())
  );
```

---

### 5. `decisions`
신랑/신부 의사결정 보드.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| couple_id | uuid | couples(id) 참조, cascade delete |
| title | text NOT NULL | 결정 항목 |
| status | text | undiscussed / discussing / decided |
| groom_opinion | text | 신랑 의견 |
| bride_opinion | text | 신부 의견 |
| final_decision | text | 최종 결정 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS**: 같은 couple_id 커플만
```sql
alter table decisions enable row level security;

create policy "커플만 결정 접근" on decisions
  for all using (
    couple_id = (select couple_id from users where id = auth.uid())
  );
```

---

### 6. `guests`
하객 명단 + 식사 수 + 축의금.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| couple_id | uuid | couples(id) 참조, cascade delete |
| name | text NOT NULL | 하객 이름 |
| side | text | groom / bride |
| relation | text | 관계 (가족/친구/직장/지인 등) |
| meal_count | integer | 식사 수 (default 1) |
| phone | text | 연락처 |
| memo | text | 메모 |
| gift_amount | integer | 축의금 (만원, null = 미입력) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS**: 같은 couple_id 커플만  
**참고**: `api/rsvp/route.js`에서 service role로 RSVP 참석자 자동 insert

```sql
alter table guests enable row level security;

create policy "커플만 하객 접근" on guests
  for all using (
    couple_id = (select couple_id from users where id = auth.uid())
  );
```

---

### 7. `rsvp_responses`
청첩장 링크를 통한 하객 참석 여부 응답.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| couple_id | uuid | couples(id) 참조 |
| name | text | 응답자 이름 |
| side | text | groom / bride (신랑측/신부측) |
| attending | boolean | 참석 여부 |
| meal_count | integer | 식사 수 (default 1) |
| phone | text | 연락처 |
| message | text | ~~메시지~~ **더 이상 사용 안 함** — RSVP 폼에서 제거, 방명록으로 통합 (항상 null) |
| created_at | timestamptz | |

**RLS**: 커플은 본인 couple_id로 읽기 / anon insert는 service role로 처리
```sql
alter table rsvp_responses enable row level security;

create policy "커플만 RSVP 조회" on rsvp_responses
  for select using (
    couple_id = (select couple_id from users where id = auth.uid())
  );
-- INSERT는 /api/rsvp 라우트에서 service role key로 처리 (비인증 하객용)
```

---

### 8. `vendors`
업체/계약 관리.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| couple_id | uuid | couples(id) 참조, cascade delete |
| type | text | hall / studio / dress / makeup / hanbok / food / flower / music / travel / other |
| name | text NOT NULL | 업체명 |
| contact_name | text | 담당자명 |
| contact_phone | text | 담당자 연락처 |
| deposit | integer | 계약금 (만원) |
| balance | integer | 잔금 (만원) |
| balance_due | date | 잔금 납부일 |
| contract_status | text | candidate / pending / signed / balance / done |
| memo | text | 메모 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS**: 같은 couple_id 커플만
```sql
alter table vendors enable row level security;

create policy "커플만 업체 접근" on vendors
  for all using (
    couple_id = (select couple_id from users where id = auth.uid())
  );
```

---

### 9. `invitations`
모바일 청첩장 (공개 URL).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| couple_id | uuid | couples(id) 참조 |
| slug | text UNIQUE | URL 경로 (`/i/[slug]`) |
| groom_name | text | 신랑 이름 |
| bride_name | text | 신부 이름 |
| wedding_date | date | 결혼식 날짜 |
| wedding_time | text | 결혼식 시간 |
| venue_name | text | 예식장 이름 |
| venue_address | text | 예식장 주소 |
| venue_map_url | text | 지도 URL |
| account_groom | text | 신랑측 계좌 |
| account_bride | text | 신부측 계좌 |
| message | text | 인사말 |
| template | text | 청첩장 템플릿 |
| cover_image_url | text | OG 이미지 커버 URL |
| view_count | integer | 조회수 (default 0) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS**: 커플은 수정/조회, anon은 slug로 읽기만 가능
```sql
alter table invitations enable row level security;

create policy "커플만 청첩장 수정" on invitations
  for all using (
    couple_id = (select couple_id from users where id = auth.uid())
  );

create policy "공개 청첩장 조회 (slug)" on invitations
  for select using (true);  -- 모든 사람이 slug로 조회 가능 (공개 청첩장)
```

---

### 10. `couple_notes`
커플 간 공유 메모 / 링크.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| couple_id | uuid | couples(id) 참조, cascade delete |
| user_id | uuid | users(id) 참조 (작성자) |
| role | text | groom / bride |
| content | text | 메모 내용 |
| link_url | text | 링크 URL |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS**: 같은 couple_id 커플만
```sql
alter table couple_notes enable row level security;

create policy "커플만 노트 접근" on couple_notes
  for all using (
    couple_id = (select couple_id from users where id = auth.uid())
  );
```

---

### 11. `photo_events`
하객 사진 공유 이벤트 (QR 코드 기반).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| couple_id | uuid | couples(id) 참조, cascade delete |
| event_code | text UNIQUE | QR 코드용 이벤트 코드 |
| title | text | 이벤트 이름 |
| max_photos | integer | 최대 사진 수 (default 50) |
| expires_at | timestamptz | 만료일 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS**: 커플은 CRUD / anon은 event_code로 읽기만
```sql
alter table photo_events enable row level security;

create policy "커플만 이벤트 관리" on photo_events
  for all using (
    couple_id = (select couple_id from users where id = auth.uid())
  );

create policy "공개 이벤트 조회 (event_code)" on photo_events
  for select using (true);
```

---

### 12. `guest_photos`
하객이 업로드한 사진 메타데이터.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| event_id | uuid | photo_events(id) 참조, cascade delete |
| storage_path | text | Supabase Storage 경로 |
| uploader_name | text | 업로더 이름 |
| created_at | timestamptz | |

**RLS**: anon insert (하객 업로드) / 커플은 event_id로 읽기
```sql
alter table guest_photos enable row level security;

create policy "누구나 사진 업로드" on guest_photos
  for insert with check (true);

create policy "커플 사진 조회" on guest_photos
  for select using (
    event_id in (
      select id from photo_events
      where couple_id = (select couple_id from users where id = auth.uid())
    )
  );
```

---

## 보류/검토 테이블

없음. 모든 테이블이 활성 상태.

### ✅ `invitation_guestbook` — 완전 활성화 (2026-04-21)
청첩장 공개 방명록. 이전에 UI 없음 상태였으나 연동 완료.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| invitation_id | uuid | invitations(id) 참조 |
| name | text | 작성자 이름 |
| message | text | 방명록 메시지 (200자 이내) |
| created_at | timestamptz | |

**현재 상태**:
- `app/api/guestbook/route.js` — GET/POST API
- `components/InvitationTemplates.js` — 청첩장 하단 "축하 메시지" 폼
- `app/guests/page.js` — 참석확인 탭 하단 방명록 섹션 (최신 50개)
- `app/dashboard/page.js` — 대시보드 방명록 위젯 (최신 3개)

---

## RLS 정책 패턴

### 패턴 1: 커플 전용 (대부분의 테이블)
```sql
for all using (
  couple_id = (select couple_id from users where id = auth.uid())
);
```

### 패턴 2: 공개 읽기 + 커플 쓰기 (invitations, photo_events)
```sql
-- 읽기: 누구나
for select using (true);
-- 쓰기: 커플만
for all using (couple_id = (select couple_id from users where id = auth.uid()));
```

### 패턴 3: service role로 비인증 insert (rsvp_responses, guests 자동 매핑)
RLS를 우회하지 않고 서버 API Route(`/api/rsvp`)에서 `SUPABASE_SERVICE_ROLE_KEY`로 처리.
클라이언트에는 절대 노출하지 않는다.

---

## 공개 접근 API

| 라우트 | 방법 | 대상 테이블 | 인증 |
|--------|------|------------|------|
| `GET /api/rsvp?couple_id=` | anon key | invitations | 없음 |
| `POST /api/rsvp` | service role | rsvp_responses, guests | 없음 |
| `GET /api/guestbook?invitation_id=` | anon key | invitation_guestbook | 없음 |
| `POST /api/guestbook` | service role | invitation_guestbook | 없음 |
| `POST /api/guest/upload` | service role | guest_photos | 없음 (event_code 검증) |
| `GET /i/[slug]` | anon key | invitations | 없음 (공개 URL) |
| `GET /rsvp/[id]` | anon key | invitations | 없음 (public RSVP 폼) |

---

## 정리 권장 사항

### 완료된 것
- [x] `invitation_guestbook` 대시보드 + 하객관리 연동 완료
- [x] `next.config.ts` 삭제 (`next.config.js` 하나만 유지)
- [x] `middleware.js` → `proxy.js` 마이그레이션 (Next.js 16)
- [x] RSVP `message` 필드 미사용 처리 (방명록으로 통합)
- [x] 인덱스 12개 추가

### 남은 것
- [ ] `rsvp_responses.message` 컬럼 — DB에서 DROP 해도 됨 (항상 null, 앱에서 미사용)

### Supabase Storage
- `guest-photos` 버킷: 하객 업로드 사진 저장
- Storage 정책: anon upload (event_code 검증은 API에서), 커플 download

### 인덱스 추가 권장 (성능)
```sql
create index idx_checklist_couple on checklist_items(couple_id);
create index idx_budget_couple on budget_items(couple_id);
create index idx_decisions_couple on decisions(couple_id);
create index idx_guests_couple on guests(couple_id);
create index idx_vendors_couple on vendors(couple_id);
create index idx_rsvp_couple on rsvp_responses(couple_id);
create index idx_notes_couple on couple_notes(couple_id);
create index idx_photo_events_couple on photo_events(couple_id);
create index idx_guest_photos_event on guest_photos(event_id);
create index idx_invitations_slug on invitations(slug);
create index idx_invitations_couple on invitations(couple_id);
```

### 불필요한 테이블 (현재 없음)
모든 테이블이 각자 용도가 있다. 단, `invitation_guestbook`은 UI 미완성 상태.
