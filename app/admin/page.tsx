import { upsertDailyPin } from "@/app/actions/admin";
import { getActiveProfileContext } from "@/lib/auth/session";
import { ProfileDeleteSection } from "./profile-delete-section";

export default async function AdminPage() {
  async function submitPin(formData: FormData) {
    "use server";
    const content = String(formData.get("content") ?? "").trim();
    if (!content) {
      throw new Error("내용을 입력해 주세요.");
    }
    await upsertDailyPin(content);
  }

  const profile = await getActiveProfileContext();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">관리자 설정</h1>

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

      {profile ? (
        <ProfileDeleteSection profileId={profile.id} profileName={profile.name} />
      ) : null}
    </main>
  );
}
