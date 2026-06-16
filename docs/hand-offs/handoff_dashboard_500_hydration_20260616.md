# Hand-off: Dashboard 500 / Hydration #418 근본 원인 분석 및 수정

## 세션 시작 시必读

이 세션은 기존 세션에서 분석한 **대시보드 500 에러 + React Error #418 하이드레이션 불일치**의 근본 원인 수정을 이어받는 작업이다.

**기존 세션 결과:**
- `TimelineFeedSection.tsx` — DB 쿼리 try/catch 추가 완료 (커밋 `2c709a9`)
- 근본 원인 분석 완료 (아래 참조)
- `git.md` 워크플로우 기준: `bun run lint && bun run typecheck:strict && bun run test && just ci`

**중요:** `git commit --no-verify` 절대 금지. AGENTS.md §7.3 준수.

---

## 1. 문제 요약

### 500 에러 (브라우저 `Failed to load resource: 500`)

**시나리오 A (로컬):** `TURSO_DATABASE_URL` 누락 → `db/client.ts:12-14` 모듈 import 시점 throw
**시나리오 B (Vercel 운영):** `.env.vercel.prod`에서 `AUTH_SECRET=""`, `AUTH_GOOGLE_ID=""`, `AUTH_GOOGLE_SECRET=""` 빈 값 → Auth.js 세션 서명 실패

### Error #418 (Hydration Mismatch — `args[]=text&args[]=`)

**주범:** `app/(dashboard)/TimelineFeed.tsx` — `"use client"` 컴포넌트 내부 `new Date()` 기반 렌더링 분기

| 우선순위 | 파일:라인 | 문제 |
|---------|----------|------|
| 치명적 | `TimelineFeed.tsx:83` | `useState(() => startOfLocalDay(new Date()))` — SSR/CSR 초기값 불일치 |
| 치명적 | `TimelineFeed.tsx:88` | `todayLocalKey = formatDateKey(startOfLocalDay(new Date()))` — 렌더 분기 차이 |
| 치명적 | `TimelineFeed.tsx:95-101` | `useMemo(() => { const now = new Date(); ... }, [])` — 날짜 캐시 불일치 |
| 치명적 | `TimelineFeed.tsx:396` | `Date.now() - createdMs <= undoMs` — `canUndo` boolean 차이 → DOM 구조 차이 |

### 추가 발견: `DashboardDeferred.tsx` try/catch 누락

`TimelineFeedSection.tsx`와 동일 패턴 — 3개 쿼리가 try/catch 없음:
- `homeworkTypes` 조회 (line 59-67)
- `routineItems` 조회 (line 68-76)
- `homeworkLogs` 조회 (line 78-81)

---

## 2. 수정 계획

### Task 1: Vercel 환경 변수 검증 (우선순위 최상)

**목표:** 500 에러의 근본 원인(환경 변수)을 확인하고 수정

1. `.env.vercel.prod` 파일 확인 — `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`이 빈 값인지 확인
2. Vercel 대시보드 환경 변수와 비교
3. 빈 값이면 Vercel 대시보드에서 실제 값으로 설정 후 redeploy

**검증:**
```bash
# 로컬에서 재현 테스트
cp .env.example .env.local
# TURSO 변수만 채우고 AUTH_SECRET 비워둔 채 dev 기동 → 500 재현 확인
bun run dev
```

**참고:** `.env.vercel.prod`는 Vercel CI export 파일. Vercel 대시보드가 SSOT.

---

### Task 2: TimelineFeed.tsx 하이드레이션 불일치 수정

**목표:** `new Date()` 기반 렌더링 분기를 서버 계산 prop 전달 방식으로 변경

**현재 구조:**
```tsx
// TimelineFeed.tsx — "use client" 컴포넌트
const centerDate = useState(() => startOfLocalDay(new Date())); // line 83
const todayLocalKey = formatDateKey(startOfLocalDay(new Date())); // line 88
const dateCache = useMemo(() => { const now = new Date(); ... }, []); // line 95
const canUndo = Date.now() - new Date(event.created_at).getTime() <= undoMs; // line 396
```

