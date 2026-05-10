---
description: AI의 작업 과정 중 가치가 높은 "인지적 흔적(Cognitive Trace)"을 선별적으로 기록하여, 미래의 학습 데이터(Gold Data) 및 인사이트 추출
---

# 🧠 인지 관측성 로깅 워크플로우 (/ai-log)

이 워크플로우는 AI의 작업 과정 중 가치가 높은 "인지적 흔적(Cognitive Trace)"을 선별적으로 기록하여, 미래의 학습 데이터(Gold Data) 및 인사이트 추출을 위한 기반을 마련합니다.

## 1. 개요 및 철학 (Curation Philosophy)

단순한 작업 기록(Surveillance)이 아닌, **인지적 가치(Observability)**가 있는 순간만을 기록합니다. 
"나중에 이 로그를 보고 모델이 자신의 실수를 교정하거나, 복잡한 아키텍처 결정을 재현할 수 있는가?"를 기준으로 삼습니다.

### ✅ 기록 대상 (Interesting Cognition)
- **Assumption Correction**: 모델이 잘못된 전제를 스스로 수정하거나 사고를 전환한 순간.
- **Retrieval materially changed outcome**: 검색(RAG/Research)을 통해 결정적인 해결책을 찾은 사례.
- **Compression success**: 방대한 reasoning을 짧고 명확한 인사이트로 압축해 낸 경우.
- **High-token failure**: 자원을 대량 소모하고도 실패한 경우 (병목 분석용).
- **Self-repair trajectory**: 여러 시도(Retry)를 거치며 해결책이 점진적으로 정교해지는 과정.
- **Domain Insight**: FHIR, 보험 청구 등 특정 도메인의 미묘한 엣지 케이스 해결.

### ❌ 제외 대상 (Trivial/Noise)
- 단순 오타 수정, Boilerplate CRUD 생성, 단순 포맷팅.
- 한 번에 완벽하게 성공한 일반적인 생성물.

### ⚠️ Cognition Value Score (CVS) 자동 보정 원칙
- **수동 CVS 설정 금지**: `--cvs-json` 파라미터로 novelty/depth/reusability 값을 수동으로 입력하지 마세요.
- **자동 계산**: 데이터셋이 축적되면 `export_analyzer.py --auto-cvs` 명령어로 패턴 기반 학습을 통해 자동 보정됩니다.
  - **Threshold**: Golden Log 50건 이상 시 자동 실행 (또는 `--auto-cvs` 플래그로 강제)
  - **Heuristics**: 도구 조합 희소성, 시도 횟수+성공=depth, 검색 이벤트=novelty 등
- **현재 상태**: CVS 필드는 NULL 상태로 유지되며, 향후 SFT/DPO 파이프라인에서 Golden Log 우선순위 결정에 활용됩니다.

---

## 2. 사용 방법

### 기본 명령어 (CLI 연동)
`/ai-log`를 호출하면 에이전트는 `tools/ai_worklog/log_task.py`를 사용하여 다음 정보를 수집하고 기록합니다.

```bash
# 1. 고시그널 성공 로그
python3 tools/ai_worklog/log_task.py \
    --task "[작업 이름]" \
    --success true \
    --lineage "[관련 ID]" \
    --attempt [시도 횟수] \
    --token-json '{"prompt": N, "completion": M, "cached": K, "retrieval": L}' \
    --env '{"model": "...", "temp": ...}' \
    --compressed-takeaway "[압축된 핵심 인사이트]"

# 2. 실패 및 근본 원인 분석
python3 tools/ai_worklog/log_task.py \
    --task "[작업 이름]" \
    --success false \
    --failure "[카테고리]" \
    --root-cause "[근본 원인 분석]" \
    --compressed-takeaway "[교훈]"
```

### 토큰 사용량: 정확치가 없을 때 (Rough estimate 필수)

플랫폼이 에이전트 채널에 **정확한 토큰 수를 넘겨주지 않는 경우가 대부분**이어도, 분석·휴리스틱용으로 **`--token-json`은 0으로 비우지 말고 추정치를 넣는다.** 절대값보다 **수량급(order)과 prompt/completion 비율**이 의미 있다.

| 입력 | 관행적인 rough 변환 |
|------|---------------------|
| 눈에 보이는 대화·규칙·붙은 스니펫 등 **입력 쪽 합산 글자 수** | 영어 위주: `≈ chars / 4`. 한글·혼합: `≈ chars / 2` ~ `chars / 3` 구간으로 잡기. |
| **도구로 대량 read/search** 한 턴이 많음 | 위 추정에 **1.5~2배** 또는 구간 상한을 올려 반영. |
| `prompt` vs `completion` 분해 | 대화+컨텍스트 덩어리 → `prompt`, 모델이 쓴 답·패치 설명 → `completion`으로 **대략 분할** (정확할 필요 없음). |
| `cached`, `retrieval` | 알 수 없으면 `0` 또는 생략 가능한 필드 정책에 따름. 모호하면 `env`에 `"token_note":"heuristic"` 정도만 남겨도 됨. |

**원칙**: “측정 불가”라고 **전부 0**만 넣기보다, **구간의 중앙값 하나**를 숫자로 넣는 편이 로그 가치가 높다. `compressed-takeaway`와 달리 토큰 필드는 **라벨 없이도 추정임이 전제**라도 된다.

---

## 3. 실행 프로토콜 (Agent Protocol)

사용자가 `/ai-log`를 요청하면 에이전트는 다음 단계를 수행합니다:

1.  **가치 판별**: 현재 진행 중인 세션이나 최근 작업이 위 "기록 대상"에 해당되는지 자문합니다.
2.  **데이터 추출**: 
    - `lineage_id`: 세션의 일관성을 나타내는 고유 ID 생성 또는 유지.
    - `token_usage`: API 수치가 없으면 위 **「토큰 사용량: Rough estimate」** 절에 따라 `prompt` / `completion` 등을 **휴리스틱으로 채운다** (전부 0 회피).
    - `environment`: 사용 중인 모델 이름, 온도, 컨텍스트 크기 등 수집.
3.  **인사이트 압축**: `takeaway`를 넘어서는 `compressed_takeaway`와 `root_cause`를 도출합니다.
4.  **기록 실행**: `tools/ai_worklog/log_task.py`를 실행하여 DB에 영구 저장합니다.
5.  **보고**: 저장 완료 메시지와 함께 간략한 요약을 제공합니다.

---

## 4. 데이터 활용 (Future Value)

저장된 데이터는 `export_jsonl.py`를 통해 다음 목적으로 활용됩니다:
- **SFT (Supervised Fine-Tuning)**: "Good Reasoning Trace" 학습.
- **DPO (Direct Preference Optimization)**: 성공 vs 실패 쌍 구성.
- **Personalized Retrieval**: 사용자 특유의 코딩 패턴 및 도메인 지식 검색 지원.
