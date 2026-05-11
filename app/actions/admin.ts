"use server";

import { revalidatePath } from "next/cache";
import { and, eq, max } from "drizzle-orm";
import { db } from "@/db/client";
import { careGuides, dailyPins, events, homeworkLogs, homeworkTypes, quickActions } from "@/db/schema";
import { getActiveProfileContext } from "@/lib/auth/session";
import { normalizeAndValidateEventMetadata } from "@/lib/event-metadata";

const PRESET_ACTION_TYPES = new Set([
  "meal",
  "medication",
  "school_dropoff",
  "school_pickup",
  "brushing",
]);

type QuickActionParseResult<T> = { ok: true; value: T } | { ok: false; error: string };
type CreateQuickActionResult = { success: true } | { success: false; error: string };

function parseActionTypeFromForm(formData: FormData): QuickActionParseResult<string> {
  const preset = String(formData.get("actionPreset") ?? "").trim();
  if (preset === "custom") {
    const slug = String(formData.get("actionCustom") ?? "").trim();
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(slug)) {
      return { ok: false, error: "커스텀 타입은 소문자 시작, 영문·숫자·밑줄만 사용할 수 있습니다." };
    }
    return { ok: true, value: slug };
  }
  if (!PRESET_ACTION_TYPES.has(preset)) {
    return { ok: false, error: "액션 타입이 올바르지 않습니다." };
  }
  return { ok: true, value: preset };
}

function parseQuickActionTarget(formData: FormData): QuickActionParseResult<"kid7" | "kid4" | "family"> {
  const raw = String(formData.get("target") ?? "");
  if (raw === "kid7" || raw === "kid4" || raw === "family") {
    return { ok: true, value: raw };
  }
  return { ok: false, error: "대상이 올바르지 않습니다." };
}

async function resolveActiveAdmin() {
  const profile = await getActiveProfileContext();

  if (!profile) {
    throw new Error("프로필을 찾을 수 없습니다.");
  }

  if (profile.role !== "admin") {
    throw new Error("관리자 권한이 필요합니다.");
  }

  return profile;
}

export async function upsertDailyPin(content: string) {
  const profile = await resolveActiveAdmin();

  await db
    .update(dailyPins)
    .set({ isActive: false })
    .where(and(eq(dailyPins.familyId, profile.familyId), eq(dailyPins.isActive, true)));

  await db.insert(dailyPins).values({
    id: crypto.randomUUID(),
    familyId: profile.familyId,
    content,
    isActive: true,
    createdBy: profile.id,
  });

  return { success: true };
}

export async function createHomeworkType(childGroup: "kid7" | "kid4", title: string) {
  const profile = await resolveActiveAdmin();
  await db.insert(homeworkTypes).values({
    id: crypto.randomUUID(),
    familyId: profile.familyId,
    childGroup,
    title,
    isActive: true,
  });

  revalidatePath("/admin");
  revalidatePath("/homework");
  return { success: true };
}

export async function deactivateHomeworkType(formData: FormData) {
  const profile = await resolveActiveAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("잘못된 요청입니다.");
  }

  await db
    .update(homeworkTypes)
    .set({ isActive: false })
    .where(and(eq(homeworkTypes.id, id), eq(homeworkTypes.familyId, profile.familyId)));

  revalidatePath("/admin");
  revalidatePath("/homework");
  return { success: true };
}

export async function completeHomework(homeworkTypeId: string) {
  const profile = await getActiveProfileContext();

  if (!profile) {
    throw new Error("프로필을 찾을 수 없습니다.");
  }

  const [hwType] = await db
    .select({
      id: homeworkTypes.id,
      title: homeworkTypes.title,
      childGroup: homeworkTypes.childGroup,
    })
    .from(homeworkTypes)
    .where(and(eq(homeworkTypes.id, homeworkTypeId), eq(homeworkTypes.familyId, profile.familyId)))
    .limit(1);

  if (!hwType) {
    throw new Error("숙제 유형을 찾을 수 없습니다.");
  }

  const today = new Date().toISOString().slice(0, 10);

  const [existingLog] = await db
    .select({ id: homeworkLogs.id })
    .from(homeworkLogs)
    .where(
      and(
        eq(homeworkLogs.familyId, profile.familyId),
        eq(homeworkLogs.homeworkTypeId, homeworkTypeId),
        eq(homeworkLogs.dateKey, today)
      )
    )
    .limit(1);
  const alreadyCompleteToday = Boolean(existingLog);

  const logId = crypto.randomUUID();
  const metadataJson = JSON.stringify(
    normalizeAndValidateEventMetadata("homework", {
      timelineDate: today,
      homework: { homeworkTypeId, title: hwType.title },
    })
  );

  await db.transaction(async (tx) => {
    await tx
      .insert(homeworkLogs)
      .values({
        id: logId,
        familyId: profile.familyId,
        homeworkTypeId,
        dateKey: today,
        completedBy: profile.id,
        completedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: [homeworkLogs.homeworkTypeId, homeworkLogs.dateKey],
        set: {
          completedBy: profile.id,
          completedAt: Date.now(),
        },
      });

    if (!alreadyCompleteToday) {
      await tx.insert(events).values({
        id: crypto.randomUUID(),
        familyId: profile.familyId,
        profileId: profile.id,
        actionType: "homework",
        target: hwType.childGroup,
        metadata: metadataJson,
        isReverted: false,
      });
    }
  });

  revalidatePath("/homework");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function createGuide(formData: FormData) {
  const profile = await resolveActiveAdmin();
  const category = String(formData.get("category") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const linkedAction = String(formData.get("linkedAction") ?? "").trim();

  await db.insert(careGuides).values({
    id: crypto.randomUUID(),
    familyId: profile.familyId,
    category,
    title,
    body,
    linkedAction: linkedAction || null,
    imageUrl: null,
  });

  return { success: true };
}

export async function createQuickAction(formData: FormData): Promise<CreateQuickActionResult> {
  const profile = await resolveActiveAdmin();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) {
    return { success: false, error: "버튼 이름을 입력해 주세요." };
  }

  const actionTypeResult = parseActionTypeFromForm(formData);
  if (!actionTypeResult.ok) {
    return { success: false, error: actionTypeResult.error };
  }

  const targetResult = parseQuickActionTarget(formData);
  if (!targetResult.ok) {
    return { success: false, error: targetResult.error };
  }

  const [maxRow] = await db
    .select({ m: max(quickActions.sortOrder) })
    .from(quickActions)
    .where(eq(quickActions.familyId, profile.familyId));
  const nextSort = (maxRow?.m ?? -1) + 1;

  await db.insert(quickActions).values({
    id: crypto.randomUUID(),
    familyId: profile.familyId,
    label,
    actionType: actionTypeResult.value,
    target: targetResult.value,
    sortOrder: nextSort,
    isActive: true,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deactivateQuickAction(formData: FormData) {
  const profile = await resolveActiveAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("잘못된 요청입니다.");
  }

  await db
    .update(quickActions)
    .set({ isActive: false })
    .where(and(eq(quickActions.id, id), eq(quickActions.familyId, profile.familyId)));

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}
