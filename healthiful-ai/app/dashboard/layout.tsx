import Link from 'next/link';
import { LayoutDashboard, LineChart, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen bg-[var(--background)] font-sans">
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 no-scrollbar">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white h-20 flex items-center justify-around z-50">
        <Link href="/dashboard" className="flex flex-col items-center gap-1.5 p-2 text-[var(--primary)]">
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Plan</span>
        </Link>
        <Link href="/dashboard/analytics" className="flex flex-col items-center gap-1.5 p-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">
          <LineChart className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Progress</span>
        </Link>
        <Link href="/dashboard/profile" className="flex flex-col items-center gap-1.5 p-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">
          <User className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Me</span>
        </Link>
      </nav>
    </div>
  );
}
