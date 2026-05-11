"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MEDICATION_UNITS } from "@/lib/event-metadata";

export type RecordDraft = {
  actionType: string;
  target: string;
  label: string;
};

type CreateEventInput = {
  actionType: string;
  target: string;
  metadata?: Record<string, unknown>;
};

type CreateEventResult =
  | { success: true; eventId: string }
  | { blocked: true; lastEventAt: string | null };

export type CreateEventAction = (payload: CreateEventInput) => Promise<CreateEventResult>;

const TARGET_OPTIONS: { value: "kid7" | "kid4" | "family"; label: string }[] = [
  { value: "kid7", label: "주원이" },
  { value: "kid4", label: "승원이" },
  { value: "family", label: "가족 공통" },
];

const SCHOOL_CHILD_OPTIONS: { value: "kid7" | "kid4"; label: string; hint: string }[] = [
  { value: "kid7", label: "주원이", hint: "첫째" },
  { value: "kid4", label: "승원이", hint: "둘째" },
];

function parseTarget(t: string): "kid7" | "kid4" | "family" {
  if (t === "kid7" || t === "kid4" || t === "family") {
    return t;
  }
  return "family";
}

function defaultSchoolChildFromDraftTarget(target: string): "kid7" | "kid4" {
  const t = parseTarget(target);
  if (t === "kid7" || t === "kid4") {
    return t;
  }
  return "kid4";
}

type MedRow = { name: string; amount: number; unit: (typeof MEDICATION_UNITS)[number] };

type RecordEventModalProps = {
  draft: RecordDraft | null;
  onClose: () => void;
  timelineDate?: string | null;
  onRecorded: () => void;
  showToast: (message: string) => void;
  createEventAction: CreateEventAction;
};

