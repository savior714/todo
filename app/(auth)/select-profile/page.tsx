import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { selectProfile } from "@/app/actions/auth";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { profiles, userFamilies } from "@/db/schema";

type ProfileRow = {
  id: string;
  name: string;
  role: "admin" | "executor";
};

export default async function SelectProfilePage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    redirect("/login");
  }

  const [membership] = await db
    .select({ familyId: userFamilies.familyId })
    .from(userFamilies)
    .where(eq(userFamilies.userId, user.id));

  if (!membership) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
        <h1 className="mt-8 text-2xl font-bold">프로필 선택</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">먼저 가족 구성을 생성해 주세요.</p>
      </main>
    );
  }

  const profileList = (await db
    .select({ id: profiles.id, name: profiles.name, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.familyId, membership.familyId))
    .orderBy(asc(profiles.createdAt))) as ProfileRow[];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
      <h1 className="mt-8 text-2xl font-bold">프로필 선택</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        오늘 실행할 구성원을 선택해 주세요.
      </p>

      <div className="mt-4 grid gap-3">
        {profileList.map((profile) => (
          <form key={profile.id} action={selectProfile.bind(null, profile.id)}>
            <button
              type="submit"
              className="flex min-h-[60px] w-full items-center justify-between rounded-xl border border-neutral-300 bg-white px-4 py-3 text-left transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
            >
              <span className="font-semibold">{profile.name}</span>
              <span className="text-xs uppercase text-neutral-500">{profile.role}</span>
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
