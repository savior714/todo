"use server";

import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { events } from "@/db/schema";
import { getActiveProfileContext } from "@/lib/auth/session";
import { formatMetadataValidationMessage, normalizeAndValidateEventMetadata } from "@/lib/event-metadata";
import { getUndoWindowMsForActionType } from "@/lib/event-undo-policy";

type CreateEventInput = {
  actionType: string;
  target: string;
  metadata?: Record<string, unknown>;
};

type CreateEventResult =
  | { success: true; eventId: string }
  | { blocked: true; lastEventAt: string | null };

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export async function createEvent(payload: CreateEventInput): Promise<CreateEventResult> {
  const profile = await getActiveProfileContext();

  if (!profile) {
    throw new Error("프로필을 찾을 수 없습니다.");
  }

  const isOverride = Boolean(payload.metadata?.override);

  if (payload.actionType === "medication" && !isOverride) {
    const windowStart = Date.now() - TWO_HOURS_MS;
    const [recentMedication] = await db
      .select({ created_at: events.createdAt })
      .from(events)
      .where(
        and(
          eq(events.familyId, profile.familyId),
          eq(events.actionType, "medication"),
          eq(events.target, payload.target),
          eq(events.isReverted, false),
          gte(events.createdAt, windowStart)
        )
      )
      .orderBy(desc(events.createdAt))
      .limit(1);

    if (recentMedication) {
      return {
        blocked: true,
        lastEventAt: new Date(recentMedication.created_at).toISOString(),
      };
    }
  }

  const rawMeta = payload.metadata ?? {};
  if (typeof rawMeta !== "object" || rawMeta === null || Array.isArray(rawMeta)) {
    throw new Error("metadata 형식이 올바르지 않습니다.");
  }

  let metadataJson: string;
  try {
    metadataJson = JSON.stringify(
      normalizeAndValidateEventMetadata(payload.actionType, rawMeta as Record<string, unknown>)
    );
  } catch (err) {
    throw new Error(formatMetadataValidationMessage(err), { cause: err });
  }

  const eventId = crypto.randomUUID();
  await db.insert(events).values({
    id: eventId,
    familyId: profile.familyId,
    profileId: profile.id,
    actionType: payload.actionType,
    target: payload.target,
    metadata: metadataJson,
    isReverted: false,
  });

  return { success: true, eventId };
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

  const createdAtMs = event.created_at;
  const undoWindowMs = getUndoWindowMsForActionType(event.action_type);
  const withinUndoWindow = Date.now() - createdAtMs <= undoWindowMs;

  if (!withinUndoWindow) {
    throw new Error("Undo 가능 시간이 지났습니다.");
  }

  await db
    .update(events)
    .set({ isReverted: true })
    .where(and(eq(events.id, eventId), eq(events.familyId, profile.familyId)));

  return { success: true };
}
