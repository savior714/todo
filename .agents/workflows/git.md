---
scope: [".agents/workflows/git.md"]
domain: "workflows"
situation: 커밋
trigger: /git
level: Mandatory
description: Git Commit & Push - 세션 변경 사항 SSOT 반영 및 Git 커밋·푸시
version: 1.2.0
last_updated: 2026-05-11
---
<!-- Language: ko -->

# 🗂️ Git Commit & Push 워크플로우 (/git)

이 워크플로우는 현재 세션의 모든 변경 사항을 SSOT 문서에 반영하고, 최종적으로 Git에 커밋·푸시하여 작업을 마무리합니다.

> **환경 호환성**: 이 워크플로우는 **Claude Code(VS Code)** 및 **Google Antigravity** 양쪽 환경에서 동일하게 동작합니다.
> 파일 조작은 환경에서 제공하는 파일 읽기/수정 도구를 사용하고, Git 명령어는 터미널에서 실행하십시오.

### 이 레포(FamilySync MVP / Next.js) 기준 검증

현재 루트에 **`.husky/pre-commit`은 없다**. 커밋 전 품질 게이트는 **에이전트·개발자가 아래 명령을 직접 실행**하는 것을 표준으로 한다. (`justfile`·`package.json`이 SSOT)

| 구분 | 명령 | 비고 |
|------|------|------|
| **프론트 린트** | `bun run lint` | ESLint (`eslint .`) |
| **프론트 타입** | `bun run typecheck:strict` | `tsc --noEmit` |
| **계약/E2E 테스트** | `bun run test` | `node --test tests/e2e/*.test.mjs` — 로직·라우트·계약 변경 시 권장 |
| **빌드 스모크** | `bun run build` | Next 빌드·번들 이슈가 의심될 때 |
| **플랜·메모리 CI(최소 게이트)** | `just ci` | `just lint-fix` → `just memory-verify` 순 (`justfile` 참고) |

**`just lint-fix` (이 레포)**: `docs/plans/*.md`에 대해 `python3 scripts/plan_loop/plan_lint.py`를 실행한다. Ruff/Biome·`apps/renderer`와는 무관하다.

**권장 한 줄 (대부분의 코드·UI 변경)**:

```bash
bun run lint && bun run typecheck:strict && just ci
```

**문서·플랜만 변경**한 경우: `just ci`에 더해, 한글 `docs/**`를 커밋하면 `python3 scripts/verify_korean_text.py --dir docs`(또는 `--dir docs/memory`)를 실행한다.

**`git commit --no-verify`**: 훅이 없어도, 위 검증을 건너뛰면 같은 실패가 다음 커밋·리뷰에서 되돌아온다. **불가피한 예외**일 때만 사용하고, 본문에 이유를 남기거나 후속 커밋에서 위 검증을 통과시킨다.

**분리 triage**: `bun run lint` / `typecheck:strict` 실패는 앱 코드 쪽, `just ci` 실패는 Blueprint(`docs/plans`)·`.agents/memory/MEMORY.md` 위생(`just memory-verify`) 쪽을 우선 본다.

---

## 📋 실행 체크리스트

### 0단계: WIP 스냅샷 (작업 유실 방지) 🛡️

> **필수**: 커밋 전 현재 dirty state를 자동 보존합니다. 멀티 IDE 환경에서 작업 유실을 방지하는 핵심 안전장치입니다.

- [ ] WIP 스냅샷을 생성한다:
  ```bash
  just wip "pre-commit-$(date +%Y%m%d_%H%M)"
  ```
- [ ] 스냅샷이 `.git-snapshots/` 에 정상 생성되었는지 확인한다.

### 1단계: 세션 변경 사항 분석 및 SSOT 식별

- [ ] **[Fatal Guard] 아키텍처 변경 누락 검사**: 이번 작업 중 인프라(DB, 스택, 공통 패턴) 설계 변경이 있었는가? 반영되었다면 `PROJECT_RULES.md` §8에 의사결정(Decision)이 등재되었는지 **반드시 검증**하라. 누락되었다면 커밋을 즉시 멈추고 로그 갱신부터 수행한다.
- [ ] `.agents/memory/MEMORY.md`와 현재 대화 기록을 검토하여 수정된 기능, 로직, 스펙을 추출한다.
- [ ] 업데이트가 필요한 SSOT 대상 문서를 결정한다 (`PROJECT_RULES.md` §1.1 준수):
  - 운영 규칙 / 프로토콜 → `PROJECT_RULES.md`
  - 설계 결정 / 핵심 불변 정책 → `PROJECT_RULES.md` §8
  - 기능 요구사항 및 명세 / 인터페이스 → `docs/specs/*.md`
  - 진행 상황 (세션 정보) → `.agents/memory/project_changelog_*.md`·`project_*.md` 등 본문 SSOT, **`MEMORY.md`에는 링크만** (`AGENTS.md` §2.1.1)

