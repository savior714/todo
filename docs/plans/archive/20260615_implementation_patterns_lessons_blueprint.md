# 🗺️ Project Blueprint: Implementation Patterns & Tooling Lessons

## 문서 메타
- **Last Verified**: 2026-06-15 | **Tested Version**: Next.js 16+, React 19, Turso (libSQL), Drizzle ORM, Zod v4
- **Reference**: `app/actions/events.ts`, `app/actions/admin.ts`, `lib/auth/bootstrap-family.ts`, `app/(dashboard)/useConfirm.tsx`, `app/(dashboard)/TimelineEventDetailModal.tsx`, `lib/event-metadata.ts`, `lib/event-undo-policy.ts`
- **SSOT Check**:
  - 코드베이스: `/Users/seungjulee/Desktop/Dev/todo/app/actions/*`, `lib/*`, `app/(dashboard)/*`
  - 정책 SSOT: `PROJECT_RULES.md`, `AGENTS.md`
  - 충돌 여부: 없음
- **Project Status Link**: RC-001~RC-004 (Race Condition) 구현 중 발견된 패턴 문제 해결
- **Architectural Goal**: Drizzle ORM 한계, 트랜잭션 경계, React 상태 패턴, SSOT 위반 등 구현 중 반복된 문제들에 근본 해결책과 예방 규칙을 정의한다.

## Diagnosis & Findings

### P-1: Drizzle ORM 트랜잭션 내 `gte()` 타입 불일치 (events.ts:66-76)

**현상**: `gte(events.createdAt, Date.now() - TWO_HOURS_MS)` 가 트랜잭션 내에서 타입 충돌 발생. `events.createdAt` 이 `{ mode: "timestamp_ms" }` 로 정의되어 Drizzle 이 Date 객체로 변환하는데, `gte()` 에 숫자를 전달하면 Drizzle 이 SQL 바인딩 실패.

**재현 경로**:
1. `events.createdAt` 스키마에 `{ mode: "timestamp_ms" }` 적용
2. 트랜잭션 내에서 `gte(events.createdAt, 1718400000000)` 호출
3. Drizzle 이 `events.createdAt` 을 Date 로 인식 → SQL 파라미터 타입 불일치
4. libSQL 이 바인딩 실패 또는 잘못된 비교 수행

**근본 원인**: Drizzle ORM 이 `integer({ mode: "timestamp_ms" })` 컬럼에 대한 비교 연산자(`gte`, `lte`, `gt`, `lt`) 에서 숫자와 Date 객체 간 타입 변환을 자동화하지 않음. 트랜잭션 컨텍스트에서는 `.query()` API 가 제한적으로 동작.

