---
situation: 플랜 아카이브
trigger: /archive
level: Recommended
description: 완료된 docs/plans Blueprint를 archive로 이관하고 저장소 참조를 일괄 갱신
version: 1.0.0
last_updated: 2026-05-06
---


# 완료 플랜 아카이브 워크플로우 (/archive)

진행이 끝난 **`docs/plans/*.md`** 를 **`docs/plans/archive/`** 로 옮기고, `.agents/memory/`, `docs/specs/`, `docs/knowledge/`, `PROJECT_RULES.md` §8 등에 흩어진 **동일 파일명 링크를 한 번에** `plans/archive/` 경로로 맞춥니다.

## 언제 쓰는가

- Blueprint·시장 비교 문서의 **Task/DoD가 모두 완료**되어 루트 `docs/plans/` 를 비우고 싶을 때
- 삭제 대신 **git 이력·경로 추적성**을 유지하고 싶을 때 (삭제는 참조 끊김 위험이 큼)

## 사전 조건

- 대상 파일이 **`docs/plans/` 루트**에 존재해야 함 (이미 `archive/` 에만 있으면 `unarchive` 또는 수동 복구).
- **끊긴 링크 점검**: 저장소 루트에서 `python3 scripts/archive_plans.py check` 실행
  - **성공 시**: "No broken links found" 메시지 확인 → 아카이브 진행
  - **실패 시**: 누락 파일 목록 확인 → 해당 파일을 먼저 정리하거나, 아카이브 후 `docs/plans/archive/README.md`를 통해 사용자에게 안내

## 실행 절차 (에이전트/휴먼 공통)

1. **이관할 파일명 확정** (예: `20260411_interop_hardening_blueprint.md`).
2. **[신규] Specs 일치 검증** — Blueprint 아카이브 전 `docs/specs/` 하위 관련 specs 파일과 불일치 확인
   - **2-1. 관련 specs 파일 식별** — Blueprint 헤더의 `Related`·`Reference`(있을 경우) 및 개요 절의 **범위 SSOT 표**·하단 `[관련 명세](../specs/...)` 링크를 확인한다. ([`docs/specs/_meta/architecture_blueprint_ssot.md`](../../docs/specs/_meta/architecture_blueprint_ssot.md) 형식 권장)
   - **2-2. Specs 파일 존재 여부 확인** — `ls docs/specs/<해당경로>.md`
   - **2-3. 불일치 항목 검증** — 다음 항목들을 비교:
     | 비교 항목 | Blueprint | Specs | 비고 |
     |----------|-----------|-------|------|
     | 테스트 시나리오 수 | 예: 15개 | 동일 | S01-S15 모두 specs에 명시되어 있는지 |
     | 429 Backoff 정책 | 예: 3회, 1s→2s→4s | 동일 | `frontend/e2e/helpers/auth.ts` 구현과 일치 |
     | MFA 감지 로직 | 예: `handleMfaError` | 동일 | 모든 테스트 블록에 적용 |
     | authContext scope | 예: `'worker'` | 동일 | 시리얼 모드 최적화 |
   - **2-4. 불일치 발견 시** — Specs 파일을 Blueprint 기준으로 업데이트 **후** 아카이브 진행
     - Specs가 Blueprint보다 **구체적**이면: Specs를 SSOT로 간주하고 Blueprint 수정 또는 Specs에 주석 추가
     - Specs가 Blueprint보다 **추상적**이면: Blueprint를 상세 구현으로 간주하고 Specs 보완
   - **2-5. 검증 결과 기록** — `docs/plans/archive/` 이동 전, 검증 결과를 Blueprint 하단 `[아카이브 전 검증]` 섹션에 기록
3. **[신규] 잔여 이슈 및 후속 태스크 확인**
   - 아카이브 전, 해당 문서에서 해결되지 못한 이슈(todo/blocked)나 **Conclusion에 기록된 후순위/범위 외(out of scope) 이슈**를 확인한다.
   - **실행**: `python3 scripts/verify/check_residual_issues.py docs/plans/<파일명>.md`
   - **결과 처리**:
     - **이슈 발견 시 (Exit 1)**: 발견된 잔여 이슈 및 `Conclusion` 내 이관 사항들을 모두 수집하여 **`/plan` 워크플로우를 즉시 실행**하고 새로운 Blueprint를 생성한다.
     - **이슈 없음 (Exit 0)**: 다음 단계로 진행한다.
4. **Dry-run (권장)**
   `python3 scripts/archive_plans.py archive --dry-run 20260411_interop_hardening_blueprint.md`
5. **실행**
   `python3 scripts/archive_plans.py archive -- 20260411_interop_hardening_blueprint.md`
   (여러 개 나열 가능)
6. **검증**
   - `python3 scripts/archive_plans.py check` → "No broken links found" 메시지 확인
   - `git add .` → `git diff` 로 의도한 치환만 있는지 확인
   - 커밋 메시지 예시: `docs: archive completed plans`

## 스크립트 동작 요약

| 명령 | 동작 |
|------|------|
| `check` | `docs/plans/` 및 `docs/plans/archive/` 어느 쪽에도 없는 `*.md` 를 가리키는 참조 나열 |
| `archive` | `docs/plans/X` → `docs/plans/archive/X` 로 이동 후, 텍스트 내 `docs/plans/X`, `/plans/X` 형태를 `.../archive/X` 로 치환 |
| `unarchive` | `docs/plans/archive/X` → `docs/plans/X` 로 복구 (아카이브 후 바로 오류 발견 시 긴급 복구용) |

치환 대상 확장자: `.md`, `.mdx`, `.mjs`, `.js`, `.ts`, `.tsx`, `.py`, `.html`, `.json`, `.yml`, `.yaml` (제외 디렉터리: `.git/`, `.venv/`, `node_modules/`, `dist/`, `build/`).

## MEMORY Anti-Drift

- `AGENTS.md` §2.1.1 참조 — `.agents/memory/MEMORY.md` 에 장문 절차를 넣지 말고, **이 파일(워크플로우) + `docs/plans/archive/README.md`** 로만 링크합니다.

## SSOT

- **아카이브 폴더 안내**: [`docs/plans/archive/README.md`](docs/plans/archive/README.md) - 아카이브된 플랜 목록, 아카이브 날짜, 관련 이슈/PR 링크
- **구현**: [`scripts/archive_plans.py`](scripts/archive_plans.py) - 파일 이동 + 링크 치환 + 누락 링크 점검

## 리스크 및 주의사항

- **작업 전 확인**: 아카이브 전에 `git status`를 확인하고, 작업 중인 변경사항이 있다면 먼저 커밋하거나 stash 해주세요
- **병렬 작업 금지**: 아카이브 작업 중에는 다른 사람이 docs/plans/를 수정하지 않도록 혼선 방지
- **MEMORY.md 갱신**: 이 워크플로우 파일만 링크하고, `.agents/memory/MEMORY.md`는 갱신하지 않음
- **복구 가능성**: `unarchive` 명령으로 아카이브를 취소할 수 있으나, 아카이브 후 다른 사람이 수정한 내용이 있다면 충돌 가능성 있음
