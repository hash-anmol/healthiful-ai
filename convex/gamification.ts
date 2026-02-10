import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Shared game config helpers (used by both frontend and backend)
import { xpForLevel, levelForXp, titleForLevel, REWARDS } from "../lib/gameConfig";

// ── Queries ─────────────────────────────────────────────────────────

export const getGameProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("gameProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      // Return default values for new users
      return {
        coins: 0,
        xp: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        totalWorkouts: 0,
        totalExercises: 0,
        personalRecords: 0,
        lastActiveDate: undefined,
        title: titleForLevel(1),
        xpToNextLevel: xpForLevel(2),
        xpInCurrentLevel: 0,
      };
    }

    const nextLevel = profile.level + 1;
    const xpNeeded = xpForLevel(nextLevel);
    let xpAccumulated = 0;
    for (let l = 1; l <= profile.level; l++) {
      xpAccumulated += xpForLevel(l);
    }
    const xpInCurrentLevel = profile.xp - xpAccumulated;

    return {
      ...profile,
      title: titleForLevel(profile.level),
      xpToNextLevel: xpNeeded,
      xpInCurrentLevel: Math.max(0, xpInCurrentLevel),
    };
  },
});

export const getAchievements = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// ── Mutations ───────────────────────────────────────────────────────

/** Ensure a game profile exists for the user, creating one if needed */
const ensureProfile = async (ctx: any, userId: any) => {
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
};

/** Award coins and XP for completing an exercise */
export const awardExerciseComplete = mutation({
  args: {
    userId: v.id("users"),
    exerciseName: v.string(),
    weightUsed: v.number(),
    hadRpe: v.boolean(),
  },
  handler: async (ctx, args) => {
    const profile = await ensureProfile(ctx, args.userId);

    let coinsEarned = REWARDS.EXERCISE_COMPLETE.coins;
    let xpEarned = REWARDS.EXERCISE_COMPLETE.xp;
    const newAchievements: string[] = [];

    // RPE bonus
    if (args.hadRpe) {
      coinsEarned += REWARDS.RPE_LOGGED.coins;
      xpEarned += REWARDS.RPE_LOGGED.xp;
    }

    // Check for personal record
    const previousLogs = await ctx.db
      .query("exerciseLogs")
      .withIndex("by_user_exercise", (q) =>
        q.eq("userId", args.userId).eq("exerciseName", args.exerciseName)
      )
      .collect();

    const previousMaxWeight = previousLogs.reduce(
      (max, log) => Math.max(max, log.weightUsed),
      0
    );

    let isPR = false;
    if (args.weightUsed > previousMaxWeight && args.weightUsed > 0 && previousLogs.length > 0) {
      coinsEarned += REWARDS.PERSONAL_RECORD.coins;
      xpEarned += REWARDS.PERSONAL_RECORD.xp;
      isPR = true;
    }

    const newPRCount = profile.personalRecords + (isPR ? 1 : 0);
    const newTotalExercises = profile.totalExercises + 1;
    const newCoins = profile.coins + coinsEarned;
    const newXp = profile.xp + xpEarned;
    const newLevel = levelForXp(newXp);

    await ctx.db.patch(profile._id, {
      coins: newCoins,
      xp: newXp,
      level: newLevel,
      totalExercises: newTotalExercises,
      personalRecords: newPRCount,
    });

    // Check achievements
    if (newTotalExercises === 1) {
      const exists = await ctx.db
        .query("achievements")
        .withIndex("by_user_achievement", (q) =>
          q.eq("userId", args.userId).eq("achievementId", "first_blood")
        )
        .first();
      if (!exists) {
        await ctx.db.insert("achievements", {
          userId: args.userId,
          achievementId: "first_blood",
          unlockedAt: Date.now(),
        });
        newAchievements.push("first_blood");
      }
    }

    if (newPRCount >= 5) {
      const exists = await ctx.db
        .query("achievements")
        .withIndex("by_user_achievement", (q) =>
          q.eq("userId", args.userId).eq("achievementId", "pr_machine")
        )
        .first();
      if (!exists) {
        await ctx.db.insert("achievements", {
          userId: args.userId,
          achievementId: "pr_machine",
          unlockedAt: Date.now(),
        });
        newAchievements.push("pr_machine");
      }
    }

    if (newCoins >= 1000) {
      const exists = await ctx.db
        .query("achievements")
        .withIndex("by_user_achievement", (q) =>
          q.eq("userId", args.userId).eq("achievementId", "coin_collector")
        )
        .first();
      if (!exists) {
        await ctx.db.insert("achievements", {
          userId: args.userId,
          achievementId: "coin_collector",
          unlockedAt: Date.now(),
        });
        newAchievements.push("coin_collector");
      }
    }

    if (newLevel >= 10) {
      const exists = await ctx.db
        .query("achievements")
        .withIndex("by_user_achievement", (q) =>
          q.eq("userId", args.userId).eq("achievementId", "level_10")
        )
        .first();
      if (!exists) {
        await ctx.db.insert("achievements", {
          userId: args.userId,
          achievementId: "level_10",
          unlockedAt: Date.now(),
        });
        newAchievements.push("level_10");
      }
    }

    const leveledUp = newLevel > profile.level;

    return {
      coinsEarned,
      xpEarned,
      isPR,
      leveledUp,
      newLevel,
      newAchievements,
      totalCoins: newCoins,
    };
  },
});

