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
      <div
        role="note"
        className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-xs leading-relaxed text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-300"
      >
        카카오톡·메신저 등 앱 안 브라우저에서는 Google이 보안 정책으로 로그인을 막는 경우가 있습니다.
        Safari나 Chrome에서 이 주소를 연 뒤, 필요하면 링크를 길게 눌러 외부 브라우저로 여세요.
        앱 오류가 아니라 Google 쪽 제한입니다.
      </div>
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
