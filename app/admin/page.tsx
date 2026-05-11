import {
  createGuide,
  createHomeworkType,
  createQuickAction,
  deactivateHomeworkType,
  deactivateQuickAction,
  upsertDailyPin,
} from "@/app/actions/admin";
import { db } from "@/db/client";
import { homeworkTypes, quickActions } from "@/db/schema";
import { getActiveProfileContext } from "@/lib/auth/session";
import { asc, desc, eq } from "drizzle-orm";

export default async function AdminPage() {
  const profile = await getActiveProfileContext();
  const rows =
    profile?.role === "admin"
      ? await db
          .select({
            id: quickActions.id,
            label: quickActions.label,
            actionType: quickActions.actionType,
            target: quickActions.target,
            sortOrder: quickActions.sortOrder,
            isActive: quickActions.isActive,
          })
          .from(quickActions)
          .where(eq(quickActions.familyId, profile.familyId))
          .orderBy(asc(quickActions.sortOrder), asc(quickActions.createdAt))
      : [];

  const homeworkRows =
    profile?.role === "admin"
      ? await db
          .select({
            id: homeworkTypes.id,
            title: homeworkTypes.title,
            childGroup: homeworkTypes.childGroup,
            isActive: homeworkTypes.isActive,
          })
          .from(homeworkTypes)
          .where(eq(homeworkTypes.familyId, profile.familyId))
          .orderBy(desc(homeworkTypes.createdAt))
      : [];

  async function submitPin(formData: FormData) {
    "use server";
    const content = String(formData.get("content") ?? "").trim();
    if (!content) {
      throw new Error("내용을 입력해 주세요.");
    }
    await upsertDailyPin(content);
  }

  async function submitHomeworkType(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    const childGroup = String(formData.get("childGroup") ?? "") as "kid7" | "kid4";
    if (!title || (childGroup !== "kid7" && childGroup !== "kid4")) {
      throw new Error("입력값이 올바르지 않습니다.");
    }
    await createHomeworkType(childGroup, title);
  }

  async function submitGuide(formData: FormData) {
    "use server";
    await createGuide(formData);
  }

  async function submitQuickAction(formData: FormData) {
    "use server";
    await createQuickAction(formData);
  }

  async function submitDeactivateQuickAction(formData: FormData) {
    "use server";
    await deactivateQuickAction(formData);
  }

  async function submitDeactivateHomeworkType(formData: FormData) {
    "use server";
    await deactivateHomeworkType(formData);
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">관리자 설정</h1>

      <section className="mt-6 rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
        <h2 className="text-lg font-semibold">퀵 액션 버튼</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          대시보드에 보이는 버튼을 추가합니다. 액션 타입은 타임라인·가이드 연결(linked_action)에 쓰입니다.
        </p>

        <ul className="mt-4 grid gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-600"
            >
              <div>
                <span className="font-medium">{row.label}</span>
                <span className="ml-2 text-xs text-neutral-500">
                  {row.actionType} · {row.target}
                  {!row.isActive ? " · 비활성" : ""}
                </span>
              </div>
              {row.isActive ? (
                <form action={submitDeactivateQuickAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <button
                    type="submit"
                    className="inline-flex min-h-[44px] items-center rounded-md border border-neutral-400 px-3 text-sm dark:border-neutral-500"
                  >
                    숨기기
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>

        <form action={submitQuickAction} className="mt-4 grid gap-2">
          <input
            name="label"
            required
            placeholder="버튼에 보일 이름 (예: 저녁 식사)"
            className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 dark:border-neutral-700"
          />
          <label className="grid gap-1 text-sm">
            액션 타입
            <select
              name="actionPreset"
              defaultValue="meal"
              className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 dark:border-neutral-700"
            >
              <option value="meal">식사 (meal)</option>
              <option value="medication">투약 (medication)</option>
              <option value="school_dropoff">등원 (school_dropoff)</option>
              <option value="school_pickup">하원 (school_pickup)</option>
              <option value="brushing">양치 (brushing)</option>
              <option value="custom">커스텀 (직접 입력)</option>
            </select>
          </label>
          <input
            name="actionCustom"
            placeholder="커스텀일 때만: 예) laundry"
            className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 dark:border-neutral-700"
          />
          <label className="grid gap-1 text-sm">
            기록 대상 (target)
            <select
              name="target"
              defaultValue="kid4"
              className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 dark:border-neutral-700"
            >
              <option value="family">family (가족 전체)</option>
              <option value="kid7">kid7</option>
              <option value="kid4">kid4</option>
            </select>
          </label>
          <button type="submit" className="inline-flex min-h-[44px] items-center rounded-md bg-black px-3 text-white">
            퀵 액션 추가
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
        <h2 className="text-lg font-semibold">오늘의 지시사항</h2>
        <form action={submitPin} className="mt-3 grid gap-2">
          <textarea
            name="content"
            required
            className="min-h-[100px] rounded-md border border-neutral-300 bg-transparent p-2 dark:border-neutral-700"
          />
          <button type="submit" className="inline-flex min-h-[44px] items-center rounded-md bg-black px-3 text-white">
            저장
          </button>
        </form>
      </section>

      <section className="mt-4 rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
        <h2 className="text-lg font-semibold">숙제 유형</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          잘못 추가한 유형은 숨기기로 비활성화합니다. (숙제 트래커에는 활성 유형만 표시됩니다.)
        </p>
        <ul className="mt-3 grid gap-2">
          {homeworkRows.map((hw) => (
            <li
              key={hw.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-600"
            >
              <div>
                <span className="font-medium">{hw.title}</span>
                <span className="ml-2 text-xs text-neutral-500">
                  {hw.childGroup}
                  {!hw.isActive ? " · 비활성" : ""}
                </span>
              </div>
              {hw.isActive ? (
                <form action={submitDeactivateHomeworkType}>
                  <input type="hidden" name="id" value={hw.id} />
                  <button
                    type="submit"
                    className="inline-flex min-h-[44px] items-center rounded-md border border-neutral-400 px-3 text-sm dark:border-neutral-500"
                  >
                    숨기기
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        <form action={submitHomeworkType} className="mt-4 grid gap-2">
          <input
            name="title"
            required
            placeholder="숙제 제목"
            className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 dark:border-neutral-700"
          />
          <select
            name="childGroup"
            defaultValue="kid7"
            className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 dark:border-neutral-700"
          >
            <option value="kid7">kid7</option>
            <option value="kid4">kid4</option>
          </select>
          <button type="submit" className="inline-flex min-h-[44px] items-center rounded-md bg-black px-3 text-white">
            추가
          </button>
        </form>
      </section>

      <section className="mt-4 rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
        <h2 className="text-lg font-semibold">가이드 추가</h2>
        <form action={submitGuide} className="mt-3 grid gap-2">
          <input
            name="category"
            required
            placeholder="카테고리"
            className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 dark:border-neutral-700"
          />
          <input
            name="title"
            required
            placeholder="제목"
            className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 dark:border-neutral-700"
          />
          <textarea
            name="body"
            required
            placeholder="본문"
            className="min-h-[100px] rounded-md border border-neutral-300 bg-transparent p-2 dark:border-neutral-700"
          />
          <input
            name="linkedAction"
            placeholder="linked action (예: school_pickup, meal)"
            className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 dark:border-neutral-700"
          />
          <button type="submit" className="inline-flex min-h-[44px] items-center rounded-md bg-black px-3 text-white">
            저장
          </button>
        </form>
      </section>
    </main>
  );
}
