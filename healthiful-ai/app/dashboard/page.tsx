"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseCard } from "@/components/dashboard/ExerciseCard";
import { MessageSquare, RefreshCcw, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

export default function DashboardPage() {
  const user = useQuery(api.users.getMe);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [duration, setDuration] = useState(45);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const workout = useQuery(api.workouts.getWorkout, user ? { userId: user._id, date: dateStr } : "skip");
  const generateWorkoutAction = useAction(api.actions.generateWorkout);
  const saveWorkout = useMutation(api.workouts.saveWorkout);
  const toggleComplete = useMutation(api.workouts.markExerciseComplete);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);

  const handleGenerate = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      const plan = await generateWorkoutAction({ 
        userId: user._id, 
        date: dateStr,
        feedback: feedback.trim() || undefined,
        duration: duration
      });
      if (plan) {
        await saveWorkout({
          userId: user._id,
          date: dateStr,
          title: plan.title,
          exercises: plan.exercises.map((ex: any) => ({
            ...ex,
            completed: false,
          })),
        });
        setFeedback("");
        setShowFeedbackInput(false);
      }
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggle = async (exerciseName: string, completed: boolean) => {
    if (!workout) return;
    await toggleComplete({
      workoutId: workout._id,
      exerciseName,
      completed
    });
  };

  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="bg-[#F8FAFC] text-[#1E293B] font-sans antialiased min-h-screen pb-24 relative overflow-x-hidden">
      <header className="sticky top-0 z-30 pt-12 pb-4 px-6 bg-[#F8FAFC]/90 backdrop-blur-md">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-slate-500 text-sm font-medium">
              Hello, {user ? user.name : <Skeleton className="h-3 w-16 inline-block" />}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Ready to Workout</h1>
          </div>
          <button className="p-2 rounded-full bg-white shadow-sm border border-slate-100 hover:bg-slate-50 transition">
            <span className="material-icons-round text-[#FF6B00] text-xl">notifications_none</span>
          </button>
        </div>
        
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-6xl font-extrabold text-[#FF6B00] leading-none tracking-tighter">
              {duration}
            </span>
            <span className="text-xl font-semibold text-slate-400 ml-1">Min</span>
            <p className="text-lg font-bold mt-1 text-slate-900">
              {workout ? workout.title : "No Plan Selected"}
            </p>
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

      <main className="px-6 space-y-6">

        {/* Horizontal Calendar */}
        <div className="flex space-x-3 overflow-x-auto hide-scrollbar py-2">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center justify-center min-w-[70px] h-[90px] rounded-3xl transition-all ${
                  isSelected
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
              </button>
            );
          })}
        </div>

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
              <MessageSquare className="w-6 h-6" />
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
            <h2 className="text-xl font-bold text-slate-900">Today's Routine</h2>
            <span className="text-sm text-[#FF6B00] font-semibold">
              {workout ? `${workout.exercises.length} Exercises` : "0 Exercises"}
            </span>
          </div>

          <div className="space-y-4">
            {isGenerating ? (
              <WorkoutSkeleton />
            ) : workout ? (
              workout.exercises.map((exercise, idx) => (
                <ExerciseCard 
                  key={idx}
                  exercise={exercise as any}
                  workoutTitle={workout.title}
                  workoutId={workout._id}
                  userId={user?._id}
                  onToggle={() => handleToggle(exercise.name, !exercise.completed)}
                />
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <p className="text-slate-400">No workout generated for this day.</p>
              </div>
            )}
          </div>
        </div>
      </main>

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
    </div>
  );
}

function WorkoutSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-3xl p-4 shadow-soft border border-slate-100 animate-pulse">
          <div className="flex gap-4 items-center">
            <div className="w-20 h-20 bg-slate-200 rounded-2xl flex-shrink-0"></div>
            <div className="flex-grow space-y-2">
              <div className="h-5 bg-slate-200 rounded w-1/2"></div>
              <div className="h-3 bg-slate-200 rounded w-1/4"></div>
              <div className="flex gap-3">
                <div className="h-6 bg-slate-200 rounded w-16"></div>
                <div className="h-6 bg-slate-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
