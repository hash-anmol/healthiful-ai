"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LineChart, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const NAV_LEFT = [
  { href: '/dashboard', label: 'Plan', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/analytics', label: 'Progress', icon: LineChart, exact: false },
];

const NAV_RIGHT = [
  { href: '/dashboard/profile', label: 'Me', icon: User, exact: false },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: typeof NAV_LEFT[number]) => {
    const active = isActive(item.href, item.exact);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className="relative flex flex-col items-center gap-1 py-2 px-4 group"
      >
        {active && (
          <motion.div
            layoutId="navActiveIndicator"
            className="absolute inset-0 bg-orange-50 rounded-2xl border border-orange-100"
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          />
        )}

        <div className="relative">
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
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Frosted glass background */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-t border-slate-100" />

      <div className="relative flex items-center justify-around h-20 max-w-lg mx-auto px-4">
        {/* Left nav items */}
        {NAV_LEFT.map(renderNavItem)}

        {/* Center: Ask Jacked AI button */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("jacked-ai-toggle"))}
          className="relative flex flex-col items-center gap-0.5 -mt-5"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FF8C33] text-white flex items-center justify-center shadow-xl shadow-orange-300/50 border-[3px] border-white">
            <span className="text-2xl leading-none">🤖</span>
          </div>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#FF6B00] mt-0.5">
            Ask Jacked
          </span>
        </button>

        {/* Right nav items */}
        {NAV_RIGHT.map(renderNavItem)}
      </div>

      {/* Safe area spacer for phones with home indicators */}
      <div className="h-[env(safe-area-inset-bottom)] bg-white/80 backdrop-blur-xl" />
    </nav>
  );
}
