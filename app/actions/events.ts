"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { events } from "@/db/schema";
import { getActiveProfileContext } from "@/lib/auth/session";
import { checkRecentMedicationTx } from "@/lib/events/db-queries";
import { formatMetadataValidationMessage, normalizeAndValidateEventMetadata } from "@/lib/events/metadata";
import { getUndoWindowMsForActionType } from "@/lib/events/undo-policy";

/** Turso/libSQL UNIQUE constraint violation 에러 코드 (https://libsql.github.io/libsql/experimental-error-codes) */
const TURSO_CONSTRAINT_ERROR_CODE = "2067";

type CreateEventInput = {
  actionType: string;
  target: string;
  metadata?: Record<string, unknown>;
};

type CreateEventResult =
  | { success: true; eventId: string }
  | { blocked: true; lastEventAt: string | null; reason?: "duplicate" };

/**
 * 타임라인 이벤트를 생성합니다.
 *
 * medication 액션 타입의 경우 중복 체크를 수행하며,
 * Turso UNIQUE constraint 위반 시 중복 차단 결과를 반환합니다.
 *
 * @param payload - 생성할 이벤트의 actionType, target, metadata 포함
 * @returns 성공 시 eventId, 중복 차단 시 마지막 이벤트 시각과 함께 blocked 반환
 */
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

  const today = new Date().toISOString().split("T")[0];

  try {
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
        createdDate: today,
      });

      return { success: true, eventId } as const;
    });

    revalidatePath("/dashboard");
    return result;
  } catch (err) {
    if ((err as { code?: string }).code === TURSO_CONSTRAINT_ERROR_CODE || (err as Error).message?.includes("UNIQUE constraint")) {
      const [lastEvent] = await db
        .select({ createdAt: events.createdAt })
        .from(events)
        .where(
          and(
            eq(events.familyId, profile.familyId),
            eq(events.actionType, actionType),
            eq(events.target, target),
            eq(events.createdDate, today),
            eq(events.isReverted, false),
          ),
        )
        .orderBy(desc(events.createdAt))
        .limit(1);

      return {
        blocked: true,
        lastEventAt: lastEvent
          ? new Date(lastEvent.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
          : null,
        reason: "duplicate" as const,
      } as const;
    }
    throw err;
  }
}

/**
 * 이벤트의 실행을 취소합니다 (soft revert).
 *
 * isReverted 플래그를 true로 설정하여 논리적 취소를 수행하며,
 * undo 정책(time window)을 준수하는지 검증합니다.
 *
 * @param eventId - 취소할 이벤트의 ID
 * @returns 항상 성공 결과 반환 (이미 취소된 경우 포함)
 * @throws Undo 가능 시간이 지났거나 이벤트가 존재하지 않을 경우
 */
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
