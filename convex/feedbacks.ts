import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("feedbacks")
      .withIndex("by_user_created_at", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const addFeedback = mutation({
  args: {
    userId: v.id("users"),
    exerciseName: v.string(),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmedExercise = args.exerciseName.trim();
    const trimmedFeedback = args.feedback.trim();
    if (!trimmedExercise || !trimmedFeedback) {
      throw new Error("Exercise name and feedback are required");
    }

    return await ctx.db.insert("feedbacks", {
      userId: args.userId,
      exerciseName: trimmedExercise,
      feedback: trimmedFeedback,
      createdAt: Date.now(),
    });
  },
});

export const deleteFeedback = mutation({
  args: {
    feedbackId: v.id("feedbacks"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.feedbackId);
  },
});
