import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { api } from "./_generated/api";

export const generateWorkout = action({
  args: {
    userId: v.id("users"),
    date: v.string(),
    feedback: v.optional(v.string()),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userData = await ctx.runQuery(api.users.getUser, { userId: args.userId });
    if (!userData) throw new Error("User not found");
    const user = userData as any;

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      You are an expert AI health assistant, gym trainer, strength coach, posture specialist, diet planner, and long-term physiology tracker.
      
      Strive for: Applied physiology, Biomechanics, Posture science, Energy balance, Progressive overload, Recovery management.
      Rules: NO motivation, NO trends, NO generic advice. Think long-term.

      STATIC USER IDENTITY:
      - Age: 19, Height: 180 cm, Weight: 59 kg (Ectomorph), Diet: Strict vegetarian.
      - Lifestyle: Mostly sedentary. Gym: 6 days/week PPL.
      - Strength: Push-ups (20-30 clean), DB Press (7.5kg-10kg), Incline DB (10kg).

      TRAINING SPLIT (PPL x 2): Mon: Push, Tue: Pull, Wed: Legs, Thu: Push, Fri: Pull, Sat: Legs, Sun: Rest.
      SESSION DURATION: ${args.duration || 45} minutes.
      Adjust the number of exercises and sets to fit strictly within ${args.duration || 45} minutes, including a 5-7m warm-up.
      - 20-30 min: 3-4 exercises total.
      - 45 min: 5-6 exercises total.
      - 60 min: 7-8 exercises total.
      
      Tempo: 3-1-1. Reps: Hypertrophy 6-15.

      Weekly Context (Workouts from ${mondayStr} to ${args.date}):
      ${weeklyWorkouts.map((w: any) => `- ${w.date}: ${w.title}`).join("\n")}

      USER SPECIFIC REGENERATION FEEDBACK: "${args.feedback || "None"}"

      Create a structured workout for ${args.date}. Infer type from day.
      Return ONLY JSON:
      {
        "title": "Workout Title",
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
    const userData = await ctx.runQuery(api.users.getUser, { userId: args.userId });
    if (!userData) throw new Error("User not found");
    const user = userData as any;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      User Profile: 19yo, 180cm, 59kg, Vegetarian, Intermediate, PPL Split.
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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      The user cannot do "${args.exerciseName}" in their "${args.workoutTitle}" workout.
      Reason: "${args.reason}"
      User Profile: 19yo, 180cm, 59kg, Vegetarian, Intermediate.

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
