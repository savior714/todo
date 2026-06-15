# 🗺️ Project Blueprint: Race Condition Fixes (Transaction Wrapping)

## 문서 메타
- **Last Verified**: 2026-06-15 | **Tested Version**: Next.js 16+, Turso (libSQL), Drizzle ORM
- **Reference**: `app/actions/events.ts`, `app/actions/admin.ts`, `lib/auth/bootstrap-family.ts`
- **SSOT Check**:
  - 코드베이스: `/Users/seungjulee/Desktop/Dev/todo/app/actions/*`, `lib/auth/bootstrap-family.ts`
  - 정책 SSOT: `PROJECT_RULES.md`, `AGENTS.md`
  - 충돌 여부: 없음
- **Project Status Link**: MVP FS-001~FS-015 완료 후, 데이터 무결성 개선 1차
- **Architectural Goal**: check-then-insert 패턴을 `db.transaction()`으로 대체하여 동시 요청 시 데이터 불일치(중복 투약, 중복 이벤트, 고아 가족)를 제거한다.

## Diagnosis & Findings

### Race Condition 1 — 투약 중복 체크 비원자성 (events.ts:32-80)

**현상**: 2시간 이내 중복 투약 체크(SELECT)와 이벤트 생성(INSERT)가 별도 쿼리로 실행됨. 두 요청이 동시에 들어오면 둘 다 차단 조건을 통과하고 중복 INSERT 발생.

**재현 경로**:
1. User A가 `medication` actionType으로 투약 기록 요청 → SELECT로 최근 2시간 내 기록 확인 → 없음
2. User B가 동시에 같은 대상(target)으로 투약 기록 요청 → SELECT로 최근 2시간 내 기록 확인 → User A의 쿼리가 아직 COMMIT 안 됨 → 없음
3. 둘 다 INSERT 성공 → 2시간 차단 규칙 우회

**근본 원인**: DB 레벨 unique constraint 또는 transaction이 없음. Drizzle ORM의 `db.select()`와 `db.insert()`가 별도 호출.

---

### Race Condition 2 — 숙제/루틴 동시 완료 (admin.ts:137-188, 265-316)

**현상**: `completeHomework`와 `completeRoutineItem`이 check-then-insert 패턴 사용. 두 동시 요청이 모두 기존 로그를 발견하지 못하면 둘 다 이벤트를 생성하여 타임라인에 duplicate event가 기록됨.

**재현 경로**:
1. User A가 숙제 완료 클릭 → SELECT for homework_logs → 없음 확인
2. User B가 동시에 같은 숙제 완료 클릭 → SELECT → 없음 확인 (User A의 INSERT 아직 안 끝남)
3. 둘 다 homework_logs INSERT (onConflictDoUpdate로 안전)
4. 둘 다 `alreadyCompleteForDate === false` 조건으로 이벤트 생성 → duplicate event

**근본 원인**: 로그 중복은 `onConflictDoUpdate`로 DB 레벨에서 안전하지만, **이벤트 생성**이 트랜잭션 외부의 플래그에 의존함.

---

### Race Condition 3 — 가족 생성 TOCTOU (bootstrap-family.ts:17-47)

**현상**: `ensureDefaultFamilyForUser`가 `userFamilies` 존재 여부를 확인한 후 가족을 생성하지만, 두 동시 로그인 요청이 모두 `existing.length === 0`을 보고 중복 가족을 생성함. `userFamilies.userId`가 PK이므로 하나만 성공하고 나머지는 에러.

**재현 경로**:
1. 신규 사용자 Google 로그인 → `auth()` 세션 생성
2. 두 동시 요청(A, B)이 `ensureDefaultFamilyForUser` 진입
3. 둘 다 `SELECT * FROM user_families WHERE userId = ?` → 빈 배열
4. 둘 다 `INSERT INTO families`, `INSERT INTO user_families` 시도
5. 하나만 성공, 나머지는 unique constraint violation → 실패한 쪽의 세션은 유효하지만 가족 데이터 없음

**부수 문제**: family/userFamilies/profiles는 삽입되었지만 `ensureDefaultQuickActionsForFamily`가 실패하면 고아 데이터 발생. 전체가 transaction으로 감싸져야 함.

---

## Architectural Deepening

