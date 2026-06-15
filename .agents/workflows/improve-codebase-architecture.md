---
situation: 아키텍처 개선 및 리팩토링
trigger: /improve-codebase-architecture
level: Recommended
description: Matt Pocock improve-codebase-architecture 스킬 — shallow 모듈 → deep 모듈 전환, 테스트 용이성 + AI 탐색성 향상
version: 1.0.0
last_updated: 2026-05-06
---

# 🏗️ Improve Codebase Architecture

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

## 프로젝트 컨텍스트 (FamilySync)

본 레포는 Next.js App Router 기반 단일 앱이다. Matt Pocock의 shallow/deep 모듈 개념은 다음 레이어 경계에 적용한다.

| Pokock 용어 | 프로젝트 매핑 |
|---|---|
| Module | `app/`, `lib/`, `db/` 하위 모듈 |
| Interface | Server Actions, Route Handlers, lib/ export 함수 |
| Implementation | UI 컴포넌트, 도메인 로직, Drizzle 쿼리 |
| Seam | `app/actions/` ↔ `lib/`, `lib/` ↔ `db/` 경계 |
| Depth | lib/ 도메인 함수의 레버리지 (작은 인터페이스 → 복잡한 로직) |

## 📚 Glossary

Use these terms exactly in every suggestion. Consistent language is the point — don't drift into "component," "service," "API," or "boundary." Full definitions in [Glossary](#-glossary).

- **Module**: Anything with an interface and an implementation (function, class, package, slice).
- **Interface**: Everything a caller must know to use the module: types, invariants, error modes, ordering, config. Not just the type signature.
- **Implementation**: The code inside.
- **Depth**: Leverage at the interface: a lot of behaviour behind a small interface. **Deep** = high leverage. **Shallow** = interface nearly as complex as the implementation.
- **Seam**: Where an interface lives; a place behaviour can be altered without editing in place.
- **Adapter**: A concrete thing satisfying an interface at a seam.
- **Leverage**: What callers get from depth.
- **Locality**: What maintainers get from depth: change, bugs, knowledge concentrated in one place.

### 프로젝트 매핑

- **Seam**: `app/actions/` ↔ `lib/events/`, `lib/` ↔ `db/` 등 레이어 경계
- **Adapter**: Server Action이 lib/ 함수를 호출하는 패턴
- **Locality**: `lib/events/metadata.ts` — 모든 이벤트 검증 로직이 한 곳에 집중

### Key Principles
- **Deletion test**: Imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.**
- **One adapter = hypothetical seam. Two adapters = real seam.**

## 🔄 Process

### 1. Explore
Read `lib/` 하위 모듈, `app/actions/`, `db/schema.ts`를 확인하고 도메인 경계를 파악한다.
Explore organically and note where you experience friction:
- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow** — interface nearly as complex as the implementation?
- Where have pure functions been extracted just for testability, but the real bugs hide in how they're called (no **locality**)?
- Where do tightly-coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow.

### 2. Present Candidates
Present a numbered list of deepening opportunities. For each candidate:
- **Files**: Which files/modules are involved.
- **Problem**: Why the current architecture is causing friction.
- **Solution**: Plain English description of what would change.
- **Benefits**: Explained in terms of locality and leverage, and also in how tests would improve.

**도메인 어휘는 `db/schema.ts` (테이블명), `lib/` 하위 폴더명, `app/actions/` 함수명을 사용한다.**
Do NOT propose interfaces yet. Ask the user: "Which of these would you like to explore?"

### 3. Grilling Loop
Once the user picks a candidate, drop into a grilling conversation. Walk the design tree with them — constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.

Side effects:
- **Naming**: If naming a deepened module after a new concept, document it.
- **ADR**: If the user rejects for a load-bearing reason, offer to record it as an ADR.
- **Want to explore alternative interfaces for the deepened module?** See [Interface Design](#-interface-design).

---

## 🎨 Interface Design

When exploring alternative interfaces for a chosen deepening candidate, use this pattern:

### 1. Frame the problem space
- The constraints any new interface would need to satisfy.
- The dependencies it would rely on.
- A rough illustrative code sketch to ground the constraints.

### 2. Design Twice (or Thrice)
Propose radically different interfaces for the deepened module:
- **Option A (Minimal)**: 1–3 entry points max. Maximise leverage per entry point.
- **Option B (Flexible)**: Support many use cases and extension.
- **Option C (Common Case)**: Optimise for the most common caller.
- **Option D (Server Action → lib/)**: Server Action을 port, lib/ 함수를 adapter로 설계

For each option, provide:
1. Interface (types, methods, params — plus invariants, ordering, error modes)
2. Usage example showing how callers use it
3. What the implementation hides behind the seam
4. Trade-offs

### 3. Present and Compare
Contrast by **depth** (leverage at the interface), **locality** (where change concentrates), and **seam placement**.
Be opinionated — provide a strong recommendation on which design is strongest and why.