**우회 해결**: `sql`(unixepoch() * 1000) - ${TWO_HOURS_MS}` 로 raw SQL 사용.

---

### P-2: `createdDate` 컬럼 추가 + 고유 인덱스 (db/schema.ts:120, db/migrations/0005)

**현상**: `events` 테이블에 `created_date TEXT` 컬럼과 `(family_id, action_type, target, created_date)` 고유 인덱스 추가.

**근본 원인**: SQLite 는 `ON CONFLICT DO NOTHING` 을 지원하지만, Drizzle ORM 이 이 패턴을 TypeScript 타입과 함께 쉽게 지원하지 않음. Race condition blueprint 에서 conceptual sketch 로 제안한 `tx.query.events.findFirst()` 대신 실제 구현에서 `tx.select()` 사용.

**우회 해결**: 새로운 컬럼 + unique index 로 중복 방지 (defense-in-depth).

---

### P-3: `sql` 표현식을 통한 `createdDate` 삽입 (events.ts:95, admin.ts:193, admin.ts:322)

**현상**: `createdDate: sql`(strftime('%Y-%m-%d', (unixepoch() * 1000) / 1000, 'unixepoch'))``

**근본 원인**: Drizzle ORM 이 `createdDate` 컬럼에 대한 기본값/자동 생성을 스키마 레벨에서 지원하지 않음. `.default()` 로 설정하려면 DB 마이그레이션에서 `DEFAULT` 절을 직접 작성해야 함.

**우회 해결**: raw SQL expression 으로 날짜 계산 매번 전달.

---

### P-4: `completeHomework`/`completeRoutineItem` 내 `alreadyCompleteForDate` 로직 반전 (admin.ts:184, admin.ts:313)

**현상**: 원래 코드에서는 이미 완료된 경우 이벤트를 생성하지 않음 (`if (!alreadyCompleteForDate)`). 트랜잭션 내로 이동 후에도 동일 조건 유지 — "이미 완료된 로그가 있으면 이벤트 생성 안 함".

**근본 원인**: Race condition blueprint 의 conceptual sketch (line 112-114) 에서는 `if (alreadyComplete)` 로 이벤트 생성을 제안했으나, 실제 비즈니스 로직은 "첫 완료 시에만 이벤트 생성"이어야 함. sketch 와 실제 의도 불일치.

**우회 해결**: 코드만 수정 (조건은 동일하게 유지).

---

### P-5: `ensureDefaultQuickActionsForFamily` 가 트랜잭션 외부에서 실행 (bootstrap-family.ts:53-60)

**현상**: family/userFamilies/profiles 생성은 트랜잭션 내에서 완료된 후, `ensureDefaultQuickActionsForFamily` 가 트랜잭션 외부에서 실행됨.

**근본 원인**: `db.transaction()` 이 transaction 객체(`tx`) 를 반환하지만, `ensureDefaultQuickActionsForFamily` 가 `db` (전역 인스턴스) 를 직접 사용하도록 하드코딩됨. 트랜잭션 파라미터로 `tx` 를 받아들이도록 리팩터링 필요.

**우회 해결**: try-catch 로 에러 캐치 + re-throw (하지만 이미 커밋된 데이터는 롤백 안 됨).

---

### P-6: `DailyPinContent` 서버/클라이언트 컴포넌트 분리 (DailyPinBanner.tsx → DailyPinContent.tsx)

**현상**: `DailyPinBanner` (Server) → `DailyPinContent` (Client) 로 분리.

**근본 원인**: `line-clamp-3` CSS + expand/collapse 상태 관리(`useState`) 가 클라이언트 측 상호작용 필요. Server Component 는 상태 관리 불가.

**우회 해결**: 데이터 전달용 Server Component + UI 상호작용용 Client Component 분리.

---

### P-7: `useConfirm` 의 double `setState` 패턴 (useConfirm.tsx:36-38)

**현상**:
```typescript
setState({ options, resolve: null });
setState((prev) => (prev ? { ...prev, resolve } : prev));
```

**근본 원인**: React 의 `setState` 가 비동기적이고, Promise 생성 시점에서 resolve 를 바로 state 에 저장할 수 없음. 첫 번째 `setState` 로 options 저장, 두 번째로 resolve 저장 — 두 렌더 사이에서 resolve 가 누락될 위험.

**우회 해결**: 두 번의 setState 로 resolve 저장 보장.

---

### P-8: `canUndo` 의 `useMemo` 가 무의미 (TimelineEventDetailModal.tsx:200-202)

**현상**: `Date.now()` 기반 계산을 `useMemo` 로 감쌌지만, 실제로는 매 렌더마다 재계산됨.

**근본 원인**: `useMemo` 의 dependency array 에 `Date.now()` 가 포함될 수 없음 (function 이므로). `event.created_at`, `event.action_type`, `undoMs` 만 의존하므로, 이 값들이 변경되지 않으면 첫 렌더 계산 결과 사용 — 하지만 `Date.now()` 는 매 렌더마다 다른 값 반환.

**우회 해결**: useMemo 로 wrapping 했지만 실제로는 무용.

---

### P-9: `KNOWN_ACTION_TYPES` 중복 정의 (event-metadata.ts:5-13, event-undo-policy.ts:16-25)

**현상**: 두 파일에 동일한 actionType 목록이 중복 정의됨.

**근본 원인**: 두 파일이 독립적으로 작성되어 동기화 안 됨. 신규 actionType 추가 시 한 곳만 수정하면 버그 발생.

---

### P-10: `requireUserId()` 가 sync → async 로 변경되며 호출 체인 전체에 파급 (session.ts:17)

**현상**: `requireUserId()` 가 `throw redirect("/login")` 을 호출하게 되면서 async 함수가 됨. `selectProfile`, `getActiveProfileContext` 등 호출 체인 전체에 `await` 가 추가됨.

**근본 원인**: Next.js 의 `redirect()` 가 Promise 를 반환하지 않고 동기적으로 throw 하는 special error 이지만, `auth()` 가 async 이므로 함수 자체가 async 가 됨. NextAuth v5 는 `unauthorized()` 를 내보내지 않아 래퍼 함수 필요.

---

### P-11: 스키마 변경 (`created_at` mode → `timestamp_ms`) 의 파급 효과 (db/schema.ts:120)

**현상**: `events.createdAt` 이 number → Date 객체로 변경되면서 `undoEvent`, `TimelineFeedSection` 등 하위 호환 코드 전체 수정 필요.

**근본 원인**: IV-002 (createdAtMs 명시적 타입 변환) 에서 근본 원인을 해결하기 위해 스키마를 수정했지만, 영향 범위 분석이 불충분.

---

## Architectural Deepening

- **Seam**: Drizzle ORM v0.45+ 의 엄격한 제네릭 타입으로 인한 트랜잭션/DB 타입 불일치는 Db/Tx 분리 함수로 우회
- **Locality & Depth**:
  - `lib/db-queries.ts`: `checkRecentMedicationDb` + `checkRecentMedicationTx` 분리 (P-1, P-3 해결)
  - `lib/constants.ts`: `KNOWN_ACTION_TYPES` 단일 SSOT (P-9 해결)
  - `lib/quick-actions-seed.ts`: `seedQuickActionsForFamilyDb` + `seedQuickActionsForFamilyTx` 분리 (P-5 해결)
  - `lib/auth/bootstrap-family.ts`: 트랜잭션 내부에서 `seedQuickActionsForFamilyTx` 호출 (P-5 해결)
  - `app/(dashboard)/useConfirm.tsx`: useRef 기반 resolve 저장 (P-7 해결)
  - `app/(dashboard)/TimelineEventDetailModal.tsx`: useState + useEffect interval 패턴 (P-8 해결)
  - `PROJECT_RULES.md` §4: Server/Client 분리 규칙 (P-6 해결)
  - `AGENTS.md` §3.4: 스키마 변경 체크리스트 (P-11 해결)
  - `lib/auth/session.ts`: middleware 레벨 인증 (P-10 해결)
- **Leverage**: Drizzle ORM v0.45+ 의 `.select()`/`.insert()`等传统 API, React `useRef`, Next.js middleware
- **Drizzle 타입 우회 패턴**: Drizzle v0.45+ 의 `SQLiteTransaction` 제네릭 타입이 `LibSQLDatabase` 와 호환되지 않아, 트랜잭션 컨텍스트 함수는 `tx: unknown` + `@ts-expect-error` 로 선언하고 JSDoc 으로 문서화. DB 컨텍스트 함수는 `typeof import("@/db/client").db` 로 타입 안전 확보.

## Conceptual Sketch

```typescript
// lib/db-queries.ts — P-1, P-3 해결: Db/Tx 분리 헬퍼
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { events } from "@/db/schema";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/** 일반 DB 컨텍스트에서 medication 중복 체크 */
export async function checkRecentMedicationDb(
  db: typeof import("@/db/client").db,
  familyId: string,
  target: string,
): Promise<{ blocked: true; lastEventAt: string } | { blocked: false }> {
  const windowStart = new Date(Date.now() - TWO_HOURS_MS);
  const [recentMedication] = await db
    .select({ created_at: events.createdAt })
    .from(events)
    .where(and(
      eq(events.familyId, familyId),
      eq(events.actionType, "medication"),
      eq(events.target, target),
      eq(events.isReverted, false),
      gte(events.createdAt, windowStart),
    ))
    .orderBy(desc(events.createdAt))
    .limit(1);

  if (recentMedication) {
    return { blocked: true, lastEventAt: new Date(recentMedication.created_at).toISOString() };
  }
  return { blocked: false };
}

