---
scope: ["Dockerfile*", "docker-compose*"]
always_apply: false
priority: normal
description: 컨테이너·로컬 인프라 (레포 정책 반영)
---

<!-- Language: ko -->
# Infrastructure & Docker Rules

## MUST

- **PROJECT_RULES 준수**: 본 MVP 레포는 루트 `docker-compose.dev.yml`·`./run_dev.sh` 기반 **풀스택 로컬**을 표준으로 두지 않는다. 문서·스크립트가 이와 모순되면 `PROJECT_RULES.md`를 우선한다.
- **Built-in Tool Priority**: 파일 I/O는 Read/Write/Grep/Glob/SemanticSearch 우선.

## MUST NOT

- 정책에 없는 "표준 포트·데몬"을 임의로 가정해 문서화
- Built-in으로 가능한 작업을 무근거 Shell로 대체
