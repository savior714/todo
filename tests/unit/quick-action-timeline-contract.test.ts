import { describe, expect, test } from "bun:test";
import { normalizeAndValidateEventMetadata, summarizeEventMetadataForDisplay } from "@/lib/event-metadata";

/** 퀵 액션 모달 제출 → DB `events.metadata` JSON → 타임라인 카드 요약 줄까지의 파이프라인 */
function timelineSummaryLines(actionType: string, rawMetadata: Record<string, unknown>): string[] {
  const normalized = normalizeAndValidateEventMetadata(actionType, rawMetadata);
  const json = JSON.stringify(normalized);
  return summarizeEventMetadataForDisplay(json, actionType);
}

describe("퀵 액션으로 기록한 사용자 입력은 타임라인 요약에 반영된다", () => {
  const marker = "사용자가-입력한-본문";

  test("커스텀 슬러그 + 메모(detail.note)는 요약에 본문이 포함된다", () => {
    const lines = timelineSummaryLines("evening_stretch", { detail: { note: marker } });
    expect(lines.some((l) => l.includes(marker))).toBe(true);
  });

  test("brushing + 메모(detail.note)는 요약에 본문이 포함된다", () => {
    const lines = timelineSummaryLines("brushing", { detail: { note: marker } });
    expect(lines.some((l) => l.includes(marker))).toBe(true);
  });

  test("meal + meal.note는 요약에 본문이 포함된다", () => {
    const lines = timelineSummaryLines("meal", { meal: { note: marker } });
    expect(lines.some((l) => l.includes(marker))).toBe(true);
  });

  test("meal 타입인데 detail.note만 있어도(비정형 페이로드) 요약에 본문이 포함된다", () => {
    const lines = timelineSummaryLines("meal", { detail: { note: marker } });
    expect(lines.some((l) => l.includes(marker))).toBe(true);
  });

  test("투약: 약 항목 없이 메모만 있어도 정규화에 성공하고 요약에 메모가 포함된다", () => {
    expect(() =>
      normalizeAndValidateEventMetadata("medication", {
        medication: { subject: "kid4", items: [], note: marker },
      })
    ).not.toThrow();

    const lines = timelineSummaryLines("medication", {
      medication: { subject: "kid4", items: [], note: marker },
    });
    expect(lines.some((l) => l.includes(marker))).toBe(true);
  });

  test("등원·하원: 장소만 입력해도 요약에 장소 문자열이 포함된다", () => {
    const lines = timelineSummaryLines("school_dropoff", {
      schoolRun: { child: "kid4", place: marker },
    });
    expect(lines.some((l) => l.includes(marker))).toBe(true);
  });
});
