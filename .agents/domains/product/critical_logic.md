---
scope: ["PROJECT_RULES.md", "CRITICAL_RULES.md"]
always_apply: false
priority: high
description: FamilySync 불변·의사결정 SSOT
---

<!-- Language: ko -->
# Critical Logic & Product Invariants

## MUST

- **SSOT**: 가족 격리·투약 안전·인증·세션·타임라인 메타데이터 등 **불변**은 [`PROJECT_RULES.md`](../../PROJECT_RULES.md) §8(Critical Logic)에 따른다.
- **동기화**: 계약·동작을 바꾸면 관련 테스트·`PRD`/`TRD`·본 문서를 함께 갱신한다.
- **진입점**: [`CRITICAL_RULES.md`](../../CRITICAL_RULES.md)는 본 SSOT로의 링크만 제공한다.

## MUST NOT

- `CRITICAL_LOGIC`과 충돌하는 "편의상" 예외를 코드에만 남기기