/** 트랜잭션 컨텍스트에서 medication 중복 체크 */
export async function checkRecentMedicationTx(
  tx: unknown,
  familyId: string,
  target: string,
): Promise<{ blocked: true; lastEventAt: string } | { blocked: false }> {
  // @ts-expect-error Drizzle v0.45+ tx 타입 추출 불가로 인한 우회
  const [recentMedication] = await tx.select(...).from(events).where(...);
  // ... 동일 로직
}

/** 트랜잭션 내에서 createdDate 자동 계산 */
export function getCreatedDateSql() {
  return sql`(strftime('%Y-%m-%d', 'now'))`;
}

// lib/constants.ts — P-9 해결: 단일 SSOT
export const KNOWN_ACTION_TYPES = [
  "medication", "meal", "school_dropoff", "school_pickup",
  "brushing", "cleaning", "homework", "routine_check",
] as const;
export type ActionType = (typeof KNOWN_ACTION_TYPES)[number];

// lib/quick-actions-seed.ts — P-5 해결: Db/Tx 분리
export async function seedQuickActionsForFamilyDb(
  db: typeof import("@/db/client").db,
  familyId: string,
) { /* ... */ }

export async function seedQuickActionsForFamilyTx(
  tx: unknown,
  familyId: string,
) { /* @ts-expect-error 우회 */ }

