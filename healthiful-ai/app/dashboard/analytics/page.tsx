'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Trophy, Flame, CalendarDays, TrendingUp, Sparkles } from 'lucide-react';
import { format, startOfWeek, subWeeks, endOfWeek, subDays } from 'date-fns';

const toISODate = (date: Date) => format(date, 'yyyy-MM-dd');

const renderDelta = (current: number, previous: number, suffix = '') => {
  if (!previous) return `New baseline${suffix}`;
  const delta = current - previous;
  const percent = Math.round((delta / previous) * 100);
  if (delta === 0) return `Even with last week${suffix}`;
  const direction = delta > 0 ? '+' : '';
  return `${direction}${percent}% from last week${suffix}`;
};

export default function AnalyticsPage() {
  const user = useQuery(api.users.getMe);
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

  const exerciseOptions = useMemo(() => {
    if (!exerciseCatalog) return [];
    return exerciseCatalog;
  }, [exerciseCatalog]);

  const encouragement = stats?.encouragement ?? 'Log a workout and watch your progress build.';

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Your Progress</h1>
        <p className="text-muted-foreground">
          {encouragement}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Workouts</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.weeklyWorkouts ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {renderDelta(stats?.weeklyWorkouts ?? 0, stats?.previousWeeklyWorkouts ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(stats?.weeklyVolume ?? 0).toLocaleString()} kg
            </div>
            <p className="text-xs text-muted-foreground">
              {renderDelta(stats?.weeklyVolume ?? 0, stats?.previousWeeklyVolume ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.streak ?? 0} Days</div>
            <p className="text-xs text-muted-foreground">Keep the fire burning!</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Volume Load</CardTitle>
            <CardDescription>
              Total weight lifted across all exercises this week.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyVolume ?? []}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    cursor={{ fill: 'var(--muted)' }}
                  />
                  <Bar dataKey="volume" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white via-orange-50 to-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-500" />
              Weekly Wins
            </CardTitle>
            <CardDescription>Micro milestones that keep you moving.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-500 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Progressive overload</p>
                <p className="text-xs text-slate-500">{stats?.weeklyVolume ? 'Volume is trending upward.' : 'Log a workout to unlock trends.'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Consistency badge</p>
                <p className="text-xs text-slate-500">{stats?.streak ? `You're on a ${stats.streak}-day streak.` : 'Your first streak starts today.'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Show up score</p>
                <p className="text-xs text-slate-500">{stats?.weeklyWorkouts ? `You've trained ${stats.weeklyWorkouts} days this week.` : 'Plan your first session to earn this.'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Progressive Overload</CardTitle>
            <CardDescription>Track strength over time for a single lift.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              value={selectedExercise ?? ''}
              onChange={(event) => setSelectedExercise(event.target.value || undefined)}
              className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="">Select exercise</option>
              {exerciseOptions.map((exercise) => (
                <option key={exercise} value={exercise}>
                  {exercise}
                </option>
              ))}
            </select>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={exerciseProgress ?? []}>
                  <XAxis dataKey="date" hide />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Line type="monotone" dataKey="weight" stroke="var(--primary)" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="volume" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consistency Map</CardTitle>
            <CardDescription>Every block is a workout day.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {(heatmap ?? []).map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.workouts} workouts`}
                  className={`h-6 rounded-lg ${
                    day.workouts === 0
                      ? 'bg-slate-100'
                      : day.workouts === 1
                        ? 'bg-orange-200'
                        : day.workouts === 2
                          ? 'bg-orange-400'
                          : 'bg-orange-500'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
