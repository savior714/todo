# Hand-off: Admin Submodal — 후속 작업

## 완료한 작업 (이 세션)

- `QuickActionsAdminModal.tsx` — 퀵 액션 편집 서브모달 (`<dialog>` 기반)
- `HomeworkTypesAdminModal.tsx` — 숙제 유형 관리 서브모달
- `RoutineItemsAdminModal.tsx` — 루틴 체크 관리 서브모달
- `QuickActionPanel.tsx` — 3개 `<Link href="/admin#...">` → 모달 버튼 + 상태 관리
- `DashboardDeferred.tsx` — admin 데이터(`quickActions`, `homeworkTypes`, `routineItems`) fetch & prop 전달
- `tests/e2e/done-criteria.contract.test.mjs` — 테스트 패턴 업데이트
- `.agents/memory/MEMORY.md` — 세션 노트 추가

---

## 후속 작업 1: `/admin` 페이지에서 인라인 섹션 제거

### 배경
대시보드에서 3개 기능이 서브모달로 이동했지만, `/admin` 페이지의 인라인 섹션(`QuickActionsAdminSection`, `HomeworkTypesAdminSection`, `RoutineItemsAdminSection`)이 그대로 남아있음. 중복 UI.

### 작업
1. `app/admin/page.tsx`에서 3개 섹션 컴포넌트 import 및 렌더링 제거
2. `app/admin/quick-actions-admin-section.tsx` — 삭제 또는 `@deprecated` 주석 추가
3. `app/admin/homework-types-admin-section.tsx` —同上
4. `app/admin/routine-items-admin-section.tsx` —同上

### 영향 범위
- `app/admin/page.tsx` (lines 10-12, 129-134, 155-168)
- `app/admin/quick-actions-admin-section.tsx`
- `app/admin/homework-types-admin-section.tsx`
- `app/admin/routine-items-admin-section.tsx`

### 검증
```bash
bun run lint && bun run typecheck:strict && bun run test
```

---

## 후속 작업 2: 모달 내 서버 액션 경계 명확화

### 배경
현재 모달 컴포넌트(`QuickActionsAdminModal.tsx` 등)에서 서버 액션을 클라이언트 컴포넌트 내부에 래퍼 함수로 감싸고 있음:

```tsx
// QuickActionsAdminModal.tsx line 101
<form action={async (formData) => { await deactivateQuickAction(formData); }}>
```

이는 `"use client"` 컴포넌트 내에 `use server` 지시어가 암묵적으로 배치되는 구조로, 기능적 문제는 없으나 서버/클라이언트 경계가 불명확함.

### 작업
1. `app/actions/admin.ts`에 모달 전용 래퍼 액션 추가:
   - `createQuickActionForModal(formData: FormData)` — 기존 `createQuickAction` 호출 후 `revalidatePath("/dashboard")` 추가
   - `deactivateQuickActionForModal(formData: FormData)` —同上
   - 동일 패턴으로 `homeworkTypes`, `routineItems`용
2. 모달 컴포넌트에서 직접 import 사용

### 영향 범위
- `app/actions/admin.ts` (신규 함수 추가)
- `app/(dashboard)/QuickActionsAdminModal.tsx`
- `app/(dashboard)/HomeworkTypesAdminModal.tsx`
- `app/(dashboard)/RoutineItemsAdminModal.tsx`

### 검증
```bash
bun run lint && bun run typecheck:strict && bun run test
```

---

## 후속 작업 3: 모달 닫기 시 데이터 리프레시

### 배경
현재 모달에서 추가/숨기기 후 `router.refresh()`가 호출되지 않음. 서버 액션 폼 제출 시 페이지 전체 리프레시가 일어나지만, 모달을 닫고 대시보드 상태를 즉시 반영하려면 `router.refresh()` 또는 `revalidatePath` 필요.

### 작업
1. 모달 컴포넌트에 `onChanged?: () => void` prop 추가
2. 폼 제출 후 `onChanged()` 호출 (또는 `router.refresh()` 직접 호출)
3. `QuickActionPanel`에서 `onChanged={() => { setModalOpen(false); router.refresh(); }}` 전달

### 영향 범위
- `app/(dashboard)/QuickActionsAdminModal.tsx`
- `app/(dashboard)/HomeworkTypesAdminModal.tsx`
- `app/(dashboard)/RoutineItemsAdminModal.tsx`
- `app/(dashboard)/QuickActionPanel.tsx`

### 검증
```bash
bun run lint && bun run typecheck:strict
```

---

## 후속 작업 4: 모달 애니메이션 일관성

### 배경
`RecordEventModal`은 `@keyframes dialog-record-in` 애니메이션을 사용하지만, 신규 모달들은 현재 정적 표시.

### 작업
1. `app/globals.css`에서 `dialog-record-in` keyframe 확인
2. 신규 모달들에 동일한 애니메이션 적용 (또는 `RecordEventModal`과 동일한 구조로 통일)

### 영향 범위
- `app/globals.css` (기존 keyframe 확인)
- `app/(dashboard)/QuickActionsAdminModal.tsx`
- `app/(dashboard)/HomeworkTypesAdminModal.tsx`
- `app/(dashboard)/RoutineItemsAdminModal.tsx`

### 검증
```bash
bun run lint
```

---

## 후속 작업 5: Storybook 스토리 추가

### 배경
`Dashboard.stories.tsx`에서 `QuickActionPanel`을 렌더링하지만, 신규 모달 컴포넌트들의 스토리가 없음.

### 작업
1. `app/(dashboard)/QuickActionsAdminModal.stories.tsx` — mock 데이터 기반 미리보기
2. `app/(dashboard)/HomeworkTypesAdminModal.stories.tsx` —同上
3. `app/(dashboard)/RoutineItemsAdminModal.stories.tsx` —同上

### 영향 범위
- 신규 `.stories.tsx` 파일 3개

### 검증
```bash
bun run build-storybook
```

---

## 검증 명령 (모든 작업 공통)

```bash
bun run lint && bun run typecheck:strict && bun run test && just ci
```
