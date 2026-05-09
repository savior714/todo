---
situation: 구조 변경
trigger: /directory_verify
level: Mandatory
description: README.md 디렉토리 맵 일치 여부 검증 (verify_directory_map.py)
version: 1.0.0
last_updated: 2026-05-06
---

# 📂 디렉토리 구조 검증 워크플로우 (/directory_verify)

이 워크플로우는 프로젝트의 디렉토리 구조가 변경되었을 때, `README.md`의 '12. 프로젝트 디렉토리 맵'과 실제 파일 시스템이 일치하는지 검증합니다.

## 실행 지침

1. **변경 감지**: 파일 이동, 폴더 생성, 삭제 등 구조적 변경이 발생했을 때 호출합니다.
2. **검증 실행**:
   ```bash
   python3 scripts/verify_directory_map.py
   ```
3. **불일치 해결**:
   - 검증 실패 시 `README.md`를 실제 구조에 맞게 업데이트합니다.
   - 업데이트 후 다시 검증을 실행하여 PASS를 확인합니다.

## Definition of Done
- [ ] `verify_directory_map.py` 실행 결과 SUCCESS 확인
- [ ] `README.md` 내 디렉토리 맵이 최신 상태임
