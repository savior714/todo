---
situation: JSX 컴포넌트 생성
trigger: /jsx_casing_check
level: Mandatory
description: PascalCase 검증 + casing_scan.py 실행
version: 1.0.0
last_updated: 2026-05-06
---

## 문서 메타 (Version SSOT)
- **Last Verified**: 2026-05-02
- **Tested Version**: v1.0 (Task D-2: CASING-LONGTERM-002)
- **Min Supported**: JSX Casing Codemod Phase D 완료 후
- **Reference**: `AGENTS.md` (§7.3, §5.1), `PROJECT_RULES.md` (§React Component Naming & Casing), `docs/specs/ui/react_casing_guardrail.md`

## 문서 경계(SSOT)
- **규칙/운영**: `PROJECT_RULES.md` (§React Component Naming & Casing)
- **설계 결정**: `docs/plans/archive/20260501_react_component_casing_guardrail_plan.md`
- **실행 스크립트**: `scripts/casing_scan.py`

---

# 🗂️ JSX 컴포넌트 케이싱 검사 워크플로우 (/jsx_casing_check)

이 워크플로우는 에이전트가 JSX 컴포넌트를 생성하거나 수정할 때 자동으로 PascalCase 검증과 소문자 JSX 태그 감지를 수행합니다.

> **⚠️ Fatal Rule**: `/jsx_casing_check` 실행 시 반드시 **PascalCase 검증**과 **casing_scan.py 실행**을 모두 완료해야 합니다. 하나라도 누락 시 워크플로우 실패로 간주합니다.

---

## 📋 실행 파이프라인 (3 Phase)

```
Phase 1: 생성/수정 파일 식별 → casing_scan.py 사전 스캔
Phase 2: PascalCase 검증 → 컴포넌트명/파일명 일치 확인
Phase 3: CI 검사 실행 → 전체 프로젝트 잔여 패턴 재스캔
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
  python3 scripts/casing_scan.py \
    --path apps/renderer/src \
    --output docs/reports/pre_check_$(date +%Y%m%d_%H%M).json \
    --fail-on-count 100
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
  # 소문자 JSX 태그 검색 (컴포넌트만 해당)
  grep -rn '<[a-z][a-z0-9]*\s' apps/renderer/src --include="*.tsx" | \
    grep -v 'HTML_ELEMENTS' | \
    grep -v 'TS_TYPE_KEYWORDS'
  ```

---

## Phase 3: CI 검사 실행 및 보고

### 6단계: 전체 프로젝트 잔여 패턴 재스캔

- **동작**: 변경 후 전체 프로젝트에 대한 케이싱 검사 실행
- **명령어**:
  ```bash
  python3 scripts/casing_scan.py \
    --path apps/renderer/src \
    --output docs/reports/post_check_$(date +%Y%m%d_%H%M).json \
    --fail-on-count 100
  ```

### 7단계: 보고서 생성 및 에러 처리

- **동작**: 검사 결과에 따른 후속 조치
- **체크리스트**:
  - [ ] **0건 발견**: ✅ 통과, 작업 완료 보고
  - [ ] **소수 건 (≤5)**: 경고 출력, 수동 검토 권장
  - [ ] **다수 건 (>5)**: ❌ 실패, `codemods/jsx-casing-fix.js` 실행 권장

### 8단계: Codemod 자동 적용 제안 (필요 시)

- **동작**: 잔여 패턴이 많을 경우 자동 변환 제안
- **명령어**:
  ```bash
  # Dry-run 먼저 실행
  npx jscodeshift --dry-run --print \
    --transform codemods/jsx-casing-fix.js \
    apps/renderer/src/**/*.tsx
  
  # 실제 적용 (Dry-run 확인 후)
  npx jscodeshift --parallel --threads=4 \
    --transform codemods/jsx-casing-fix.js \
    apps/renderer/src/**/*.tsx
  ```

---

## 📊 Definition of Done

1. [ ] 변경된 모든 JSX 파일에 대한 PascalCase 검증 완료
2. [ ] `casing_scan.py` 사전/사후 스캔 모두 실행 완료
3. [ ] 컴포넌트명/파일명 일치 확인 완료
4. [ ] import/export 문 일관성 검증 완료
5. [ ] 전체 프로젝트 재스캔 결과 보고 (0건 또는 알려진 한계 케이스만)

---

## 🔗 관련 문서

- **AGENTS.md §Execution Rules**: [`AGENTS.md`](AGENTS.md) §5.1 React Component Creation Guidelines
- **PROJECT_RULES.md §React Component Naming & Casing**: [`PROJECT_RULES.md`](PROJECT_RULES.md)
- **JSX Casing Guardrail Spec**: [`docs/specs/ui/react_casing_guardrail.md`](docs/specs/ui/react_casing_guardrail.md)
- **Codemod Execution Plan**: [`docs/plans/20260501_jsx_casing_codemod_execution_plan.md`](docs/plans/20260501_jsx_casing_codemod_execution_plan.md)
- **CI 워크플로우**: [`.github/workflows/casing-guardrail.yml`](.github/workflows/casing-guardrail.yml)
