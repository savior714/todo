---
situation: JSX 컴포넌트 생성
trigger: /jsx_casing_check
level: Mandatory
description: PascalCase 검증 + ESLint/grep (선택 casing_scan.py)
version: 1.1.0
last_updated: 2026-05-11
---

## 문서 메타 (Version SSOT)
- **Last Verified**: 2026-05-02
- **Tested Version**: v1.0 (Task D-2: CASING-LONGTERM-002)
- **Min Supported**: JSX Casing Codemod Phase D 완료 후
- **Reference**: `AGENTS.md`, `PROJECT_RULES.md` §4 (TypeScript & Frontend Rules)

## 문서 경계(SSOT)
- **규칙/운영**: `PROJECT_RULES.md` §4 (PascalCase·`any` 금지 등)
- **설계 결정**: (선택) 별도 케이싱 플랜이 있으면 `docs/plans/` 참고
- **실행 스크립트**: (선택) `scripts/casing_scan.py` — **본 레포에 없으면 `grep` + `bun run lint`로 대체**

---

# 🗂️ JSX 컴포넌트 케이싱 검사 워크플로우 (/jsx_casing_check)

이 워크플로우는 에이전트가 JSX 컴포넌트를 생성하거나 수정할 때 자동으로 PascalCase 검증과 소문자 JSX 태그 감지를 수행합니다.

> **⚠️ Fatal Rule**: **PascalCase 검증**과 **`bun run lint` 통과**는 필수. `casing_scan.py`가 레포에 있으면 사전/사후 스캔도 수행한다.

---

## 📋 실행 파이프라인 (3 Phase)

```
Phase 1: 생성/수정 파일 식별 → (선택) casing_scan.py 또는 `grep` 사전 스캔
Phase 2: PascalCase 검증 → 컴포넌트명/파일명 일치 확인
Phase 3: `bun run lint` → 전체 `app/**/*.tsx` 잔여 패턴 재확인
```

---

## Phase 1: 변경 파일 식별 및 사전 스캔

### 1단계: 변경된 JSX 파일 식별

- **동작**: `git diff --name-only` 또는 세션 내 수정 이력으로 `.tsx`/`.jsx` 파일 목록 생성
- **체크리스트**:
  - [ ] 새로 생성된 컴포넌트 파일 확인
  - [ ] 수정된 기존 컴포넌트 파일 확인
  - [ ] import/export 문 변경 사항 확인

### 2단계: 사전 스캔 (casing_scan.py 실행)

- **동작**: 변경된 파일에 대한 사전 케이싱 검사 실행
- **명령어**:
  ```bash
  # 스크립트가 있을 때만:
  # python3 scripts/casing_scan.py --path app --output docs/reports/pre_check_$(date +%Y%m%d_%H%M).json
  ```
- **예상 결과**: 변경된 파일에서 소문자 JSX 태그 감지 시 경고 출력

---

## Phase 2: PascalCase 검증 (수동 + 자동)

### 3단계: 컴포넌트명/파일명 일치 확인

- **동작**: 생성 또는 수정된 각 컴포넌트에 대해 다음 규칙 검증
- **체크리스트**:
  - [ ] **함수명 PascalCase**: `const Header = () => ...` (❌ `const header = ...`)
  - [ ] **파일명 일치**: `Header.tsx` contains `const Header = ...`
  - [ ] **export 일관성**: `export default Header` 또는 `export { Header }`

### 4단계: import/export 문 검증

- **동작**: import/export도 컴포넌트명과 동일하게 PascalCase 유지 확인
- **체크리스트**:
  - [ ] `import { Header } from './Header'` (❌ `import { header }`)
  - [ ] JSX 태그 호출과 import명 일치: `<Header />` ↔ `{ Header }`

### 5단계: 자동 검증 스크립트 실행

- **동작**: 변경된 파일에 대한 상세 패턴 분석
- **명령어**:
  ```bash
  grep -rn '<[a-z][a-z0-9]*\s' app --include="*.tsx" | \
    grep -v 'HTML_ELEMENTS' | \
    grep -v 'TS_TYPE_KEYWORDS'
  ```

---

## Phase 3: CI 검사 실행 및 보고

### 6단계: 전체 프로젝트 잔여 패턴 재스캔

- **동작**: 변경 후 전체 프로젝트에 대한 케이싱 검사 실행
- **명령어**:
  ```bash
  bun run lint
  # (선택) python3 scripts/casing_scan.py --path app --output docs/reports/post_check_$(date +%Y%m%d_%H%M).json
  ```

### 7단계: 보고서 생성 및 에러 처리

- **동작**: 검사 결과에 따른 후속 조치
- **체크리스트**:
  - [ ] **0건 발견**: ✅ 통과, 작업 완료 보고
  - [ ] **소수 건 (≤5)**: 경고 출력, 수동 검토 권장
  - [ ] **다수 건 (>5)**: ❌ 실패, 수동 리네임·분할 또는 (레포에 있을 때만) 전용 codemod 검토

### 8단계: Codemod 자동 적용 제안 (필요 시)

- **동작**: 잔여 패턴이 많을 경우 — **본 레포에 `codemods/jsx-casing-fix.js`가 있을 때만** jscodeshift 적용을 검토한다. 없으면 ESLint·수동 수정으로 처리한다.

---

## 📊 Definition of Done

1. [ ] 변경된 모든 JSX 파일에 대한 PascalCase 검증 완료
2. [ ] `casing_scan.py`가 있으면 사전/사후 스캔, 없으면 `grep` + `bun run lint`로 동등 검증
3. [ ] 컴포넌트명/파일명 일치 확인 완료
4. [ ] import/export 문 일관성 검증 완료
5. [ ] 전체 프로젝트 재스캔 결과 보고 (0건 또는 알려진 한계 케이스만)

---

## 🔗 관련 문서

- [`AGENTS.md`](../../AGENTS.md) §4 Verification Matrix (프론트: `bun run lint` 등)
- [`PROJECT_RULES.md`](../../PROJECT_RULES.md) §4 TypeScript & Frontend Rules