/** Award bonus for completing a full workout + update streak */
export const awardWorkoutComplete = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    weeklyVolume: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const profile = await ensureProfile(ctx, args.userId);

    let coinsEarned = REWARDS.WORKOUT_COMPLETE.coins;
    let xpEarned = REWARDS.WORKOUT_COMPLETE.xp;
    const newAchievements: string[] = [];

    // Streak logic
    const today = args.date;
    const lastActive = profile.lastActiveDate;
    let newStreak = profile.currentStreak;

    if (lastActive) {
      const lastDate = new Date(lastActive);
      const todayDate = new Date(today);
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays === 0) {
        // Same day, no change
      } else {
        newStreak = 1; // Reset streak
      }
    } else {
      newStreak = 1;
    }

    const newLongestStreak = Math.max(profile.longestStreak, newStreak);

    // Streak bonuses
    if (newStreak === 3 && profile.currentStreak < 3) {
      coinsEarned += REWARDS.STREAK_3.coins;
      xpEarned += REWARDS.STREAK_3.xp;
    }
    if (newStreak === 7 && profile.currentStreak < 7) {
      coinsEarned += REWARDS.STREAK_7.coins;
      xpEarned += REWARDS.STREAK_7.xp;
    }

    // First workout of the week check
    const todayDate = new Date(today);
    const dayOfWeek = todayDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() + mondayOffset);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    if (!lastActive || lastActive < weekStartStr) {
      coinsEarned += REWARDS.FIRST_WORKOUT_OF_WEEK.coins;
      xpEarned += REWARDS.FIRST_WORKOUT_OF_WEEK.xp;
    }

    const newTotalWorkouts = profile.totalWorkouts + 1;
    const newCoins = profile.coins + coinsEarned;
    const newXp = profile.xp + xpEarned;
    const newLevel = levelForXp(newXp);

    await ctx.db.patch(profile._id, {
      coins: newCoins,
      xp: newXp,
      level: newLevel,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      totalWorkouts: newTotalWorkouts,
      lastActiveDate: today,
    });

    // Achievement checks
    if (newTotalWorkouts === 1) {
      const exists = await ctx.db
        .query("achievements")
        .withIndex("by_user_achievement", (q) =>
          q.eq("userId", args.userId).eq("achievementId", "full_send")
        )
        .first();
      if (!exists) {
        await ctx.db.insert("achievements", {
          userId: args.userId,
          achievementId: "full_send",
          unlockedAt: Date.now(),
        });
        newAchievements.push("full_send");
      }
    }

    if (newStreak >= 7) {
      const exists = await ctx.db
        .query("achievements")
        .withIndex("by_user_achievement", (q) =>
          q.eq("userId", args.userId).eq("achievementId", "streak_master")
        )
        .first();
      if (!exists) {
        await ctx.db.insert("achievements", {
          userId: args.userId,
          achievementId: "streak_master",
          unlockedAt: Date.now(),
        });
        newAchievements.push("streak_master");
      }
    }

    if (newStreak >= 30) {
      const exists = await ctx.db
        .query("achievements")
        .withIndex("by_user_achievement", (q) =>
          q.eq("userId", args.userId).eq("achievementId", "consistency_king")
        )
        .first();
      if (!exists) {
        await ctx.db.insert("achievements", {
          userId: args.userId,
          achievementId: "consistency_king",
          unlockedAt: Date.now(),
        });
        newAchievements.push("consistency_king");
      }
    }

    if ((args.weeklyVolume ?? 0) >= 10000) {
      const exists = await ctx.db
        .query("achievements")
        .withIndex("by_user_achievement", (q) =>
          q.eq("userId", args.userId).eq("achievementId", "iron_century")
        )
        .first();
      if (!exists) {
        await ctx.db.insert("achievements", {
          userId: args.userId,
          achievementId: "iron_century",
          unlockedAt: Date.now(),
        });
        newAchievements.push("iron_century");
      }
    }

    const leveledUp = newLevel > profile.level;

    return {
      coinsEarned,
      xpEarned,
      leveledUp,
      newLevel,
      newStreak,
      newAchievements,
      totalCoins: newCoins,
      totalXp: newXp,
    };
  },
});
