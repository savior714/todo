# CRITICAL_LOGIC.md — FamilySync MVP 불변·의사결정

| 항목 | 값 |
|------|-----|
| **Last Verified** | 2026-05-11 |
| **제품 요구** | `docs/specs/PRD.md` |
| **기술 요구** | `docs/specs/TRD.md` |
| **실행 계획** | `docs/plans/20260509_familysync_mvp_blueprint.md` |

본 문서는 **코드와 운영에서 깨지면 안 되는 경계**와 **이미 확정된 아키텍처 결정**만 기록한다. 세부 구현·세션 로그는 `docs/memory/MEMORY.md` 및 PRD/TRD를 따른다.

---

## 1. 제품 불변 조건 (Non-Negotiables)

1. **가족 데이터 격리**: 모든 업무 데이터는 **하나의 `family_id`** 안에서만 읽고 쓴다. 다른 가족 행에 도달하는 코드 경로는 버그로 간주한다.
2. **투약 안전**: 동일 `target`(아이 구분)에 대해 **최근 2시간 이내** 비-revert 투약 이벤트가 있으면, 서버는 기본적으로 생성을 거부한다. 예외는 **`metadata.override === true`** 일 때만 허용한다.
3. **감사 가능한 타임라인**: 이벤트는 되도록 **삭제하지 않고** `is_reverted`로 무효화한다. 목록·집계는 revert되지 않은 행만 포함한다.
4. **2단계 신원**: “구글 계정 로그인”과 “어떤 가족 프로필로 행동하는지”를 분리한다. 후자는 **`active_profile_id` 쿠키**(HTTP-only)로만 식별한다.

---

## 2. 멀티테넌시·신원 (구현 SSOT)

- **저장소**: Turso(libSQL) + Drizzle. DB에 Postgres RLS는 없으며, **경계는 서버(Server Actions·라우트)에서 강제**한다.
- **사용자 → 가족**: `user_families.user_id`로 현재 로그인 사용자의 `family_id`를 결정한다. (`lib/auth/session.ts`의 `getCurrentFamilyId`)
- **프로필 문맥**: `getActiveProfileContext()`는 (1) 세션 `userId`, (2) `active_profile_id` 쿠키, (3) `profiles.id`가 해당 `family_id`에 속하는지 **동시에** 만족할 때만 유효하다. 하나라도 어긋나면 `null`·에러 처리로 끝낸다.
- **첫 로그인 시드**: `ensureDefaultFamilyForUser`는 `user_families`가 없을 때만 `families`·멤버십·기본 프로필 2명(admin/executor)을 만든다. 중복 호출은 멱등이다.

---

## 3. 인증·세션 (Auth.js)

- **프로바이더**: Google OAuth. 세션은 **DB 어댑터**를 사용한다(Auth.js 표준 테이블: `users`, `accounts`, `sessions`, `verificationTokens` 등).
- **`AUTH_URL` 정책**: Vercel Preview에서는 `instrumentation.ts`가 `AUTH_URL`/`NEXTAUTH_URL`을 제거해 **현재 호스트** 기준 콜백을 쓴다. 로컬에서 `NEXT_PUBLIC_SITE_URL`이 localhost인데 `AUTH_URL`만 프로덕션 도메인이면 동일하게 제거해 **redirect 불일치**를 막는다.
- **운영 점검**: `GET /api/health`는 비밀을 노출하지 않고, 필수 env 존재·DB ping·핵심 테이블(Auth 어댑터 + 앱 스키마의 `quick_actions` 등) 존재 여부를 반환한다. `tables` 중 하나라도 `false`이면 Auth/세션·대시보드 경로가 실패할 수 있으므로 **마이그레이션 미적용**을 최우선 의심한다.
- **퀵 액션 장애 관측**: 대시보드 SSR에서 `quick_actions` 시드·조회가 실패하면 사용자에게는 마이그레이션 안내 배너만 노출하고, 민감 정보 없이 `console.error("[dashboard] quick_actions load failed", { familyId, message, code? })` 형태로 **서버 로그에만** 원인을 남긴다 (`app/(dashboard)/dashboard/page.tsx`).

---

## 4. 이벤트 모델·타임라인

- **스키마 요지**: `events`는 `family_id`, `profile_id`, `action_type`, `target`, `metadata`(JSON 문자열), `is_reverted`, `created_at`을 가진다.
- **날짜 열 배치**: 대시보드 3열(어제/오늘/내일) 및 주 단위 이동은 **`metadata.timelineDate`** (`YYYY-MM-DD`)가 있으면 그날짜에 붙이고, 없으면 `created_at`의 **로컬 자정 기준 날짜**로 붙인다. (`lib/timeline-date.ts`의 `getEventDisplayDateKey`)
- **투약 상세 메타**: `action_type === "medication"`일 때 구조화 필드는 **`metadata.medication`** 에 둔다 (`subject`: `kid7` \| `kid4` \| `family`, `items[]`: 약 이름·용량·단위, 선택 `note`). 저장 전 검증은 `lib/event-metadata.ts`의 `normalizeAndValidateEventMetadata`가 수행한다. UI 기록은 `RecordEventModal`을 경유한다.
- **투약 차단 쿼리**: `action_type = 'medication'`, 동일 `family_id`·`target`, `is_reverted = false`, `created_at >= now - 2h` 조건으로 최근 1건을 조회한다. (`app/actions/events.ts`) 모달에서 확정한 **투약 대상**과 동일한 값이 `events.target`으로 저장되어야 차단 키가 일치한다.

