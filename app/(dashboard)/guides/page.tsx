import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { careGuides } from "@/db/schema";
import { getActiveProfileContext } from "@/lib/auth/session";

export default async function GuidesPage() {
  const profile = await getActiveProfileContext();

  if (!profile) {
    return <main className="p-6">프로필이 필요합니다.</main>;
  }

  const guides = await db
    .select({
      id: careGuides.id,
      category: careGuides.category,
      title: careGuides.title,
      body: careGuides.body,
      linkedAction: careGuides.linkedAction,
    })
    .from(careGuides)
    .where(eq(careGuides.familyId, profile.familyId))
    .orderBy(desc(careGuides.createdAt));

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">우리집 가이드</h1>
      <div className="mt-4 grid gap-3">
        {(guides ?? []).map((guide) => (
          <article key={guide.id} className="rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
            <p className="text-sm text-neutral-500">{guide.category}</p>
            <p className="mt-1 text-lg font-semibold">{guide.title}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{guide.body}</p>
            {guide.linkedAction && (
              <p className="mt-2 text-xs text-blue-600 dark:text-blue-300">
                linked action: {guide.linkedAction}
              </p>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
