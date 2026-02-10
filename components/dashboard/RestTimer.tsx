import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RestTimerProps {
  duration: number;
  onComplete: () => void;
  onSkip: () => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({ duration, onComplete, onSkip }) => {
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    setRemaining(duration);
  }, [duration]);

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining]);

  useEffect(() => {
    if (remaining === 0) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      onComplete();
    }
  }, [remaining, onComplete]);

  const progress = duration > 0 ? (duration - remaining) / duration : 0;
  const isAlmostDone = remaining <= 5 && remaining > 0;

  const size = 120;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center justify-between bg-slate-50 rounded-2xl px-5 py-4 border border-slate-100 overflow-hidden"
    >
      <div className="flex items-center gap-4">
        {/* Compact circular timer */}
        <div className="relative w-14 h-14 shrink-0">
          <svg width={56} height={56} className="transform -rotate-90">
            <circle cx={28} cy={28} r={23} fill="none" stroke="#e2e8f0" strokeWidth={4} />
            <circle
              cx={28} cy={28} r={23}
              fill="none"
              stroke={isAlmostDone ? '#ef4444' : '#FF6B00'}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 23}
              strokeDashoffset={(2 * Math.PI * 23) * (1 - progress)}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn(
              "text-sm font-black tabular-nums",
              isAlmostDone ? "text-red-500" : "text-slate-900"
            )}>
              {timeStr}
            </span>
          </div>
          {/* Pulse when almost done */}
          {isAlmostDone && (
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2 border-red-300"
            />
          )}
        </div>

        <div>
          <p className="text-sm font-bold text-slate-900">Resting</p>
          <p className="text-[11px] text-slate-400 font-medium">Next set ready soon</p>
        </div>
      </div>

      <button
        onClick={onSkip}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors border border-slate-200 active:scale-95"
      >
        <SkipForward size={13} />
        Skip
      </button>
    </motion.div>
  );
};
