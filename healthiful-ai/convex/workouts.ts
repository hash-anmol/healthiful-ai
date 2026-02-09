import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const saveWorkout = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    title: v.string(),
    exercises: v.array(
      v.object({
        name: v.string(),
        sets: v.number(),
        reps: v.string(),
        weight: v.optional(v.string()),
        notes: v.optional(v.string()),
        completed: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => 
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        title: args.title,
        exercises: args.exercises,
        status: "generated",
      });
    }

    return await ctx.db.insert("workouts", {
      userId: args.userId,
      date: args.date,
      title: args.title,
      exercises: args.exercises,
      status: "generated",
    });
  },
});

export const getWorkout = query({
  args: {
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => 
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();
    return workout;
  },
});

export const getRecentWorkouts = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
    return workouts;
  },
});

export const markExerciseComplete = mutation({
  args: {
    workoutId: v.id("workouts"),
    exerciseName: v.string(),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");

    const updatedExercises = workout.exercises.map((ex) => {
      if (ex.name === args.exerciseName) {
        return { ...ex, completed: args.completed };
      }
      return ex;
    });

    await ctx.db.patch(args.workoutId, { exercises: updatedExercises });

    // Also log this completion for analytics if completed is true
    if (args.completed) {
      await ctx.db.insert("exerciseLogs", {
        userId: workout.userId,
        workoutId: workout._id,
        exerciseName: args.exerciseName,
        date: workout.date,
        setsCompleted: 1, // Simplified for now
        weightUsed: 0, // Placeholder
        repsCompleted: 0, // Placeholder
      });
    }
  },
});