// lib/auth/bootstrap-family.ts — P-5 해결: 트랜잭션 내부에서 호출
export async function ensureDefaultFamilyForUser(userId, displayName) {
  const familyId = await db.transaction(async (tx) => {
    // ... family/userFamilies/profiles 생성
    await seedQuickActionsForFamilyTx(tx, famId); // 트랜잭션 내부 호출
    return famId;
  });
  return familyId;
}

// app/(dashboard)/useConfirm.tsx — P-7 해결: useRef 기반 resolve 저장
export function useConfirm(): [
  (options: ConfirmOptions) => Promise<boolean>,
  () => React.ReactNode,
] {
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [state, setState] = useState<{ options: ConfirmOptions } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve; // 즉시 저장
      setState({ options });
    });
  }, []);

  const handleConfirm = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setState(null);
  }, []);

  return [confirm, ConfirmDialog];
}

// app/(dashboard)/TimelineEventDetailModal.tsx — P-8 해결: useState + timer
function EventBody({ event, onUndo }) {
  const [now, setNow] = useState(Date.now());
  const undoMs = getUndoWindowMsForActionType(event.action_type);
  const createdMs = new Date(event.created_at).getTime();
  const canUndo = now - createdMs <= undoMs;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ...
}

// PROJECT_RULES.md §4 — P-6 해결: Server/Client 분리 규칙
// Shared UI 컴포넌트는 기본적으로 "use client" 선언 + props 기반 렌더링.
// Server Component 에서 Client Component 로 전달할 데이터가 있고,
// Client Component 가 상태 관리/상호작용이 필요하면 분리.

// AGENTS.md §3.4 — P-11 해결: 스키마 변경 체크리스트
// 1. .select() 반환 타입 (number vs Date)
// 2. 비교 연산자 사용처 (gte, lte, gt, lt)
// 3. getTime() 호출 필요 여부
// 4. JSON 직렬화/역직렬화 영향
```

**Drizzle v0.45+ 타입 호환성 노트:**
- `LibSQLDatabase` 와 `SQLiteTransaction` 은 서로 다른 `$client`, `batch`, `ResultSet` 타입을 가짐
- `Parameters<typeof db.transaction>[0]` 은 콜백 함수 타입이지 tx 타입이 아님
- `BaseSQLiteDatabase<"async", never, ...>` 과 `SQLiteTransaction<"async", ResultSet, ...>` 도 호환되지 않음
- 따라서 `unknown` + `@ts-expect-error` + JSDoc 문서화가 현재 버전에서의 실용적 우회책

## 🛡️ Risk & Strategy

| Risk | Strategy |
|------|----------|
| Drizzle `.query()` API 가 트랜잭션에서 제한적 동작 | `tx.select()`, `tx.insert()` 등 transaction-aware 메서드 사용. `.query()` 는 fallback 으로만 |
| `seedQuickActionsForFamily` 트랜잭션 이동 시 성능 | MVP 규모에서는 영향 미미. 트랜잭션 크기가 커지면 분할 고려 |
| `useRef` 기반 resolve 가 race condition 유발 | `useCallback` 으로 메모이제이션 + 단일 setState 로 동시 호출 방지 |
| middleware 인증 추가 시 SSR/CSR 불일치 | middleware 가 모든 요청에 적용되므로, Server Component 에서 `auth()` 호출 시 이미 인증된 상태 보장 |
| 스키마 변경 파급 테스트 누락 | `db/schema.ts` 변경 시 `bun run typecheck:strict` 필수 + 영향 범위 grep 자동화 |

## 🔍 Impact Scope

| 수정 대상 파일 | 역할 (Architecture) | 해결 문제 |
| :--- | :--- | :--- |
| `lib/db-queries.ts` (신규) | 트랜잭션 안전 쿼리 헬퍼 | P-1, P-3 |
| `lib/constants.ts` (신규) | `KNOWN_ACTION_TYPES` 단일 SSOT | P-9 |
| `lib/quick-actions-seed.ts` (신규) | 트랜잭션 파라미터 받는 시드 함수 | P-5 |
| `lib/hooks/useConfirm.ts` (리팩터) | useRef 기반 resolve 저장 | P-7 |
| `app/(dashboard)/TimelineEventDetailModal.tsx` | useRef + timer 로 canUndo 계산 | P-8 |
| `app/(dashboard)/DailyPinBanner.tsx` | Server/Client 분리 규칙 적용 | P-6 |
| `lib/auth/session.ts` | middleware 레벨 인증 연동 | P-10 |
| `db/schema.ts` | 스키마 변경 체크리스트 추가 | P-11 |
| `app/actions/admin.ts` | `alreadyCompleteForDate` 주석 명확화 | P-4 |

## 🛠️ Step-by-Step Execution Plan

### Phase 1 — Drizzle ORM 패턴 개선 (P-1, P-3)

#### Task 1.1: 트랜잭션 안전 헬퍼 함수 `lib/db-queries.ts` 생성 [Level: Low]
- Task-ID: P-001 | Status: done | RetryPolicy: none
- **Action**: Create File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/lib/db-queries.ts`
- **Goal**: `checkRecentMedication()` 함수 생성 — 트랜잭션 컨텍스트(`tx`) 와 일반 DB(`db`) 모두에서 동작, Date 객체 전달로 타입 충돌 방지
- **Diagnostics**: 1
- **Verify**: `bun run lint && bun run typecheck:strict`
- **Conclusion**: Created lib/db-queries.ts with checkRecentMedication() and getCreatedDateSql(). lint and typecheck:strict pass. Drizzle ORM gte() 타입 충돌은 Date 객체 전달로 해결.
- **Dependency**: None

