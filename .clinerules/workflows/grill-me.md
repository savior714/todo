---
situation: 계획 심문
trigger: /grill-me
level: Recommended
description: 설계 결정 및 블라인드 스팟 심층 심문 (Stress-test)
version: 1.0.0
last_updated: 2026-05-06
---

# 🛡️ Grill Me

## When to use
- User wants to stress-test a plan, architecture, or design decision
- User says "grill me" or asks to be challenged on their thinking
- User wants to uncover blind spots before implementation

## When NOT to use
- User just wants quick feedback (not deep interrogation)
- User is in early brainstorming and wants open exploration
- The plan is too vague to meaningfully question (ask user to elaborate first)

## Inputs required
- A plan, design doc, or proposal to interrogate
- Optional: context about constraints, stakeholders, or risk areas of concern

## Workflow

1. **Acknowledge & Scope** — Restate the plan in your own words. Confirm you understand it correctly before grilling.

2. **Walk the Decision Tree** — Systematically go through each major decision branch:
   - Identify every explicit and implicit design decision in the plan
   - For each decision, ask: "Why this choice? What were the alternatives?"
   - Provide your recommended answer with reasoning

3. **Probe Dependencies** — For each resolved decision, check:
   - Does this create constraints on other decisions?
   - Are there ordering or sequencing implications?
   - What breaks if this assumption changes?

4. **Stress Test** — For each resolved area:
   - Ask: "What could go wrong?"
   - Challenge edge cases and failure modes
   - Question non-functional requirements (performance, scalability, security)

5. **Summarize** — When all branches are resolved:
   - List every decision made with the rationale
   - Flag any unresolved tensions or open questions
   - Note areas where the plan is solid vs. where it needs more work

## Principles
- Always provide a recommended answer, not just questions
- Be direct and specific — avoid vague challenges
- Dig deeper when answers are hand-wavy
- Track decisions as you go so nothing gets lost
