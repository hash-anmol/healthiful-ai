import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins } from 'lucide-react';

interface CoinAnimationProps {
  amount: number;
  trigger: number; // increment to trigger animation
}

interface FloatingCoin {
  id: number;
  x: number;
  y: number;
}

export const CoinAnimation: React.FC<CoinAnimationProps> = ({ amount, trigger }) => {
  const [coins, setCoins] = useState<FloatingCoin[]>([]);

  useEffect(() => {
    if (trigger === 0) return;

    const newCoins: FloatingCoin[] = Array.from({ length: Math.min(amount / 5, 8) }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 60 - 30,
      y: Math.random() * 20,
    }));

    setCoins((prev) => [...prev, ...newCoins]);

    // Clean up after animation
    const timer = setTimeout(() => {
      setCoins((prev) => prev.filter((c) => !newCoins.find((nc) => nc.id === c.id)));
    }, 1500);

    return () => clearTimeout(timer);
  }, [trigger]);

  return (
    <div className="relative pointer-events-none">
      <AnimatePresence>
        {coins.map((coin) => (
          <motion.div
            key={coin.id}
            initial={{ opacity: 1, y: 0, x: coin.x, scale: 1 }}
            animate={{ opacity: 0, y: -60 - coin.y, scale: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute -top-2 left-1/2 -translate-x-1/2"
          >
            <div className="flex items-center gap-1 bg-amber-400 text-white px-2 py-1 rounded-full text-[10px] font-black shadow-lg">
              <Coins size={10} />
              +{amount}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

/** Animated coin counter for the header */
interface CoinCounterProps {
  coins: number;
  className?: string;
}

export const CoinCounter: React.FC<CoinCounterProps> = ({ coins, className }) => {
  const [displayedCoins, setDisplayedCoins] = useState(coins);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (coins === displayedCoins) return;
    setIsAnimating(true);

    const diff = coins - displayedCoins;
    const steps = Math.min(Math.abs(diff), 20);
    const increment = diff / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      if (step >= steps) {
        setDisplayedCoins(coins);
        setIsAnimating(false);
        clearInterval(interval);
      } else {
        setDisplayedCoins((prev) => Math.round(prev + increment));
      }
    }, 50);

    return () => clearInterval(interval);
  }, [coins]);

  return (
    <motion.div
      animate={isAnimating ? { scale: [1, 1.15, 1] } : {}}
      transition={{ duration: 0.3 }}
      className={`flex items-center gap-1.5 ${className ?? ''}`}
    >
      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md shadow-amber-200">
        <Coins size={14} className="text-white" />
      </div>
      <span className="text-sm font-black text-slate-900 tabular-nums">{displayedCoins.toLocaleString()}</span>
    </motion.div>
  );
};

/** XP progress bar */
interface XpBarProps {
  xpInCurrentLevel: number;
  xpToNextLevel: number;
  level: number;
  className?: string;
}

export const XpBar: React.FC<XpBarProps> = ({ xpInCurrentLevel, xpToNextLevel, level, className }) => {
  const progress = xpToNextLevel > 0 ? Math.min((xpInCurrentLevel / xpToNextLevel) * 100, 100) : 0;

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <div className="flex items-center gap-1">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#FF6B00] to-[#FF8C33] flex items-center justify-center">
          <span className="text-[9px] font-black text-white">{level}</span>
        </div>
      </div>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FFB347] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[10px] font-bold text-slate-400 tabular-nums min-w-[40px] text-right">
        {Math.round(xpInCurrentLevel)}/{xpToNextLevel}
      </span>
    </div>
  );
};

/** Streak fire badge */
interface StreakBadgeProps {
  streak: number;
  className?: string;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ streak, className }) => {
  if (streak <= 0) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`flex items-center gap-1 ${className ?? ''}`}
    >
      <motion.div
        animate={streak >= 3 ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
        className="text-lg"
      >
        🔥
      </motion.div>
      <span className="text-sm font-black text-slate-900">{streak}</span>
    </motion.div>
  );
};