---

## 5. Undo (실행 취소)

- **방식**: `is_reverted = true` 업데이트. 물리 삭제 금지.
- **권한·범위**: 동일 `family_id`에 속한 이벤트만 대상으로 한다.
- **시간 윈도우 (액션별)**: `lib/event-undo-policy.ts`의 `getUndoWindowMsForActionType`가 단일 SSOT이다.
  - **투약** (`action_type === "medication"`): 생성 시각 기준 **30분**.
  - **그 외** (식사·등하원 등 저위험): 생성 시각 기준 **24시간**.
  서버 `undoEvent`와 타임라인 UI 노출이 동일 정책을 따른다.
- **PRD 정합**: PRD에 고정 분 단위 표현이 있으면 본 절·TRD·상수를 기준으로 정합화한다.

---

## 6. 권한 모델

- **`profiles.role`**: `admin` | `executor`. Pin·가이드·숙제 설정 등 **관리자 전용 변이**는 서버에서 `admin`을 검증한다.
- **공동 관리자(선택)**: 환경변수 **`FAMILY_CO_ADMIN_EMAILS`**(쉼표·공백 등 구분, 이메일 대소문자 무시)에 등록된 Google 계정으로 **로그인(`signIn`)할 때**, 해당 사용자의 `family_id`에 속한 **`executor` 프로필은 `admin`으로 멱등 승격**된다. 가족 내 executor를 유지해야 하는 비관리자 프로필이 있으면 allowlist에 넣지 않는다. (`lib/auth/promote-co-admins.ts`)
- **숙제 유형**: 물리 삭제 대신 **`homework_types.is_active = false`** 로 숨긴다. 트래커 UI는 활성 행만 노출한다.
- **실행자**: 퀵 액션·숙제 완료·타임라인 조회 등은 일반적으로 활성 프로필만 유효하면 된다(세부는 각 Server Action).

---

## 7. Daily Pin 제약

- **비즈니스 규칙**: 가족당 **활성(`is_active`) 핀은 최대 1개**. DB에는 부분 유니크 인덱스로 보강한다. (`TRD` 스키마 절 참고)

---

## 8. 운영·보안 결정

- **일회성 마이그레이션 라우트 금지**: 운영 DB에 스키마를 맞추기 위해 **임시 관리자 HTTP 라우트를 배포했다가 두는 패턴**은 사용하지 않는다. 필요 시 로컬/CI에서 `npm run db:migrate` 등 **정식 경로**만 사용하고, 과거에 사용했다면 즉시 제거·계약 테스트로 잔존을 금지한다.
- **Turso `npm run db:migrate`**: `scripts/migrate-turso.mjs`가 **`.env` → `.env.local` → `.env.vercel.dev` → `.env.vercel.prod`** 를 읽어 `TURSO_*`를 주입한다(`node`는 Next처럼 자동 로드하지 않음). 적용한 `db/migrations/*.sql` 파일명은 **`_turso_applied_migrations`** 테이블에 기록되며, 이미 기록된 파일은 재실행하지 않는다. 메타가 비어 있으나 **`users` 테이블이 이미 있으면** 레거시 DB로 보고 `0000_initial.sql`만 기록상 적용 처리한 뒤 이후 파일만 실행한다. `0001_quick_actions.sql`은 **`CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`** 로 재적용이 안전하다.
- **민감 파일**: `.env*`, 로컬 마이그레이션 시크릿(예: `.migrate-secret.local`), 로컬 전용 도구 심링크 등은 Git에 올리지 않는다.

---

## 9. 검증 기준 (회귀 방지)

- **계약 테스트**: `tests/e2e/done-criteria.contract.test.mjs`가 투약 로직·가이드 힌트·타임라인·헬스·마이그레이션 금지 등 핵심 불변을 문자열/구조 레벨에서 검증한다. 이 테스트를 약화시키는 변경은 본 문서와 PRD/TRD를 동시에 갱신해야 한다.

---

## 10. 변경 절차

1. 동작 변경이 **사용자 안전·데이터 격리·인증**에 관련되면 → PRD/TRD 또는 본 문서에 먼저 근거를 남긴다.
2. Red → Green 테스트로 회귀를 고정한다.
3. `README.md`의 스택·배포 설명과 충돌하면 README를 정합화한다.
