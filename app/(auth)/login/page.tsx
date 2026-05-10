import { beginGoogleLogin } from "@/app/actions/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

const ACTIVE_PROFILE_COOKIE = "active_profile_id";

export default async function LoginPage() {
  const session = await auth();
  const user = session?.user;

  if (user) {
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get(ACTIVE_PROFILE_COOKIE)?.value;
    redirect(activeProfileId ? "/dashboard" : "/select-profile");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold">FamilySync 로그인</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Google 계정으로 로그인해 가족 프로필을 선택하세요.
      </p>
      <form action={beginGoogleLogin}>
        <button
          type="submit"
          className="inline-flex min-h-[60px] w-full items-center justify-center rounded-xl bg-black px-4 py-3 text-white transition hover:opacity-90 dark:bg-white dark:text-black"
        >
          Google로 로그인
        </button>
      </form>
    </main>
  );
}
