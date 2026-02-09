import { query } from "./_generated/server";
import { v } from "convex/values";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const buildEncouragement = (stats: {
  weeklyWorkouts: number;
  weeklyVolume: number;
  streak: number;
  previousWeeklyVolume: number;
  previousWeeklyWorkouts: number;
}) => {
  const volumeDelta = stats.previousWeeklyVolume
    ? Math.round(((stats.weeklyVolume - stats.previousWeeklyVolume) / stats.previousWeeklyVolume) * 100)
    : 0;
  const workoutDelta = stats.weeklyWorkouts - stats.previousWeeklyWorkouts;

  if (stats.weeklyWorkouts === 0) {
    return "Fresh start week. Pick one workout and build momentum.";
  }

  if (stats.streak >= 5) {
    return "Momentum unlocked. Keep the streak alive and the wins stack.";
  }

  if (volumeDelta >= 10) {
    return `Big week. Volume is up ${volumeDelta}% and your engine is building.`;
  }

  if (workoutDelta > 0) {
    return `You're showing up more often. +${workoutDelta} workout${workoutDelta === 1 ? "" : "s"} this week.`;
  }

  return "Solid consistency. One more session makes the week a win.";
};

export const getDashboardStats = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    previousStartDate: v.string(),
    previousEndDate: v.string(),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("exerciseLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).gte("date", args.startDate).lte("date", args.endDate)
      )
      .collect();

    const previousLogs = await ctx.db
      .query("exerciseLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId)
          .gte("date", args.previousStartDate)
          .lte("date", args.previousEndDate)
      )
      .collect();

    const workoutIds = new Set(logs.map((log) => String(log.workoutId)));
    const previousWorkoutIds = new Set(previousLogs.map((log) => String(log.workoutId)));
    const weeklyWorkouts = workoutIds.size;
    const previousWeeklyWorkouts = previousWorkoutIds.size;

    const weeklyVolume = logs.reduce((total, log) => {
      return total + log.weightUsed * log.repsCompleted * log.setsCompleted;
    }, 0);

    const previousWeeklyVolume = previousLogs.reduce((total, log) => {
      return total + log.weightUsed * log.repsCompleted * log.setsCompleted;
    }, 0);

    const recentLogs = await ctx.db
      .query("exerciseLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(120);

    const recentDates = new Set(recentLogs.map((log) => log.date));
    let streak = 0;
    const anchor = new Date(args.endDate);
    for (let i = 0; i < 28; i += 1) {
      const date = new Date(anchor.getTime());
      date.setDate(anchor.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      if (recentDates.has(key)) {
        streak += 1;
      } else {
        break;
      }
    }

    const encouragement = buildEncouragement({
      weeklyWorkouts,
      weeklyVolume,
      streak,
      previousWeeklyVolume,
      previousWeeklyWorkouts,
    });

    return {
      weeklyWorkouts,
      previousWeeklyWorkouts,
      weeklyVolume,
      previousWeeklyVolume,
      streak,
      encouragement,
    };
  },
});

export const getWeeklyVolume = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("exerciseLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).gte("date", args.startDate).lte("date", args.endDate)
      )
      .collect();

    const byDay = new Map<string, { volume: number; workouts: Set<string> }>();
    for (const log of logs) {
      const current = byDay.get(log.date) ?? { volume: 0, workouts: new Set() };
      current.volume += log.weightUsed * log.repsCompleted * log.setsCompleted;
      current.workouts.add(String(log.workoutId));
      byDay.set(log.date, current);
    }

    const days: { name: string; volume: number; workouts: number }[] = [];
    const start = new Date(args.startDate);
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(start.getTime());
      day.setDate(start.getDate() + i);
      const dateKey = day.toISOString().slice(0, 10);
      const stats = byDay.get(dateKey) ?? { volume: 0, workouts: new Set() };
      const dayName = DAY_NAMES[i] ?? DAY_NAMES[day.getDay() === 0 ? 6 : day.getDay() - 1];
      days.push({
        name: dayName,
        volume: Math.round(stats.volume),
        workouts: stats.workouts.size,
      });
    }

    return days;
  },
});

export const getExerciseProgress = query({
  args: {
    userId: v.id("users"),
    exerciseName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.exerciseName) return [];
    const exerciseName = args.exerciseName;

    const logs = await ctx.db
      .query("exerciseLogs")
      .withIndex("by_user_exercise", (q) =>
        q.eq("userId", args.userId).eq("exerciseName", exerciseName)
      )
      .order("desc")
      .take(18);

    return logs
      .map((log) => ({
        date: log.date,
        volume: Math.round(log.weightUsed * log.repsCompleted * log.setsCompleted),
        weight: log.weightUsed,
        reps: log.repsCompleted,
      }))
      .reverse();
  },
});

export const getExerciseCatalog = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const recentWorkouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(30);

    const names = new Set<string>();
    for (const workout of recentWorkouts) {
      workout.exercises.forEach((exercise) => names.add(exercise.name));
    }

    return Array.from(names).sort((a, b) => a.localeCompare(b));
  },
});

export const getWorkoutHeatmap = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const heatmap: { date: string; workouts: number }[] = [];
    const logs = await ctx.db
      .query("exerciseLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).gte("date", args.startDate).lte("date", args.endDate)
      )
      .collect();

    const byDate = new Map<string, Set<string>>();
    logs.forEach((log) => {
      const current = byDate.get(log.date) ?? new Set<string>();
      current.add(String(log.workoutId));
      byDate.set(log.date, current);
    });

    const start = new Date(args.startDate);
    const end = new Date(args.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().slice(0, 10);
      const workouts = byDate.get(dateKey)?.size ?? 0;
      heatmap.push({
        date: dateKey,
        workouts: clampNumber(workouts, 0, 3),
      });
    }

    return heatmap;
  },
});
