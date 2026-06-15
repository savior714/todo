"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { events } from "@/db/schema";
import { getActiveProfileContext } from "@/lib/auth/session";
import { checkRecentMedicationTx, getCreatedDateSql } from "@/lib/events/db-queries";
import { formatMetadataValidationMessage, normalizeAndValidateEventMetadata } from "@/lib/events/metadata";
import { getUndoWindowMsForActionType } from "@/lib/events/undo-policy";

type CreateEventInput = {
  actionType: string;
  target: string;
  metadata?: Record<string, unknown>;
};

type CreateEventResult =
  | { success: true; eventId: string }
  | { blocked: true; lastEventAt: string | null };

export async function createEvent(payload: CreateEventInput): Promise<CreateEventResult> {
  const profile = await getActiveProfileContext();

  if (!profile) {
    throw new Error("프로필을 찾을 수 없습니다.");
  }

  const actionType = payload.actionType.trim();
  if (!actionType) {
    throw new Error("액션 타입을 입력해 주세요.");
  }
  if (actionType.length > 50) {
    throw new Error("액션 타입은 50자 이하여야 합니다.");
  }

  const target = payload.target.trim();
  if (!target) {
    throw new Error("대상을 입력해 주세요.");
  }
  if (target.length > 50) {
    throw new Error("대상은 50자 이하여야 합니다.");
  }

  const isOverride = Boolean(payload.metadata?.override);

  const rawMeta = payload.metadata ?? {};
  if (typeof rawMeta !== "object" || rawMeta === null || Array.isArray(rawMeta)) {
    throw new Error("metadata 형식이 올바르지 않습니다.");
  }

  let metadataJson: string;
  try {
    metadataJson = JSON.stringify(
      normalizeAndValidateEventMetadata(actionType, rawMeta as Record<string, unknown>)
    );
  } catch (err) {
    throw new Error(formatMetadataValidationMessage(err), { cause: err });
  }

  const eventId = crypto.randomUUID();

  const result = await db.transaction(async (tx) => {
    if (actionType === "medication" && !isOverride) {
      const medicationCheck = await checkRecentMedicationTx(tx, profile.familyId, target);
      if (medicationCheck.blocked) {
        return { blocked: true, lastEventAt: medicationCheck.lastEventAt } as const;
      }
    }

    await tx.insert(events).values({
      id: eventId,
      familyId: profile.familyId,
      profileId: profile.id,
      actionType,
      target,
      metadata: metadataJson,
      isReverted: false,
      createdDate: getCreatedDateSql(),
    });

    return { success: true, eventId } as const;
  });

  revalidatePath("/dashboard");
  return result;
}

export async function undoEvent(eventId: string) {
  const profile = await getActiveProfileContext();

  if (!profile) {
    throw new Error("프로필을 찾을 수 없습니다.");
  }

  const [event] = await db
    .select({
      id: events.id,
      created_at: events.createdAt,
      is_reverted: events.isReverted,
      action_type: events.actionType,
    })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.familyId, profile.familyId)));

  if (!event) {
    throw new Error("이벤트를 찾을 수 없습니다.");
  }

  if (event.is_reverted) {
    return { success: true };
  }

  const createdAtMs = event.created_at.getTime();
  const undoWindowMs = getUndoWindowMsForActionType(event.action_type);
  const withinUndoWindow = Date.now() - createdAtMs <= undoWindowMs;

  if (!withinUndoWindow) {
    throw new Error("Undo 가능 시간이 지났습니다.");
  }

  await db
    .update(events)
    .set({ isReverted: true })
    .where(and(eq(events.id, eventId), eq(events.familyId, profile.familyId)));

  revalidatePath("/dashboard");
  return { success: true };
}
