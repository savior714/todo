<!-- Language: ko -->
# `/linear` — Linear–Blueprint 동기화 (템플릿)

## 목적

`dev/emr` 등에서 사용하는 **Linear 이슈와 Blueprint 간 수동 동기화** 절차를 정의한 워크플로이다. **FamilySync(`todo`) 레포에는 `scripts/linear_sync/` 및 관련 플랜이 없을 수 있으므로**, 도입 전까지는 본 파일을 **참고용 템플릿**으로만 취급한다.

## 실행 트리거

- 사용자가 명시적으로 `/linear` 입력
- (도입 시) `ADAPTIVE_GUIDELINES.json`의 AAG-009·AAG-010 등 선제 동기화 규칙

## emr 기준 절차 요약

1. 활성 Blueprint 목록 확인 (`docs/plans/`, archive 제외)
2. `scripts/linear_sync/check_phase7_status.py` 등으로 Linear 상태 조회
3. Blueprint–Linear 매핑 검증
4. API 또는 Linear UI에서 상태·Conclusion 댓글 반영

전체 단계·출력 형식은 **emr**의 `.agents/workflows/linear.md` 원본을 SSOT로 하고, 본 레포에 동기화 스크립트를 추가한 뒤 본문을 그에 맞게 고친다.

## 관련 (도입 시)

- `LINEAR_API_KEY`
- `.agents/memory/ADAPTIVE_GUIDELINES.json` — AAG-009, AAG-010
