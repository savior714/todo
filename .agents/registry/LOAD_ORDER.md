<!-- Language: ko -->
# Load Order & Precedence

## 목적

세션 초기화 시 규칙 파일 로딩 순서와 충돌 해결 기준을 정의한다. Bootstrap(GEMINI.md 등 에디터 세션 부트스트랩)은 이 문서의 순서를 따른다.

본 문서는 `AGENTS.md` §2 Rule Hierarchy와 1:1로 매핑된다.

## 로딩 순서 (AGENTS.md §2 기준)

```text
1. PROJECT_RULES.md (§8 Critical Logic 포함)
2. AGENTS.md
3. .agents/core/ (상시 적용, priority: 1)
4. .agents/domains/ (경로별 동적 적용)
5. .agents/workflows/ (명시적 트리거 시)
6. .agents/adaptive/ (조건부)
```

### 상세 로드 매핑

| 단계 | 파일 | 적용 조건 |
|---|---|---|
| Governance | `PROJECT_RULES.md`, `AGENTS.md` | 세션 시작 시 항상 |
| Routing | `.agents/registry/LOAD_ORDER.md`, `CONTEXT_ROUTING.md` | 세션 시작 시 항상 |
| Memory | `.agents/memory/MEMORY.md` | 세션 시작 시 항상 (인덱스만) |
| Core | `.agents/core/*.md` (priority: 1) | 항상 적용 (`always_apply: true`) |
| Domain | `.agents/domains/*/` | `CONTEXT_ROUTING.md` 경로 매핑 기반 |
| Workflow | `.agents/workflows/*/` | 슬래시 커맨드 또는 명시적 트리거 시 |
| Adaptive | `.agents/adaptive/*.md` | 세션 종료 시 또는 명시적 트리거 시 |

## 충돌 해결 원칙

- 낮은 단계 번호가 높은 단계를 override
- 동일 단계 내에서는 명시적 규칙 > 암시적 규칙
- Domain 규칙 간 충돌 시 더 specific한 경로 패턴 우선
