import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardPinchZoomLock from "@/app/(dashboard)/DashboardPinchZoomLock";
import { ACTIVE_PROFILE_COOKIE } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const activeProfileId = cookieStore.get(ACTIVE_PROFILE_COOKIE)?.value;

  if (!activeProfileId) {
    redirect("/select-profile");
  }

  return (
    <>
      <DashboardPinchZoomLock />
      {children}
    </>
  );
}
