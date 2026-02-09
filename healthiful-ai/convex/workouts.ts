import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const parseWeight = (weight?: string) => {
  if (!weight) return 0;
  const match = weight.match(/([0-9]+(\.[0-9]+)?)/);
  if (!match) return 0;
  return Number(match[1]);
};

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
        type: v.optional(v.string()),
        tip: v.optional(v.string()),
        visualization_prompt: v.optional(v.string()),
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
    userId: v.id("users"),
    workoutId: v.id("workouts"),
    exerciseName: v.string(),
    completed: v.boolean(),
    date: v.string(),
    setsCompleted: v.optional(v.number()),
    repsCompleted: v.optional(v.number()),
    weightUsed: v.optional(v.number()),
    rpe: v.optional(v.number()),
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

    if (args.completed) {
      const workoutExercise = workout.exercises.find((ex) => ex.name === args.exerciseName);
      const defaultReps = Number(String((workoutExercise?.reps || "0")).split("-")[0]) || 0;
      const setsCompleted = args.setsCompleted ?? workoutExercise?.sets ?? 0;
      const repsCompleted = args.repsCompleted ?? defaultReps;
      const weightUsed = args.weightUsed ?? parseWeight(workoutExercise?.weight);

      if (setsCompleted > 0 && repsCompleted > 0) {
        await ctx.db.insert("exerciseLogs", {
          userId: args.userId,
          workoutId: args.workoutId,
          exerciseName: args.exerciseName,
          date: args.date,
          setsCompleted,
          repsCompleted,
          weightUsed,
          rpe: args.rpe,
        });
      }
    }
  },
});

export const replaceExercise = mutation({
  args: {
    workoutId: v.id("workouts"),
    oldExerciseName: v.string(),
    newExercise: v.object({
      name: v.string(),
      sets: v.number(),
      reps: v.string(),
      weight: v.optional(v.string()),
      notes: v.optional(v.string()),
      completed: v.boolean(),
      type: v.optional(v.string()),
      tip: v.optional(v.string()),
      visualization_prompt: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");

    const updatedExercises = workout.exercises.map((ex) => {
      if (ex.name === args.oldExerciseName) {
        return args.newExercise;
      }
      return ex;
    });

    await ctx.db.patch(args.workoutId, { exercises: updatedExercises });
  },
});

export const getWorkoutsInRange = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId)
          .gte("date", args.startDate)
          .lte("date", args.endDate)
      )
      .collect();
    return workouts;
  },
});