**수정 방향:**

1. **서버에서 날짜 계산 prop으로 전달**
   - `TimelineFeedSection.tsx` (서버 컴포넌트)에서 `todayKey`, `yesterdayKey`, `tomorrowKey` 계산
   - `TimelineFeed` 컴포넌트에 prop으로 전달

2. **클라이언트에서 prop 사용**
   - `useState(() => startOfLocalDay(new Date()))` → `useState(initialCenterDate)` prop 기반
   - `todayLocalKey` 계산 → prop으로 받은 값 사용
   - `useMemo` 내 `new Date()` → prop 기반 상수 사용
   - `canUndo` → SSR 시 false 고정 또는 client-only render 분기

3. **구체적 수정안:**

```tsx
// TimelineFeedSection.tsx (서버 컴포넌트)에 추가:
const todayKey = formatDateKey(startOfLocalDay(new Date()));
const yesterdayKey = formatDateKey(addDays(startOfLocalDay(new Date()), -1));
const tomorrowKey = formatDateKey(addDays(startOfLocalDay(new Date()), 1));

// TimelineFeed에 prop 전달:
<TimelineFeed
  initialTodayKey={todayKey}
  initialYesterdayKey={yesterdayKey}
  initialTomorrowKey={tomorrowKey}
  ...
/>
```

```tsx
// TimelineFeed.tsx (클라이언트 컴포넌트) 수정:
type TimelineFeedProps = {
  initialTodayKey: string;
  initialYesterdayKey: string;
  initialTomorrowKey: string;
  ...
};

export default function TimelineFeed({ initialTodayKey, initialYesterdayKey, initialTomorrowKey, ... }: TimelineFeedProps) {
  const [centerDate, setCenterDate] = useState(() => {
    // prop으로 받은 todayKey 기반으로 초기값 계산
    return initialTodayKey; // 또는 parse 해서 Date 객체
  });

  const todayLocalKey = initialTodayKey; // 계산 제거

  const dateCache = useMemo(() => ({
    yesterdayKey: initialYesterdayKey,
    todayKey: initialTodayKey,
    tomorrowKey: initialTomorrowKey,
  }), [initialYesterdayKey, initialTodayKey, initialTomorrowKey]);

  // canUndo 처리 — SSR/CSR 불일치 방지
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const canUndo = isClient && Date.now() - new Date(event.created_at).getTime() <= undoMs;
  // 또는 SSR 시 항상 false: const canUndo = false; (UI에서 "실행 취소는 상세에서" 고정)
}
```

**검증:**
- `bun run typecheck:strict` — 타입 에러 없음
- `bun run lint` — ESLint 통과
- `bun run test` — 33개 테스트 모두 통과
- 브라우저 DevTools에서 Error #418 콘솔 메시지 제거 확인

---

### Task 3: DashboardDeferred.tsx try/catch 추가

**목표:** `TimelineFeedSection.tsx`와 동일한 graceful degradation 패턴 적용

**수정 대상:** `app/(dashboard)/dashboard/DashboardDeferred.tsx` line 56-82

**현재 코드:**
```tsx
const [{ rows: quickActionRows, failed: quickActionsLoadFailed }, homeworkTypeRows, routineItemRows, homeworkLogsToday] =
  await Promise.all([
    loadQuickActionsForDashboard(profile.familyId), // ← try/catch 있음
    db.select(...).from(homeworkTypes)...             // ← try/catch 없음
    db.select(...).from(routineItems)...              // ← try/catch 없음
    db.select(...).from(homeworkLogs)...              // ← try/catch 없음
  ]);
```

**수정 방향:**
- `loadQuickActionsForDashboard`와 동일 패턴으로 3개 쿼리를 별도 async 함수로 분리 + try/catch
- 실패 시 빈 배열 fallback + `console.error` 로깅

**참고:** 기존 `TimelineFeedSection.tsx` 수정본 (`2c709a9`)을 참조.

