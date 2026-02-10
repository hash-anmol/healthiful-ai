import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { api } from "./_generated/api";

const formatUserProfile = (u: any) => {
  const diet = u.dietType === 'vegetarian' ? 'Vegetarian (No eggs, dairy ok)' : u.dietType;
  const injuries = u.injuryFlags?.length > 0 ? `Injuries/Flags: ${u.injuryFlags.join(", ")}.` : "No major injuries.";
  const strength = u.strengthTest ? 
    `Strength: Push-ups: ${u.strengthTest.pushupsCount}, Bicep Curls: ${u.strengthTest.bicepCurlWeight}kg.` : 
    "Strength: Not tested.";
  
  return `
  USER IDENTITY:
  - Age: ${u.age}, Height: ${u.height} cm, Weight: ${u.weight} kg, Sex: ${u.sex}.
  - Diet: ${diet}.
  - Goal: ${u.primaryGoal} (${u.goalAggressiveness} aggressiveness).
  - Experience: ${u.trainingExperience}. Frequency: ${u.trainingFrequency}.
  - Equipment: ${u.equipmentAccess}.
  - Activity Level: ${u.dailyActivity}.
  - Recovery Capacity: ${u.recoveryCapacity}.
  - ${injuries}
  - ${strength}
  - Additional Objectives: ${u.additionalObjectives?.join(", ") || "None"}.
  `;
};

const formatFeedbacks = (items: Array<{ exerciseName: string; feedback: string }>) => {
  if (!items || items.length === 0) return "FEEDBACKS:\n- None.";
  const lines = items.map((item) => `- ${item.exerciseName}: ${item.feedback}`);
  return `FEEDBACKS (ADJUST EXERCISE SELECTION):\n${lines.join("\n")}`;
};

const USER_PROFILE_CACHE = new Map<string, { value: string; expiresAt: number }>();
const USER_PROFILE_TTL_MS = 5 * 60 * 1000;

const getCachedUserProfileString = async (ctx: any, userId: any) => {
  const cacheKey = String(userId);
  const cached = USER_PROFILE_CACHE.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const userData = await ctx.runQuery(api.users.getUser, { userId });
  if (!userData) throw new Error("User not found");
  const value = formatUserProfile(userData as any);
  USER_PROFILE_CACHE.set(cacheKey, { value, expiresAt: now + USER_PROFILE_TTL_MS });
  return value;
};

