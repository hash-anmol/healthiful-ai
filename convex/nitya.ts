import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// The Nitya sadhana app owns its state shape; the server only stores it.
// Cap the payload so a bug in the client cannot fill the table.
const MAX_STATE_CHARS = 500_000;

export const getState = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("nityaSadhana")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const saveState = mutation({
  args: { userId: v.id("users"), state: v.string(), updatedAt: v.number() },
  handler: async (ctx, args) => {
    if (args.state.length > MAX_STATE_CHARS) {
      throw new Error("Sadhana state is too large");
    }
    const existing = await ctx.db
      .query("nityaSadhana")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) {
      // Never let an older device overwrite newer progress
      if (existing.updatedAt > args.updatedAt) return existing.updatedAt;
      await ctx.db.patch(existing._id, { state: args.state, updatedAt: args.updatedAt });
    } else {
      await ctx.db.insert("nityaSadhana", args);
    }
    return args.updatedAt;
  },
});
