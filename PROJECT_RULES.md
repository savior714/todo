# PROJECT_RULES.md — Policy Hub

## 0. Purpose

본 문서는 프로젝트 정책·스택·품질·아키텍처 제약(What)을 정의한다.

에이전트 실행 방식은 `AGENTS.md`를 따른다.

**중요**: 모든 기능 구현 및 수정 시 반드시 `Reference Index`의 관련 명세(Specs)를 먼저 읽어야 하며, 명세는 이 정책 문서와 함께 프로젝트의 핵심 SSOT로 취급된다.

---

# 1. Architecture Rules

## MUST
- DDD 의존 방향 유지: `main → application → domain`
- bounded context 기반 점진적 migration
- domain 계층에 infra/API concern 누수 금지
- business logic 변경 시 tests 동기화

## MUST NOT
- reverse dependency
- infrastructure leakage into domain
- contract-breaking implementation drift

---

# 2. Stack & Runtime Policy

## Docker-First
- 표준 개발 환경: `docker-compose.dev.yml`, `./run_dev.sh`
- 금지: undocumented local daemons, manual DB startup

## Workspace File I/O Policy
- 워크스페이스 파일 읽기·쓰기·목록·검색은 Built-in 파일 도구(`Read`, `Write`, `Grep`, `Glob`, `SemanticSearch`)를 우선 사용한다.
- 위 경로로 처리 불가한 경우에만 Shell 접근을 허용한다.

## Standard Infrastructure Ports (SoT)
- `8000`: server, `5432`: postgres, `6379`: valkey, `8200`: vault
- 원칙: Docker stack 외 포트 점유 금지. 변경 시 `run_dev.sh`와 동기화 필수.

## Standard Runtime
- Frontend: `bun run dev`
- Infra: `./run_dev.sh`

---

# 3. Verification & Quality Policy

## 3.1 Plan & TDD Enforcement
- **Plan-First**: 모든 설계 및 복합 작업은 **통합 심층 설계(Unified Deep Planning, `/plan`)** 워크플로우 선행 필수. 이는 진단(Diagnose), 아키텍처 심화(Improve), 태스크 분해(Plan)를 단일 문서로 통합한 표준입니다. 특히 설계 단계에서 완벽한 근거 확보를 위한 **코드 실행 및 연구(Research)**를 적극 권장하며, 무결점 순차성을 가진 `[Level: Low]` 태스크 분해를 지향한다. 상세 절차는 `AGENTS.md` 참조.
- **TDD Red-First**: 구현 전 실패 테스트 작성 및 실행 로그 확인 필수. `Red -> Green -> Refactor` 사이클 준수.

## 3.2 Quality Gates
- **Strict Lint/Type**: `Ruff`, `Biome`, `TypeScript` strict mode 통과 필수.
- **No Bypass**: 검증 통과를 위한 severity 하향(`error -> warn`)이나 gate 우회 금지.
- **Biome Strict**: `apps/renderer` 내 `noExplicitAny`, `noArrayIndexKey` 0건 유지.

---

# 4. TypeScript & Frontend Rules

## MUST
- `bun run typecheck:strict`
- PascalCase React components & filenames
- reusable UI extraction & responsive layouts
- `unknown` 타입 사용 시 Type Guard를 통한 Narrowing 선행

## MUST NOT
- habitual `any`
- unjustified ts-ignore
- lowercase JSX components
- monolithic TSX components

---

# 5. Documentation & Reporting Integrity

## 5.1 Documentation
- **SSOT Preservation**: `README.md` 디렉토리 맵, `docs/plans` 로드맵 정보를 온전히 유지.
- **No Truncation**: 미래 태스크(`todo`/`pending`)를 임의 삭제하여 로드맵을 파괴하는 행위 금지.
- **Link Validity**: 내부 링크 및 참조 정합성 유지.

## 5.2 Communication & Reporting
- **한국어 우선**: 모든 응답·요약·보고서는 한국어로 작성. 영문-only 리포트 금지.
- **기본 간결**: `AGENTS.md` §10 Reporting Protocol 준수. 대화 전 구간 동일하게 짧게 보고; 상세는 실패·블로커·명시 요청 시에만.

---

# 6. SSOT Hub

| Purpose | SSOT |
|---|---|
| Project overview | `README.md` |
| Execution protocol | `AGENTS.md` |
| Project policy | `PROJECT_RULES.md` |
| Critical logic | `docs/CRITICAL_LOGIC.md` |
| Requirements contract | `tests/` |
| Session memory | `docs/memory/` |

---

# 7. Reference Index

- **Technical**: `aqg_protocol.md`, `ddd_migration_guide.md`, `tdd_policy.md`, `desktop_distribution_strategy.md`
- **UI**: `react_casing_guardrail.md`, `consultation_screen_design.md`
- **Verification**: `verification_protocol.md`