**검증:**
- `bun run typecheck:strict` — 타입 에러 없음
- `bun run lint` — ESLint 통과
- `bun run test` — 33개 테스트 모두 통과

---

## 3. 실행 순서

```
Task 1 (환경 변수 검증) → Task 2 (TimelineFeed 하이드레이션 수정) → Task 3 (DashboardDeferred try/catch)
```

각 Task 완료 시:
1. `bun run lint && bun run typecheck:strict && bun run test` 실행
2. `just ci` 실행 (lint-fix + memory-verify)
3. `git add` → 커밋 → `git push origin main`
4. `.agents/memory/MEMORY.md`에 세션 기록 추가

---

## 4. 참고 파일

| 파일 | 용도 |
|------|------|
| `app/(dashboard)/TimelineFeed.tsx` | 하이드레이션 불일치 주범 — 수정 대상 |
| `app/(dashboard)/TimelineFeedSection.tsx` | 서버 컴포넌트 — 날짜 prop 전달 추가 |
| `app/(dashboard)/dashboard/DashboardDeferred.tsx` | try/catch 누락 — 수정 대상 |
| `db/client.ts` | TURSO_DATABASE_URL throw 지점 |
| `.env.vercel.prod` | Vercel env export — AUTH_SECRET 빈 값 확인 |
| `.env.example` | 로컬 dev 기준 env |
| `lib/auth/auth.ts` | Auth.js 설정 — AUTH_SECRET 사용 |
| `.agents/memory/MEMORY.md` | 세션 기록 — 업데이트 필요 |

---

## 5. 기존 커밋 이력

```
2c709a9 fix(dashboard): [RELIAB-02] TimelineFeedSection DB 쿼리 try/catch 추가로 500/하이드레이션 불일치 방지
```

이 커밋부터 시작. `git log --oneline -5`로 확인.

---

## 6. git.md 워크플로우 체크리스트

- [ ] WIP 스냅샷: `just wip "pre-commit-$(date +%Y%m%d_%H%M)"`
- [ ] `bun run lint && bun run typecheck:strict && bun run test`
- [ ] `just ci`
- [ ] `git add` (파일명 명시, `git add .` 지양)
- [ ] 커밋 메시지: `fix(scope): [인증지표] summary` 형식
- [ ] `git pull --rebase origin main`
- [ ] `git push origin main`
- [ ] `.agents/memory/MEMORY.md` 업데이트

---

## 7. 하이드레이션 불일치 — 상세 기술 배경

**Error #418 발생 메커니즘:**
React 18+에서 SSR HTML과 CSR 하이드레이션 간 텍스트/DOM 불일치가 발생하면 치명적 오류로 처리. `args[]=text&args[]=` 은 텍스트 콘텐츠 불일치를 의미.

**불일치 유발 패턴:**
1. `useState(() => startOfLocalDay(new Date()))` — SSR 시 서버 날짜, CSR 시 클라이언트 날짜
2. `useMemo(() => { const now = new Date(); ... }, [])` — 동일 메커니즘
3. 컴포넌트 본문 `new Date()` 계산 — 렌더 분기 차이
4. `Date.now()` 기반 조건부 렌더링 — DOM 구조 차이

**수정 원칙:**
- 서버 컴포넌트에서 날짜 계산 → prop으로 전달
- 클라이언트 컴포넌트에서 prop 사용 (재계산 금지)
- `Date.now()` 기반 조건부 렌더링은 `isClient` state 또는 SSR 시 고정값 사용

---

## 8. 검증 완료 기준 (Definition of Done)

- [ ] `bun run lint` 통과
- [ ] `bun run typecheck:strict` 통과
- [ ] `bun run test` — 33개 테스트 모두 통과
- [ ] `just ci` 통과
- [ ] 브라우저 DevTools에서 Error #418 콘솔 메시지 제거
- [ ] 브라우저 DevTools에서 500 에러 리소스 요청 제거 (또는 근본 원인 해결)
- [ ] Git 커밋 + push 완료
- [ ] `MEMORY.md` 업데이트
