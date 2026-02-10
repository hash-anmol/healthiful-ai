"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseCard } from "@/components/dashboard/ExerciseCard";
import { CoinCounter, XpBar, StreakBadge } from "@/components/dashboard/CoinAnimation";
import { WorkoutCompleteModal } from "@/components/dashboard/WorkoutCompleteModal";
import { AchievementToast } from "@/components/dashboard/AchievementToast";
import { RefreshCcw, Send, Coins, Sparkles, X, ChevronDown, Check, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthProvider';
import { streamAiText } from '@/lib/streamAiText';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AI_CARD_BG_URL = "/motivation-bg.png";
const TITLE_PATTERN = /^(Push|Pull|Legs)\s+(A|B)\s+[—-]\s+.+$/i;

function getWorkoutSplitLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  switch (weekday) {
    case 1:
      return "Push A";
    case 2:
      return "Pull A";
    case 3:
      return "Legs A";
    case 4:
      return "Push B";
    case 5:
      return "Pull B";
    case 6:
      return "Legs B";
    default:
      return "Recovery Day";
  }
}

function getFocusFromExercises(exercises: any[]): string {
  const firstMain = exercises.find((ex) => ex?.type === "main") || exercises[0];
  if (!firstMain?.name) return "Strength";
  const clean = String(firstMain.name)
    .replace(/\(.*?\)/g, "")
    .replace(/[:\-–—].*$/g, "")
    .trim();
  const focusWords = clean.split(/\s+/).slice(0, 3).join(" ");
  return focusWords || "Strength";
}

function normalizeWorkoutTitle(rawTitle: string | undefined, dateStr: string, exercises: any[]): string {
  const split = getWorkoutSplitLabel(dateStr);
  const title = rawTitle?.trim() || "";
  if (TITLE_PATTERN.test(title)) {
    return title.replace(/\s*[-–—]\s*/, " — ");
  }
  if (split === "Recovery Day") {
    return "Recovery Day — Mobility Focus";
  }
  return `${split} — ${getFocusFromExercises(exercises)} Focus`;
}

function sanitizeExerciseForDb(exercise: any) {
  return {
    name: String(exercise?.name || "Exercise"),
    sets: Number(exercise?.sets) || 3,
    reps: String(exercise?.reps || "8-12"),
    weight: exercise?.weight ? String(exercise.weight) : undefined,
    notes: exercise?.notes ? String(exercise.notes) : undefined,
    type: exercise?.type ? String(exercise.type) : undefined,
    tip: exercise?.tip ? String(exercise.tip) : undefined,
    visualization_prompt: exercise?.visualization_prompt ? String(exercise.visualization_prompt) : undefined,
    completed: false,
  };
}

function extractCompleteJsonObjects(input: string): { objects: string[]; rest: string } {
  const objects: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;
  let lastConsumed = 0;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}") {
      if (depth > 0) depth -= 1;
      if (depth === 0 && start !== -1) {
        objects.push(input.slice(start, i + 1));
        lastConsumed = i + 1;
        start = -1;
      }
    }
  }

  return { objects, rest: input.slice(lastConsumed) };
}

