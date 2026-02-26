import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { xpForLevel, levelForXp, REWARDS } from "../lib/gameConfig";

// ─── Queries ────────────────────────────────────────────────

export const getMantraProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mantraProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const getTodayLog = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mantraLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();
  },
});

export const getRecentLogs = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mantraLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(60);
  },
});

export const getLogForDate = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mantraLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();
  },
});

export const getSadhanaStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("mantraProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const recentLogs = await ctx.db
      .query("mantraLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(60);

    // Build weekly chanting data (last 7 days)
    const weeklyData: { name: string; chants: number; malas: number }[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const log = recentLogs.find((l) => l.date === dateStr);
      weeklyData.push({
        name: dayNames[d.getDay()],
        chants: log?.count ?? 0,
        malas: log?.malas ?? 0,
      });
    }

    // Build heatmap (last 30 days)
    const heatmap: { date: string; chanted: boolean; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const log = recentLogs.find((l) => l.date === dateStr);
      heatmap.push({
        date: dateStr,
        chanted: !!log,
        count: log?.count ?? 0,
      });
    }

    return {
      totalChanted: profile?.totalChanted ?? 0,
      siddhiGoal: profile?.siddhiGoal ?? 900000,
      currentStreak: profile?.currentStreak ?? 0,
      longestStreak: profile?.longestStreak ?? 0,
      weeklyData,
      heatmap,
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

// ─── Helper: ensure game profile exists ─────────────────────

async function ensureGameProfile(ctx: any, userId: any) {
  const existing = await ctx.db
    .query("gameProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (existing) return existing;
  const id = await ctx.db.insert("gameProfiles", {
    userId,
    coins: 0,
    xp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    totalWorkouts: 0,
    totalExercises: 0,
    personalRecords: 0,
    lastActiveDate: undefined,
  });
  return await ctx.db.get(id);
}

// ─── Mutations ──────────────────────────────────────────────

export const logChanting = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    malas: v.number(),
  },
  handler: async (ctx, args) => {
    const count = args.malas * 108;
    const newAchievements: string[] = [];

    // 1. Upsert daily log
    const existingLog = await ctx.db
      .query("mantraLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    let dayTotalMalas = args.malas;
    if (existingLog) {
      dayTotalMalas = existingLog.malas + args.malas;
      await ctx.db.patch(existingLog._id, {
        count: existingLog.count + count,
        malas: dayTotalMalas,
      });
    } else {
      await ctx.db.insert("mantraLogs", {
        userId: args.userId,
        date: args.date,
        count,
        malas: args.malas,
        createdAt: Date.now(),
      });
    }

    // 2. Upsert mantra profile
    const profile = await ctx.db
      .query("mantraProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    let newTotal: number;
    let newStreak: number;
    let newLongest: number;

    if (profile) {
      newTotal = profile.totalChanted + count;

      // Calculate streak
      newStreak = profile.currentStreak;
      const lastDate = profile.lastChantDate;

      if (lastDate === args.date) {
        // Same day — streak stays the same
      } else if (lastDate) {
        const last = new Date(lastDate + "T00:00:00");
        const today = new Date(args.date + "T00:00:00");
        const diffDays = Math.round(
          (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) {
          newStreak = profile.currentStreak + 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
        // diffDays < 0 means logging a past date — don't change streak
      } else {
        newStreak = 1;
      }

      newLongest = Math.max(profile.longestStreak, newStreak);

      await ctx.db.patch(profile._id, {
        totalChanted: newTotal,
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastChantDate: args.date > (profile.lastChantDate ?? "") ? args.date : profile.lastChantDate,
      });
    } else {
      newTotal = count;
      newStreak = 1;
      newLongest = 1;

      await ctx.db.insert("mantraProfiles", {
        userId: args.userId,
        mantraName: "Navarna Mantra",
        mantraText: "ऐं ह्रीं क्लीं चामुण्डायै विच्चे",
        totalChanted: count,
        siddhiGoal: 900000,
        currentStreak: 1,
        longestStreak: 1,
        lastChantDate: args.date,
      });
    }

    // 3. Award coins/XP via gameProfiles
    const gameProfile = await ensureGameProfile(ctx, args.userId);
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

    // 4. Check Sadhana achievements

    // First japa
    if (await tryAwardAchievement(ctx, args.userId, "first_japa")) {
      newAchievements.push("first_japa");
    }

    // Mala master (10+ malas in a single day)
    if (dayTotalMalas >= 10) {
      if (await tryAwardAchievement(ctx, args.userId, "mala_master")) {
        newAchievements.push("mala_master");
      }
    }

    // Weekly sadhak / Dawn devotee (7-day streak)
    if (newStreak >= 7) {
      if (await tryAwardAchievement(ctx, args.userId, "weekly_sadhak")) {
        newAchievements.push("weekly_sadhak");
      }
      if (await tryAwardAchievement(ctx, args.userId, "dawn_devotee")) {
        newAchievements.push("dawn_devotee");
      }
    }

    // Navadina sadhak (9-day streak)
    if (newStreak >= 9) {
      if (await tryAwardAchievement(ctx, args.userId, "sadhana_streak_9")) {
        newAchievements.push("sadhana_streak_9");
      }
    }

    // Ekadashi vrati (21-day streak)
    if (newStreak >= 21) {
      if (await tryAwardAchievement(ctx, args.userId, "sadhana_streak_21")) {
        newAchievements.push("sadhana_streak_21");
      }
    }

    // Anushthana siddh (40-day streak)
    if (newStreak >= 40) {
      if (await tryAwardAchievement(ctx, args.userId, "sadhana_streak_40")) {
        newAchievements.push("sadhana_streak_40");
      }
    }

    // Lakh chanter (1,00,000 total)
    if (newTotal >= 100000) {
      if (await tryAwardAchievement(ctx, args.userId, "lakh_chanter")) {
        newAchievements.push("lakh_chanter");
      }
    }

    // Panch lakh (5,00,000 total)
    if (newTotal >= 500000) {
      if (await tryAwardAchievement(ctx, args.userId, "panch_lakh")) {
        newAchievements.push("panch_lakh");
      }
    }

    // Mantra siddhi (9,00,000 total)
    if (newTotal >= 900000) {
      if (await tryAwardAchievement(ctx, args.userId, "mantra_siddhi")) {
        newAchievements.push("mantra_siddhi");
      }
    }

    return {
      totalChanted: newTotal,
      currentStreak: newStreak,
      longestStreak: newLongest,
      newAchievements,
      coinsEarned,
      xpEarned,
    };
  },
});
