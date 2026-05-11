import { z } from "zod";

const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;

export const MEDICATION_UNITS = ["ml", "cc", "mg", "drop", "회"] as const;

const medicationItemSchema = z.object({
  name: z.string().trim().min(1, "약 이름을 입력해 주세요.").max(200),
  amount: z.coerce.number().nonnegative("용량은 0 이상이어야 합니다."),
  unit: z.enum(MEDICATION_UNITS),
});

const medicationDetailSchema = z.object({
  subject: z.enum(["kid7", "kid4", "family"]),
  items: z.array(medicationItemSchema).min(1, "투약 항목을 1개 이상 추가해 주세요.").max(20),
  note: z.string().trim().max(2000).optional(),
});

const mealDetailSchema = z.object({
  note: z.string().trim().max(2000).optional(),
});

const genericDetailSchema = z.object({
  note: z.string().trim().max(2000).optional(),
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
    return { ...base };
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
  kid7: "7세 그룹",
  kid4: "4세 그룹",
  family: "가족",
};

const SCHOOL_CHILD_KO: Record<string, string> = {
  kid7: "첫째 (7세 그룹)",
  kid4: "둘째 (4세 그룹)",
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
