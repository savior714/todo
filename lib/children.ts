/**
 * lib/children.ts — child identifier SSOT (Single Source of Truth)
 *
 * kid7 / kid4 identifier, 한글 label map, Zod enum helper, DB→UI 매핑 함수를
 * 단일 모듈에서 제공한다. 모든 UI 컴포넌트와 서버 액션에서 이 모듈을 import 한다.
 */

import { z } from "zod";

// ── Constants ────────────────────────────────────────────────────────────────

export const CHILD_IDS = ["kid7", "kid4"] as const;
export const CHILD_TARGETS = ["kid7", "kid4", "family"] as const;

export const KID7 = "kid7" as const;
export const KID4 = "kid4" as const;
export const FAMILY = "family" as const;

export type ChildId = (typeof CHILD_IDS)[number];
export type ChildTarget = (typeof CHILD_TARGETS)[number];

/** 기본 타겟 (시드 데이터 등) */
export const DEFAULT_CHILD_TARGET: ChildId = "kid4";

// ── Label maps (context별 분리) ──────────────────────────────────────────────

/** quick-actions / medication subject 등 — "주원이", "승원이", "가족 전체" */
export const TARGET_LABEL: Record<ChildTarget, string> = {
  kid7: "주원이",
  kid4: "승원이",
  family: "가족 전체",
};

/** routine_items 등 — "주원이 (첫째)", "승원이 (둘째)", "가족 공통" */
export const ROUTINE_TARGET_LABEL: Record<ChildTarget, string> = {
  kid7: "주원이 (첫째)",
  kid4: "승원이 (둘째)",
  family: "가족 공통",
};

/** homework_types 등 — "주원이", "승원이" */
export const CHILD_GROUP_LABEL: Record<ChildId, string> = {
  kid7: "주원이",
  kid4: "승원이",
};

/** school_run / brushing 등 — "주원이", "승원이" (hint 별도) */
export const CHILD_LABEL: Record<ChildId, string> = {
  kid7: "주원이",
  kid4: "승원이",
};

/** school_run child display — "주원이 (첫째)", "승원이 (둘째)" */
export const SCHOOL_CHILD_LABEL: Record<ChildId, string> = {
  kid7: "주원이 (첫째)",
  kid4: "승원이 (둘째)",
};

/** timeline event target display — "주원이", "승원이", "가족" */
export const EVENT_TARGET_LABEL: Record<ChildTarget, string> = {
  kid7: "주원이",
  kid4: "승원이",
  family: "가족",
};

// ── Zod helpers ──────────────────────────────────────────────────────────────

export function zodChildEnum() {
  return z.enum(CHILD_IDS);
}

export function zodChildTargetEnum() {
  return z.enum(CHILD_TARGETS);
}

// ── Formatting helpers ───────────────────────────────────────────────────────

export function formatChildLabel(id: ChildId): string {
  return CHILD_LABEL[id] ?? id;
}

export function formatChildTargetLabel(target: ChildTarget): string {
  return TARGET_LABEL[target] ?? target;
}

/** kid7/kid4 → "주원이 (첫씨)" / "승원이 (둘째)", family → "가족" */
export function formatEventTargetForDisplay(target: string): string {
  if (target === "kid7" || target === "kid4") {
    return SCHOOL_CHILD_LABEL[target as ChildId] ?? target;
  }
  if (target === "family") {
    return EVENT_TARGET_LABEL.family;
  }
  return target;
}

/** DB child_group/target 값을 UI safe 값으로 normalize */
export function normalizeChildGroup(raw: string): ChildId {
  if (raw === "kid7" || raw === "kid4") {
    return raw as ChildId;
  }
  console.warn(`[normalizeChildGroup] Invalid childGroup: "${raw}" — defaulting to "${DEFAULT_CHILD_TARGET}"`);
  return DEFAULT_CHILD_TARGET;
}

export function normalizeRoutineTarget(raw: string): ChildTarget {
  if (raw === "kid7" || raw === "kid4" || raw === "family") {
    return raw as ChildTarget;
  }
  console.warn(`[normalizeRoutineTarget] Invalid routine target: "${raw}" — defaulting to "family"`);
  return "family";
}

/** target validation — "kid7" | "kid4" | "family" 인지 확인 */
export function isValidTarget(raw: string): raw is ChildTarget {
  return raw === "kid7" || raw === "kid4" || raw === "family";
}

/** child identifier 인지 확인 */
export function isChildId(raw: string): raw is ChildId {
  return raw === "kid7" || raw === "kid4";
}