### 2단계: 문서 업데이트 (Surgical Edit)

- [ ] **Surgical Edit**: 식별된 문서들을 외과적으로 정밀 수정하여 기존 포맷팅을 보존하며 새로운 정보만 병합한다.
- [ ] **Standard Header**: 신규 문서 생성 시 `docs/templates/DOC_SSOT_HEADER_TEMPLATE.md` 헤더를 반드시 적용한다 (`Last Verified`, `Reference` 등).
- [ ] **Memory Density / Anti-Drift**: `AGENTS.md` §10.2·`just memory-verify` 기준 — `MEMORY.md`가 **200라인**을 초과하면 `.agents/memory/changelog/` 등으로 이관해 한도 이하로 맞춘다. **라인 수와 무관하게** `MEMORY.md`에 장문 요약·긴 괄호·기술 메모를 넣지 않는다.

### 3단계: 통합 검증 및 결과 분석

- [ ] **앱 코드·UI 변경 시**: `bun run lint`와 `bun run typecheck:strict`를 통과시킨다. 동작·계약이 바뀌면 `bun run test`를 추가하고, 빌드 이슈가 있으면 `bun run build`로 확인한다.
- [ ] **플랜·메모리 게이트**: `just ci`를 통과시킨다. (`just ci`가 내부에서 `just lint-fix`·`just memory-verify`를 수행한다.)
- [ ] **문서 무결성**: 커밋에 한글 `docs/**`가 포함되면 `python3 scripts/verify_korean_text.py --dir docs`(또는 변경 범위에 맞는 `--dir` / `--file`)를 실행한다.
- [ ] **산출 검증 파일**: 레포에 `verify-last-result.json` 등 별도 검증 산출물이 없으면 해당 단계는 생략한다. (검증 매트릭스는 `AGENTS.md` §4 — 이 레포: `bun`·`just ci`.)
- [ ] **민감 정보 스캔**: `git status`를 통해 스테이징될 파일 목록 중 `.env`, `*.db`, `*.key`, `*.pem` 등 민감 데이터가 포함되지 않았는지 확인한다.
- [ ] 오류 발생 시 커밋 전 반드시 수정하고 재검증한다. **`--no-verify`로 우회한 경우** 후속 커밋에서 `bun run lint`·`typecheck:strict`·`just ci`를 통과시킨다.

### 4단계: Git Commit & Push

- [ ] 변경된 파일을 **파일명을 명시하여** 스테이징한다. (`git add .` 지양)
  ```bash
  git add "app/(dashboard)/dashboard/page.tsx" .agents/memory/MEMORY.md PROJECT_RULES.md
  ```
- [ ] 시니어 아키텍트 톤의 커밋 메시지를 작성한다 (`PROJECT_RULES.md` §5 준수).
  - 형식: `feat(scope): [인증지표] summary` / `fix(scope): [인증지표] summary` / `docs(scope): [인증지표] summary`
  - 예시:
    - `docs(memory): [SSOT-01] Archive session context and update MEMORY.md index`
    - `fix(backend): [CORE-04] Correct FHIR resource ID mapping in Patient domain model`
    - `refactor(frontend): [UI-02] Extract patient display ID logic to dedicated utility`

  ```bash
  git commit -m "feat(scope): [인증지표] [핵심 변경 요약]"
  ```
- [ ] 원격 저장소의 최신 변경 사항을 병합하여 충돌을 방지한다.
  ```bash
  git pull --rebase origin $(git branch --show-current)
  ```
- [ ] 원격 저장소로 푸시한다.
  ```bash
  git push origin $(git branch --show-current)
  ```

### 5단계: 자기 최적화 및 최종 보고

- [ ] **자기 최적화(Self-Optimization)**: 세션 중 반복된 작업 패턴(3회 이상)이 있다면 `PROJECT_RULES.md` §8에 기록하고 다음 에이전트를 위한 자동화나 워크플로우를 제안한다.
- [ ] `PROJECT_RULES.md` §4.4의 `Verify Report` 형식에 맞춰 최종 보고를 작성한다.
  - **통합 검증 요약**: `bun run lint`·`bun run typecheck:strict`·`just ci` (및 실행했다면 `bun run test` / `bun run build`) 통과 여부와 실패 시 마지막 에러 한 줄
  - **변경 파일**: 스테이징한 파일 목록
  - **테스트 결과**: `bun run test`(계약/E2E) 실행 시 요약; 미실행이면 생략 가능
  - **스모크 검증**: `bun run dev` 등으로 확인했다면 한 줄로 명시
  - **리스크/후속**: 잔여 리스크 및 다음 액션
- [ ] 업데이트된 SSOT 문서 목록과 Git 푸시 성공 여부를 사용자에게 보고하며 세션을 마친다.
