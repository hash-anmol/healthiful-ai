import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  authUsers: defineTable({
    email: v.string(),
    passwordDigest: v.string(),
    createdAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
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
    medicalConditions: v.optional(v.string()),
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
    clerkId: v.optional(v.string()), // If using Clerk
    authUserId: v.optional(v.id("authUsers")),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_auth_user_id", ["authUserId"]),

  workouts: defineTable({
    userId: v.id("users"),
    date: v.string(), // ISO date string YYYY-MM-DD
    title: v.string(),
    exercises: v.array(
      v.object({
        name: v.string(),
        sets: v.number(),
        reps: v.string(), // e.g., "8-12"
        weight: v.optional(v.string()), // specific weight or "RPE 8"
        notes: v.optional(v.string()),
        completed: v.boolean(),
        type: v.optional(v.string()),
        tip: v.optional(v.string()),
        visualization_prompt: v.optional(v.string()),
      })
    ),
    status: v.string(), // 'generated', 'completed'
  }).index("by_user_date", ["userId", "date"]),

  feedbacks: defineTable({
    userId: v.id("users"),
    exerciseName: v.string(),
    feedback: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created_at", ["userId", "createdAt"]),

  exerciseLogs: defineTable({
    userId: v.id("users"),
    workoutId: v.id("workouts"),
    exerciseName: v.string(),
    date: v.string(),
    setsCompleted: v.number(),
    weightUsed: v.number(),
    repsCompleted: v.number(),
    rpe: v.optional(v.number()),
  })
    .index("by_user_exercise", ["userId", "exerciseName"])
    .index("by_user_date", ["userId", "date"])
    .index("by_workout_exercise", ["workoutId", "exerciseName"]),

  gameProfiles: defineTable({
    userId: v.id("users"),
    coins: v.number(),
    xp: v.number(),
    level: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    totalWorkouts: v.number(),
    totalExercises: v.number(),
    personalRecords: v.number(),
    lastActiveDate: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  achievements: defineTable({
    userId: v.id("users"),
    achievementId: v.string(),
    unlockedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_achievement", ["userId", "achievementId"]),

  weightLogs: defineTable({
    userId: v.id("users"),
    date: v.string(),
    weight: v.number(),
    createdAt: v.number(),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_user", ["userId"]),
});
