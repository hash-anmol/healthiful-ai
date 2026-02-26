import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { REWARDS, levelForXp } from "../lib/gameConfig";

// ─── Queries ────────────────────────────────────────────────

export const getRecentSessions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("meditationSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(30);
  },
});

export const getMeditationStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("meditationSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(90);

    const totalSessions = sessions.length;
    const totalMinutes = Math.round(
      sessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60
    );
    const totalChants = sessions.reduce((sum, s) => sum + s.chantCount, 0);

    // Longest session
    const longestSession = sessions.reduce(
      (max, s) => Math.max(max, s.durationSeconds),
      0
    );

    // Consecutive day streak
    let streak = 0;
    const sessionDates = new Set(sessions.map((s) => s.date));
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      if (sessionDates.has(dateStr)) {
        streak++;
      } else {
        break;
      }
    }

    // Last 7 days data
    const weeklyData: { name: string; minutes: number }[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const daySessions = sessions.filter((s) => s.date === dateStr);
      const totalMins = Math.round(
        daySessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60
      );
      weeklyData.push({
        name: dayNames[d.getDay()],
        minutes: totalMins,
      });
    }

    // Progressive minute tracking (longest each day, last 7 days)
    const progressiveData: { date: string; longestMinutes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const daySessions = sessions.filter((s) => s.date === dateStr);
      const longest = daySessions.reduce(
        (max, s) => Math.max(max, s.durationSeconds),
        0
      );
      progressiveData.push({
        date: dateStr,
        longestMinutes: Math.round(longest / 60),
      });
    }

    return {
      totalSessions,
      totalMinutes,
      totalChants,
      longestSessionMinutes: Math.round(longestSession / 60),
      streak,
      weeklyData,
      progressiveData,
    };
  },
});

// ─── Helper: check and award an achievement ─────────────────

async function tryAwardAchievement(
  ctx: any,
  userId: any,
  achievementId: string
): Promise<boolean> {
  const existing = await ctx.db
    .query("achievements")
    .withIndex("by_user_achievement", (q: any) =>
      q.eq("userId", userId).eq("achievementId", achievementId)
    )
    .first();
  if (existing) return false;
  await ctx.db.insert("achievements", {
    userId,
    achievementId,
    unlockedAt: Date.now(),
  });
  return true;
}

// ─── Mutations ──────────────────────────────────────────────

export const logMeditationSession = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    durationSeconds: v.number(),
    malasGoal: v.number(),
    malasCompleted: v.number(),
  },
  handler: async (ctx, args) => {
    const chantCount = args.malasCompleted * 108;
    const newAchievements: string[] = [];

    // Insert session
    await ctx.db.insert("meditationSessions", {
      userId: args.userId,
      date: args.date,
      durationSeconds: args.durationSeconds,
      malasGoal: args.malasGoal,
      malasCompleted: args.malasCompleted,
      chantCount,
      completedAt: Date.now(),
    });

    // Get all sessions for achievement checks
    const allSessions = await ctx.db
      .query("meditationSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const totalSessions = allSessions.length;
    const totalMinutes = Math.round(
      allSessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60
    );
    const longestSession = allSessions.reduce(
      (max, s) => Math.max(max, s.durationSeconds),
      0
    );

    // Calculate meditation streak
    const sessionDates = new Set(allSessions.map((s) => s.date));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      if (sessionDates.has(dateStr)) {
        streak++;
      } else {
        break;
      }
    }

    // Check progressive minute increase (last 7 days each day longer)
    let progressiveStreak = 0;
    const dailyLongest: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const daySessions = allSessions.filter((s) => s.date === dateStr);
      const longest = daySessions.reduce(
        (max, s) => Math.max(max, s.durationSeconds),
        0
      );
      dailyLongest.push(longest);
    }
    // Check how many consecutive days from today the duration increased
    for (let i = 0; i < dailyLongest.length - 1; i++) {
      if (dailyLongest[i] > 0 && dailyLongest[i] >= dailyLongest[i + 1] + 60) {
        progressiveStreak++;
      } else {
        break;
      }
    }

    // ── Achievement checks ──

    // First meditation
    if (await tryAwardAchievement(ctx, args.userId, "first_dhyana")) {
      newAchievements.push("first_dhyana");
    }

    // 10 minutes sitting
    if (args.durationSeconds >= 600) {
      if (await tryAwardAchievement(ctx, args.userId, "ten_min_sit")) {
        newAchievements.push("ten_min_sit");
      }
    }

    // 30 minutes sitting
    if (args.durationSeconds >= 1800) {
      if (await tryAwardAchievement(ctx, args.userId, "thirty_min_sit")) {
        newAchievements.push("thirty_min_sit");
      }
    }

    // 1 hour sitting
    if (args.durationSeconds >= 3600) {
      if (await tryAwardAchievement(ctx, args.userId, "hour_sit")) {
        newAchievements.push("hour_sit");
      }
    }

    // 7 day meditation streak
    if (streak >= 7) {
      if (await tryAwardAchievement(ctx, args.userId, "dhyana_week")) {
        newAchievements.push("dhyana_week");
      }
    }

    // 21 day meditation streak
    if (streak >= 21) {
      if (await tryAwardAchievement(ctx, args.userId, "dhyana_sadhak")) {
        newAchievements.push("dhyana_sadhak");
      }
    }

    // Progressive 3 days
    if (progressiveStreak >= 3) {
      if (await tryAwardAchievement(ctx, args.userId, "progressive_3")) {
        newAchievements.push("progressive_3");
      }
    }

    // Progressive 7 days
    if (progressiveStreak >= 7) {
      if (await tryAwardAchievement(ctx, args.userId, "progressive_7")) {
        newAchievements.push("progressive_7");
      }
    }

    // Total 100 minutes
    if (totalMinutes >= 100) {
      if (await tryAwardAchievement(ctx, args.userId, "centurion_meditator")) {
        newAchievements.push("centurion_meditator");
      }
    }

    // Award coins/XP via gameProfiles

    const gameProfile = await ctx.db
      .query("gameProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .first();

    if (gameProfile) {
      const coinsEarned = REWARDS.MANTRA_SESSION.coins;
      const xpEarned = REWARDS.MANTRA_SESSION.xp;
      const newCoins = gameProfile.coins + coinsEarned;
      const newXp = gameProfile.xp + xpEarned;
      const newLevel = levelForXp(newXp);

      await ctx.db.patch(gameProfile._id, {
        coins: newCoins,
        xp: newXp,
        level: newLevel,
      });
    }

    return {
      newAchievements,
      durationMinutes: Math.round(args.durationSeconds / 60),
      chantCount,
    };
  },
});
