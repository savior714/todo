# Biome baseline 비어 있을 때 (lint-turn-end 동반 실패)

`just lint` / `frontend_biome_gate.sh` 출력:

```
New Biome errors detected against baseline (N new)
Current: N, Baseline: 0
```

**의미**: `{{FRONTEND_APP_PATH}}/.ci/biome-baseline.txt` 미생성 또는 비어 있음 → 모든 파일이 "new error".

## 잘못된 접근

import 순서를 파일마다 수동 정렬 — biome exact 순서와 불일치, 시간 낭비.

## 올바른 접근

```bash
bash scripts/verify/frontend_biome_gate.sh --auto-fix --update-baseline
```

1. biome `--write --unsafe`로 import 자동 정렬
2. current errors를 baseline에 기록

이후 `just lint-turn-end` 재실행.

**참고**: sync와 직접 무관하나 세션 종료 게이트에서 자주 동반 발생.