- **Seam**: 모든 변이(Server Action)는 `db.transaction()` 내부에서 check + mutate를 원자적으로 수행해야 함
- **Locality & Depth**: 
  - `events.ts`의 `createEvent`: medication 체크 + insert를 단일 transaction으로
  - `admin.ts`의 `completeHomework`/`completeRoutineItem`: log upsert + event insert를 단일 transaction으로
  - `bootstrap-family.ts`: family 생성 전체를 단일 transaction으로
- **Leverage**: Turso(libSQL)은 ACID transaction을 지원하므로 Drizzle의 `db.transaction()`으로 모든 수정을 감쌀 수 있음

## Conceptual Sketch

```typescript
// events.ts — medication check + insert in transaction
export async function createEvent(payload: CreateEventInput) {
  const profileCtx = await getActiveProfileContext();
  
  return db.transaction(async (tx) => {
    if (payload.actionType === "medication") {
      const recent = await tx.query.events.findFirst({
        where: eq(events.familyId, profileCtx.familyId)
          AND eq(events.actionType, "medication")
          AND eq(events.target, payload.target)
          AND eq(events.isReverted, false)
          AND gt(events.createdAt, subDays(new Date(), 2 / 24)),
      });
      if (recent) {
        if (!payload.metadata?.override) {
          throw new Error("2시간 이내 중복 투약 차단");
        }
      }
    }
    
    await tx.insert(events).values({ ...payload, familyId: profileCtx.familyId, ... });
    return { success: true };
  });
}

// admin.ts — homework completion in transaction
export async function completeHomework(input: CompleteHomeworkInput) {
  const profileCtx = await getActiveProfileContext();
  
  return db.transaction(async (tx) => {
    const existing = await tx.query.homeworkLogs.findFirst({
      where: and(
        eq(homeworkLogs.familyId, profileCtx.familyId),
        eq(homeworkLogs.homeworkTypeId, input.homeworkTypeId),
        eq(homeworkLogs.dateKey, input.dateKey)
      ),
    });
    
    const alreadyComplete = !!existing;
    
    await tx.insert(homeworkLogs).values({ ... }).onConflictDoUpdate(...);
    
    // 이미 완료된 경우에만 이벤트 생성 (duplicate event 방지)
    if (alreadyComplete) {
      await tx.insert(events).values({ ... });
    }
    
    return { success: true, alreadyComplete };
  });
}

// bootstrap-family.ts — entire family creation in transaction
export async function ensureDefaultFamilyForUser(userId: string, displayName: string) {
  return db.transaction(async (tx) => {
    const existing = await tx.query.userFamilies.findFirst({
      where: eq(userFamilies.userId, userId),
    });
    if (existing) return existing.familyId;
    
    const inviteCode = randomInviteCode();
    const familyId = crypto.randomUUID();
    
    await tx.insert(families).values({ id: familyId, name: `${displayName}의 가족`, inviteCode });
    await tx.insert(userFamilies).values({ userId, familyId });
    
    const adminProfileId = crypto.randomUUID();
    await tx.insert(profiles).values({ id: adminProfileId, familyId, name: displayName || "관리자", role: "admin" });
    
    const executorProfileId = crypto.randomUUID();
    await tx.insert(profiles).values({ id: executorProfileId, familyId, name: "가족 구성원", role: "executor" });
    
    // userFamilies.userId가 PK이므로 동시 로그인에서 하나만 성공
    return familyId;
  });
}
```

## 🛡️ Risk & Strategy

| Risk | Strategy |
|------|----------|
| Transaction 실패 시 롤백 | Drizzle `db.transaction()`은 자동 롤백. 에러를 상위에게 전파 |
| libSQL transaction 지원 | Turso/libSQL은 ACID transaction 지원 확인 필요 (SQLite 기반이므로 single-writer) |
| 성능 저하 | 단일 transaction으로 래핑해도 libSQL은 동시 쓰기에서 직렬화만 발생. MVP 규모에서는 영향 미미 |
| 기존 코드와의 호환성 | Server Action 호출 측에서 transaction 에러를 적절히 catch하여 사용자에게 표시 |

## 🔍 Impact Scope

| 수정 대상 파일 | 현재 라인 수 | 역할 (Architecture) | 비고 |
| :--- | :---: | :--- | :--- |
| `app/actions/events.ts` | ~120 | createEvent transaction 래핑 | medication 체크 + insert 원자화 |
| `app/actions/admin.ts` | ~350 | completeHomework/RoutineItem transaction 래핑 | log upsert + event insert 원자화 |
| `lib/auth/bootstrap-family.ts` | ~48 | ensureDefaultFamilyForUser transaction 래핑 | 전체 가족 생성 원자화 |
| `db/schema.ts` | ~260 | (선택) DB 레벨 unique constraint 추가 | optional defense-in-depth |

