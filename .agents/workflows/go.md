---
situation: 세션 이관
trigger: /go
level: Mandatory
description: 세션 산출물 문서 동기화 및 다음 에이전트 이관 프롬프트 생성
version: 1.0.0
last_updated: 2026-05-06
---

# 🚀 세션 이관 워크플로우 (/go)

이 워크플로우는 **SSOT 동기화 + 다음 세션으로의 이관**을 위한 워크플로우 입니다.

---

## 1. 필수 검증 (반드시 수행)

- 세션에서 **이미 통과한 검증**이 있으면 재실행 없이, 보고에 **실행한 명령과 exit 여부**만 명시한다.
- **FamilySync (`todo`) 표준**: `bun run lint`, `bun run typecheck:strict`, 변경 범위에 따라 `bun run test`·`bun run build`, 그리고 `just ci` (`justfile` 참고).
- `verify-last-result.json`, `verify-ruff-failures.txt`, `verify-ty-failures.txt`, `verify-pytest-failures.txt`는 **본 레포 필수 산출물이 아니다**. 존재하면 참고할 뿐이다.
- 검증 실패 상태라면 이관 보고를 완료하지 않는다

---

## 2. SSOT 동기화 (변경 발생 시에만)

- `docs/specs/`: 기능/계약 변경이 있었을 때만 반영
- `docs/plans/`: 활성 Architecture 청사진이 있으면 [`docs/specs/_meta/architecture_blueprint_ssot.md`](../../docs/specs/_meta/architecture_blueprint_ssot.md) 준수 여부를 **링크 한 줄**로만 기록한다(장문·본문 복붙 금지, `AGENTS.md` MEMORY Anti-Drift와 합치).
- `PROJECT_RULES.md` §8: 설계 결정이 생겼을 때만 반영
- `.agents/memory/MEMORY.md`: 인덱스 링크 1줄만 추가(AGENTS.md §2.1.1 참조, 장문 금지)
- `.agents/memory/project_*.md`: 세션 상세가 필요할 때만 기록

> 원칙: **변경 없는 문서는 읽거나 재서술하지 않는다.**

---

## 3. 컴플라이언스 체크 (요약)

- **Line Count Guard**: 수정 파일 500라인 초과 시 분리 후 이관
- **Memory Anti-Drift**: `AGENTS.md` §2.1.1 참조 (인덱스 링크 1줄만 추가, 장문 금지)
- **Language**: 이관 아티팩트는 한국어 유지
- **State Sync**: 실제 변경 파일 기준으로만 보고

---

## 4. 최신 문서/자산화 체크 (조건부)

- 신규 라이브러리/중요 로직 변경 시 최신 공식 문서 교차 확인
- 웹 검색이 있었다면 `docs/knowledge/{topic}.md` 자산화
- 웹 검색이 없었다면 HANDOFF에 `knowledge update: N/A`로 기록

---

## 5. 자기 최적화 체크 (경량)

- 동일 반복 작업이 3회 이상인지 확인 (수정 재시도/동일 검증 반복 등)
- 반복 패턴이 있으면 자동화 후보를 `Notes`에 1줄 제안

---

## 6. 출력 품질 규칙

- 전문 인용 금지: `AGENTS.md` / `PROJECT_RULES.md` / `MEMORY.md`
- HANDOFF는 섹션별 1~3줄 원칙
- 동일 수정 3회 실패 시 중단 후 전략 전환
- `/go`는 Push를 강제하지 않음(상태만 보고)

---

## 7. 에이전트 맞춤형 HANDOFF 전략
- **To VS Code (Executor)**: [READY FOR VS CODE] 마킹과 함께 원자적 수정 명령(파일 경로, 구체적 로직)을 명시합니다.
- **To Cursor (Reviewer)**: 전체 SSOT 정합성 체크 리스트와 `verify-last-result.json` 결과 요약을 강조합니다.
- **To Antigravity (Architect)**: 현재까지의 아키텍처 결정 사항(`PROJECT_RULES.md` §8)과 열린 리스트(Open Questions)를 우선 보고합니다.

---

## 8. HANDOFF 출력 템플릿 (고정)

아래 템플릿을 응답 최하단 코드블록으로 출력합니다.

```markdown
# 🔄 Session Transition (Balanced)

## 📌 Context Load Order
1. `AGENTS.md` / `PROJECT_RULES.md`
2. `PROJECT_RULES.md` §8 (Critical Logic)
3. `.agents/memory/MEMORY.md`
4. 관련 `docs/specs/*`

## ✅ Done
- [완료 항목 2~5개]

## 📂 Changed Files
- `path/to/file1`
- `path/to/file2`

## ✅ Verify
- exitCode: [0/1]
- failedStep: [없으면 null]
- test scope: [실행 범위 한 줄]

## 🧭 SSOT Sync
- specs: [변경 있음/없음]
- CRITICAL_LOGIC: [변경 있음/없음] (PROJECT_RULES.md §8)
- MEMORY index: [변경 있음/없음]
- README: [변경 있음/없음]
- knowledge update: [반영됨/N/A]

## 🧠 Architectural Intent
- current state: [현재 상태 1~2줄]
- business/infrastructure split: [핵심 변경 분리 1~2줄]

## ⚠️ Risks
- [남은 리스크 0~2개]

## 💡 Notes
- [다음 에이전트가 알아야 할 실행 팁 0~2개]
- [반복 패턴 기반 자동화 제안 0~1개]

## 🚀 Next (1)
1. [다음 세션 첫 물리 작업 1개]
```

---

## 9. 권장 길이

- `/go` 최종 응답은 **가능하면 300~500단어 내**로 유지합니다.