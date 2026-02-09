import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").first();
  },
});

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const createProfile = mutation({
  args: {
    age: v.number(),
    height: v.number(),
    weight: v.number(),
    sex: v.string(),
    trainingExperience: v.string(),
    trainingFrequency: v.string(),
    equipmentAccess: v.string(),
    primaryGoal: v.string(),
    dietType: v.string(),
    dailyActivity: v.string(),
    injuryFlags: v.array(v.string()),
    goalAggressiveness: v.string(),
    timelineExpectation: v.string(),
    recoveryCapacity: v.string(),
    workoutRoutine: v.optional(v.string()),
    bodyType: v.optional(v.string()),
    strengthTest: v.optional(
      v.object({
        bicepCurlWeight: v.number(),
        pushupsCount: v.number(),
      })
    ),
    additionalObjectives: v.optional(v.array(v.string())),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    clerkId: v.optional(v.string()), // If using Clerk
  },
  handler: async (ctx, args) => {
    // Check if user already exists based on clerkId or email if provided
    let existingUserId;
    
    if (args.clerkId) {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
        .first();
      existingUserId = existingUser?._id;
    }

    if (existingUserId) {
      // Update existing profile
      return await ctx.db.patch(existingUserId, {
        ...args,
        additionalObjectives: args.additionalObjectives ?? [],
        bodyType: args.bodyType ?? "",
        workoutRoutine: args.workoutRoutine ?? "",
      });
    } else {
      // Create new profile
      return await ctx.db.insert("users", {
        ...args,
        additionalObjectives: args.additionalObjectives ?? [],
        bodyType: args.bodyType ?? "",
        workoutRoutine: args.workoutRoutine ?? "",
      } as any);
    }
  },
});