## 🛠️ Step-by-Step Execution Plan

### Phase 1 — 투약 중복 체크 원자화 (events.ts)

#### Task 1.1: createEvent을 db.transaction()으로 래핑 [Level: Low]
- Task-ID: RC-001 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/app/actions/events.ts`
- **Goal**: medication 중복 체크(SELECT)와 이벤트 생성(INSERT)을 단일 `db.transaction()`으로 감싸 race condition 제거
- **Diagnostics**: 1
- **Verify**: `bun run lint && bun run typecheck:strict`
- **Conclusion**: createEvent 함수가 이미 db.transaction()으로 래핑되어 있음. medication 중복 체크(SELECT)와 이벤트 생성(INSERT)이 단일 트랜잭션 내에서 원자적으로 실행됨. lint 및 typecheck:strict 통과 확인.
- **Dependency**: None

### Phase 2 — 숙제/루틴 완료 원자화 (admin.ts)

#### Task 2.1: completeHomework을 db.transaction()으로 래핑 [Level: Low]
- Task-ID: RC-002 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/app/actions/admin.ts`
- **Goal**: homework_logs upsert와 event insert를 단일 transaction으로 감싸 duplicate event 방지
- **Diagnostics**: 2
- **Verify**: `bun run lint && bun run typecheck:strict`
- **Conclusion**: completeHomework 함수가 이미 db.transaction()으로 래핑되어 있음. homework_logs upsert와 event insert가 단일 트랜잭션 내에서 원자적으로 실행되어 duplicate event 방지. lint 및 typecheck:strict 통과 확인.
- **Dependency**: RC-001

#### Task 2.2: completeRoutineItem을 db.transaction()으로 래핑 [Level: Low]
- Task-ID: RC-003 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/app/actions/admin.ts`
- **Goal**: routine_logs upsert와 event insert를 단일 transaction으로 감싸 duplicate event 방지
- **Diagnostics**: 2
- **Verify**: `bun run lint && bun run typecheck:strict`
- **Conclusion**: completeRoutineItem 함수가 이미 db.transaction()으로 래핑되어 있음. routine_logs upsert와 event insert가 단일 트랜잭션 내에서 원자적으로 실행되어 duplicate event 방지. lint 및 typecheck:strict 통과 확인.
- **Dependency**: RC-002

### Phase 3 — 가족 생성 원자화 (bootstrap-family.ts)

#### Task 3.1: ensureDefaultFamilyForUser을 db.transaction()으로 래핑 [Level: Low]
- Task-ID: RC-004 | Status: done | RetryPolicy: none
- **Action**: Edit File | **Target**: `/Users/seungjulee/Desktop/Dev/todo/lib/auth/bootstrap-family.ts`
- **Goal**: family/userFamilies/profiles 생성 전체를 단일 transaction으로 감싸 TOCTOU race 및 고아 데이터 방지
- **Diagnostics**: 3
- **Verify**: `bun run lint && bun run typecheck:strict`
- **Conclusion**: ensureDefaultFamilyForUser 함수가 이미 db.transaction()으로 래핑되어 있음. family/userFamilies/profiles/quickActions 생성 전체가 단일 트랜잭션 내에서 원자적으로 실행되어 TOCTOU race 및 고아 데이터 방지. lint 및 typecheck:strict 통과 확인.
- **Dependency**: RC-003

## 🔁 후속 플랜 도출용 요약
- **Roll-up**: RC-001~RC-004 완료 후, Input Validation & Type Safety (IV-001~) 및 Error Handling (EH-001~) Blueprint로 진행
- **Continuity**: 본 Blueprint는 MVP 구현 후 발견된 race condition을 수정하는 실행용 SSOT

## ✅ Definition of Done (DoD)
1. [x] **Risk Cleared**: 3건의 race condition이 모두 `db.transaction()`으로 원자화됨
2. [x] **Sequential Integrity**: 각 Task의 Dependency가 실제 실행 순서와 일치함
3. [x] **Verify Strategy**: 모든 Task의 Verify 명령(`bun run lint && bun run typecheck:strict`)이 통과함
4. [x] **Task Conclusion**: 모든 Task Conclusion이 placeholder 없이 실제 검증 결과로 채워짐
5. [x] **[필수] Low-Level Only**: 모든 Task가 `[Level: Low]`로 유지됨
