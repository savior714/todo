---
scope: [".agents/workflows/bootstrap.md"]
domain: "workflows"
situation: 환경 동기화
trigger: /bootstrap
level: Recommended
description: FamilySync MVP 로컬·검증 재현 체크리스트 (타 레포 bootstrap 템플릿 비적용)
version: 2.0.0
last_updated: 2026-05-11
---
<!-- Language: ko -->

# `/bootstrap` — FamilySync MVP (`todo`)

원래 이 트리거는 `../bootstrap`·`dev/bootstrap`·`verify.sh` 등 **외부 템플릿 동기화**를 가정한 워크플로였다. **본 레포에는 해당 디렉터리·스크립트가 없으므로**, 에이전트는 아래 **로컬 재현·검증 체크리스트**만 수행·안내한다.

## 체크리스트

1. **의존성**: `bun install`
2. **환경 변수**: `.env.example`·`README.md`·Vercel 문서를 참고해 `AUTH_*`·`TURSO_*` 등 설정
3. **앱 기동**: `bun run dev`
4. **품질 게이트**: `bun run lint && bun run typecheck:strict` (+ 변경 시 `bun run test`·`bun run build`)
5. **플랜·메모리**: `just ci` (`justfile`: 플랜 계약·`memory-verify`)
6. **DB 스키마**: `README.md` 절차에 따라 `npm run db:migrate` (Turso)

## 주의

- 민감 값(`.env`, Vercel pull 파일)은 **커밋하지 않는다** (`.gitignore` 준수).
- 상위 폴더로 템플릿을 export하는 작업은 **이 레포 범위 밖**이다.
