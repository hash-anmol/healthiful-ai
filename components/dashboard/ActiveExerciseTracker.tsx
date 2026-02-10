import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Timer, Coins, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RestTimer } from './RestTimer';

interface SetData {
  reps: number;
  weight: number;
  completed: boolean;
}

interface ActiveExerciseTrackerProps {
  exercise: {
    name: string;
    sets: number;
    reps: string;
    weight?: string;
    type?: string;
    tip?: string;
  };
  onComplete: (payload: {
    setsCompleted: number;
    repsCompleted: number;
    weightUsed: number;
    rpe?: number;
  }) => void;
  onClose: () => void;
  coinsReward?: number;
}

const getDefaultRestDuration = (type?: string): number => {
  switch (type) {
    case 'warmup': return 30;
    case 'abs': return 45;
    case 'compound': return 120;
    case 'isolation': return 60;
    default: return 90;
  }
};

const parseReps = (value?: string) => {
  if (!value) return 0;
  const [first] = value.split('-');
  const parsed = Number(first);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseWeight = (value?: string) => {
  const match = value?.match(/([0-9]+(\.[0-9]+)?)/);
  return match ? Number(match[1]) : 0;
};

export const ActiveExerciseTracker: React.FC<ActiveExerciseTrackerProps> = ({
  exercise,
  onComplete,
  onClose,
  coinsReward = 10,
}) => {
  const defaultReps = parseReps(exercise.reps);
  const defaultWeight = parseWeight(exercise.weight);
  const restDuration = getDefaultRestDuration(exercise.type);

  const [sets, setSets] = useState<SetData[]>(() =>
    Array.from({ length: exercise.sets }, () => ({
      reps: defaultReps,
      weight: defaultWeight,
      completed: false,
    }))
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [activeSetIndex, setActiveSetIndex] = useState(0);
  const [editingSet, setEditingSet] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Exercise timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const completedCount = sets.filter((s) => s.completed).length;
  const allCompleted = completedCount === sets.length;

  const handleSetToggle = useCallback((index: number) => {
    setSets((prev) => {
      const next = [...prev];
      const isNowCompleted = !next[index].completed;
      next[index] = { ...next[index], completed: isNowCompleted };

      if (isNowCompleted) {
        setEditingSet(null);
        const nextIncomplete = next.findIndex((s, i) => i > index && !s.completed);
        if (nextIncomplete !== -1) {
          setActiveSetIndex(nextIncomplete);
          setShowRestTimer(true);
        } else {
          setShowRestTimer(false);
        }
      }

      return next;
    });
  }, []);

  const handleRestComplete = useCallback(() => {
    setShowRestTimer(false);
  }, []);

  const handleRestSkip = useCallback(() => {
    setShowRestTimer(false);
  }, []);

  const handleUpdateSet = (index: number, field: 'reps' | 'weight', value: number) => {
    setSets((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleCompleteExercise = () => {
    const completedSets = sets.filter((s) => s.completed);
    const avgReps = completedSets.length > 0
      ? Math.round(completedSets.reduce((sum, s) => sum + s.reps, 0) / completedSets.length)
      : 0;
    const maxWeight = completedSets.length > 0
      ? Math.max(...completedSets.map((s) => s.weight))
      : 0;

    onComplete({
      setsCompleted: completedSets.length,
      repsCompleted: avgReps,
      weightUsed: maxWeight,
    });
  };

  return (
    <div
      className="fixed inset-0 z-200 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl relative max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="px-5 pb-4 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-slate-900 leading-tight">{exercise.name}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-400 font-medium">
                  {exercise.sets}s &times; {exercise.reps}
                  {exercise.weight ? ` @ ${exercise.weight}` : ''}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-300">
                  <Timer size={12} />
                  <span className="tabular-nums font-medium">{formatTime(elapsedSeconds)}</span>
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1 mt-4">
            {sets.map((set, i) => (
              <motion.div
                key={i}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-colors duration-300",
                  set.completed
                    ? "bg-[#FF6B00]"
                    : i === activeSetIndex && !set.completed
                      ? "bg-orange-200"
                      : "bg-slate-100"
                )}
                animate={set.completed ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.25 }}
              />
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 no-scrollbar">
          {/* Sets */}
          <div className="space-y-2">
            {sets.map((set, i) => {
              const isActive = i === activeSetIndex && !set.completed && !showRestTimer;
              const isEditing = editingSet === i && !set.completed;

              return (
                <div key={i}>
                  <motion.div
                    layout
                    className={cn(
                      "rounded-2xl border transition-all duration-200",
                      set.completed
                        ? "bg-emerald-50/60 border-emerald-100"
                        : isActive
                          ? "bg-orange-50/40 border-orange-200/60"
                          : "bg-white border-slate-100"
                    )}
                  >
                    {/* Main set row - always visible */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Set indicator */}
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                        set.completed
                          ? "bg-emerald-500 text-white"
                          : isActive
                            ? "bg-[#FF6B00] text-white"
                            : "bg-slate-100 text-slate-400"
                      )}>
                        {set.completed ? <Check size={14} strokeWidth={3} /> : i + 1}
                      </div>

                      {/* Set info */}
                      <button
                        className="flex-1 text-left"
                        onClick={() => {
                          if (!set.completed) {
                            setEditingSet(isEditing ? null : i);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-semibold",
                            set.completed ? "text-emerald-700" : "text-slate-900"
                          )}>
                            {set.reps} reps
                          </span>
                          {set.weight > 0 && (
                            <>
                              <span className="text-slate-300">&middot;</span>
                              <span className={cn(
                                "text-sm",
                                set.completed ? "text-emerald-600" : "text-slate-500"
                              )}>
                                {set.weight} kg
                              </span>
                            </>
                          )}
                          {!set.completed && (
                            <ChevronDown
                              size={14}
                              className={cn(
                                "text-slate-300 transition-transform",
                                isEditing && "rotate-180"
                              )}
                            />
                          )}
                        </div>
                      </button>

                      {/* Complete button */}
                      <motion.button
                        onClick={() => handleSetToggle(i)}
                        whileTap={{ scale: 0.9 }}
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all",
                          set.completed
                            ? "bg-emerald-500 text-white"
                            : isActive
                              ? "bg-[#FF6B00] text-white shadow-sm shadow-orange-200"
                              : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                        )}
                      >
                        <Check size={16} strokeWidth={2.5} />
                      </motion.button>
                    </div>

                    {/* Expandable edit fields */}
                    <AnimatePresence>
                      {isEditing && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex gap-3 px-4 pb-3">
                            <div className="flex-1">
                              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Reps</label>
                              <input
                                type="number"
                                min={0}
                                value={set.reps}
                                onChange={(e) => handleUpdateSet(i, 'reps', Number(e.target.value))}
                                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]/30"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Weight (kg)</label>
                              <input
                                type="number"
                                min={0}
                                step={0.5}
                                value={set.weight}
                                onChange={(e) => handleUpdateSet(i, 'weight', Number(e.target.value))}
                                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]/30"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* Rest timer - inline compact */}
          <AnimatePresence>
            {showRestTimer && (
              <div className="mt-3">
                <RestTimer
                  key={`rest-${activeSetIndex}`}
                  duration={restDuration}
                  onComplete={handleRestComplete}
                  onSkip={handleRestSkip}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Tip - subtle */}
          {exercise.tip && (
            <p className="mt-4 text-xs text-slate-400 leading-relaxed pl-1">
              <span className="text-[#FF6B00] font-semibold">Tip:</span> {exercise.tip}
            </p>
          )}
        </div>

        {/* Sticky footer button */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-50 bg-white">
          <motion.button
            onClick={handleCompleteExercise}
            disabled={completedCount === 0}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "w-full py-3.5 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all",
              allCompleted
                ? "bg-[#FF6B00] text-white shadow-lg shadow-orange-200/50"
                : completedCount > 0
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-300 cursor-not-allowed"
            )}
          >
            {allCompleted ? (
              <>
                Complete
                <span className="flex items-center gap-1 text-white/80 text-sm font-medium">
                  <Coins size={14} /> +{coinsReward}
                </span>
              </>
            ) : completedCount > 0 ? (
              <>
                Finish ({completedCount}/{sets.length})
                <span className="flex items-center gap-1 text-white/60 text-sm">
                  <Coins size={13} /> +{Math.floor(coinsReward * (completedCount / sets.length))}
                </span>
              </>
            ) : (
              <span className="text-sm">Complete a set to finish</span>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
