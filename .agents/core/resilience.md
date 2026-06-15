---
domain: "core"
scope: ["*"]
always_apply: true
priority: 1
---
<!-- Language: ko -->
# Retry & Resilience

예외 상황(타임아웃, 연결 끊김 등) 시 복구 및 재시도 전략을 정의한다.

---

## 1. Retry Triggers

- `terminated`
- `timeout`
- `context_length_exceeded`
- `connection_reset`
- `rate_limit`

---

## 2. Resilience Strategies

- **Text/Search**: 범위·텍스트 양을 줄여 chunked retry
- **Code**: task/file split 후 재시도
- **Large Ops**: grouped retry
- **Backoff**: `rate_limit` 시 지수 백오프
- **Logging**: retry log 유지
- **Reporting**: partial failure 시 사용자에게 보고
