import { and, asc, eq } from "drizzle-orm";
import { completeHomework } from "@/app/actions/admin";
import { db } from "@/db/client";
import { homeworkLogs, homeworkTypes } from "@/db/schema";
import { getActiveProfileContext } from "@/lib/auth/session";

export default async function HomeworkPage() {
  const profile = await getActiveProfileContext();

  if (!profile) {
    return <main className="p-6">프로필이 필요합니다.</main>;
  }

  const today = new Date().toISOString().slice(0, 10);
  const homeworkTypeRows = await db
    .select({
      id: homeworkTypes.id,
      title: homeworkTypes.title,
      child_group: homeworkTypes.childGroup,
    })
    .from(homeworkTypes)
    .where(and(eq(homeworkTypes.familyId, profile.familyId), eq(homeworkTypes.isActive, true)))
    .orderBy(asc(homeworkTypes.createdAt));

  const logs = await db
    .select({ homework_type_id: homeworkLogs.homeworkTypeId })
    .from(homeworkLogs)
    .where(and(eq(homeworkLogs.familyId, profile.familyId), eq(homeworkLogs.dateKey, today)));

  const completedSet = new Set((logs ?? []).map((row) => row.homework_type_id));

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">숙제 트래커</h1>
      <div className="mt-4 grid gap-3">
        {homeworkTypeRows.map((type) => {
          const done = completedSet.has(type.id);
          async function submitCompleteHomework() {
            "use server";
            await completeHomework(type.id);
          }
          return (
            <article key={type.id} className="rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
              <p className="font-medium">{type.title}</p>
              <p className="text-sm text-neutral-500">{type.child_group}</p>
              <form action={submitCompleteHomework} className="mt-2">
                <button
                  type="submit"
                  disabled={done}
                  className="inline-flex min-h-[44px] items-center rounded-md bg-green-600 px-3 text-white disabled:opacity-50"
                >
                  {done ? "완료됨" : "완료 체크"}
                </button>
              </form>
            </article>
          );
        })}
      </div>
    </main>
  );
}
