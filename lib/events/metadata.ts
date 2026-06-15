import { z } from "zod";
import { KNOWN_ACTION_TYPES } from "@/lib/constants";

const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;

export const CUSTOM_SLUG_REGEX = /^[a-z][a-z0-9_]{0,63}$/;

/** @deprecated Use KNOWN_ACTION_TYPES from @/lib/constants (SSOT) */
export const KNOWN_ACTION_TYPES_SET = new Set(KNOWN_ACTION_TYPES);

export const MEDICATION_UNITS = ["ml", "cc", "mg", "drop", "회"] as const;

const medicationItemSchema = z.object({
  name: z.string().trim().min(1, "약 이름을 입력해 주세요.").max(200),
  amount: z.coerce.number().nonnegative("용량은 0 이상이어야 합니다."),
  unit: z.enum(MEDICATION_UNITS),
});

const medicationDetailSchema = z
  .object({
    subject: z.enum(["kid7", "kid4", "family"]),
    items: z.array(medicationItemSchema).max(20).default([]),
    note: z.string().trim().max(2000).optional(),
  })
  .superRefine((val, ctx) => {
    const hasItems = val.items.length > 0;
    const hasMemo = (val.note ?? "").trim().length > 0;
    if (!hasItems && !hasMemo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "투약 항목을 1개 이상 추가하거나 메모를 입력해 주세요.",
        path: ["items"],
      });
    }
  });

const mealDetailSchema = z.object({
  note: z.string().trim().max(2000).optional(),
});

const genericDetailSchema = z.object({
  note: z.string().trim().max(2000).optional(),
});

const homeworkCompleteDetailSchema = z.object({
  homeworkTypeId: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(300),
});

const routineCompleteDetailSchema = z.object({
  routineItemId: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(300),
});

/** 등원·하원: 아이(프로필 그룹) + 선택 장소. `events.target`은 `child`와 동일하게 둔다. */
const schoolRunDetailSchema = z
  .object({
    child: z.enum(["kid7", "kid4"]),
    place: z.string().trim().max(300).optional(),
  })
  .transform((o) => ({
    child: o.child,
    ...(o.place && o.place.length > 0 ? { place: o.place } : {}),
  }));

export type MedicationDetail = z.infer<typeof medicationDetailSchema>;
export type SchoolRunDetail = z.infer<typeof schoolRunDetailSchema>;
export type NormalizedEventMetadata = Record<string, unknown>;

function pickTimelineFields(raw: Record<string, unknown>): NormalizedEventMetadata {
  const out: NormalizedEventMetadata = {};
  const td = raw.timelineDate;
  if (typeof td === "string" && dateKeyRegex.test(td)) {
    out.timelineDate = td;
  }
  if (raw.override === true) {
    out.override = true;
  }
  return out;
}

/**
 * Server-side: validates action-specific metadata and returns a storable object
 * (timelineDate / override preserved when valid).
 */
export function normalizeAndValidateEventMetadata(
  actionType: string,
  raw: Record<string, unknown>
): NormalizedEventMetadata {
  const base = pickTimelineFields(raw);
  if (actionType === "medication") {
    const medication = medicationDetailSchema.parse(raw.medication);
    return { ...base, medication };
  }
  if (actionType === "school_dropoff" || actionType === "school_pickup") {
    const schoolRun = schoolRunDetailSchema.parse(raw.schoolRun);
    return { ...base, schoolRun };
  }
  if (actionType === "meal") {
    if (raw.meal !== undefined && raw.meal !== null) {
      return { ...base, meal: mealDetailSchema.parse(raw.meal) };
    }
    if (raw.detail !== undefined && raw.detail !== null) {
      const detail = genericDetailSchema.parse(raw.detail);
      if (detail.note !== undefined && detail.note.length > 0) {
        return { ...base, meal: { note: detail.note } };
      }
    }
    return { ...base };
  }
  if (actionType === "homework") {
    const homework = homeworkCompleteDetailSchema.parse(raw.homework);
    return { ...base, homework };
  }
  if (actionType === "routine_check") {
    const routine = routineCompleteDetailSchema.parse(raw.routine);
    return { ...base, routine };
  }
  if (raw.detail !== undefined && raw.detail !== null) {
    return { ...base, detail: genericDetailSchema.parse(raw.detail) };
  }
  return { ...base };
}

export function formatMetadataValidationMessage(err: unknown): string {
  if (err instanceof z.ZodError) {
    const first = err.issues[0];
    return first?.message ?? "입력값을 확인해 주세요.";
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "입력값을 확인해 주세요.";
}

const TARGET_KO: Record<string, string> = {
  kid7: "주원이",
  kid4: "승원이",
  family: "가족",
};

const SCHOOL_CHILD_KO: Record<string, string> = {
  kid7: "주원이 (첫째)",
  kid4: "승원이 (둘째)",
};

/** 타임라인 카드의 `events.target` 한 줄 표기 (kid7/kid4/family 등). */
export function formatEventTargetForDisplay(target: string): string {
  if (target === "kid7" || target === "kid4") {
    return SCHOOL_CHILD_KO[target] ?? target;
  }
  if (target === "family") {
    return TARGET_KO.family;
  }
  return target;
}

/** Short lines for timeline cards (read-only). */
export function summarizeEventMetadataForDisplay(metadataJson: string, actionType: string): string[] {
  try {
    const raw = JSON.parse(metadataJson || "{}") as Record<string, unknown>;
    if (actionType === "medication" && raw.medication && typeof raw.medication === "object") {
      const med = raw.medication as MedicationDetail;
      const subject = med.subject ? TARGET_KO[med.subject] ?? med.subject : "";
      const parts: string[] = [];
      if (subject) {
        parts.push(`대상: ${subject}`);
      }
      if (Array.isArray(med.items)) {
        for (const it of med.items) {
          if (it?.name) {
            parts.push(`${it.name} ${it.amount}${it.unit ?? ""}`.trim());
          }
        }
      }
      if (med.note) {
        parts.push(med.note);
      }
      return parts.filter(Boolean);
    }
    if (actionType === "meal" && raw.meal && typeof raw.meal === "object") {
      const note = (raw.meal as { note?: string }).note;
      return note ? [note] : [];
    }
    if (actionType === "homework" && raw.homework && typeof raw.homework === "object") {
      const title = (raw.homework as { title?: string }).title;
      return title ? [title] : [];
    }
    if (actionType === "routine_check" && raw.routine && typeof raw.routine === "object") {
      const title = (raw.routine as { title?: string }).title;
      return title ? [title] : [];
    }
    if (
      (actionType === "school_dropoff" || actionType === "school_pickup") &&
      raw.schoolRun &&
      typeof raw.schoolRun === "object"
    ) {
      const sr = raw.schoolRun as SchoolRunDetail;
      const lines: string[] = [];
      const who = sr.child ? (SCHOOL_CHILD_KO[sr.child] ?? sr.child) : "";
      if (who) {
        lines.push(`대상: ${who}`);
      }
      if (sr.place) {
        lines.push(`장소: ${sr.place}`);
      }
      return lines;
    }
    if (raw.detail && typeof raw.detail === "object") {
      const note = (raw.detail as { note?: string }).note;
      return note ? [note] : [];
    }
  } catch {
    /* ignore */
  }
  return [];
}