export default function DashboardPage() {
  const { authUser } = useAuth();
  const user = useQuery(
    api.users.getMe,
    authUser?._id ? { authUserId: authUser._id } : "skip"
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [duration, setDuration] = useState(45);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const workout = useQuery(api.workouts.getWorkout, user ? { userId: user._id, date: dateStr } : "skip");
  const generateWorkoutAction = useAction(api.actions.generateWorkout);
  const saveWorkout = useMutation(api.workouts.saveWorkout);
  const toggleComplete = useMutation(api.workouts.markExerciseComplete);
  const feedbackItems = useQuery(api.feedbacks.listByUser, user ? { userId: user._id } : "skip");

  // Gamification hooks
  const gameProfile = useQuery(api.gamification.getGameProfile, user ? { userId: user._id } : "skip");
  const awardExerciseComplete = useMutation(api.gamification.awardExerciseComplete);
  const awardWorkoutComplete = useMutation(api.gamification.awardWorkoutComplete);

  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [generationPreview, setGenerationPreview] = useState<any | null>(null);
  const [coachInput, setCoachInput] = useState("");
  const [coachMessages, setCoachMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [coachLoading, setCoachLoading] = useState(false);
  const [showCoachPopover, setShowCoachPopover] = useState(false);
  const [dailyMotivation, setDailyMotivation] = useState("");
  const [motivationLoading, setMotivationLoading] = useState(false);
  const [motivationLoaded, setMotivationLoaded] = useState<string | null>(null);
  const coachScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll coach chat to bottom
  useEffect(() => {
    if (coachScrollRef.current) {
      coachScrollRef.current.scrollTop = coachScrollRef.current.scrollHeight;
    }
  }, [coachMessages, coachLoading]);

  // Gamification state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionStats, setCompletionStats] = useState<any>(null);
  const [pendingAchievements, setPendingAchievements] = useState<string[]>([]);
  const [sessionCoins, setSessionCoins] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);

  const handleGenerate = async () => {
    if (!user) return;
    setIsGenerating(true);
    setGenerationPreview({ title: "Generating...", exercises: [] });

    try {
      const feedbackBlock = (feedbackItems || [])
        .slice(0, 10)
        .map((item) => `${item.exerciseName}: ${item.feedback}`)
        .join("\n");

      const dayOfWeek = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
      const streamPrompt = `
You are Jacked AI — an expert workout planner with deep knowledge of exercise science, progressive overload, and time management.

SESSION CONTEXT:
- Date: ${dateStr} (${dayOfWeek})
- Duration: ${duration} minutes (strict — the workout MUST fit within this window)
- User: Age ${user.age}, Height ${user.height}cm, Weight ${user.weight}kg, Sex ${user.sex}
- Goal: ${user.primaryGoal}, Experience: ${user.trainingExperience}
- Frequency: ${user.trainingFrequency}, Equipment: ${user.equipmentAccess}
- Injuries: ${user.injuryFlags.join(", ") || "None"}
- Recovery: ${user.recoveryCapacity}

TRAINING SPLIT (PPL x 2): Mon: Push, Tue: Pull, Wed: Legs, Thu: Push, Fri: Pull, Sat: Legs, Sun: Rest/Active Recovery.
Infer the workout type from the day of the week above.

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
- Keep a running total. Stop adding exercises when the total reaches ${duration} minutes.
- Do NOT use a fixed exercise count. Let the time budget decide.

User feedback for regeneration: ${feedback.trim() || "None"}
Historical exercise feedbacks:
${feedbackBlock || "None"}
If an exercise is flagged in feedbacks, avoid it or use a close alternative.

Output STRICTLY as newline-delimited JSON objects (NDJSON), one object per line:
0) Emit the title line IMMEDIATELY first (do not wait for all exercises)
1) {"type":"title","title":"..."}
2) For each exercise: {"type":"exercise","exercise":{"name":"...","sets":3,"reps":"8-12","weight":"...","notes":"...","type":"warmup|main|abs","tip":"...","estMinutes":6,"visualization_prompt":"..."}}
3) Final line: {"type":"done"}
No markdown. No extra text. No explanation.
      `.trim();

      let buffer = "";
      const streamedPlan: { title: string; exercises: any[] } = { title: "Today's Workout", exercises: [] };

      await streamAiText({
        messages: [{ role: "user", content: streamPrompt }],
        model: "google/gemini-3-flash-preview",
        temperature: 0.4,
        onChunk: (chunk) => {
          buffer += chunk;
          const extraction = extractCompleteJsonObjects(buffer);
          buffer = extraction.rest;

          for (const jsonChunk of extraction.objects) {
            try {
              const parsed = JSON.parse(jsonChunk);
              if (parsed.type === "title" && typeof parsed.title === "string") {
                streamedPlan.title = parsed.title;
              } else if (parsed.type === "exercise" && parsed.exercise) {
                streamedPlan.exercises.push(parsed.exercise);
              }
              setGenerationPreview({
                title: normalizeWorkoutTitle(streamedPlan.title, dateStr, streamedPlan.exercises),
                exercises: [...streamedPlan.exercises],
              });
            } catch {
              // Ignore malformed partial objects and keep streaming.
            }
          }
        },
      });

      const tailExtraction = extractCompleteJsonObjects(buffer);
      for (const jsonChunk of tailExtraction.objects) {
        try {
          const parsed = JSON.parse(jsonChunk);
          if (parsed.type === "title" && typeof parsed.title === "string") {
            streamedPlan.title = parsed.title;
          } else if (parsed.type === "exercise" && parsed.exercise) {
            streamedPlan.exercises.push(parsed.exercise);
          }
        } catch {
          // Ignore malformed final objects.
        }
      }

      if (!streamedPlan.exercises.length) {
        // Fallback to existing non-stream generation for resiliency.
        const fallbackPlan = await generateWorkoutAction({
          userId: user._id,
          date: dateStr,
          feedback: feedback.trim() || undefined,
          duration,
        });
        if (!fallbackPlan) throw new Error("No streamed or fallback plan generated");
        streamedPlan.title = fallbackPlan.title;
        streamedPlan.exercises = fallbackPlan.exercises;
      }

      await saveWorkout({
        userId: user._id,
        date: dateStr,
        title: normalizeWorkoutTitle(streamedPlan.title, dateStr, streamedPlan.exercises),
        exercises: streamedPlan.exercises.map((ex: any) => sanitizeExerciseForDb(ex)),
      });

      setFeedback("");
      setShowFeedbackInput(false);
      setSessionCoins(0);
      setSessionXp(0);
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setGenerationPreview(null);
      setIsGenerating(false);
    }
  };

  const checkWorkoutComplete = useCallback(async (exerciseName: string) => {
    if (!workout || !user?._id) return;

    const willBeAllCompleted = workout.exercises.every(ex =>
      ex.name === exerciseName ? true : ex.completed
    );

    if (willBeAllCompleted) {
      try {
        const result = await awardWorkoutComplete({
          userId: user._id,
          date: dateStr,
        });
        setSessionCoins((prev) => prev + result.coinsEarned);
        setSessionXp((prev) => prev + result.xpEarned);
        setCompletionStats({
          exerciseCount: workout.exercises.length,
          totalCoins: sessionCoins + result.coinsEarned,
          totalXp: sessionXp + result.xpEarned,
          leveledUp: result.leveledUp,
          newLevel: result.newLevel,
          newStreak: result.newStreak,
          newAchievements: result.newAchievements,
          workoutTitle: workout.title,
        });

        if (result.newAchievements.length > 0) {
          setPendingAchievements((prev) => [...prev, ...result.newAchievements]);
        }

        // Small delay to let exercise completion animate, then show modal
        setTimeout(() => setShowCompleteModal(true), 600);
      } catch (err) {
        console.error("Workout complete reward failed:", err);
      }
    }
  }, [workout, user?._id, dateStr, awardWorkoutComplete, sessionCoins, sessionXp]);

  const handleToggle = async (exerciseName: string, completed: boolean) => {
    if (!workout) return;
    if (!user?._id) return;
    const allDone = workout.exercises.length > 0 && workout.exercises.every((exercise) => exercise.completed);
    if (!completed && allDone) {
      return;
    }

    await toggleComplete({
      userId: user._id,
      workoutId: workout._id,
      exerciseName,
      completed,
      date: workout.date,
    });
  };

  const handleLogAndToggle = async (exerciseName: string, payload: {
    setsCompleted: number;
    repsCompleted: number;
    weightUsed: number;
    rpe?: number;
  }) => {
    if (!workout || !user?._id) return;

    await toggleComplete({
      userId: user._id,
      workoutId: workout._id,
      exerciseName,
      completed: true,
      date: workout.date,
      setsCompleted: payload.setsCompleted,
      repsCompleted: payload.repsCompleted,
      weightUsed: payload.weightUsed,
      rpe: payload.rpe,
    });

    // Award coins for exercise completion
    try {
      const result = await awardExerciseComplete({
        userId: user._id,
        exerciseName,
        weightUsed: payload.weightUsed,
        hadRpe: payload.rpe !== undefined,
      });
      setSessionCoins((prev) => prev + result.coinsEarned);
      setSessionXp((prev) => prev + result.xpEarned);

      if (result.newAchievements.length > 0) {
        setPendingAchievements((prev) => [...prev, ...result.newAchievements]);
      }
    } catch (err) {
      console.error("Exercise reward failed:", err);
    }

    // Check if workout is now fully complete
    checkWorkoutComplete(exerciseName);
  };

  const handleCoinsEarned = useCallback((amount: number) => {
    // visual feedback handled by CoinCounter
  }, []);

  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const workoutExercises = workout?.exercises?.map((ex) => ({
    name: ex.name,
    sets: ex.sets,
    reps: ex.reps,
    type: ex.type,
  }));
  const completedCount = workout?.exercises?.filter((ex) => ex.completed).length || 0;
  const totalCount = workout?.exercises?.length || 0;

  const sendCoachMessage = async (message: string) => {
    const text = message.trim();
    if (!text) return;

    setShowCoachPopover(true);
    setCoachLoading(true);
    const newMessages = [...coachMessages, { role: 'user' as const, content: text }];
    setCoachMessages([...newMessages, { role: 'assistant' as const, content: '' }]);
    setCoachInput('');

    const contextPrompt = `
You are Jacked AI, an elite personal trainer and workout assistant. 
Provide expert, technical, and actionable guidance on exercise form, structure, and recovery.

CURRENT CONTEXT:
- Date: ${dateStr}
- Workout: ${workout?.title || "No workout yet"}
- Progress: ${completedCount}/${totalCount} completed.
- Exercises:
${(workoutExercises || []).map((ex) => `- ${ex.name} (${ex.sets} sets, ${ex.reps}${ex.type ? `, ${ex.type}` : ''})`).join("\n") || "- None"}

USER PROFILE:
- Name: ${user?.name || "Athlete"}
- Goal: ${user?.primaryGoal}
- Experience: ${user?.trainingExperience}
- Injuries: ${user?.injuryFlags?.join(", ") || "None"}

INSTRUCTIONS:
1. BE DIRECT. No opening pleasantries (e.g., "What's up", "Crushing it", "Great work").
2. NO FLUFF. Eliminate unnecessary conversational filler or encouraging slogans.
3. Focus purely on technical breakdown, cues, and answering the user's specific question.
4. When explaining "how to", use concise bullet points for steps and cues.
5. If the user asks about an exercise not in the routine, give specific form tips for that exercise immediately, then briefly state it's not in today's plan.
6. Use markdown (bolding, lists) for clarity.
7. End the message immediately after providing the answer. No closing remarks.
    `.trim();

    try {
      // Prepare history: system prompt + all previous messages (excluding the empty one we just added)
      const chatHistory = [
        { role: "system" as const, content: contextPrompt },
        ...newMessages.map(m => ({ role: m.role, content: m.content }))
      ];

      await streamAiText({
        messages: chatHistory,
        model: "google/gemini-flash-lite-latest",
        temperature: 0.4,
        onChunk: (chunk) => {
          setCoachMessages((prev) => {
            if (!prev.length) return prev;
            const next = [...prev];
            const lastIndex = next.length - 1;
            if (next[lastIndex].role === 'assistant') {
              next[lastIndex] = {
                ...next[lastIndex],
                content: `${next[lastIndex].content}${chunk}`,
              };
            }
            return next;
          });
        },
      });
    } catch (error) {
      console.error("Coach streaming failed:", error);
      setCoachMessages((prev) => {
        if (!prev.length) return prev;
        const next = [...prev];
        const lastIndex = next.length - 1;
        if (next[lastIndex].role === 'assistant' && !next[lastIndex].content.trim()) {
          next[lastIndex] = {
            ...next[lastIndex],
            content: "Jacked AI is unavailable right now. Try again in a moment.",
          };
        }
        return next;
      });
    } finally {
      setCoachLoading(false);
    }
  };

  useEffect(() => {
    const handler = () => setShowCoachPopover((prev) => !prev);
    window.addEventListener("jacked-ai-toggle", handler as EventListener);
    return () => window.removeEventListener("jacked-ai-toggle", handler as EventListener);
  }, []);

  // Reset session stats when workout changes
  useEffect(() => {
    setSessionCoins(0);
    setSessionXp(0);
  }, [workout?._id]);

  // Clear motivation when workout changes to prevent stale text
  useEffect(() => {
    setDailyMotivation("");
    setMotivationLoaded(null);
  }, [workout?._id]);

  // Daily motivation - fires once per workout
  useEffect(() => {
    const key = workout?._id ? String(workout._id) : null;
    if (!key || !user?.name || motivationLoaded === key) return;
    setMotivationLoaded(key);
    setDailyMotivation("");
    setMotivationLoading(true);
    const streak = gameProfile?.currentStreak ?? 0;
    const prompt = `Give 1-2 powerful, personalized, and concise sentences of daily motivation for ${user.name}. Today's workout: "${workout?.title}". Streak: ${streak} days. Completed: ${completedCount}/${totalCount}. Be confident, no emoji, no bullet points.`;
    streamAiText({
      messages: [{ role: "user", content: prompt }],
      model: "google/gemini-flash-lite-latest",
      temperature: 0.7,
      onChunk: (chunk) => setDailyMotivation((prev) => prev + chunk),
    })
      .catch(() => setDailyMotivation("Let's make today count."))
      .finally(() => setMotivationLoading(false));
  }, [workout?._id, user?.name, motivationLoaded]);

  // Query week workout statuses for calendar completion indicators
  const weekStartStr = format(start, 'yyyy-MM-dd');
  const weekEndStr = format(addDays(start, 6), 'yyyy-MM-dd');
  const weekWorkouts = useQuery(
    api.workouts.getWorkoutsInRange,
    user ? { userId: user._id, startDate: weekStartStr, endDate: weekEndStr } : "skip"
  );
  const completedDates = new Set(
    (weekWorkouts ?? [])
      .filter((w: any) => w.exercises?.length > 0 && w.exercises.every((ex: any) => ex.completed))
      .map((w: any) => w.date)
  );

  return (
    <div className="bg-[#F8FAFC] text-[#1E293B] font-sans antialiased min-h-screen pb-24 relative overflow-x-hidden">
      {/* Achievement Toast */}
      <AchievementToast
        achievementIds={pendingAchievements}
        onDismiss={() => setPendingAchievements([])}
      />

      <header className="sticky top-0 z-30 pt-6 pb-3 px-6 bg-[#F8FAFC]/80 backdrop-blur-xl border-b border-slate-100">
        {/* Top row: greeting + gamification stats */}
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="text-slate-500 text-sm font-medium">
              Hello, {user ? user.name : <Skeleton className="h-3 w-16 inline-block" />}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Ready to Workout</h1>
          </div>
          <div className="flex items-center gap-3">
            <StreakBadge streak={gameProfile?.currentStreak ?? 0} />
            <CoinCounter coins={gameProfile?.coins ?? 0} />
          </div>
        </div>

        {/* XP bar */}
        {gameProfile && (
          <XpBar
            xpInCurrentLevel={gameProfile.xpInCurrentLevel}
            xpToNextLevel={gameProfile.xpToNextLevel}
            level={gameProfile.level}
            className="mb-3"
          />
        )}

        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-6xl font-extrabold text-[#FF6B00] leading-none tracking-tighter">
              {duration}
            </span>
            <span className="text-xl font-semibold text-slate-400 ml-1">Min</span>
            <div className="text-lg font-bold mt-1 text-slate-900">
              {workout === undefined ? (
                <Skeleton className="h-5 w-40 inline-block" />
              ) : workout ? normalizeWorkoutTitle(workout.title, dateStr, workout.exercises) : "No Plan Selected"}
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowDurationPicker(!showDurationPicker)}
              className={cn(
                "p-3 rounded-2xl bg-white shadow-sm border transition-all",
                showDurationPicker ? "border-[#FF6B00] bg-orange-50" : "border-slate-100"
              )}
            >
              <span className={cn(
                "material-icons-round transition-colors",
                showDurationPicker ? "text-[#FF6B00]" : "text-slate-400"
              )}>tune</span>
            </button>

            <AnimatePresence>
              {showDurationPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 min-w-[120px]"
                >
                  {[20, 30, 45, 50, 60].map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setDuration(d);
                        setShowDurationPicker(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2 text-left rounded-xl text-sm font-bold transition-colors",
                        duration === d
                          ? "bg-orange-50 text-[#FF6B00]"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {d} Minutes
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-6 pt-4">

        {/* Horizontal Calendar */}
        <div className="flex space-x-3 overflow-x-auto hide-scrollbar py-2">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const dayStr = format(day, 'yyyy-MM-dd');
            const isDayCompleted = completedDates.has(dayStr);
            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={`relative flex flex-col items-center justify-center min-w-[70px] h-[90px] rounded-3xl transition-all ${isSelected
                  ? "bg-[#FF6B00] text-white shadow-[0_4px_20px_-2px_rgba(255,107,0,0.3)] transform scale-105"
                  : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50"
                  }`}
              >
                <span className={`text-xs font-medium ${isSelected ? "opacity-80" : ""}`}>
                  {format(day, 'EEE')}
                </span>
                <span className={`text-2xl font-bold mt-1 ${isSelected ? "" : "text-xl"}`}>
                  {format(day, 'd')}
                </span>
                {isDayCompleted && (
                  <div className={cn(
                    "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                    isSelected ? "bg-white" : "bg-green-500"
                  )}>
                    <Check size={11} className={isSelected ? "text-[#FF6B00]" : "text-white"} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>


        {/* Daily Motivation Card */}
        {(dailyMotivation || motivationLoading) && (
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 shadow-[0_14px_40px_-22px_rgba(15,23,42,0.45)] min-h-[110px]">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('${AI_CARD_BG_URL}')`,
                filter: "blur(14px) saturate(1.2) brightness(0.35)",
                transform: "scale(1.08)",
              }}
            />
            <div
              className="absolute inset-0 bg-cover bg-center opacity-45"
              style={{ backgroundImage: `url('${AI_CARD_BG_URL}')` }}
            />
            <div className="absolute inset-0 bg-slate-900/60" />

            {/* Badge */}
            <div className="absolute top-4 left-4 z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Quote size={14} className="text-white fill-white" />
            </div>

            <div className="relative z-10 px-6 py-6 pl-14">
              {motivationLoading && !dailyMotivation ? (
                <div className="w-full space-y-3.5">
                  {[0, 1, 2, 3].map((row) => (
                    <div
                      key={row}
                      className="h-4 rounded-full bg-white/25 relative overflow-hidden"
                      style={{ width: `${row === 3 ? 40 : 95 - row * 14}%` }}
                    >
                      <motion.div
                        className="absolute inset-0 bg-linear-to-r from-transparent via-white/35 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 1.1, ease: "linear", delay: row * 0.12 }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[15px] font-bold text-white leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                  {dailyMotivation}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Regeneration Section */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-[3] py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
            >
              <RefreshCcw className={cn("w-5 h-5", isGenerating && "animate-spin")} />
              {isGenerating ? 'Generating...' : workout ? 'Regenerate' : 'Generate Workout'}
            </button>

            <button
              onClick={() => setShowFeedbackInput(!showFeedbackInput)}
              className={cn(
                "flex-1 py-4 rounded-2xl font-bold flex items-center justify-center transition-all border",
                showFeedbackInput
                  ? "bg-orange-50 text-[#FF6B00] border-orange-100"
                  : "bg-white text-slate-600 border-slate-100"
              )}
            >
              <span className="material-icons-round text-2xl">tune</span>
            </button>
          </div>

          <AnimatePresence>
            {showFeedbackInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex gap-2 items-center">
                  <input
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="e.g. Focus more on upper chest..."
                    className="flex-grow bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-slate-400"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={!feedback.trim() || isGenerating}
                    className="p-2 bg-[#FF6B00] text-white rounded-xl disabled:opacity-30"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Today's Routine */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">Today&apos;s Routine</h2>
            <span className="text-sm text-[#FF6B00] font-semibold">
              {workout === undefined ? (
                <Skeleton className="h-4 w-20 inline-block" />
              ) : workout ? `${workout.exercises.length} Exercises` : "0 Exercises"}
            </span>
          </div>




          {/* Generation title preview */}
          {isGenerating && generationPreview && generationPreview.title !== "Generating..." && (
            <p className="text-sm font-bold text-slate-900 mb-3">{generationPreview.title}</p>
          )}

          {/* Workout Progress Bar */}
          {
            workout && totalCount > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-5">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Progress</span>
                    <span className="text-xs font-extrabold text-slate-900">{completedCount}/{totalCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                    <Coins size={10} />
                    ~{totalCount * 10 + 50} coins possible
                  </div>
                </div>
                <div className="flex gap-1">
                  {workout.exercises.map((ex, i) => (
                    <motion.div
                      key={i}
                      className={cn(
                        "flex-1 h-3 rounded-full transition-all duration-500",
                        ex.completed
                          ? "bg-gradient-to-r from-[#FF6B00] to-[#FF8C33]"
                          : "bg-slate-100"
                      )}
                      animate={ex.completed ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    />
                  ))}
                </div>
                {completedCount === totalCount && totalCount > 0 && (
                  <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-bold text-green-600 mt-2 text-center"
                  >
                    All exercises complete! Great work!
                  </motion.p>
                )}
              </div>
            )
          }

          {/* Exercise Cards */}
          <div className="space-y-4">
            {isGenerating ? (
              <>
                {/* Streamed exercises appear one-by-one as real cards */}
                {generationPreview?.exercises?.map((exercise: any, idx: number) => (
                  <motion.div
                    key={`${exercise.name}-${idx}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm"
                  >
                    <div className="flex gap-4 items-center">
                      <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="text-xl font-black text-[#FF6B00]">{idx + 1}</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{exercise.name}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{exercise.sets} sets &bull; {exercise.reps}{exercise.estMinutes ? ` &bull; ~${exercise.estMinutes}min` : ''}</p>
                        {exercise.tip && <p className="text-xs text-slate-400 mt-1 italic">{exercise.tip}</p>}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {/* Skeleton placeholder for next exercise being generated */}
                <WorkoutSkeleton count={1} />
              </>
            ) : workout === undefined ? (
              /* Profile / workout data still loading from DB */
              <WorkoutSkeleton count={4} />
            ) : workout ? (
              workout.exercises.map((exercise, idx) => (
                <ExerciseCard
                  key={idx}
                  exercise={exercise as any}
                  workoutTitle={workout.title}
                  workoutId={workout._id}
                  userId={user?._id}
                  onToggle={() => handleToggle(exercise.name, !exercise.completed)}
                  onLog={(payload) => handleLogAndToggle(exercise.name, payload)}
                  onCoinsEarned={handleCoinsEarned}
                />
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <p className="text-slate-400">No workout generated for this day.</p>
              </div>
            )}
          </div>
        </div >
      </main >

      {/* Jacked AI backdrop — behind the popup, above page content */}
      <AnimatePresence>
        {
          showCoachPopover && (
            <motion.div
              key="jacked-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/15 backdrop-blur-[6px]"
              onClick={() => setShowCoachPopover(false)}
            />
          )
        }
      </AnimatePresence >

      {/* Jacked AI popup — above everything including backdrop */}
      <AnimatePresence>
        {
          showCoachPopover && (
            <motion.div
              key="jacked-popup"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed bottom-24 left-3 right-3 sm:left-auto sm:right-6 sm:w-[420px] z-[100]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-[28px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.22)] overflow-hidden border border-slate-200/60">
                {/* Header */}
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center text-lg">
                      🤖
                    </div>
                    <p className="text-[15px] font-bold text-slate-900">Jacked AI</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {coachMessages.length > 0 && (
                      <button
                        onClick={() => setCoachMessages([])}
                        className="w-8 h-8 rounded-full text-slate-400 hover:text-[#FF6B00] hover:bg-orange-50 flex items-center justify-center transition-all"
                        title="Reset chat"
                      >
                        <RefreshCcw size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => setShowCoachPopover(false)}
                      className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                    >
                      <ChevronDown size={20} />
                    </button>
                  </div>
                </div>

                {/* Chat area */}
                <div
                  ref={coachScrollRef}
                  className="max-h-[52vh] overflow-y-auto px-5 pb-4 space-y-5 no-scrollbar scroll-smooth"
                >
                  {coachMessages.length === 0 && (
                    <p className="text-[15px] text-slate-400 py-4">
                      Ask anything about today&apos;s routine, form, or progression.
                    </p>
                  )}
                  {coachMessages.map((msg, idx) => (
                    <div key={`${msg.role}-${idx}`}>
                      {msg.role === 'user' ? (
                        <div className="flex justify-end mb-1">
                          <div className="bg-slate-900 text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] text-[15px] leading-relaxed">
                            {msg.content}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[15px] text-slate-700 leading-[1.7]">
                          {coachLoading && idx === coachMessages.length - 1 && !msg.content && (
                            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-900/45 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md mb-2">
                              <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{
                                  backgroundImage: `url('${AI_CARD_BG_URL}')`,
                                  filter: "blur(30px) saturate(1.35) brightness(0.65)",
                                  transform: "scale(1.2)",
                                }}
                              />
                              <div className="relative z-10 p-4">
                                <div className="flex items-center gap-2.5 mb-3">
                                  <span className="text-sm animate-pulse">🤖</span>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-100/80">
                                    Jacked AI is thinking
                                  </p>
                                </div>
                                <div className="space-y-2.5">
                                  {[0, 1, 2].map((row) => (
                                    <div
                                      key={row}
                                      className="h-2.5 rounded-full bg-white/20 relative overflow-hidden"
                                      style={{ width: `${92 - row * 12}%` }}
                                    >
                                      <motion.div
                                        className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent"
                                        animate={{ x: ['-100%', '100%'] }}
                                        transition={{ repeat: Infinity, duration: 1.05, ease: "linear", delay: row * 0.12 }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ ...props }) => <p className="mb-2.5 last:mb-0" {...props} />,
                              ul: ({ ...props }) => <ul className="list-disc ml-5 mb-2.5 space-y-1" {...props} />,
                              ol: ({ ...props }) => <ol className="list-decimal ml-5 mb-2.5 space-y-1" {...props} />,
                              li: ({ ...props }) => <li className="text-[15px]" {...props} />,
                              strong: ({ ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
                              code: ({ ...props }) => <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[13px] font-mono" {...props} />,
                              h1: ({ ...props }) => <h1 className="text-lg font-bold text-slate-900 mb-2" {...props} />,
                              h2: ({ ...props }) => <h2 className="text-base font-bold text-slate-900 mb-1.5" {...props} />,
                              h3: ({ ...props }) => <h3 className="text-[15px] font-bold text-slate-900 mb-1" {...props} />,
                            }}
                          >
                            {msg.content || '\u00A0'}
                          </ReactMarkdown>
                          {coachLoading && idx === coachMessages.length - 1 && !!msg.content && (
                            <span className="inline-block w-1.5 h-5 bg-[#FF6B00] rounded-full animate-pulse" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Input bar */}
                <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2">
                  <input
                    type="text"
                    value={coachInput}
                    onChange={(event) => setCoachInput(event.target.value)}
                    placeholder="Ask Jacked AI..."
                    className="flex-1 h-12 rounded-2xl bg-slate-50 border border-slate-200 px-4 text-[15px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/15 focus:border-transparent"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && coachInput.trim() && !coachLoading) {
                        void sendCoachMessage(coachInput);
                      }
                    }}
                  />
                  <button
                    onClick={() => void sendCoachMessage(coachInput)}
                    disabled={!coachInput.trim() || coachLoading}
                    className="w-12 h-12 rounded-2xl bg-[#FF6B00] text-white flex items-center justify-center shrink-0 disabled:opacity-30 transition-opacity active:scale-95"
                  >
                    <Send size={18} className={cn(coachLoading && "animate-pulse")} />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        }
      </AnimatePresence >

      {/* Workout Complete Modal */}
      {
        completionStats && (
          <WorkoutCompleteModal
            show={showCompleteModal}
            onClose={() => {
              setShowCompleteModal(false);
              setCompletionStats(null);
            }}
            stats={completionStats}
          />
        )
      }

      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div >
  );
}

function WorkoutSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="relative overflow-hidden bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <div className="flex gap-4 items-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl shrink-0" />
            <div className="grow space-y-2.5">
              <div className="h-5 bg-slate-100 rounded-lg w-3/5" />
              <div className="h-3 bg-slate-50 rounded-lg w-2/5" />
            </div>
          </div>
          <motion.div
            className="absolute inset-0 bg-linear-to-r from-transparent via-white/60 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "linear", delay: i * 0.15 }}
          />
        </div>
      ))}
    </>
  );
}
