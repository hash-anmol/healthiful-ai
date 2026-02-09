import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { api } from "./_generated/api";

export const generateWorkout = action({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Fetch user profile
    const userData = await ctx.runQuery(api.users.getUser, { userId: args.userId });
    if (!userData) throw new Error("User not found");
    const user = userData as any;

    // 2. Fetch recent workouts for context
    const recentWorkouts = await ctx.runQuery(api.workouts.getRecentWorkouts, { userId: args.userId, limit: 3 });

    // 3. Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in Convex environment variables.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = "gemini-3-flash-preview";
    console.log(`Initializing Gemini with model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });

    // 4. Construct Prompt
    const prompt = `
      You are an expert fitness coach. Create a workout plan for a user with the following profile:
      - Age: ${user.age}
      - Sex: ${user.sex}
      - Training Experience: ${user.trainingExperience}
      - Training Frequency: ${user.trainingFrequency}
      - Equipment Access: ${user.equipmentAccess}
      - Primary Goal: ${user.primaryGoal}
      - Diet Type: ${user.dietType}
      - Daily Activity: ${user.dailyActivity}
      - Injury Flags: ${user.injuryFlags.join(", ")}
      - Goal Aggressiveness: ${user.goalAggressiveness}
      - Timeline Expectation: ${user.timelineExpectation}
      - Recovery Capacity: ${user.recoveryCapacity}
      - Body Type: ${user.bodyType || "Not specified"}
      - Workout Routine: ${user.workoutRoutine || "Not specified"}
      - Strength Test: ${user.strengthTest ? `Bicep Curl ${user.strengthTest.bicepCurlWeight}kg, Pushups ${user.strengthTest.pushupsCount}` : "Not specified"}
      - Additional Objectives: ${user.additionalObjectives ? user.additionalObjectives.join(", ") : "None"}

      Recent Activity:
      ${recentWorkouts.map((workout) => `- ${workout.date}: ${workout.title} (${workout.status})`).join("\n")}

      Create a structured workout for ${args.date}.
      Focus on progressive overload and accounting for their recovery.
      
      Return ONLY a JSON object with this structure:
      {
        "title": "Workout Title (e.g. Upper Body Power)",
        "exercises": [
          {
            "name": "Exercise Name",
            "sets": 3,
            "reps": "8-12",
            "weight": "Recommended weight or RPE",
            "notes": "Form cues or specific instructions"
          }
        ]
      }
    `;

    try {
      // 5. Generate
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean up potential markdown code blocks
      const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      const plan = JSON.parse(jsonString);
      return plan;
    } catch (error) {
      console.error("AI Generation failed, using fallback:", error);
      // Fallback plan if AI fails or key is invalid
      return {
        title: "Full Body Foundation (Fallback)",
        exercises: [
          {
            name: "Goblet Squats",
            sets: 3,
            reps: "12",
            weight: "Moderate",
            notes: "Keep chest up, drive through heels."
          },
          {
            name: "Push-Ups",
            sets: 3,
            reps: "AMRAP",
            weight: "Bodyweight",
            notes: "Maintain a straight line from head to heels."
          },
          {
            name: "Dumbbell Rows",
            sets: 3,
            reps: "10 per side",
            weight: "10-15kg",
            notes: "Pull elbow to hip, squeeze shoulder blade."
          },
          {
            name: "Plank",
            sets: 3,
            reps: "45 sec",
            weight: "Bodyweight",
            notes: "Engage core, don't let hips sag."
          }
        ]
      };
    }
  },
});
