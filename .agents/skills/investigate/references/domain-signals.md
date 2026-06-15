# Domain-Specific Diagnostic Signals

증상이 아래 패턴과 맞을 때만 Read한다. 일반 조사 절차는 [SKILL.md](../SKILL.md) Step 1~5를 따른다.

## Next.js Fast Refresh Full Reload

`⚠ Fast Refresh had to perform a full reload` is **not just a warning** — it's a diagnostic signal about component architecture:

- **Triggers when**: Fast Refresh cannot hot-reload a module because of structural changes in the component tree, state loss during HMR, or client components inside layouts with side-effect hooks
- **What it tells you**: Look at the component that changed — is it a layout? Does it contain client components with `useEffect` redirect guards, event listeners, or ResizeObservers?
- **Common root cause**: Auth state transition during hydration (isLoading→isAuthenticated) in a client component nested inside layout
- **Investigation path**: Check `layout.tsx` → client component imports → useEffect redirect guards → auth context initialization timing

See also: [Next.js Fast Refresh](https://nextjs.org/docs/architecture/fast-refresh)

## React Render Cascade Freezing

환자 전환, 데이터 변경 후 UI가 멈추는 현상은 **렌더링 캐스케이드**가 원인일 수 있습니다.

- **Triggers when**: `useMemo` 컨텍스트 객체의 의존성 배열이 과도하게 넓음 (20개 초과), `useDeferredValue`가 부분만 적용됨
- **What it tells you**: `widgetBinderContext`, `examination` 훅, `contentProps` 등 큰 `useMemo` 객체의 의존성 배열 길이를 확인
- **Common root causes**:
  - A1. 거대 컨텍스트 객체 (~60개 의존성) → 모든 하위 컴포넌트가 리렌더됨
  - A2. `useDeferredValue` 부분 적용 (patientId만 defer, selectedPatient은 즉시 렌더)
  - A3. Hook 참조 불안정 (`useMemo` spread 하위 훅 → 하나 변경 시 전체 recompute)
  - A4. 동기 Effect 블록 (`useLayoutEffect` 내 JSON.stringify 등 메인 스레드 차단)
- **Investigation path**: Step 2~4 진행 → 성능 수정이 필요하면 [vercel-react-best-practices](../../frontend/vercel-react-best-practices/SKILL.md) §5 Re-render Optimization 참고 후 `/diagnose` 또는 `/plan` 핸드오프

## {{PROJECT_NAME}} — hub raw JSONL

API/LLM 형식 불일치 의심 시 type cast·방어 코드 패치 **전에** raw 응답을 읽는다.

1. `just api-response-errors` → `var/log/emr/hub/api_response_errors.jsonl`
2. `just raw-logs` → `api_log.jsonl`, `tool_log.jsonl`

수정 루프가 필요해지면 [diagnose/SKILL.md](../../diagnose/SKILL.md)로 핸드오프한다.
