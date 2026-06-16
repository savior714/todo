"use client";

import { deleteProfile } from "@/app/actions/admin";

type ProfileDeleteSectionProps = {
  profileId: string;
  profileName: string;
};

export function ProfileDeleteSection({ profileId, profileName }: ProfileDeleteSectionProps) {
  async function handleDelete() {
    if (!confirm(`정말 "${profileName}" 프로필을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      await deleteProfile(profileId);
      alert("프로필이 삭제되었습니다.");
      window.location.href = "/";
    } catch (error) {
      const message = error instanceof Error ? error.message : "프로필 삭제 중 오류가 발생했습니다.";
      alert(message);
    }
  }

  return (
    <section
      id="profile-delete-admin"
      className="scroll-mt-6 mt-6 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800/70 dark:bg-red-950/30"
    >
      <h2 className="text-lg font-semibold tracking-tight text-red-800 dark:text-red-300">
        프로필 삭제
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-red-700 dark:text-red-400">
        현재 "{profileName}" 프로필을 삭제합니다. 삭제하면 해당 프로필의 모든 기록(이벤트, 일일 핀, 숙제 로그, 루틴 로그)이 함께 삭제됩니다.
      </p>
      <form className="mt-4">
        <button
          type="submit"
          onClick={(e) => {
            e.preventDefault();
            void handleDelete();
          }}
          className="inline-flex min-h-[44px] items-center rounded-md bg-red-600 px-3 text-sm font-semibold leading-snug text-white hover:bg-red-700"
        >
          프로필 삭제하기
        </button>
      </form>
    </section>
  );
}
