---
situation: 커밋
trigger: /git
level: Mandatory
description: Git Commit & Push - 세션 변경 사항 SSOT 반영 및 Git 커밋·푸시
version: 1.1.0
last_updated: 2026-05-06
---

# 🗂️ Git Commit & Push 워크플로우 (/git)

이 워크플로우는 현재 세션의 모든 변경 사항을 SSOT 문서에 반영하고, 최종적으로 Git에 커밋·푸시하여 작업을 마무리합니다.

> **환경 호환성**: 이 워크플로우는 **Claude Code(VS Code)** 및 **Google Antigravity** 양쪽 환경에서 동일하게 동작합니다.
> 파일 조작은 환경에서 제공하는 파일 읽기/수정 도구를 사용하고, Git 명령어는 터미널에서 실행하십시오.

### Pre-commit (Husky) — `just lint-fix`와 동일

로컬에서 일반 `git commit`을 실행하면 **`.husky/pre-commit`** 이 **`just lint-fix`** 를 호출한다. 다음이 **순서대로** 실행되며, 한 단계라도 실패하면 커밋이 거부된다.

| 단계 | 명령 (요약) | 비고 |
|------|-------------|------|
| 서버 린트·자동 수정 | `uv run ruff check --fix --unsafe-fixes src/` | |
| 서버 포맷 | `uv run ruff format src/` | |
| 프론트 린트·자동 수정 | `cd apps/renderer && bun x biome check --write ./src` | 경고는 대부분 통과; 정책 변경 시 확인 |
| 서버 타입 (`ty`) | `just ty` → `uv run ty check src/` | `SecretStr \| None` 등은 `.get_secret_value()` 직호출 금지 → `secret_str_value()` 등으로 좁힘 (`src/infrastructure/config/settings.py`) |

**권장**: 커밋 직전에 훅과 동일하게 한 번 돌려 실패를 선제적으로 제거한다.

```bash
just lint-fix
```

**`git commit --no-verify`**: 기본적으로 사용하지 않는다. 훅·`just ty`를 우회하면 동일 실패가 CI/다음 커밋에서 재발한다. **불가피한 예외**일 때만 사용하고, 본문에 이유를 남기거나 후속 이슈로 `just lint-fix` 통과 작업을 명시한다.

**`just ci` vs 훅**: `just ci`는 DB·pytest 등 **전체 파이프라인**을 포함한다. 훅 실패의 대부분은 **`just lint-fix`** 만으로 재현·수정 가능하다. PR 정책상 `just ci` green이 필요하면 본 문서 3단계와 병행한다.

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

- [ ] **[Fatal Guard] 아키텍처 변경 누락 검사**: 이번 작업 중 인프라(DB, 스택, 공통 패턴) 설계 변경이 있었는가? 반영되었다면 `docs/CRITICAL_LOGIC.md`에 의사결정(Decision)이 등재되었는지 **반드시 검증**하라. 누락되었다면 커밋을 즉시 멈추고 로그 갱신부터 수행한다.
- [ ] `docs/memory/MEMORY.md`와 현재 대화 기록을 검토하여 수정된 기능, 로직, 스펙을 추출한다.
- [ ] 업데이트가 필요한 SSOT 대상 문서를 결정한다 (`PROJECT_RULES.md` §1.1 준수):
  - 운영 규칙 / 프로토콜 → `PROJECT_RULES.md`
  - 설계 결정 / 핵심 불변 정책 → `docs/CRITICAL_LOGIC.md`
  - 기능 요구사항 및 명세 / 인터페이스 → `docs/specs/*.md`
  - 진행 상황 (세션 정보) → `docs/memory/project_changelog_*.md`·`project_*.md` 등 본문 SSOT, **`MEMORY.md`에는 링크만** (`AGENTS.md` §2.1.1)

### 2단계: 문서 업데이트 (Surgical Edit)

- [ ] **Surgical Edit**: 식별된 문서들을 외과적으로 정밀 수정하여 기존 포맷팅을 보존하며 새로운 정보만 병합한다.
- [ ] **Standard Header**: 신규 문서 생성 시 `docs/templates/DOC_SSOT_HEADER_TEMPLATE.md` 헤더를 반드시 적용한다 (`Last Verified`, `Reference` 등).
- [ ] **Memory Density / Anti-Drift**: `AGENTS.md` §2.1.1 참조 — `MEMORY.md`가 **500라인**을 초과하면 50라인 이내 요약으로 재작성하고, 세부 내용은 `docs/memory/` 하위 모듈(`user`, `feedback`, `project`, `reference`)로 분리/아카이브한다. **라인 수와 무관하게** `MEMORY.md`에 장문 요약·긴 괄호·기술 메모를 넣지 않는다.

### 3단계: 통합 검증 및 결과 분석

- [ ] **Pre-commit 동등 검증**: Husky가 실행하는 것과 동일하게 **`just lint-fix`** 를 통과시킨다 (위 표 참고). 문서·설정만 바꾼 경우에도 `ty`/Biome가 영향을 받을 수 있으므로 생략하지 않는 것이 안전하다.
- [ ] 통합 검증 스크립트를 실행한다 (`PROJECT_RULES.md` §4.0). 실행 전 `just plans-index`로 인덱스를 최신화하십시오.
  ```bash
  just plans-index && just ci
  ```
  - **참고**: `just ci` 실패가 pytest·인프라 때문일 때도, **커밋 자체**는 여전히 **`just lint-fix`**(훅)에 막힐 수 있다. 두 축을 분리해 triage한다.
- [ ] **문서 무결성 최종 확인**: `AGENTS.md` §3에 따라 `python scripts/verify_korean_text.py --dir docs`를 실행하여 커밋될 문서의 인코딩 및 오염 여부를 확인한다.
- [ ] `Read` 도구로 결과를 확인한다:
  - `verify-last-result.json` (exitCode 및 failedStep 확인)
  - (실패 시) `verify-pytest-failures.txt` (상세 실패 요약 확인)
- [ ] **민감 정보 스캔**: `git status`를 통해 스테이징될 파일 목록 중 `.env`, `*.db`, `*.key`, `*.pem` 등 민감 데이터가 포함되지 않았는지 확인한다.
- [ ] 오류 발생 시 커밋 전 반드시 수정하고 재검증한다. **`--no-verify`로 우회한 경우** 후속 커밋에서 `just lint-fix` 통과를 반드시 달성한다.

### 4단계: Git Commit & Push

- [ ] 변경된 파일을 **파일명을 명시하여** 스테이징한다. (`git add .` 지양)
  ```bash
  git add src/foo.ts docs/memory/MEMORY.md docs/CRITICAL_LOGIC.md
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

- [ ] **자기 최적화(Self-Optimization)**: 세션 중 반복된 작업 패턴(3회 이상)이 있다면 `docs/CRITICAL_LOGIC.md`에 기록하고 다음 에이전트를 위한 자동화나 워크플로우를 제안한다.
- [ ] `PROJECT_RULES.md` §4.4의 `Verify Report` 형식에 맞춰 최종 보고를 작성한다.
  - **통합 검증 요약**: `just ci` (또는 `just verify`) **exitCode** + `failedStep` (실패 시 원인 파일/단계 명시)
  - **변경 파일**: 스테이징한 파일 목록
  - **테스트 결과**: pytest 결과 요약
  - **스모크 검증**: 구동 확인 완료 여부
  - **리스크/후속**: 잔여 리스크 및 다음 액션
- [ ] 업데이트된 SSOT 문서 목록과 Git 푸시 성공 여부를 사용자에게 보고하며 세션을 마친다.
