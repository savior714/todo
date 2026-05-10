import { createGuide, createHomeworkType, upsertDailyPin } from "@/app/actions/admin";

export default function AdminPage() {
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

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">관리자 설정</h1>

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
        <h2 className="text-lg font-semibold">숙제 유형 추가</h2>
        <form action={submitHomeworkType} className="mt-3 grid gap-2">
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
            placeholder="linked action (예: laundry)"
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
