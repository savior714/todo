# Required drift · Phase 2 루프

## Phase 2 자동 갱신 루프

`just sync --check`가 `required` drift를 보고해도 **즉시 exit 1하지 않을 수 있음**.
에이전트 루프:

1. drift 목록 → 후보 스펙 경로 식별
2. `@code-sync-lock`의 `spec:` 필드 문서 우선 읽기
3. 스펙 본문 수정 (Claim·표·절)
4. `just sync --check` → PASS까지 반복

**함정**: 일부 spec만 수정하면 다시 `required` — **모든** drift 해결까지 반복.

## `required` vs PASS

`required` 힌트가 출력되어도 **code lock + spec alignment가 PASS**이면 통과 가능.
본문 편집은 Phase 2 루프 또는 Blueprint Phase 종료 게이트에서 수행.

## 점진적 Blueprint — PASS면 다음 Phase로 이양

대규모 Blueprint Phase 1(모델·API·UI) 직후 흔한 패턴:

```
🔍 Spec drift level: required
   Reason: 라우트·Next 설정·프록시/미들웨어 변경 …

✅ [PASS] Spec alignment: 문서 갱신 N 건
```

**원인**: 코드 변경은 감지됐으나 **현재 Phase에서 spec 본문 완성이 의도적으로 보류**된 경우.

**대응**:

1. `just sync-turn-end` PASS
2. `just sync --check` — `required`라도 **PASS**면 통과
3. spec 본문은 **해당 Blueprint Phase 종료(plan-close)** 시 한 번에
4. `required` drift는 다음 Phase로 이양 가능

**핵심**: code lock PASS + spec alignment PASS → 즉시 본문 편집 강제 아님.

## 레거시 CLI

`just sync --nudge` · `just spec-sync-nudge` — **제거됨**. `just sync --check`만 사용.
