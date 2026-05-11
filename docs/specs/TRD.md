# TRD: FamilySync (Technical Requirements Document) v2.0

## 1. 문서 목적
- 본 문서는 `PRD`의 제품 요구사항을 실제 구현 가능한 기술 요구사항으로 구체화한다.
- 범위는 모바일 웹(PWA) 기반 FamilySync 서비스의 프론트엔드, 백엔드, 데이터, 인증, 배포, 운영 요구사항을 포함한다.

## 2. 시스템 개요
- **클라이언트**: Next.js 14+ (App Router) + React + TailwindCSS 기반 PWA.
- **백엔드**: Turso (libSQL) + Drizzle ORM, Auth.js(Google OAuth·DB 세션).
- **배포**: Vercel.
- **핵심 목표**:
  - 다중 양육자 환경에서 실시간 동기화.
  - 저입력/대버튼 중심 UX.
  - 중복 투약 방지, Undo 등 안전장치 내장.

## 3. 기술 아키텍처 요구사항

### 3.1 프론트엔드 (Next.js App Router)
- **Server Components (RSC) 기본 사용**: 초기 로딩 속도와 SEO/메타데이터 최적화를 위해 데이터 페칭은 서버 컴포넌트에서 수행한다.
- **Client Components 최소화**: 사용자 인터랙션(퀵 액션 버튼, 토스트, Undo 타이머, 프로필 선택)이 필요한 리프(Leaf) 노드만 `'use client'`로 분리한다.
- **상태 변이(Mutation)**: API Route(`/api/...`) 대신 **Server Actions**를 사용하여 폼 제출 및 데이터 변경을 처리한다.
- **PWA 요구사항**: `manifest.json` 제공, `next-pwa` 또는 커스텀 서비스 워커를 통한 정적 자산 캐싱, 홈 화면 아이콘(standalone) 지원.

### 3.2 백엔드/데이터 (Turso + Drizzle)
- 단일 진실 소스(SSOT)로 Turso(libSQL 호환)를 사용하며, 스키마·쿼리는 Drizzle로 관리한다.
- **동기화**: MVP는 Server Actions + 라우터 갱신 등으로 타임라인을 맞추며, 별도 Realtime 구독은 후속 과제로 둔다.
- 사진 자산은 `care_guides.image_url` 등 URL 필드로 참조하며, 저장소는 Vercel Blob·외부 스토리지 등으로 선택한다.

### 3.3 인증/권한 및 멀티테넌시 (핵심 해결 과제)
- **가족 단위 격리(Multi-tenancy)**: 모든 데이터는 `family_id`를 기준으로 완벽히 격리된다. (다른 가족의 데이터 접근 원천 차단)
- **2-Depth 인증 플로우 (Netflix Style)**:
  1. **Account Auth**: Google OAuth로 로그인 (이때 `auth.users.id` 발급 및 `family_id` 매핑).
  2. **Profile Select**: 화면에서 '할머니', '아빠' 등 프로필 선택. 선택된 `profile_id`는 **HTTP-only 쿠키**(`active_profile_id`)에 저장되어 이후 모든 Server Action에서 "누가 실행했는지" 식별하는 데 사용된다.
- **권한 모델**: `profiles.role` 필드를 통해 `admin`(엄마)과 `executor`(그 외)를 서버 단에서 검증한다.

---

## 4. 데이터 모델 요구사항 (Schema)

모든 주요 테이블에는 `family_id`가 포함되어야 RLS(Row Level Security) 정책을 안전하게 적용할 수 있습니다.

### 4.1 테이블 정의
1. **`families`** (가족 그룹)
   - `id (uuid pk)`, `name (text)`, `invite_code (text unique)`, `created_at`
2. **`user_families`** (구글 계정과 가족의 매핑)
   - `user_id (uuid pk, fk to auth.users)`, `family_id (uuid, fk)`
3. **`profiles`** (가족 구성원 프로필 - 넷플릭스 얼굴들)
   - `id (uuid pk)`, `family_id (uuid fk)`, `name (text)`, `avatar_url (text)`, `role (enum: admin|executor)`, `created_at`
4. **`events`** (타임라인 기록)
   - `id (uuid pk)`, `family_id (uuid fk)`, `profile_id (uuid fk)`, `action_type (text)`, `target (text)`, `metadata (jsonb)`, `is_reverted (boolean default false)`, `created_at`
   - *인덱스*: `(family_id, created_at desc)`, `(family_id, action_type, created_at desc)`
