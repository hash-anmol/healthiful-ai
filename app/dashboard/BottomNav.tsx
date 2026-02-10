"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LineChart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Plan', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/analytics', label: 'Progress', icon: LineChart, exact: false },
  { href: '/dashboard/profile', label: 'Me', icon: User, exact: false },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Frosted glass background */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-t border-slate-100" />

      <div className="relative flex items-center justify-around h-20 max-w-lg mx-auto px-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center gap-1 py-2 px-5 group"
            >
              {/* Active background pill */}
              {active && (
                <motion.div
                  layoutId="navActiveIndicator"
                  className="absolute inset-0 bg-orange-50 rounded-2xl border border-orange-100"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}

              <div className="relative">
                {/* Active dot indicator on top */}
                {active && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FF6B00]"
                  />
                )}
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors duration-200 relative",
                    active ? "text-[#FF6B00]" : "text-slate-400 group-hover:text-slate-600"
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
              </div>

              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 relative",
                  active ? "text-[#FF6B00]" : "text-slate-400 group-hover:text-slate-600"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Safe area spacer for phones with home indicators */}
      <div className="h-[env(safe-area-inset-bottom)] bg-white/80 backdrop-blur-xl" />
    </nav>
  );
}
