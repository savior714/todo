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
import { redirect } from "next/navigation";

const TARGET_LABEL: Record<string, string> = {
  kid7: "주원이",
  kid4: "승원이",
  family: "가족 전체",
};

/** 퀵 액션 목록·폼에서 노출용 (DB 값은 그대로 유지) */
const ACTION_TYPE_LABEL: Record<string, string> = {
  meal: "식사",
  medication: "투약",
  school_dropoff: "등원",
  school_pickup: "하원",
  brushing: "양치",
};

function formatQuickActionMeta(actionType: string, target: string) {
  const typeLabel = ACTION_TYPE_LABEL[actionType] ?? actionType;
  const who = TARGET_LABEL[target] ?? target;
  return `${typeLabel} · ${who}`;
}

const CHILD_GROUP_LABEL: Record<"kid7" | "kid4", string> = {
  kid7: "주원이",
  kid4: "승원이",
};

type AdminPageProps = {
  searchParams?: Promise<{ quickActionError?: string | string[] }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const quickActionErrorParam = resolvedSearchParams?.quickActionError;
  const quickActionError = Array.isArray(quickActionErrorParam) ? quickActionErrorParam[0] : quickActionErrorParam;
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
    const result = await createQuickAction(formData);
    if (!result.success) {
      redirect(`/admin?quickActionError=${encodeURIComponent(result.error)}#quick-actions-admin`);
    }
    redirect("/admin#quick-actions-admin");
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

      <section
        id="quick-actions-admin"
        className="scroll-mt-6 mt-6 rounded-lg border border-neutral-300 p-4 dark:border-neutral-700"
      >
        <h2 className="text-lg font-semibold">퀵 액션</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          대시보드 단축 버튼입니다. 누르면 타임라인에 같은 종류로 기록됩니다.
        </p>
        {quickActionError ? (
          <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
            {quickActionError}
          </p>
        ) : null}

        <ul className="mt-4 grid gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-600"
            >
              <div className="min-w-0">
                <div className="font-medium">{row.label}</div>
                <div className="text-xs text-neutral-500">
                  {formatQuickActionMeta(row.actionType, row.target)}
                  {!row.isActive ? " · 숨김" : ""}
                </div>
              </div>
              {row.isActive ? (
                <form action={submitDeactivateQuickAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <button
                    type="submit"
                    className="inline-flex min-h-[44px] shrink-0 items-center rounded-md border border-neutral-400 px-3 text-sm dark:border-neutral-500"
                  >
                    숨기기
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>

        <form action={submitQuickAction} className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-medium text-neutral-800 dark:text-neutral-100">
            버튼 이름
            <input
              name="label"
              required
              placeholder="예: 저녁 식사"
              className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 font-normal dark:border-neutral-700"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-neutral-800 dark:text-neutral-100">
              기록 종류
              <select
                name="actionPreset"
                defaultValue="meal"
                className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 font-normal dark:border-neutral-700"
              >
                <option value="meal">식사</option>
                <option value="medication">투약</option>
                <option value="school_dropoff">등원</option>
                <option value="school_pickup">하원</option>
                <option value="brushing">양치</option>
                <option value="custom">기타(직접 입력)</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-neutral-800 dark:text-neutral-100">
              기록 대상
              <select
                name="target"
                defaultValue="kid4"
                className="min-h-[44px] rounded-md border border-neutral-300 bg-transparent px-2 font-normal dark:border-neutral-700"
              >
                <option value="family">가족 전체</option>
                <option value="kid7">주원이</option>
                <option value="kid4">승원이</option>
              </select>
            </label>
          </div>
          <details className="rounded-md border border-dashed border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600">
            <summary className="cursor-pointer select-none text-neutral-700 dark:text-neutral-300">
              기타(직접 입력)일 때만 펼치기
            </summary>
            <input
              name="actionCustom"
              placeholder="영문 코드 (예: laundry)"
              className="mt-2 min-h-[44px] w-full rounded-md border border-neutral-300 bg-transparent px-2 dark:border-neutral-700"
            />
            <p className="mt-1 text-xs text-neutral-500">소문자로 시작, 영문·숫자·밑줄만 사용합니다.</p>
          </details>
          <button type="submit" className="inline-flex min-h-[44px] items-center rounded-md bg-black px-3 text-white">
            버튼 추가
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

      <section
        id="homework-types-admin"
        className="scroll-mt-6 mt-4 rounded-lg border border-neutral-300 p-4 dark:border-neutral-700"
      >
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
                  {CHILD_GROUP_LABEL[hw.childGroup]}
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
            <option value="kid7">kid7 (주원이)</option>
            <option value="kid4">kid4 (승원이)</option>
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
