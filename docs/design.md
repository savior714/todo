---
id: DESIGN
type: DESIGN
status: active
last_verified: 2026-06-12
---

<!-- Language: ko -->

# Design Token SSOT (Starter)

> **프로젝트 SSOT**: 이 문서는 **{{PROJECT_NAME}}** 의 색·타이포·간격 규칙을 정의합니다.
> Bootstrap 설치 시 **파일이 없을 때만** seed 됩니다 — 기존 `docs/design.md`는 덮어쓰지 않습니다.
>
> 런타임 CSS 변수가 있으면 `{{FRONTEND_APP_PATH}}/src/styles/tokens.css` 등과 1:1로 맞추세요.
> 토큰 변경 시 **문서·CSS 동시 수정** — 불일치 금지.

## Decision Log

| ID | 결정 | 근거 |
|:---|:---|:---|
| D-01 | 1차 관문 = 토큰(색·글꼴·간격) | 화면별 하드코딩보다 토큰 SSOT가 유지보수에 유리 |
| D-02 | 메인 액션 색 = `#2563EB` (Blue 600) | shadcn/Tailwind 기본 블루 — 프로젝트 브랜드에 맞게 수정 |
| D-03 | bootstrap starter | EMR 전용 와이어프레임·의료 UI 패턴은 포함하지 않음 |

## Brand Palette

| Token | Hex | 의미 |
|:---|:---|:---|
| `--color-brand-primary` | `#2563EB` | 메인 액션 |
| `--color-brand-secondary` | `#64748B` | 보조 브랜드 |
| `--color-brand-accent` | `#3B82F6` | 강조·호버 |
| `--color-brand-ink` | `#1E40AF` | 강조 배경 |

## Semantic Palette

| Token | Hex | 의미 |
|:---|:---|:---|
| `--color-success` | `#059669` | 성공·확인 |
| `--color-warning` | `#D97706` | 경고·주의 |
| `--color-danger` | `#DC2626` | 파괴·에러 |
| `--color-info` | `#2563EB` | 정보 |

## Neutral / Surface

| Token | Hex | 용도 |
|:---|:---|:---|
| `--color-bg-primary` | `#FFFFFF` | 메인 표면 |
| `--color-bg-secondary` | `#F3F4F6` | 배경 |
| `--color-border-default` | `#D1D5DB` | 기본 경계선 |
| `--color-text-primary` | `#111827` | 본문 |
| `--color-text-muted` | `#6B7280` | 보조 텍스트 |

## Typography

| Token | 값 | 용도 |
|:---|:---|:---|
| `--font-size-xs` | `0.75rem` | 캡션·메타 |
| `--font-size-sm` | `0.875rem` | 보조 본문 |
| `--font-size-base` | `1rem` | 본문 |
| `--font-size-lg` | `1.125rem` | 소제목 |
| `--font-size-xl` | `1.25rem` | 섹션 제목 |

## Spacing & Radius

| Token | 값 |
|:---|:---|
| `--spacing-2` | `0.5rem` |
| `--spacing-4` | `1rem` |
| `--radius-sm` | `0.25rem` |
| `--radius-md` | `0.375rem` |
| `--radius-lg` | `0.5rem` |

## 신규 UI 호출 규칙

1. shadcn 유틸(`bg-primary`, `text-muted-foreground`) 또는 CSS 변수(`var(--color-brand-primary)`) 중 **한 갈래**만 사용.
2. hex 하드코딩 금지 — 토큰 표에서만 값 변경.
3. 컴포넌트·페이지별 예외는 이 문서 Decision Log에 1줄 기록.

## 다음 단계 (프로젝트별)

- [ ] `{{PROJECT_NAME}}` 브랜드 색으로 Brand Palette 수정
- [ ] `{{FRONTEND_APP_PATH}}` 의 tokens/globals CSS와 표 정합
- [ ] (선택) 화면 타입별 레이아웃 패턴을 §추가 절로 확장
