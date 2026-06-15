---
domain: "core"
scope: [".agents/memory/MEMORY.md"]
always_apply: true
priority: 1
---
<!-- Language: ko -->
# Memory Hygiene Check

세션 메모리(`MEMORY.md`) 위생 상태를 유지한다.

---

## 1. Memory Hygiene Standards

세션 종료 전 `.agents/memory/MEMORY.md`를 점검한다.

### 1.1 필수

- **라인 수**: 200줄 이하 유지
- **중복 링크** 확인
- **`just memory-verify`** 실행

### 1.2 위생 불량 시

- 오래된 로그·결정은 `.agents/memory/changelog/`로 이관
- `MEMORY.md`를 200줄 이하로 정리
- 불량이면 세션을 종료하지 않고 먼저 정리
