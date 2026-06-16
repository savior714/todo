"use server";

import { revalidatePath } from "next/cache";
import { and, eq, max } from "drizzle-orm";
import { db } from "@/db/client";
import { dailyPins, events, homeworkLogs, homeworkTypes, profiles, quickActions, routineItems, routineLogs } from "@/db/schema";
import { getActiveProfileContext } from "@/lib/auth/session";
import { getCreatedDateSql } from "@/lib/events/db-queries";
import { normalizeAndValidateEventMetadata, CUSTOM_SLUG_REGEX } from "@/lib/events/metadata";
import { assertHomeworkLogDateKey } from "@/lib/homework/date-key";

const PRESET_ACTION_TYPES = new Set([
  "meal",
  "medication",
  "school_dropoff",
  "school_pickup",
  "brushing",
  "cleaning",
]);

type QuickActionParseResult<T> = { ok: true; value: T } | { ok: false; error: string };
type CreateQuickActionResult = { success: true } | { success: false; error: string };

function parseActionTypeFromForm(formData: FormData): QuickActionParseResult<string> {
  const preset = String(formData.get("actionPreset") ?? "").trim();
  if (preset === "custom") {
    const slug = String(formData.get("actionCustom") ?? "").trim();
    if (!CUSTOM_SLUG_REGEX.test(slug)) {
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
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error("숙제 제목을 입력해 주세요.");
  }
  if (trimmedTitle.length > 100) {
    throw new Error("숙제 제목은 100자 이하여야 합니다.");
  }
  await db.insert(homeworkTypes).values({
    id: crypto.randomUUID(),
    familyId: profile.familyId,
    childGroup,
    title: trimmedTitle,
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

export async function completeHomework(homeworkTypeId: string, dateKeyOverride?: string) {
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

  const logDateKey =
    typeof dateKeyOverride === "string" && dateKeyOverride.trim().length > 0
      ? assertHomeworkLogDateKey(dateKeyOverride)
      : new Date().toISOString().slice(0, 10);

  const logId = crypto.randomUUID();
  const metadataJson = JSON.stringify(
    normalizeAndValidateEventMetadata("homework", {
      timelineDate: logDateKey,
      homework: { homeworkTypeId, title: hwType.title },
    })
  );

  await db.transaction(async (tx) => {
    const [existingLog] = await tx
      .select({ id: homeworkLogs.id })
      .from(homeworkLogs)
      .where(
        and(
          eq(homeworkLogs.familyId, profile.familyId),
          eq(homeworkLogs.homeworkTypeId, homeworkTypeId),
          eq(homeworkLogs.dateKey, logDateKey)
        )
      )
      .limit(1);
    const alreadyCompleteForDate = Boolean(existingLog);

    await tx
      .insert(homeworkLogs)
      .values({
        id: logId,
        familyId: profile.familyId,
        homeworkTypeId,
        dateKey: logDateKey,
        completedBy: profile.id,
        completedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [homeworkLogs.homeworkTypeId, homeworkLogs.dateKey],
        set: {
          completedBy: profile.id,
          completedAt: new Date(),
        },
      });

    if (!alreadyCompleteForDate) {
      // P-4 해결: 첫 완료 시에만 이벤트 생성 (비즈니스 의도 — 이미 완료된 로그가 있으면 중복 이벤트 생성 안 함)
      await tx.insert(events).values({
        id: crypto.randomUUID(),
        familyId: profile.familyId,
        profileId: profile.id,
        actionType: "homework",
        target: hwType.childGroup,
        metadata: metadataJson,
        isReverted: false,
        createdDate: getCreatedDateSql(),
      });
    }
  });

  revalidatePath("/homework");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function createRoutineItem(target: "kid7" | "kid4" | "family", title: string) {
  const profile = await resolveActiveAdmin();
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("제목을 입력해 주세요.");
  }

  const [maxRow] = await db
    .select({ m: max(routineItems.sortOrder) })
    .from(routineItems)
    .where(eq(routineItems.familyId, profile.familyId));
  const nextSort = (maxRow?.m ?? -1) + 1;

  await db.insert(routineItems).values({
    id: crypto.randomUUID(),
    familyId: profile.familyId,
    title: trimmed,
    target,
    sortOrder: nextSort,
    isActive: true,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deactivateRoutineItem(formData: FormData) {
  const profile = await resolveActiveAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("잘못된 요청입니다.");
  }

  await db
    .update(routineItems)
    .set({ isActive: false })
    .where(and(eq(routineItems.id, id), eq(routineItems.familyId, profile.familyId)));

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function completeRoutineItem(routineItemId: string, dateKeyOverride?: string) {
  const profile = await getActiveProfileContext();

  if (!profile) {
    throw new Error("프로필을 찾을 수 없습니다.");
  }

  const [item] = await db
    .select({
      id: routineItems.id,
      title: routineItems.title,
      target: routineItems.target,
    })
    .from(routineItems)
    .where(and(eq(routineItems.id, routineItemId), eq(routineItems.familyId, profile.familyId)))
    .limit(1);

  if (!item) {
    throw new Error("루틴 항목을 찾을 수 없습니다.");
  }

  const logDateKey =
    typeof dateKeyOverride === "string" && dateKeyOverride.trim().length > 0
      ? assertHomeworkLogDateKey(dateKeyOverride)
      : new Date().toISOString().slice(0, 10);

  const logId = crypto.randomUUID();
  const metadataJson = JSON.stringify(
    normalizeAndValidateEventMetadata("routine_check", {
      timelineDate: logDateKey,
      routine: { routineItemId, title: item.title },
    })
  );

  await db.transaction(async (tx) => {
    const [existingLog] = await tx
      .select({ id: routineLogs.id })
      .from(routineLogs)
      .where(
        and(
          eq(routineLogs.familyId, profile.familyId),
          eq(routineLogs.routineItemId, routineItemId),
          eq(routineLogs.dateKey, logDateKey)
        )
      )
      .limit(1);
    const alreadyCompleteForDate = Boolean(existingLog);

    await tx
      .insert(routineLogs)
      .values({
        id: logId,
        familyId: profile.familyId,
        routineItemId,
        dateKey: logDateKey,
        completedBy: profile.id,
        completedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [routineLogs.routineItemId, routineLogs.dateKey],
        set: {
          completedBy: profile.id,
          completedAt: new Date(),
        },
      });

    if (!alreadyCompleteForDate) {
      // P-4 해결: 첫 완료 시에만 이벤트 생성 (비즈니스 의도 — 이미 완료된 로그가 있으면 중복 이벤트 생성 안 함)
      await tx.insert(events).values({
        id: crypto.randomUUID(),
        familyId: profile.familyId,
        profileId: profile.id,
        actionType: "routine_check",
        target: item.target,
        metadata: metadataJson,
        isReverted: false,
        createdDate: getCreatedDateSql(),
      });
    }
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function createQuickAction(formData: FormData): Promise<CreateQuickActionResult> {
  const profile = await resolveActiveAdmin();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) {
    return { success: false, error: "버튼 이름을 입력해 주세요." };
  }
  if (label.length > 100) {
    return { success: false, error: "버튼 이름은 100자 이하여야 합니다." };
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

// --- Modal-specific wrappers (revalidate /dashboard) ---

export async function createQuickActionForModal(formData: FormData): Promise<CreateQuickActionResult> {
  const result = await createQuickAction(formData);
  if (result.success) {
    revalidatePath("/dashboard");
  }
  return result;
}

export async function deactivateQuickActionForModal(formData: FormData) {
  await deactivateQuickAction(formData);
  revalidatePath("/dashboard");
}

export async function createHomeworkTypeForModal(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const childGroup = String(formData.get("childGroup") ?? "") as "kid7" | "kid4";
  if (!title || (childGroup !== "kid7" && childGroup !== "kid4")) {
    throw new Error("입력값이 올바르지 않습니다.");
  }
  await createHomeworkType(childGroup, title);
  revalidatePath("/dashboard");
}

export async function deactivateHomeworkTypeForModal(formData: FormData) {
  await deactivateHomeworkType(formData);
  revalidatePath("/dashboard");
}

export async function createRoutineItemForModal(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const target = String(formData.get("target") ?? "") as "kid7" | "kid4" | "family";
  if (!title || (target !== "kid7" && target !== "kid4" && target !== "family")) {
    throw new Error("입력값이 올바르지 않습니다.");
  }
  await createRoutineItem(target, title);
  revalidatePath("/dashboard");
}

export async function deactivateRoutineItemForModal(formData: FormData) {
  await deactivateRoutineItem(formData);
  revalidatePath("/dashboard");
}

export async function deleteProfile(profileId: string) {
  const admin = await resolveActiveAdmin();

  if (profileId !== admin.id) {
    throw new Error("본인 프로필만 삭제할 수 있습니다.");
  }

  await db.transaction(async (tx) => {
    await tx.delete(events).where(eq(events.profileId, profileId));
    await tx.delete(dailyPins).where(eq(dailyPins.createdBy, profileId));
    await tx.delete(homeworkLogs).where(eq(homeworkLogs.completedBy, profileId));
    await tx.delete(routineLogs).where(eq(routineLogs.completedBy, profileId));
    await tx.delete(profiles).where(eq(profiles.id, profileId));
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}