export const generateWorkout = action({
  args: {
    userId: v.id("users"),
    date: v.string(),
    feedback: v.optional(v.string()),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userProfileString = await getCachedUserProfileString(ctx, args.userId as any);

    const targetDate = new Date(args.date);
    const day = targetDate.getDay(); 
    const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(targetDate.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const mondayStr = monday.toISOString().split('T')[0];
    
    const weeklyWorkouts = await ctx.runQuery(api.workouts.getWorkoutsInRange, { 
      userId: args.userId, 
      startDate: mondayStr,
      endDate: args.date 
    });

    const feedbackItems = await ctx.runQuery(api.feedbacks.listByUser, {
      userId: args.userId,
    });
    const feedbacksSection = formatFeedbacks(feedbackItems as any);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      You are an expert AI health assistant, gym trainer, strength coach, posture specialist, diet planner, and long-term physiology tracker.
      
      Strive for: Applied physiology, Biomechanics, Posture science, Energy balance, Progressive overload, Recovery management.
      Rules: NO motivation, NO trends, NO generic advice. Think long-term.

      ${userProfileString}

      WARM-UP RULE (NON-NEGOTIABLE):
      - Warm-up must include posture-corrective exercises.
      - Must include at least 2 of the following:
        - Neck retraction / mobility
        - Thoracic extension or rotation
        - Scapular retraction or depression
        - Hip flexor or glute activation

      HISTORY USAGE RULE:
      - Use Weekly Context to avoid repeating the same main exercises already performed this week unless progression is intended.
      - Prefer movement-pattern variation over exact repetition.

      VOLUME BALANCE RULE:
      - Weekly push volume must not exceed pull volume.
      - On Push days, bias rear-delts, scapular stability, or light pulling in warm-up or accessories if needed.

      TRAINING SPLIT (PPL x 2): Mon: Push, Tue: Pull, Wed: Legs, Thu: Push, Fri: Pull, Sat: Legs, Sun: Rest/Active Recovery.
      SESSION DURATION: ${args.duration || 45} minutes (strict — the workout MUST fit within this window).

      TITLE FORMAT RULE (STRICT):
      - Must be EXACTLY: "<Split> — <Focus>"
      - <Split> must be one of: "Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B", "Recovery Day"
      - <Focus> should reflect the session focus, e.g. "Back & Biceps", "Chest & Shoulders", "Quad Emphasis"
      - NEVER include prefixes/suffixes such as "Jacked AI:", dates, parentheses, or slogans.
      - NEVER use generic titles like "45-Minute Muscle Building Workout".

      TIME ESTIMATION RULE (CRITICAL):
      - For each exercise, internally estimate the time it will take (sets × time-per-set including rest).
      - Warm-up: 5-7 minutes.
      - Typical main exercise: ~6-8 min (3 sets with 90s rest), ~8-10 min (4 sets with 90-120s rest).
      - Keep a running total. Stop adding exercises when the total reaches ${args.duration || 45} minutes.
      - Do NOT use a fixed exercise count. Let the time budget decide.

      Tempo: 3-1-1. Reps: Hypertrophy 6-15.

      Weekly Context (Workouts from ${mondayStr} to ${args.date}):
      ${weeklyWorkouts.map((w: any) => `- ${w.date}: ${w.title}`).join("\n")}

      USER SPECIFIC REGENERATION FEEDBACK: "${args.feedback || "None"}"

      ${feedbacksSection}

      FEEDBACKS USAGE RULE:
      - If an exercise is flagged in FEEDBACKS, avoid it or use a close alternative that respects the feedback.

      Create a structured workout for ${args.date}. Infer type from day.
      Return ONLY JSON:
      {
        "title": "Push A — Chest & Shoulders (example, use actual type)",
        "exercises": [{ "name": "...", "sets": 3, "reps": "8-12", "weight": "...", "notes": "...", "type": "warmup"|"main"|"abs", "tip": "...", "visualization_prompt": "..." }]
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = (await result.response).text();
      const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("AI Generation failed:", error);
      return null;
    }
  },
});

export const askExerciseQuestion = action({
  args: {
    userId: v.id("users"),
    exerciseName: v.string(),
    workoutTitle: v.string(),
    question: v.string(),
    exerciseNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userProfileString = await getCachedUserProfileString(ctx, args.userId as any);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      ${userProfileString}
      Context: Doing "${args.exerciseName}" in "${args.workoutTitle}".
      
      User Question: "${args.question}"

      If the user is asking why they cannot do this exercise or requesting a change, provide a professional physiological reason AND suggest a specific alternative exercise.
      Otherwise, answer their technical question concisely.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  },
});

export const suggestExerciseAlternative = action({
  args: {
    userId: v.id("users"),
    exerciseName: v.string(),
    reason: v.string(),
    workoutTitle: v.string(),
  },
  handler: async (ctx, args) => {
    const userProfileString = await getCachedUserProfileString(ctx, args.userId as any);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      The user cannot do "${args.exerciseName}" in their "${args.workoutTitle}" workout.
      Reason: "${args.reason}"
      ${userProfileString}

      Suggest ONE replacement exercise that targets the same muscle groups and respects their reason.
      Return ONLY a JSON object:
      {
        "name": "New Exercise Name",
        "sets": 3,
        "reps": "8-12",
        "weight": "Recommended load",
        "notes": "Form cues",
        "type": "warmup"|"main"|"abs",
        "tip": "Coach tip",
        "visualization_prompt": "..."
      }
    `;

    const result = await model.generateContent(prompt);
    const text = (await result.response).text();
    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonString);
  },
});

export const talkToCoach = action({
  args: {
    userId: v.id("users"),
    date: v.string(),
    userName: v.optional(v.string()),
    workoutTitle: v.optional(v.string()),
    workoutExercises: v.optional(
      v.array(
        v.object({
          name: v.string(),
          sets: v.optional(v.number()),
          reps: v.optional(v.string()),
          type: v.optional(v.string()),
        })
      )
    ),
    completedCount: v.optional(v.number()),
    totalCount: v.optional(v.number()),
    userMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userProfileString = await getCachedUserProfileString(ctx, args.userId as any);
    const feedbackItems = await ctx.runQuery(api.feedbacks.listByUser, {
      userId: args.userId,
    });
    const feedbacksSection = formatFeedbacks(feedbackItems as any);

    // Fetch gamification stats for the coach
    const gameProfile = await ctx.runQuery(api.gamification.getGameProfile, {
      userId: args.userId,
    });

    const gameSection = gameProfile
      ? `GAMIFICATION CONTEXT:
      - Level: ${gameProfile.level} (${gameProfile.title})
      - Coins: ${gameProfile.coins}
      - Current Streak: ${gameProfile.currentStreak} days (Best: ${gameProfile.longestStreak})
      - Lifetime Workouts: ${gameProfile.totalWorkouts}
      - Personal Records: ${gameProfile.personalRecords}
      - XP Progress: ${Math.round(gameProfile.xpInCurrentLevel)}/${gameProfile.xpToNextLevel} to next level`
      : "GAMIFICATION CONTEXT: New user, no game stats yet.";

    const workoutTitle = args.workoutTitle || "No workout scheduled";
    const exercises = args.workoutExercises || [];
    const exerciseLines = exercises.length
      ? exercises.map((ex) => {
          const sets = ex.sets ? `${ex.sets} sets` : "sets n/a";
          const reps = ex.reps ? `, reps ${ex.reps}` : "";
          const type = ex.type ? `, type ${ex.type}` : "";
          return `- ${ex.name} (${sets}${reps}${type})`;
        })
      : ["- None."];

    const completionSummary =
      typeof args.totalCount === "number"
        ? `Completed: ${args.completedCount ?? 0}/${args.totalCount}.`
        : "Completed: Unknown.";

    const userMessage = args.userMessage?.trim() || "";
    const userName = args.userName?.trim() || "";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      You are Jack AI, a supportive, agentic workout copilot.
      Tone: confident, clear, and motivating without hype. Short, punchy sentences.
      If a name is provided, use it once in the opening line.

      ${userProfileString}

      TODAY WORKOUT CONTEXT:
      - Date: ${args.date}
      - Title: ${workoutTitle}
      - ${completionSummary}
      - Exercises:
      ${exerciseLines.join("\n")}

      ${feedbacksSection}

      ${gameSection}

      COACHING RULES:
      - Use the workout context to give concrete guidance.
      - If FEEDBACKS mention an exercise, warn before suggesting it and offer alternatives.
      - Offer 1-2 crisp next actions when helpful.
      - Reference gamification naturally when relevant (streaks, levels, PRs, coins earned).
        Example: "You're on a 5-day streak, keep it alive today." or "Close to leveling up, let's make this count."
      - Don't force gamification into every message. Use it when it adds motivation.

      USER MESSAGE: "${userMessage || "(empty)"}"

      RESPONSE RULES:
      - If USER MESSAGE is empty, deliver a 2-4 sentence daily brief plus one short question. Optionally reference a streak or level milestone if close.
      - Otherwise answer the user directly with 2-6 sentences.
      - Do not use markdown or bullet points.
      - Keep it concise.

      NAME: "${userName}"
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  },
});

export const getExerciseImages = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.SERP_API_KEY;
    if (!apiKey) {
      console.warn("SERP_API_KEY not set");
      return [];
    }

    try {
      const refinedQuery = `${args.query} exercise biomechanics diagram anatomical form`;
      const response = await fetch(
        `https://serpapi.com/search.json?q=${encodeURIComponent(refinedQuery)}&engine=google_images&api_key=${apiKey}&safe=active`
      );
      const data = await response.json();
      return (data.images_results || []).slice(0, 6).map((img: any) => ({
        title: img.title,
        url: img.original,
        thumbnail: img.thumbnail
      }));
    } catch (error) {
      console.error("SerpApi fetch failed:", error);
      return [];
    }
  },
});

export const getExerciseDetails = action({
  args: {
    exerciseName: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      Provide a detailed analysis of the exercise: "${args.exerciseName}".
      Include:
      1. Why this exercise is effective.
      2. Muscle groups and areas it specifically affects.
      3. Primary benefits.
      4. Form tips.
      
      Return ONLY a JSON object:
      {
        "why": "...",
        "affectedAreas": ["...", "..."],
        "benefits": ["...", "..."],
        "formTips": ["...", "..."]
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = (await result.response).text();
      const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("AI Details Generation failed:", error);
      return null;
    }
  },
});
