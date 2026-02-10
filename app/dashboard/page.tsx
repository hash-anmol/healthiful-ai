"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseCard } from "@/components/dashboard/ExerciseCard";
import { CoinCounter, XpBar, StreakBadge } from "@/components/dashboard/CoinAnimation";
import { WorkoutCompleteModal } from "@/components/dashboard/WorkoutCompleteModal";
import { AchievementToast } from "@/components/dashboard/AchievementToast";
import { RefreshCcw, Send, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthProvider';

export default function DashboardPage() {
  const { authUser } = useAuth();
  const user = useQuery(
    api.users.getMe,
    authUser?._id ? { authUserId: authUser._id } : "skip"
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [duration, setDuration] = useState(45);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const workout = useQuery(api.workouts.getWorkout, user ? { userId: user._id, date: dateStr } : "skip");
  const generateWorkoutAction = useAction(api.actions.generateWorkout);
  const talkToCoachAction = useAction(api.actions.talkToCoach);
  const saveWorkout = useMutation(api.workouts.saveWorkout);
  const toggleComplete = useMutation(api.workouts.markExerciseComplete);

  // Gamification hooks
  const gameProfile = useQuery(api.gamification.getGameProfile, user ? { userId: user._id } : "skip");
  const awardExerciseComplete = useMutation(api.gamification.awardExerciseComplete);
  const awardWorkoutComplete = useMutation(api.gamification.awardWorkoutComplete);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [coachInput, setCoachInput] = useState("");
  const [coachReply, setCoachReply] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachHasInit, setCoachHasInit] = useState(false);

  // Gamification state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionStats, setCompletionStats] = useState<any>(null);
  const [pendingAchievements, setPendingAchievements] = useState<string[]>([]);
  const [sessionCoins, setSessionCoins] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);

  const handleGenerate = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      const plan = await generateWorkoutAction({ 
        userId: user._id, 
        date: dateStr,
        feedback: feedback.trim() || undefined,
        duration: duration
      });
      if (plan) {
        await saveWorkout({
          userId: user._id,
          date: dateStr,
          title: plan.title,
          exercises: plan.exercises.map((ex: any) => ({
            ...ex,
            completed: false,
          })),
        });
        setFeedback("");
        setShowFeedbackInput(false);
        setSessionCoins(0);
        setSessionXp(0);
      }
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const checkWorkoutComplete = useCallback(async (exerciseName: string) => {
    if (!workout || !user?._id) return;

    const willBeAllCompleted = workout.exercises.every(ex => 
      ex.name === exerciseName ? true : ex.completed
    );

    if (willBeAllCompleted) {
      try {
        const result = await awardWorkoutComplete({
          userId: user._id,
          date: dateStr,
        });
        setSessionCoins((prev) => prev + result.coinsEarned);
        setSessionXp((prev) => prev + result.xpEarned);
        setCompletionStats({
          exerciseCount: workout.exercises.length,
          totalCoins: sessionCoins + result.coinsEarned,
          totalXp: sessionXp + result.xpEarned,
          leveledUp: result.leveledUp,
          newLevel: result.newLevel,
          newStreak: result.newStreak,
          newAchievements: result.newAchievements,
          workoutTitle: workout.title,
        });

        if (result.newAchievements.length > 0) {
          setPendingAchievements((prev) => [...prev, ...result.newAchievements]);
        }

        // Small delay to let exercise completion animate, then show modal
        setTimeout(() => setShowCompleteModal(true), 600);
      } catch (err) {
        console.error("Workout complete reward failed:", err);
      }
    }
  }, [workout, user?._id, dateStr, awardWorkoutComplete, sessionCoins, sessionXp]);

  const handleToggle = async (exerciseName: string, completed: boolean) => {
    if (!workout) return;
    if (!user?._id) return;

    await toggleComplete({
      userId: user._id,
      workoutId: workout._id,
      exerciseName,
      completed,
      date: workout.date,
    });
  };

  const handleLogAndToggle = async (exerciseName: string, payload: {
    setsCompleted: number;
    repsCompleted: number;
    weightUsed: number;
    rpe?: number;
  }) => {
    if (!workout || !user?._id) return;

    await toggleComplete({
      userId: user._id,
      workoutId: workout._id,
      exerciseName,
      completed: true,
      date: workout.date,
      setsCompleted: payload.setsCompleted,
      repsCompleted: payload.repsCompleted,
      weightUsed: payload.weightUsed,
      rpe: payload.rpe,
    });

    // Award coins for exercise completion
    try {
      const result = await awardExerciseComplete({
        userId: user._id,
        exerciseName,
        weightUsed: payload.weightUsed,
        hadRpe: payload.rpe !== undefined,
      });
      setSessionCoins((prev) => prev + result.coinsEarned);
      setSessionXp((prev) => prev + result.xpEarned);

      if (result.newAchievements.length > 0) {
        setPendingAchievements((prev) => [...prev, ...result.newAchievements]);
      }
    } catch (err) {
      console.error("Exercise reward failed:", err);
    }

    // Check if workout is now fully complete
    checkWorkoutComplete(exerciseName);
  };

  const handleCoinsEarned = useCallback((amount: number) => {
    // visual feedback handled by CoinCounter
  }, []);

  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const workoutExercises = workout?.exercises?.map((ex) => ({
    name: ex.name,
    sets: ex.sets,
    reps: ex.reps,
    type: ex.type,
  }));
  const completedCount = workout?.exercises?.filter((ex) => ex.completed).length || 0;
  const totalCount = workout?.exercises?.length || 0;

  const fetchCoachReply = async (message?: string) => {
    if (!user?._id) return;
    setCoachLoading(true);
    try {
      const reply = await talkToCoachAction({
        userId: user._id,
        date: dateStr,
        userName: user.name || undefined,
        workoutTitle: workout?.title || undefined,
        workoutExercises: workoutExercises,
        completedCount,
        totalCount,
        userMessage: message?.trim() || undefined,
      });
      setCoachReply(reply);
    } catch (error) {
      console.error("Coach reply failed:", error);
      setCoachReply("Jack AI is offline for a moment. Try again in a bit.");
    } finally {
      setCoachLoading(false);
    }
  };

  useEffect(() => {
    setCoachHasInit(false);
    setCoachReply(null);
  }, [workout?._id, dateStr]);

  useEffect(() => {
    // Only auto-init the coach once a workout exists for this day
    if (!user?._id || coachHasInit || !workout) return;
    void fetchCoachReply("");
    setCoachHasInit(true);
  }, [user?._id, coachHasInit, workout]);

  // Reset session stats when workout changes
  useEffect(() => {
    setSessionCoins(0);
    setSessionXp(0);
  }, [workout?._id]);

  return (
    <div className="bg-[#F8FAFC] text-[#1E293B] font-sans antialiased min-h-screen pb-24 relative overflow-x-hidden">
      {/* Achievement Toast */}
      <AchievementToast
        achievementIds={pendingAchievements}
        onDismiss={() => setPendingAchievements([])}
      />

      <header className="sticky top-0 z-30 pt-6 pb-3 px-6 bg-[#F8FAFC]/80 backdrop-blur-xl border-b border-slate-100">
        {/* Top row: greeting + gamification stats */}
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="text-slate-500 text-sm font-medium">
              Hello, {user ? user.name : <Skeleton className="h-3 w-16 inline-block" />}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Ready to Workout</h1>
          </div>
          <div className="flex items-center gap-3">
            <StreakBadge streak={gameProfile?.currentStreak ?? 0} />
            <CoinCounter coins={gameProfile?.coins ?? 0} />
          </div>
        </div>

        {/* XP bar */}
        {gameProfile && (
          <XpBar
            xpInCurrentLevel={gameProfile.xpInCurrentLevel}
            xpToNextLevel={gameProfile.xpToNextLevel}
            level={gameProfile.level}
            className="mb-3"
          />
        )}
        
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-6xl font-extrabold text-[#FF6B00] leading-none tracking-tighter">
              {duration}
            </span>
            <span className="text-xl font-semibold text-slate-400 ml-1">Min</span>
            <p className="text-lg font-bold mt-1 text-slate-900">
              {workout ? workout.title : "No Plan Selected"}
            </p>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowDurationPicker(!showDurationPicker)}
              className={cn(
                "p-3 rounded-2xl bg-white shadow-sm border transition-all",
                showDurationPicker ? "border-[#FF6B00] bg-orange-50" : "border-slate-100"
              )}
            >
              <span className={cn(
                "material-icons-round transition-colors",
                showDurationPicker ? "text-[#FF6B00]" : "text-slate-400"
              )}>tune</span>
            </button>
            
            <AnimatePresence>
              {showDurationPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 min-w-[120px]"
                >
                  {[20, 30, 45, 50, 60].map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setDuration(d);
                        setShowDurationPicker(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2 text-left rounded-xl text-sm font-bold transition-colors",
                        duration === d 
                          ? "bg-orange-50 text-[#FF6B00]" 
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {d} Minutes
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-6 pt-4">

        {/* Horizontal Calendar */}
        <div className="flex space-x-3 overflow-x-auto hide-scrollbar py-2">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center justify-center min-w-[70px] h-[90px] rounded-3xl transition-all ${
                  isSelected
                    ? "bg-[#FF6B00] text-white shadow-[0_4px_20px_-2px_rgba(255,107,0,0.3)] transform scale-105"
                    : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50"
                }`}
              >
                <span className={`text-xs font-medium ${isSelected ? "opacity-80" : ""}`}>
                  {format(day, 'EEE')}
                </span>
                <span className={`text-2xl font-bold mt-1 ${isSelected ? "" : "text-xl"}`}>
                  {format(day, 'd')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Regeneration Section */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-[3] py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
            >
              <RefreshCcw className={cn("w-5 h-5", isGenerating && "animate-spin")} />
              {isGenerating ? 'Generating...' : workout ? 'Regenerate' : 'Generate Workout'}
            </button>
            
            <button
              onClick={() => setShowFeedbackInput(!showFeedbackInput)}
              className={cn(
                "flex-1 py-4 rounded-2xl font-bold flex items-center justify-center transition-all border",
                showFeedbackInput 
                  ? "bg-orange-50 text-[#FF6B00] border-orange-100" 
                  : "bg-white text-slate-600 border-slate-100"
              )}
            >
              <span className="material-icons-round text-2xl">tune</span>
            </button>
          </div>

          <AnimatePresence>
            {showFeedbackInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex gap-2 items-center">
                  <input 
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="e.g. Focus more on upper chest..."
                    className="flex-grow bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-slate-400"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  />
                  <button 
                    onClick={handleGenerate}
                    disabled={!feedback.trim() || isGenerating}
                    className="p-2 bg-[#FF6B00] text-white rounded-xl disabled:opacity-30"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Today's Routine */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">Today&apos;s Routine</h2>
            <span className="text-sm text-[#FF6B00] font-semibold">
              {workout ? `${workout.exercises.length} Exercises` : "0 Exercises"}
            </span>
          </div>

          {/* AI Coach Card */}
          <div className="relative overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_18px_40px_rgba(255,107,0,0.12)] mb-5">
            <div className="absolute -top-24 -right-16 h-48 w-48 rounded-full bg-orange-100/60 blur-3xl" />
            <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[#FFD4B8]/70 blur-3xl" />
            <div className="relative p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.35em] text-orange-400">
                    Jack AI
                  </p>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-2">
                    Today&apos;s focus, personalized
                  </h3>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#FFB347] text-white flex items-center justify-center shadow-lg shadow-orange-200">
                  <span className="material-icons-round text-xl">bolt</span>
                </div>
              </div>

              <div className="min-h-[72px] rounded-2xl bg-orange-50/60 border border-orange-100/80 p-4 text-sm text-slate-700 leading-relaxed">
                {coachLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/5" />
                  </div>
                ) : coachReply ? (
                  <p>{coachReply}</p>
                ) : (
                  <p>Jack AI is warming up. Give it a second.</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={coachInput}
                  onChange={(event) => setCoachInput(event.target.value)}
                  placeholder="Ask Jack about form, volume, or modifications"
                  className="flex-1 h-12 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      fetchCoachReply(coachInput);
                      setCoachInput('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    fetchCoachReply(coachInput);
                    setCoachInput('');
                  }}
                  disabled={!coachInput.trim() || coachLoading}
                  className="h-12 px-5 rounded-2xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Send className={cn("w-4 h-4", coachLoading && "animate-pulse")} />
                  Talk
                </button>
              </div>
            </div>
          </div>

          {/* Workout Progress Bar */}
          {workout && totalCount > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-5">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Progress</span>
                  <span className="text-xs font-extrabold text-slate-900">{completedCount}/{totalCount}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                  <Coins size={10} />
                  ~{totalCount * 10 + 50} coins possible
                </div>
              </div>
              <div className="flex gap-1">
                {workout.exercises.map((ex, i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      "flex-1 h-3 rounded-full transition-all duration-500",
                      ex.completed 
                        ? "bg-gradient-to-r from-[#FF6B00] to-[#FF8C33]" 
                        : "bg-slate-100"
                    )}
                    animate={ex.completed ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </div>
              {completedCount === totalCount && totalCount > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-bold text-green-600 mt-2 text-center"
                >
                  All exercises complete! Great work!
                </motion.p>
              )}
            </div>
          )}

          {/* Exercise Cards */}
          <div className="space-y-4">
            {isGenerating ? (
              <WorkoutSkeleton />
            ) : workout ? (
              workout.exercises.map((exercise, idx) => (
                <ExerciseCard 
                  key={idx}
                  exercise={exercise as any}
                  workoutTitle={workout.title}
                  workoutId={workout._id}
                  userId={user?._id}
                  onToggle={() => handleToggle(exercise.name, !exercise.completed)}
                  onLog={(payload) => handleLogAndToggle(exercise.name, payload)}
                  onCoinsEarned={handleCoinsEarned}
                />
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <p className="text-slate-400">No workout generated for this day.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Workout Complete Modal */}
      {completionStats && (
        <WorkoutCompleteModal
          show={showCompleteModal}
          onClose={() => {
            setShowCompleteModal(false);
            setCompletionStats(null);
          }}
          stats={completionStats}
        />
      )}

      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

function WorkoutSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-3xl p-4 shadow-soft border border-slate-100 animate-pulse">
          <div className="flex gap-4 items-center">
            <div className="w-20 h-20 bg-slate-200 rounded-2xl flex-shrink-0"></div>
            <div className="flex-grow space-y-2">
              <div className="h-5 bg-slate-200 rounded w-1/2"></div>
              <div className="h-3 bg-slate-200 rounded w-1/4"></div>
              <div className="flex gap-3">
                <div className="h-6 bg-slate-200 rounded w-16"></div>
                <div className="h-6 bg-slate-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
