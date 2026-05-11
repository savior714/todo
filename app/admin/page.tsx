import {
  createHomeworkType,
  createQuickAction,
  deactivateHomeworkType,
  deactivateQuickAction,
  upsertDailyPin,
} from "@/app/actions/admin";
import { HomeworkTypesAdminSection } from "@/app/admin/homework-types-admin-section";
import { QuickActionsAdminSection } from "@/app/admin/quick-actions-admin-section";
import { db } from "@/db/client";
import { homeworkTypes, quickActions } from "@/db/schema";
import { getActiveProfileContext } from "@/lib/auth/session";
import { asc, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

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
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">관리자 설정</h1>

      <QuickActionsAdminSection
        rows={rows}
        quickActionError={quickActionError}
        submitQuickAction={submitQuickAction}
        submitDeactivateQuickAction={submitDeactivateQuickAction}
      />

      <section className="mt-6 rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          오늘의 지시사항
        </h2>
        <form action={submitPin} className="mt-3 grid gap-2">
          <textarea
            name="content"
            required
            className="min-h-[100px] rounded-md border border-neutral-300 bg-transparent p-2 text-base leading-relaxed dark:border-neutral-700"
          />
          <button
            type="submit"
            className="inline-flex min-h-[44px] items-center rounded-md bg-black px-3 text-sm font-semibold leading-snug text-white"
          >
            저장
          </button>
        </form>
      </section>

      <HomeworkTypesAdminSection
        rows={homeworkRows}
        submitHomeworkType={submitHomeworkType}
        submitDeactivateHomeworkType={submitDeactivateHomeworkType}
      />
    </main>
  );
}
