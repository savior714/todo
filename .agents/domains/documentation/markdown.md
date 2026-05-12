---
scope: ["*.md", "docs/**"]
always_apply: false
priority: normal
description: 문서화·한국어 우선·언어 게이트
---

<!-- Language: ko -->
# Documentation & Markdown Rules

## MUST

- **Korean First Policy**: 문서·보고·응답은 한국어 원칙. 코드·기술 용어는 영문 가능.
- **Session Language Gate (AAG-008)**: 신규 `.md` 파일 첫 줄에 `<!-- Language: ko -->` 삽입.
- **SSOT Preservation**: `README.md` 디렉터리 맵, `docs/plans` 로드맵 정보를 임의로 훼손하지 않는다.
- **Link Integrity**: 내부 링크·파일 참조 경로 유효성 유지.
- **Knowledge**: 해결·노하우는 `docs/knowledge/` 자산화를 검토한다.

### Session Language Gate 실행

1. 신규 `.md` 생성 시 첫 줄에 언어 주석
2. 필요 시 `just session-gate` / `just session-gate-strict`
3. `scripts/verify_korean_text.py`로 연속 영문 단락 등 검사

## MUST NOT

- 영문-only 리포트
- 로드맵·계획에서 `todo`/`pending`을 명시적 폐기 없이 삭제
- 언어 주석 없이 신규 마크다운 생성
