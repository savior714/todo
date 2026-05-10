"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { careGuides, dailyPins, homeworkLogs, homeworkTypes } from "@/db/schema";
import { getActiveProfileContext } from "@/lib/auth/session";

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

  return { success: true };
}

export async function completeHomework(homeworkTypeId: string) {
  const profile = await getActiveProfileContext();

  if (!profile) {
    throw new Error("프로필을 찾을 수 없습니다.");
  }

  const today = new Date().toISOString().slice(0, 10);
  const logId = crypto.randomUUID();
  await db
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