export default function RecordEventModal({
  draft,
  onClose,
  timelineDate,
  onRecorded,
  showToast,
  createEventAction,
}: RecordEventModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [isPending, startTransition] = useTransition();

  const [subject, setSubject] = useState<"kid7" | "kid4" | "family">("family");
  const [medItems, setMedItems] = useState<MedRow[]>([{ name: "", amount: 5, unit: "ml" }]);
  const [medNote, setMedNote] = useState("");
  const [genericNote, setGenericNote] = useState("");
  const [schoolChild, setSchoolChild] = useState<"kid7" | "kid4">("kid4");
  const [schoolPlace, setSchoolPlace] = useState("");

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) {
      return;
    }
    if (draft) {
      el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [draft]);

  useEffect(() => {
    if (!draft) {
      return;
    }
    const t = parseTarget(draft.target);
    if (draft.actionType === "medication") {
      setSubject(t);
      setMedItems([{ name: "", amount: 5, unit: "ml" }]);
      setMedNote("");
    } else if (draft.actionType === "school_dropoff" || draft.actionType === "school_pickup") {
      setSchoolChild(defaultSchoolChildFromDraftTarget(draft.target));
      setSchoolPlace("");
    } else {
      setGenericNote("");
    }
  }, [draft]);

  const handleDialogClose = () => {
    onClose();
  };

  const runCreate = async (actionType: string, target: string, metadata: Record<string, unknown>) => {
    const tryCreate = async (meta: Record<string, unknown>) => {
      return createEventAction({ actionType, target, metadata: meta });
    };

    let meta = { ...metadata };
    if (timelineDate && /^\d{4}-\d{2}-\d{2}$/.test(timelineDate)) {
      meta = { ...meta, timelineDate };
    }

    const result = await tryCreate(meta);
    if ("blocked" in result && result.blocked) {
      const shouldOverride = window.confirm(
        "최근 2시간 내 동일 투약 기록이 있습니다. 정말 강행하시겠습니까?"
      );
      if (!shouldOverride) {
        return false;
      }
      const overrideResult = await tryCreate({ ...meta, override: true });
      if ("blocked" in overrideResult && overrideResult.blocked) {
        showToast("강행 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return false;
      }
      showToast("강행으로 투약 이벤트를 기록했습니다.");
      return true;
    }

    showToast("이벤트가 기록되었습니다.");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) {
      return;
    }
    if (!navigator.onLine) {
      showToast("인터넷 연결이 필요합니다.");
      return;
    }

    startTransition(async () => {
      try {
        let ok = false;
        if (draft.actionType === "medication") {
          const items = medItems
            .map((row) => ({
              name: row.name.trim(),
              amount: row.amount,
              unit: row.unit,
            }))
            .filter((row) => row.name.length > 0);
          const meta: Record<string, unknown> = {
            medication: {
              subject,
              items,
              ...(medNote.trim() ? { note: medNote.trim() } : {}),
            },
          };
          ok = await runCreate("medication", subject, meta);
        } else if (draft.actionType === "meal") {
          const meta: Record<string, unknown> = {};
          if (genericNote.trim()) {
            meta.meal = { note: genericNote.trim() };
          }
          ok = await runCreate(draft.actionType, draft.target, meta);
        } else if (draft.actionType === "school_dropoff" || draft.actionType === "school_pickup") {
          const meta: Record<string, unknown> = {
            schoolRun: {
              child: schoolChild,
              ...(schoolPlace.trim() ? { place: schoolPlace.trim() } : {}),
            },
          };
          ok = await runCreate(draft.actionType, schoolChild, meta);
        } else {
          const meta: Record<string, unknown> = {};
          if (genericNote.trim()) {
            meta.detail = { note: genericNote.trim() };
          }
          ok = await runCreate(draft.actionType, draft.target, meta);
        }

        if (ok) {
          dialogRef.current?.close();
          onRecorded();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "기록에 실패했습니다.";
        showToast(message);
      }
    });
  };

  if (!draft) {
    return null;
  }

  const isMedication = draft.actionType === "medication";
  const isSchoolRun = draft.actionType === "school_dropoff" || draft.actionType === "school_pickup";
  const title = isMedication ? `투약 — ${draft.label}` : `${draft.label} 기록`;

  return (
    <dialog
      ref={dialogRef}
      className="dialog-record m-auto max-h-none w-[min(36rem,calc(100vw-1rem))] max-w-none border-0 bg-transparent p-0 shadow-none"
      aria-labelledby="record-event-title"
      onClose={handleDialogClose}
    >
      <div className="dialog-record-panel flex max-h-[min(90dvh,48rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100">
        <header className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <h2 id="record-event-title" className="text-lg font-semibold">
            {title}
          </h2>
          {timelineDate && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">날짜: {timelineDate}</p>
          )}
        </header>

        <form onSubmit={handleSubmit} className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4">
          {isMedication ? (
            <>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">투약 대상</span>
                <select
                  value={subject}
                  onChange={(ev) => setSubject(ev.target.value as typeof subject)}
                  className="min-h-[44px] rounded-lg border border-neutral-300 bg-white px-3 dark:border-neutral-600 dark:bg-neutral-900"
                >
                  {TARGET_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-2">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">약 · 용량</span>
                <ul className="grid gap-3">
                  {medItems.map((row, idx) => (
                    <li
                      key={idx}
                      className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-2 dark:border-neutral-700"
                    >
                      <label className="grid min-w-[8rem] flex-1 gap-1 text-xs">
                        이름
                        <input
                          type="text"
                          value={row.name}
                          onChange={(ev) => {
                            const v = ev.target.value;
                            setMedItems((prev) => prev.map((r, i) => (i === idx ? { ...r, name: v } : r)));
                          }}
                          className="min-h-[40px] rounded-md border border-neutral-300 px-2 dark:border-neutral-600 dark:bg-neutral-900"
                          placeholder="예: 해열제"
                          autoComplete="off"
                        />
                      </label>
                      <label className="grid w-24 gap-1 text-xs">
                        양
                        <input
                          type="number"
                          min={0}
                          step="0.1"
                          value={Number.isNaN(row.amount) ? "" : row.amount}
                          onChange={(ev) => {
                            const v = parseFloat(ev.target.value);
                            setMedItems((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, amount: Number.isNaN(v) ? 0 : v } : r))
                            );
                          }}
                          className="min-h-[40px] rounded-md border border-neutral-300 px-2 dark:border-neutral-600 dark:bg-neutral-900"
                        />
                      </label>
                      <label className="grid w-20 gap-1 text-xs">
                        단위
                        <select
                          value={row.unit}
                          onChange={(ev) => {
                            const u = ev.target.value as MedRow["unit"];
                            setMedItems((prev) => prev.map((r, i) => (i === idx ? { ...r, unit: u } : r)));
                          }}
                          className="min-h-[40px] rounded-md border border-neutral-300 px-1 dark:border-neutral-600 dark:bg-neutral-900"
                        >
                          {MEDICATION_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </label>
                      {medItems.length > 1 && (
                        <button
                          type="button"
                          className="min-h-[40px] rounded-md border border-neutral-300 px-2 text-xs dark:border-neutral-600"
                          onClick={() => setMedItems((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          삭제
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-1 inline-flex min-h-[40px] items-center justify-center rounded-lg border border-dashed border-neutral-400 text-sm dark:border-neutral-500"
                  onClick={() => setMedItems((prev) => [...prev, { name: "", amount: 5, unit: "ml" }])}
                >
                  약 추가
                </button>
              </div>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">메모 (선택)</span>
                <textarea
                  value={medNote}
                  onChange={(ev) => setMedNote(ev.target.value)}
                  rows={2}
                  className="resize-y rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
                  placeholder="식후 30분 등"
                />
              </label>
            </>
          ) : isSchoolRun ? (
            <>
              <fieldset className="grid gap-2 text-sm">
                <legend className="font-medium text-neutral-700 dark:text-neutral-300">대상</legend>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {SCHOOL_CHILD_OPTIONS.map((o) => (
                    <label
                      key={o.value}
                      className={`flex min-h-[48px] flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 ${
                        schoolChild === o.value
                          ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600 dark:border-blue-400 dark:bg-blue-950/40 dark:ring-blue-400"
                          : "border-neutral-300 dark:border-neutral-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="school-child"
                        value={o.value}
                        checked={schoolChild === o.value}
                        onChange={() => setSchoolChild(o.value)}
                        className="size-4 accent-blue-600"
                      />
                      <span>
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{o.label}</span>
                        <span className="ml-1 text-xs text-neutral-500 dark:text-neutral-400">({o.hint})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">장소 (선택)</span>
                <input
                  type="text"
                  value={schoolPlace}
                  onChange={(ev) => setSchoolPlace(ev.target.value)}
                  className="min-h-[44px] rounded-lg border border-neutral-300 px-3 dark:border-neutral-600 dark:bg-neutral-900"
                  placeholder="예: OO유치원, 태권도장"
                  autoComplete="off"
                />
              </label>
            </>
          ) : (
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">메모 (선택)</span>
              <textarea
                value={genericNote}
                onChange={(ev) => setGenericNote(ev.target.value)}
                rows={3}
                className="resize-y rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-900"
                placeholder="필요 시 상세 내용을 적어 주세요."
              />
            </label>
          )}

          <footer className="sticky bottom-0 mt-auto flex flex-wrap gap-2 border-t border-neutral-200 bg-white pt-3 dark:border-neutral-700 dark:bg-neutral-950">
            <button
              type="button"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-neutral-300 px-4 dark:border-neutral-600"
              onClick={() => dialogRef.current?.close()}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-[48px] flex-[2] items-center justify-center rounded-xl bg-blue-600 px-4 font-medium text-white disabled:opacity-60"
            >
              {isPending ? "저장 중…" : "기록하기"}
            </button>
          </footer>
        </form>
      </div>
    </dialog>
  );
}
