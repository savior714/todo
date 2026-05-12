# PROJECT_RULES.md — Policy Hub

## 0. Purpose

본 문서는 프로젝트 정책·스택·품질·아키텍처 제약(What)을 정의한다.

에이전트 실행 방식은 `AGENTS.md`를 따른다. 세부 규칙 모듈 색인은 `.agents/registry/RULE_INDEX.md`를 참고한다.

**중요**: 모든 기능 구현 및 수정 시 반드시 `Reference Index`의 관련 명세(Specs)를 먼저 읽어야 하며, 명세는 이 정책 문서와 함께 프로젝트의 핵심 SSOT로 취급된다.

---

# 1. Architecture Rules

## MUST
- `docs/CRITICAL_LOGIC.md`·`docs/specs/PRD.md`·`TRD.md`에 정의한 **가족 데이터 격리·투약 안전·인증/프로필** 등 비기능 경계를 코드로 반영한다.
- 데이터 접근·변경은 **서버**(Server Actions·Route Handlers·서버 유틸)에서 `family_id`·`active_profile_id` 문맥을 검증한 뒤에만 수행한다 (구현 SSOT: `docs/CRITICAL_LOGIC.md`).
- 동작·계약을 바꾸면 `tests/e2e` 및 관련 스펙·`CRITICAL_LOGIC`을 동기화한다.

## MUST NOT
- 다른 가족 `family_id`로 이어지는 조회·쓰기 경로(멀티테넌시 붕괴).
- 민감 제약(투약 간격 등)을 **클라이언트만** 믿도록 두는 설계.
- 스펙·계약 없는 contract-breaking 변경.

---

# 2. Stack & Runtime Policy

## 단일 앱 스택 (FamilySync MVP)
- **프레임워크**: Next.js(App Router), React, TailwindCSS — 소스는 주로 `app/`·`lib/`·`db/` (`README.md` 디렉토리 맵).
- **데이터**: Turso(libSQL) + Drizzle; 마이그레이션은 `db/migrations/*.sql`, 적용 절차는 `README.md`·`npm run db:migrate`(`scripts/migrate-turso.mjs`).
- **Turso 마이그레이션 적용(에이전트)**: `db/migrations/`에 SQL을 **추가하거나 내용을 바꾼 커밋/작업**이면, 에이전트는 사용자에게 실행을 넘기지 않고 **`npm run db:migrate`를 직접 실행**해 적용·로그까지 확인한다(`TURSO_*`는 스크립트가 `.env`→`.env.local`→`.env.vercel.dev`→`.env.vercel.prod` 순으로 로드). **복수 Turso**(개발 DB와 운영 DB URL이 env로 분리)인 경우, 한 번의 실행은 **현재 로드되는 URL 한 곳**에만 적용되므로, 운영까지 필요하면 해당 env를 기준으로 **재실행**하거나 사용자에게 적용 대상만 한 줄 확인한다.
- **인증**: Auth.js + Google OAuth (세션·쿠키 정책은 `docs/CRITICAL_LOGIC.md`).
- **본 레포는** 루트 `docker-compose.dev.yml`·`./run_dev.sh` 기반 로컬 풀스택을 두지 않는다(과거 템플릿 문구는 무시).

## Workspace File I/O Policy
- 워크스페이스 파일 읽기·쓰기·목록·검색은 Built-in 파일 도구(`Read`, `Write`, `Grep`, `Glob`, `SemanticSearch`)를 우선 사용한다.
- 위 경로로 처리 불가한 경우에만 Shell 접근을 허용한다.

## Standard Runtime (로컬)
- 앱: `bun run dev` (`package.json`)
- 검증: `README.md`의 검증 명령 + `AGENTS.md` §4 Verification Matrix + `just ci` (`justfile`)

---

# 3. Verification & Quality Policy

## 3.1 Plan & TDD Enforcement
- **Plan-First**: 모든 설계 및 복합 작업은 **통합 심층 설계(Unified Deep Planning, `/plan`)** 워크플로우 선행 필수. 이는 진단(Diagnose), 아키텍처 심화(Improve), 태스크 분해(Plan)를 단일 문서로 통합한 표준입니다. 특히 설계 단계에서 완벽한 근거 확보를 위한 **코드 실행 및 연구(Research)**를 적극 권장하며, 무결점 순차성을 가진 `[Level: Low]` 태스크 분해를 지향한다. 상세 절차는 `AGENTS.md` 참조.
- **TDD Red-First**: 구현 전 실패 테스트 작성 및 실행 로그 확인 필수. `Red -> Green -> Refactor` 사이클 준수.

## 3.2 Quality Gates
- **Strict Lint/Type**: `bun run lint`(ESLint) 및 `bun run typecheck:strict`(`tsc --noEmit`) 통과 필수.
- **No Bypass**: 검증 통과를 위한 severity 하향(`error -> warn`)이나 gate 우회 금지.
- **TS/React**: `habitual any`·무근거 `ts-ignore`·소문자 JSX 컴포넌트명 금지(§4 TypeScript & Frontend Rules).

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

- **제품·기술 요구**: `docs/specs/PRD.md`, `docs/specs/TRD.md`
- **불변·운영 경계**: `docs/CRITICAL_LOGIC.md`
- **실행 프로토콜**: `AGENTS.md`, `justfile`, `README.md`
- **추가 명세**: `docs/specs/technical/` 등은 레포에 없을 수 있다 — 신규 도입 시 본 절과 SSOT 표를 함께 갱신한다.