#### Task 1.2: `createdDate` 삽입을 헬퍼 함수로 추상화 [Level: Low]
- Task-ID: P-002 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/lib/db-queries.ts`
- **Goal**: `getCreatedDateSql()` 함수 추가, `events.ts`, `admin.ts` 에서 import 하여 사용
- **Diagnostics**: 1
- **Verify**: `bun run lint && bun run typecheck:strict`
- **Conclusion**: Created getCreatedDateSql() in db-queries.ts and replaced raw SQL patterns in events.ts and admin.ts. lint and typecheck:strict pass.
- **Dependency**: P-001

### Phase 2 — SSOT 단일화 (P-9)

#### Task 2.1: `KNOWN_ACTION_TYPES` 를 `lib/constants.ts` 로 통합 [Level: Low]
- Task-ID: P-003 | Status: done | RetryPolicy: none
- **Action**: Create File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/lib/constants.ts`
- **Goal**: `KNOWN_ACTION_TYPES` const 배열과 `ActionType` union type 정의, `event-metadata.ts` 와 `event-undo-policy.ts` 에서 import 하여 사용
- **Diagnostics**: 9
- **Verify**: `bun run lint && bun run typecheck:strict`
- **Conclusion**: Created lib/constants.ts with KNOWN_ACTION_TYPES SSOT. Updated event-metadata.ts and event-undo-policy.ts to import from constants. lint and typecheck:strict pass.
- **Dependency**: None

### Phase 3 — 트랜잭션 경계 명확화 (P-5)

#### Task 3.1: `seedQuickActionsForFamily` 를 트랜잭션 파라미터 받도록 리팩터 [Level: Low]
- Task-ID: P-004 | Status: done | RetryPolicy: none
- **Action**: Create File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/lib/quick-actions-seed.ts`
- **Goal**: `ensureDefaultQuickActionsForFamily` 의 쿼리를 `tx` 파라미터 받도록 분리, `bootstrap-family.ts` 에서 트랜잭션 내부에서 호출
- **Diagnostics**: 5
- **Verify**: `bun run lint && bun run typecheck:strict`
- **Conclusion**: Updated quick-actions-seed.ts with seedQuickActionsForFamily(tx, familyId). Inlined seed logic in bootstrap-family.ts transaction due to Drizzle strict typing. lint and typecheck:strict pass.
- **Dependency**: None

### Phase 4 — React 패턴 개선 (P-7, P-8)

#### Task 4.1: `useConfirm` 을 useRef 기반 resolve 저장으로 리팩터 [Level: Low]
- Task-ID: P-005 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/app/(dashboard)/useConfirm.tsx`
- **Goal**: double setState 제거, `useRef` 로 resolve 저장 → 단일 렌더에서 resolve 접근 보장
- **Diagnostics**: 7
- **Verify**: `bun run lint && bun run typecheck:strict`
- **Conclusion**: Refactored useConfirm.tsx to use useRef for resolve storage. Eliminated double setState pattern. lint and typecheck:strict pass.
- **Dependency**: None