5. **`daily_pins`** (오늘의 지시사항)
   - `id (uuid pk)`, `family_id (uuid fk)`, `content (text)`, `is_active (boolean)`, `created_by (uuid fk to profiles)`, `created_at`
   - *제약*: `CREATE UNIQUE INDEX ON daily_pins (family_id) WHERE is_active = true;` (가족당 활성 핀 1개 보장)
6. **`homework_types`** (숙제 마스터)
   - `id (uuid pk)`, `family_id (uuid fk)`, `child_group (enum: kid7=주원이 | kid4=승원이)`, `title (text)`, `is_active (boolean)`, `created_at`
7. **`homework_logs`** (숙제 완료 기록)
   - `id (uuid pk)`, `family_id (uuid fk)`, `homework_type_id (uuid fk)`, `date_key (date)`, `completed_by (uuid fk to profiles)`, `completed_at`
   - *제약*: `UNIQUE(homework_type_id, date_key)`
8. **`care_guides`** (우리집 가이드)
   - `id (uuid pk)`, `family_id (uuid fk)`, `category (text)`, `title (text)`, `body (text)`, `image_url (text)`, `linked_action (text)`, `created_at`

### 4.2 데이터 무결성
- 모든 FK는 `ON DELETE CASCADE` (가족 삭제 시) 또는 `RESTRICT` 정책을 명확히 한다.
- 시간 기준은 `timestamptz` (UTC)로 저장하고, 클라이언트에서 `Intl.DateTimeFormat`을 사용해 기기 로컬 타임존으로 렌더링한다.

---

## 5. 핵심 기능별 기술 요구사항

### 5.1 퀵 액션 및 Undo (실행 취소)
- 액션 실행 시 `events` 테이블에 Insert 한다.
- 실행 취소 허용 시간은 `lib/event-undo-policy.ts` 기준(투약 30분, 그 외 24시간)이며, 타임라인 등 UI는 해당 창 안에서만 버튼을 노출한다.
- Undo 클릭 시, 해당 이벤트 레코드의 `is_reverted` 값을 `true`로 Update 한다. (물리적 삭제(`DELETE`)를 피하여 감사(Audit) 로그를 유지함)
- 타임라인 쿼리는 항상 `WHERE is_reverted = false` 조건을 포함한다.

### 5.2 투약 안전장치 (Critical)
- **Server Action 검증**: `action_type = 'medication'` 요청이 들어오면, 서버에서 해당 `target`(예: 4세)의 최근 2시간 이내 투약 기록을 조회한다.
- 기록이 존재하면 Action은 `{ blocked: true, lastEventAt: "..." }` 에러를 반환한다.
- 클라이언트는 경고 모달을 띄우고, 사용자가 '강행'을 누르면 `metadata: { override: true }` 플래그를 달아 Action을 재호출하여 기록을 강제 생성한다.

### 5.3 가이드 연동 (Contextual Hints)
- 사용자가 `action_type = 'laundry'` 팝업을 열면, 클라이언트는 서버 컴포넌트에서 미리 페칭해둔 `care_guides` 중 `linked_action == 'laundry'`인 데이터를 찾아 팝업 하단에 즉시 렌더링한다. (지연 로딩 없음)

---

## 6. API 명세 (Next.js Server Actions 기반)

REST API 대신 타입 안정성이 보장되는 Server Actions(`app/actions/`)를 사용합니다.

### 6.1 인증 및 프로필 (`actions/auth.ts`)
- `selectProfile(profileId: string)`
  - 동작: 권한 검증 후 `cookies().set('active_profile_id', profileId)` 실행.
- `logoutProfile()`
  - 동작: 쿠키 삭제 후 프로필 선택 화면으로 리다이렉트.

### 6.2 이벤트 변이 (`actions/events.ts`)
- `createEvent(payload: { actionType, target, metadata })`
  - 동작: 쿠키에서 `profile_id` 추출 -> `family_id` 조회 -> 중복 투약 검사 -> `events` Insert.
  - 리턴: `{ success: true, eventId }` 또는 `{ blocked: true, message }`.
- `undoEvent(eventId: string)`
  - 동작: 해당 이벤트의 `is_reverted = true` 처리. (생성 후 허용 시간은 `lib/event-undo-policy.ts`: 투약 30분, 그 외 24시간)

