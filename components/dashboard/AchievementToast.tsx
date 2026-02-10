import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Coins } from 'lucide-react';
import { ACHIEVEMENTS, RARITY_COLORS } from '@/lib/achievements';

interface AchievementToastProps {
  achievementIds: string[];
  onDismiss: () => void;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({
  achievementIds,
  onDismiss,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (achievementIds.length === 0) return;

    const timer = setTimeout(() => {
      if (currentIndex < achievementIds.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onDismiss();
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [currentIndex, achievementIds.length, onDismiss]);

  if (achievementIds.length === 0) return null;

  const achievementId = achievementIds[currentIndex];
  const achievement = ACHIEVEMENTS[achievementId];
  if (!achievement) return null;

  const colors = RARITY_COLORS[achievement.rarity];

  return (
    <AnimatePresence>
      <motion.div
        key={achievementId}
        initial={{ y: -100, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -100, opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-[90%] max-w-sm"
      >
        <div className={`${colors.bg} border ${colors.border} rounded-3xl p-4 shadow-xl ${colors.glow} shadow-lg relative overflow-hidden`}>
          {/* Glow effect */}
          <div className={`absolute inset-0 ${colors.bg} opacity-50 blur-xl`} />
          
          <div className="relative flex items-center gap-3">
            {/* Achievement icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', damping: 12 }}
              className={`w-12 h-12 rounded-2xl ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}
            >
              <Trophy size={24} className={colors.text} />
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <motion.p
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500"
                >
                  Achievement Unlocked!
                </motion.p>
              </div>
              <motion.h4
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="font-extrabold text-base text-slate-900 truncate"
              >
                {achievement.title}
              </motion.h4>
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-2 mt-0.5"
              >
                <span className="text-xs text-slate-500 font-medium">{achievement.description}</span>
                <span className="flex items-center gap-0.5 text-amber-600 text-[10px] font-bold bg-amber-50 px-1.5 py-0.5 rounded-md">
                  <Coins size={10} /> +{achievement.coinBonus}
                </span>
              </motion.div>
            </div>

            <button
              onClick={onDismiss}
              className="absolute top-3 right-3 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Progress indicator for multiple achievements */}
          {achievementIds.length > 1 && (
            <div className="flex gap-1 mt-3 justify-center">
              {achievementIds.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === currentIndex ? 'bg-[#FF6B00]' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
