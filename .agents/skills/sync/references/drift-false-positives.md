# Spec drift false positives (CSS · 렌더링 최적화)

`sync --check`가 **라우트·Next 설정·proxy·middleware 변경**으로 분류하지만,
실제로는 런타임 계약에 영향 없는 변경인 경우.

## CSS-only

`.css` 스타일만 수정 → `level: required` 가능.

**판단**: 라우트·config·proxy·middleware를 건드리지 않았으면 spec 본문 편집 불필요.
`just sync --check` **PASS**면 무시.

## React 렌더링 최적화

`.tsx`에서 아래만 변경 시 동일 오인식 가능:

- `useDeferredValue`, `startTransition`
- `memo`, `useCallback` deps 조정
- 위젯 prop에 deferred 값 전달

**판단**: `git diff`로 10초 확인 — 라우트/설정 변경 없으면 PASS 후 통과.

## 공통 대응

1. `just sync --check` PASS → 문서 갱신 생략
2. FAIL + required → [required-drift-and-phase2.md](./required-drift-and-phase2.md) Phase 2 루프
3. CI `--strict`에서는 문서 미갱신 시 exit 2 — 로컬 PASS와 구분
