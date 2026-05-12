---
scope: ["*"]
always_apply: true
priority: 1
---
<!-- Language: ko -->
# Verification & Patch Integrity Rules

코드 수정 전후의 검증 매트릭스와 패치 무결성을 유지하기 위한 **세부 규칙**을 정의한다.

---

## 1. Verification Matrix

작업 범위에 맞는 검증을 통과한 후 완료를 선언해야 한다.

| Scope | Required |
|---|---|
| Docs | link/path 정합성 |
| L1 small | `bun run lint` + `bun run typecheck:strict` |
| L2 feature | L1 + `bun run test` |
| L3 structural | L2 + `just ci` |
| Frontend UI | `bun run lint` + `bun run typecheck:strict` |
| Grid/layout | 수동 UI 점검 + `bun run test` 관련 케이스 |
| Directory | `/directory_verify` |

**산출물:**

- `verify-last-result.json`
- `docs/reports/REPORT_verify_report.md`

---

## 2. Patch Integrity Rules

### 2.1 Safe Edit Loop

1. lint/type 실행
2. 에러 1건 선택
3. 파일 read
4. exact snippet 확보
5. minimal patch
6. formatter / lint 재실행
7. 변경이 있으면 재read

### 2.2 Additional Rules

- regex보다 AST 기반 수정을 우선한다.
- formatter에 의해 context가 쉽게 바뀔 수 있으므로 patch 이후 재확인한다.
- 관련 없는 정리 작업은 하지 않는다.
