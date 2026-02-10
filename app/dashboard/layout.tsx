import Link from 'next/link';
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/auth/server";
import { BottomNav } from './BottomNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, profile } = await getServerAuthContext();
  if (!session) {
    redirect("/login");
  }
  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--background)] font-sans">
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-28 no-scrollbar">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
