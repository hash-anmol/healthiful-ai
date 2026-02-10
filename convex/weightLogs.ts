import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Log (or update) today's weight. Upserts by userId + date so
 * a user can correct today's entry without duplicating rows.
 */
export const logWeight = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    weight: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("weightLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        weight: args.weight,
        createdAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("weightLogs", {
      userId: args.userId,
      date: args.date,
      weight: args.weight,
      createdAt: Date.now(),
    });
  },
});

/**
 * Return the last N days of weight entries, sorted ascending by date.
 */
export const getWeightHistory = query({
  args: {
    userId: v.id("users"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.days ?? 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - limit);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const logs = await ctx.db
      .query("weightLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).gte("date", cutoffStr)
      )
      .collect();

    // Sort ascending by date
    logs.sort((a, b) => a.date.localeCompare(b.date));
    return logs;
  },
});

/**
 * Return the most recent weight log entry for the user.
 */
export const getLatestWeight = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("weightLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(1);

    return logs[0] ?? null;
  },
});
