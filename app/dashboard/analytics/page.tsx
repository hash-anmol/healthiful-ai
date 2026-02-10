'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Trophy, Flame, CalendarDays, TrendingUp, Sparkles, Scale } from 'lucide-react';
import { format, startOfWeek, subWeeks, endOfWeek, subDays } from 'date-fns';
import { useAuth } from '@/components/auth/AuthProvider';

const toISODate = (date: Date) => format(date, 'yyyy-MM-dd');

const renderDelta = (current: number, previous: number, suffix = '') => {
  if (!previous && current === 0) return `No data yet${suffix}`;
  if (!previous) return `New baseline${suffix}`;
  const delta = current - previous;
  const percent = Math.round((delta / previous) * 100);
  if (delta === 0) return `Even with last week${suffix}`;
  const direction = delta > 0 ? '+' : '';
  return `${direction}${percent}% from last week${suffix}`;
};

export default function AnalyticsPage() {
  const { authUser } = useAuth();
  const user = useQuery(
    api.users.getMe,
    authUser?._id ? { authUserId: authUser._id } : 'skip'
  );
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const prevWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
  const prevWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
  const heatmapStart = subDays(today, 60);

  const stats = useQuery(
    api.analytics.getDashboardStats,
    user
      ? {
        userId: user._id,
        startDate: toISODate(weekStart),
        endDate: toISODate(weekEnd),
        previousStartDate: toISODate(prevWeekStart),
        previousEndDate: toISODate(prevWeekEnd),
      }
      : 'skip'
  );

  const weeklyVolume = useQuery(
    api.analytics.getWeeklyVolume,
    user
      ? { userId: user._id, startDate: toISODate(weekStart), endDate: toISODate(weekEnd) }
      : 'skip'
  );

  const exerciseCatalog = useQuery(
    api.analytics.getExerciseCatalog,
    user ? { userId: user._id } : 'skip'
  );

  const [selectedExercise, setSelectedExercise] = useState<string | undefined>(undefined);
  const exerciseProgress = useQuery(
    api.analytics.getExerciseProgress,
    user && selectedExercise ? { userId: user._id, exerciseName: selectedExercise } : 'skip'
  );

  const heatmap = useQuery(
    api.analytics.getWorkoutHeatmap,
    user
      ? {
        userId: user._id,
        startDate: toISODate(heatmapStart),
        endDate: toISODate(today),
      }
      : 'skip'
  );

  const weightHistory = useQuery(
    api.weightLogs.getWeightHistory,
    user ? { userId: user._id, days: 90 } : 'skip'
  );

  const exerciseOptions = useMemo(() => {
    if (!exerciseCatalog) return [];
    return exerciseCatalog;
  }, [exerciseCatalog]);

  // Weight commentary based on body type and goal
  const weightCommentary = useMemo(() => {
    if (!weightHistory || weightHistory.length < 2 || !user) return null;
    const first = weightHistory[0].weight;
    const last = weightHistory[weightHistory.length - 1].weight;
    const diff = last - first;
    const diffStr = Math.abs(diff).toFixed(1);
    const bodyType = user.bodyType?.toLowerCase() ?? '';
    const goal = user.primaryGoal?.toLowerCase() ?? '';

    if (diff > 0) {
      if (bodyType.includes('ecto') || goal.includes('muscle') || goal.includes('gain') || goal.includes('bulk')) {
        return `Up ${diffStr} kg — great work building mass. Your consistency is paying off.`;
      }
      if (goal.includes('lose') || goal.includes('cut') || goal.includes('weight loss')) {
        return `Up ${diffStr} kg recently. Stay focused on your deficit — small fluctuations are normal.`;
      }
      return `Up ${diffStr} kg over this period.`;
    } else if (diff < 0) {
      if (goal.includes('lose') || goal.includes('cut') || goal.includes('weight loss')) {
        return `Down ${diffStr} kg — your consistency is paying off. Keep pushing.`;
      }
      if (bodyType.includes('ecto') || goal.includes('muscle') || goal.includes('gain') || goal.includes('bulk')) {
        return `Down ${diffStr} kg — consider increasing your calorie surplus to support muscle gain.`;
      }
      return `Down ${diffStr} kg over this period.`;
    }
    return 'Weight is holding steady. Keep up the good work.';
  }, [weightHistory, user]);

  const encouragement = stats?.encouragement ?? 'Log a workout and watch your progress build.';

  if (user === undefined || stats === undefined) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col space-y-2">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-5 w-64 rounded-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-[400px] rounded-3xl" />
          <Skeleton className="h-[400px] rounded-3xl" />
        </div>
      </div>
    );
  }

  const hasData = stats.weeklyVolume > 0 || stats.weeklyWorkouts > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your Progress</h1>
        <p className="text-muted-foreground font-medium">
          {encouragement}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Weekly Workouts</CardTitle>
            <CalendarDays className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{stats?.weeklyWorkouts ?? 0}</div>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              {renderDelta(stats?.weeklyWorkouts ?? 0, stats?.previousWeeklyWorkouts ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Volume</CardTitle>
            <Trophy className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">
              {Math.round(stats?.weeklyVolume ?? 0).toLocaleString()} <span className="text-lg font-bold text-slate-400">kg</span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              {renderDelta(stats?.weeklyVolume ?? 0, stats?.previousWeeklyVolume ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Active Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{stats?.streak ?? 0} <span className="text-lg font-bold text-slate-400">Days</span></div>
            <p className="text-xs font-semibold text-slate-400 mt-1">Keep the fire burning!</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold text-slate-900">Volume Load</CardTitle>
            <CardDescription className="font-medium text-slate-500">
              Total weight lifted across all exercises this week.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {!hasData ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 m-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                  <TrendingUp className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-400">No volume data yet.</p>
                <p className="text-xs text-slate-400 mt-1">Complete your first workout to see trends.</p>
              </div>
            ) : (
              <div className="h-[300px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyVolume ?? []}>
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      cursor={{ fill: '#f8fafc', radius: 8 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border-none text-xs font-bold">
                              {payload[0].value?.toLocaleString()} kg
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="volume" fill="#FF6B00" radius={[8, 8, 8, 8]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <span className="text-xl">🤖</span>
              Weekly Wins
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium">Micro milestones that keep you moving.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-orange-50/60 rounded-3xl border border-orange-100/60">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-[#FF6B00]" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Progressive overload</p>
                <p className="text-xs text-slate-500 mt-0.5">{stats?.weeklyVolume ? 'Volume is trending upward.' : 'Log a workout to unlock trends.'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-green-50/60 rounded-3xl border border-green-100/60">
              <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Consistency badge</p>
                <p className="text-xs text-slate-500 mt-0.5">{stats?.streak ? `You're on a ${stats.streak}-day streak.` : 'Your first streak starts today.'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-blue-50/60 rounded-3xl border border-blue-100/60">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Show up score</p>
                <p className="text-xs text-slate-500 mt-0.5">{stats?.weeklyWorkouts ? `You've trained ${stats.weeklyWorkouts} days this week.` : 'Plan your first session to earn this.'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weight Progress */}
      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Scale className="h-5 w-5 text-[#FF6B00]" />
            Weight Progress
          </CardTitle>
          <CardDescription className="font-medium text-slate-500">
            Your body weight over the last 90 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!weightHistory || weightHistory.length === 0 ? (
            <div className="h-[220px] flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <Scale className="h-8 w-8 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-400">No weight data yet.</p>
              <p className="text-xs text-slate-400 mt-1">Log your weight from the Profile page to see trends.</p>
            </div>
          ) : (
            <>
              <div className="h-[220px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightHistory.map((w: any) => ({ date: w.date, weight: w.weight }))}>
                    <XAxis
                      dataKey="date"
                      stroke="#94a3b8"
                      fontSize={10}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => {
                        const d = new Date(v);
                        return format(d, 'MMM d');
                      }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(v: number) => `${v}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs font-bold">
                              {payload[0].payload.date}: {payload[0].value} kg
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#FF6B00"
                      strokeWidth={3}
                      dot={{ r: 3, fill: '#FF6B00', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {weightCommentary && (
                <p className="mt-4 text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  {weightCommentary}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-900">Progressive Overload</CardTitle>
            <CardDescription className="font-medium text-slate-500">Track strength over time for a single lift.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <select
              value={selectedExercise ?? ''}
              onChange={(event) => setSelectedExercise(event.target.value || undefined)}
              className="w-full h-14 rounded-2xl border border-slate-100 bg-slate-50 px-5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all appearance-none cursor-pointer"
            >
              <option value="">Select exercise to analyze</option>
              {exerciseOptions.map((exercise) => (
                <option key={exercise} value={exercise}>
                  {exercise}
                </option>
              ))}
            </select>

            {!selectedExercise ? (
              <div className="h-[240px] flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <TrendingUp className="h-8 w-8 text-slate-300 mb-3" />
                <p className="text-xs font-bold text-slate-400">Select an exercise to see your strength curve.</p>
              </div>
            ) : exerciseProgress && exerciseProgress.length === 0 ? (
              <div className="h-[240px] flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-400">No logs found for this exercise yet.</p>
              </div>
            ) : (
              <div className="h-[240px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={exerciseProgress ?? []}>
                    <XAxis dataKey="date" hide />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{payload[0].payload.date}</p>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                                  <p className="text-xs font-bold text-slate-900">{payload[0].value} kg</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <p className="text-xs font-bold text-slate-600">{payload[1].value} vol</p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#FF6B00"
                      strokeWidth={4}
                      dot={{ r: 4, fill: '#FF6B00', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="volume"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-900">Consistency Map</CardTitle>
            <CardDescription className="font-medium text-slate-500">Every block is a workout day.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {(heatmap ?? []).map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.workouts} workouts`}
                  className={`aspect-square rounded-lg transition-all duration-300 ${day.workouts === 0
                      ? 'bg-slate-100 hover:bg-slate-200'
                      : day.workouts === 1
                        ? 'bg-orange-200 hover:bg-orange-300'
                        : day.workouts === 2
                          ? 'bg-orange-400 hover:bg-orange-500'
                          : 'bg-orange-600 hover:bg-orange-700'
                    }`}
                />
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Less</p>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-slate-100" />
                <div className="w-3 h-3 rounded-sm bg-orange-200" />
                <div className="w-3 h-3 rounded-sm bg-orange-400" />
                <div className="w-3 h-3 rounded-sm bg-orange-600" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">More</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
