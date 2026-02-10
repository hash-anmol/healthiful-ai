import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Coins, Zap, Flame, Star, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { titleForLevel } from '@/lib/gameConfig';
import confetti from 'canvas-confetti';

interface WorkoutCompleteModalProps {
  show: boolean;
  onClose: () => void;
  stats: {
    exerciseCount: number;
    totalCoins: number;
    totalXp: number;
    leveledUp: boolean;
    newLevel: number;
    newStreak: number;
    newAchievements: string[];
    workoutTitle: string;
    elapsedTime?: string;
  };
}

export const WorkoutCompleteModal: React.FC<WorkoutCompleteModalProps> = ({
  show,
  onClose,
  stats,
}) => {
  React.useEffect(() => {
    if (show) {
      // Fire confetti burst
      const duration = 2000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FF6B00', '#FFBB00', '#22C55E', '#3B82F6'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FF6B00', '#FFBB00', '#22C55E', '#3B82F6'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-lg"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background decoration */}
            <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 blur-3xl opacity-60" />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 blur-3xl opacity-60" />

            <div className="relative">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute -top-2 -right-2 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>

              {/* Trophy icon */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', damping: 10 }}
                className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-xl shadow-amber-200"
              >
                <Trophy size={40} className="text-white" />
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-6"
              >
                <h2 className="text-2xl font-black text-slate-900">Workout Complete!</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">{stats.workoutTitle}</p>
              </motion.div>

              {/* Stats grid */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-3 gap-3 mb-6"
              >
                <div className="bg-amber-50 rounded-2xl p-3 text-center border border-amber-100">
                  <Coins size={18} className="text-amber-500 mx-auto mb-1" />
                  <p className="text-lg font-black text-slate-900">+{stats.totalCoins}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Coins</p>
                </div>
                <div className="bg-purple-50 rounded-2xl p-3 text-center border border-purple-100">
                  <Zap size={18} className="text-purple-500 mx-auto mb-1" />
                  <p className="text-lg font-black text-slate-900">+{stats.totalXp}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">XP</p>
                </div>
                <div className="bg-orange-50 rounded-2xl p-3 text-center border border-orange-100">
                  <Flame size={18} className="text-orange-500 mx-auto mb-1" />
                  <p className="text-lg font-black text-slate-900">{stats.newStreak}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Streak</p>
                </div>
              </motion.div>

              {/* Level up banner */}
              {stats.leveledUp && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, type: 'spring' }}
                  className="bg-gradient-to-r from-[#FF6B00] to-[#FFB347] rounded-2xl p-4 mb-5 text-white text-center"
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Star size={18} />
                    <span className="text-sm font-black uppercase tracking-wider">Level Up!</span>
                    <Star size={18} />
                  </div>
                  <p className="text-2xl font-black">Level {stats.newLevel}</p>
                  <p className="text-xs font-bold text-white/80">{titleForLevel(stats.newLevel)}</p>
                </motion.div>
              )}

              {/* Exercise summary */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-3 mb-5 border border-slate-100"
              >
                <span className="text-xs font-bold text-slate-500">Exercises completed</span>
                <span className="text-sm font-black text-slate-900">{stats.exerciseCount}</span>
              </motion.div>

              {/* Continue button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={onClose}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl bg-slate-900 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg"
              >
                Continue
                <ArrowRight size={18} />
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
