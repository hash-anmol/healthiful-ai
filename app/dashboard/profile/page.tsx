"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, User, Settings, LogOut, Plus, Trophy, Flame, Coins, Zap, Star, TrendingUp, Crown, Target, Dumbbell, Scale } from 'lucide-react';
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/auth/AuthProvider";
import { ACHIEVEMENTS, RARITY_COLORS, type AchievementDef } from '@/lib/achievements';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type FeedbackItem = {
  _id: Id<"feedbacks">;
  exerciseName: string;
  feedback: string;
};

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  Sword: <Zap size={20} />,
  Rocket: <Star size={20} />,
  Shield: <Target size={20} />,
  Flame: <Flame size={20} />,
  Anvil: <Dumbbell size={20} />,
  TrendingUp: <TrendingUp size={20} />,
  Coins: <Coins size={20} />,
  Crown: <Crown size={20} />,
  Trophy: <Trophy size={20} />,
};

export default function ProfilePage() {
  const router = useRouter();
  const { authUser, logout } = useAuth();
  const user = useQuery(
    api.users.getMe,
    authUser?._id ? { authUserId: authUser._id } : "skip"
  );
  const feedbacks = useQuery(
    api.feedbacks.listByUser,
    user?._id ? { userId: user._id } : "skip"
  );
  const gameProfile = useQuery(
    api.gamification.getGameProfile,
    user?._id ? { userId: user._id } : "skip"
  );
  const achievements = useQuery(
    api.gamification.getAchievements,
    user?._id ? { userId: user._id } : "skip"
  );

  const addFeedback = useMutation(api.feedbacks.addFeedback);
  const deleteFeedback = useMutation(api.feedbacks.deleteFeedback);
  const logWeightMutation = useMutation(api.weightLogs.logWeight);
  const latestWeight = useQuery(
    api.weightLogs.getLatestWeight,
    user?._id ? { userId: user._id } : "skip"
  );

  const [exerciseName, setExerciseName] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [isLoggingWeight, setIsLoggingWeight] = useState(false);

  const unlockedIds = useMemo(() => {
    return new Set((achievements ?? []).map((a) => a.achievementId));
  }, [achievements]);

  const canAddFeedback = useMemo(() => {
    return Boolean(exerciseName.trim() && feedbackText.trim() && user?._id);
  }, [exerciseName, feedbackText, user?._id]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleAddFeedback = async () => {
    if (!user?._id || !canAddFeedback) return;
    setIsSaving(true);
    try {
      await addFeedback({
        userId: user._id,
        exerciseName,
        feedback: feedbackText,
      });
      setExerciseName('');
      setFeedbackText('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogWeight = async () => {
    const w = parseFloat(weightInput);
    if (!user?._id || !w || w <= 0) return;
    setIsLoggingWeight(true);
    try {
      await logWeightMutation({
        userId: user._id,
        date: format(new Date(), 'yyyy-MM-dd'),
        weight: w,
      });
      setWeightInput('');
    } finally {
      setIsLoggingWeight(false);
    }
  };

  const xpProgress = gameProfile
    ? gameProfile.xpToNextLevel > 0
      ? Math.min((gameProfile.xpInCurrentLevel / gameProfile.xpToNextLevel) * 100, 100)
      : 0
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Profile</h1>
        <p className="text-slate-500 font-medium">
          Your stats, achievements, and settings.
        </p>
      </div>

      {/* Level & XP Card */}
      {gameProfile && (
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#FF6B00] to-[#FF8C33] p-6 text-white shadow-xl shadow-orange-200">
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <span className="text-2xl font-black">{gameProfile.level}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Level</p>
                  <p className="text-lg font-extrabold">{gameProfile.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/10">
                <Coins size={16} />
                <span className="font-black text-sm">{(gameProfile.coins ?? 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-white/70">
                <span>XP Progress</span>
                <span>{Math.round(gameProfile.xpInCurrentLevel)} / {gameProfile.xpToNextLevel} XP</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lifetime Stats */}
      {gameProfile && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
            <Dumbbell size={18} className="text-[#FF6B00] mx-auto mb-1.5" />
            <p className="text-2xl font-black text-slate-900">{gameProfile.totalWorkouts}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workouts</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
            <Target size={18} className="text-purple-500 mx-auto mb-1.5" />
            <p className="text-2xl font-black text-slate-900">{gameProfile.totalExercises}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exercises</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
            <Flame size={18} className="text-orange-500 mx-auto mb-1.5" />
            <p className="text-2xl font-black text-slate-900">{gameProfile.longestStreak}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Best Streak</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
            <TrendingUp size={18} className="text-green-500 mx-auto mb-1.5" />
            <p className="text-2xl font-black text-slate-900">{gameProfile.personalRecords}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PRs</p>
          </div>
        </div>
      )}

      {/* Weight Check-in */}
      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[2rem] overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Scale size={20} className="text-[#FF6B00]" />
            Weight Check-in
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {latestWeight && (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{latestWeight.weight}</span>
              <span className="text-sm font-bold text-slate-400">kg</span>
              <span className="text-xs text-slate-400 ml-auto">Last logged: {latestWeight.date}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Input
              type="number"
              placeholder="Today's weight (kg)"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="flex-1 h-12 rounded-2xl"
              step="0.1"
              min="0"
            />
            <Button
              onClick={handleLogWeight}
              disabled={!weightInput || isLoggingWeight}
              className="h-12 px-6 rounded-2xl bg-[#FF6B00] hover:bg-[#E55D00] text-white font-bold"
            >
              Log
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[2rem] overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Trophy size={20} className="text-amber-500" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.values(ACHIEVEMENTS).map((ach: AchievementDef) => {
              const isUnlocked = unlockedIds.has(ach.id);
              const colors = RARITY_COLORS[ach.rarity];
              return (
                <motion.div
                  key={ach.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-2xl border transition-all",
                    isUnlocked
                      ? `${colors.bg} ${colors.border} shadow-sm`
                      : "bg-slate-50 border-slate-100 opacity-50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    isUnlocked ? `${colors.bg} ${colors.text}` : "bg-slate-100 text-slate-300"
                  )}>
                    {ACHIEVEMENT_ICONS[ach.icon] || <Trophy size={20} />}
                  </div>
                  <div className="min-w-0">
                    <p className={cn(
                      "text-sm font-bold truncate",
                      isUnlocked ? "text-slate-900" : "text-slate-400"
                    )}>
                      {ach.title}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">{ach.description}</p>
                  </div>
                  {isUnlocked && (
                    <div className="shrink-0 ml-auto">
                      <div className="flex items-center gap-0.5 text-amber-600 text-[9px] font-bold bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">
                        <Coins size={8} /> +{ach.coinBonus}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Exercise Feedbacks */}
      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[2rem] overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">Exercise Feedbacks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr_auto] gap-3">
            <Input
              placeholder="Exercise name"
              value={exerciseName}
              onChange={(event) => setExerciseName(event.target.value)}
            />
            <Input
              placeholder="Feedback (e.g., shoulder pain on incline press)"
              value={feedbackText}
              onChange={(event) => setFeedbackText(event.target.value)}
            />
            <Button
              onClick={handleAddFeedback}
              disabled={!canAddFeedback || isSaving}
              className="h-12"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          <div className="space-y-3">
            {(feedbacks || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No feedbacks yet. Add one to guide exercise selection.
              </div>
            ) : (
              (feedbacks || []).map((item: FeedbackItem) => (
                <div
                  key={item._id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.exerciseName}</p>
                    <p className="text-sm text-slate-600">{item.feedback}</p>
                  </div>
                  <Button
                    variant="ghost"
                    className="h-10 w-10 p-0 text-slate-400 hover:text-red-500"
                    onClick={() => deleteFeedback({ feedbackId: item._id })}
                    aria-label={`Delete feedback for ${item.exerciseName}`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account Card */}
      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[2rem] overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100">
              <User className="h-8 w-8 text-[#FF6B00]" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900">{user?.name || "Athlete"}</h3>
              <p className="text-slate-500">{authUser?.email || "Unknown email"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Button variant="outline" className="w-full justify-start text-lg h-14 gap-3 rounded-2xl">
          <Settings className="w-5 h-5" />
          App Settings
        </Button>
        <Button
          variant="destructive"
          className="w-full justify-start text-lg h-14 gap-3 rounded-2xl"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