### 6.3 관리자 기능 (`actions/admin.ts`)
- `upsertDailyPin(content: string)`
  - 동작: 기존 활성 핀 `is_active = false` 처리 후 새 핀 Insert. (`admin` 롤 검증 필수)
- `createGuide(formData: FormData)`
  - 동작: Storage에 이미지 업로드 -> URL 획득 -> `care_guides` Insert.

---

## 7. 부록: Postgres RLS 정책 SQL (참고용)

> **현재 구현**은 Turso(SQLite 호환) + Drizzle이며, DB 레벨 RLS 대신 **서버(Server Actions)에서 `family_id`·세션을 검증**한다. 아래는 Postgres/Supabase 전제의 참고 스키마다.

멀티테넌시(`family_id`)를 완벽히 지원하는 RLS 예시이다.

```sql
-- 1. 현재 세션의 user가 속한 family_id를 가져오는 헬퍼 함수
create or replace function auth.get_user_family_id()
returns uuid as $$
  select family_id from public.user_families where user_id = auth.uid() limit 1;
$$ language sql security definer;

-- 2. RLS 활성화
alter table families enable row level security;
alter table profiles enable row level security;
alter table events enable row level security;
alter table daily_pins enable row level security;
alter table care_guides enable row level security;

-- 3. 정책: 모든 테이블은 "자신의 가족(family_id) 데이터만" 읽고 쓸 수 있다.
-- Events 테이블 예시
create policy "가족 구성원만 이벤트 조회 가능" on events
for select to authenticated
using (family_id = auth.get_user_family_id());

create policy "가족 구성원만 이벤트 생성 가능" on events
for insert to authenticated
with check (family_id = auth.get_user_family_id());

-- 4. 관리자(admin) 전용 쓰기 정책 (Daily Pins 예시)
create policy "관리자만 지시사항 작성 가능" on daily_pins
for insert to authenticated
with check (
  family_id = auth.get_user_family_id() and
  exists (
    select 1 from profiles 
    where profiles.id = daily_pins.created_by 
    and profiles.role = 'admin'
  )
);
```

---

## 8. 화면별 컴포넌트 구조 (Next.js App Router)

```text
app/
 ├── (auth)/
 │    ├── login/page.tsx             # Google OAuth 로그인 버튼
 │    └── select-profile/page.tsx    # 가족 프로필 선택 (Netflix UI)
 ├── (dashboard)/
 │    ├── layout.tsx                 # 프로필 쿠키 검증 Guard, 하단 네비게이션
 │    ├── page.tsx                   # 메인 대시보드 (Server Component)
 │    │    ├── DailyPinBanner.tsx    # 오늘의 지시사항
 │    │    ├── StatusBoard.tsx       # 세탁 등 상태 보드
 │    │    ├── QuickActionPanel.tsx  #[Client] 퀵 액션 버튼 그룹 모달
 │    │    └── TimelineFeed.tsx      # [Client] Realtime 구독 및 이벤트 렌더링
 │    ├── homework/page.tsx          # 숙제 트래커
 │    └── guides/page.tsx            # 우리집 가이드 목록
 └── admin/
      ├── layout.tsx                 # Admin Role 검증 Guard
      └── page.tsx                   # 핀, 가이드, 숙제 마스터 설정 폼
```

---

## 9. 배포 및 운영 요구사항
- **환경 변수**: Vercel에 `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_URL`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` 세팅.
- **성능**: 대시보드 FCP(First Contentful Paint) 1.5초 이내. (RSC 활용으로 충분히 달성 가능)
- **장애 대응**: 사용자가 오프라인 상태일 때 퀵 액션을 누르면, `navigator.onLine`을 체크하여 "인터넷 연결이 필요합니다"라는 명시적 에러 토스트를 띄운다. (잘못된 로컬 캐싱으로 인한 투약 중복 사고 방지)

## 10. 검증 기준 (Done Criteria)
1. **격리성**: A 가족의 계정으로 로그인 시 B 가족의 데이터가 API/DB 레벨에서 절대 노출되지 않아야 한다.
2. **안전성**: 2시간 이내 투약 시도 시 서버 액션 레벨에서 정확히 차단(Block) 응답이 내려와야 한다.
3. **실시간성**: 한 기기에서 액션 완료 시, 다른 기기에서 새로고침 없이 1초 이내에 타임라인에 반영되어야 한다.
4. **접근성**: 조부모님 사용을 고려해 퀵 액션 버튼의 터치 영역이 최소 60x60px 이상 확보되어야 한다.