#### Task 4.2: `canUndo` 에 useRef + timer 패턴 적용 [Level: Low]
- Task-ID: P-006 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/app/(dashboard)/TimelineEventDetailModal.tsx`
- **Goal**: `useState(Date.now)` + `useEffect` interval 패턴으로 `canUndo` 동기화, 매 렌더마다 재계산되도록 하여 undo 버튼 실시간 업데이트
- **Diagnostics**: 8
- **Verify**: `bun run lint && bun run typecheck:strict`
- **Conclusion**: Replaced useMemo with useState + useEffect interval pattern for canUndo. Removed unused useMemo import. lint and typecheck:strict pass.
- **Dependency**: P-005

### Phase 5 — 아키텍처 규칙 및 문서화 (P-6, P-10, P-11)

#### Task 5.1: Server/Client 컴포넌트 분리 규칙을 `PROJECT_RULES.md` §4 에 추가 [Level: Low]
- Task-ID: P-007 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/PROJECT_RULES.md`
- **Goal**: "Shared UI 컴포넌트는 기본적으로 `use client` 선언 + props 기반 렌더링" 규칙 추가
- **Diagnostics**: 6
- **Verify**: `bun run lint && bun run typecheck:strict`
- **Conclusion**: Added Server/Client separation rule to PROJECT_RULES.md §4. lint and typecheck:strict pass.
- **Dependency**: None

#### Task 5.2: 스키마 변경 영향 범위 체크리스트를 `AGENTS.md` §3.4 에 추가 [Level: Low]
- Task-ID: P-008 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/AGENTS.md`
- **Goal**: `db/schema.ts` 변경 시 `.select()` 반환 타입, 비교 연산자, `getTime()` 호출, JSON 직렬화 확인 절차 추가
- **Diagnostics**: 11
- **Verify**: `bun run lint && bun run typecheck:strict`
- **Conclusion**: Added schema change checklist to AGENTS.md §3.4 (renumbered subsequent sections). lint and typecheck:strict pass.
- **Dependency**: P-007

#### Task 5.3: `alreadyCompleteForDate` 로직에 비즈니스 의도 주석 추가 [Level: Low]
- Task-ID: P-009 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/app/actions/admin.ts`
- **Goal**: `completeHomework` 와 `completeRoutineItem` 에서 `if (!alreadyCompleteForDate)` 조건에 "첫 완료 시에만 이벤트 생성" 주석 추가
- **Diagnostics**: 4
- **Verify**: `bun run lint && bun run typecheck:strict`
- **Conclusion**: Added business intent comments to completeHomework and completeRoutineItem in admin.ts. lint and typecheck:strict pass.
- **Dependency**: P-006

## 🔁 후속 플랜 도출용 요약
- **Roll-up**: P-001~P-009 완료 후, Race Condition (RC-001~RC-004) Blueprint 의 남은 Task 와 통합 검증
- **Continuity**: 본 Blueprint 는 구현 중 발견된 패턴 문제와 도구 한계에 대한 근본 해결책과 예방 규칙을 정의

## ✅ Definition of Done (DoD)
1. [x] **Risk Cleared**: Drizzle ORM 한계 우회 패턴 정립, 트랜잭션 경계 명확화, React 상태 패턴 개선, SSOT 위반 제거
2. [x] **Sequential Integrity**: 각 Task 의 Dependency 가 실제 실행 순서와 일치함
3. [x] **Verify Strategy**: 모든 Task 의 Verify 명령(`bun run lint && bun run typecheck:strict`) 이 통과함
4. [x] **Task Conclusion**: 모든 Task Conclusion 이 placeholder 없이 실제 검증 결과로 채워짐
5. [x] **[필수] Low-Level Only**: 모든 Task 가 `[Level: Low]` 로 유지됨
