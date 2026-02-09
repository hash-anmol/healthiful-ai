"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const user = useQuery(api.users.getMe);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  // Actually fetching workout from Convex
  const workout = useQuery(api.workouts.getWorkout, user ? { userId: user._id, date: dateStr } : "skip");
  const generateWorkoutAction = useAction(api.actions.generateWorkout);
  const saveWorkout = useMutation(api.workouts.saveWorkout);
  
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      const plan = await generateWorkoutAction({ userId: user._id, date: dateStr });
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
      }
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Days of the week for the horizontal selector
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="bg-[#F8FAFC] text-[#1E293B] font-sans antialiased min-h-screen pb-24 relative overflow-x-hidden">
      <main className="px-6 space-y-6 mt-12">
        <div className="flex flex-col mb-4">
          <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            Hello, {user ? user.name : <Skeleton className="h-3 w-16 inline-block" />}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Today&apos;s Workout
          </h1>
          {workout && (
            <p className="text-[#FF6B00] font-bold text-lg mt-1">{workout.title}</p>
          )}
        </div>
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

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
        >
          <span className={`material-icons-round ${isGenerating ? 'animate-spin' : ''}`}>
            {isGenerating ? 'refresh' : 'cached'}
          </span>
          {isGenerating ? 'Generating...' : workout ? 'Regenerate Workout' : 'Generate Workout'}
        </button>

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
                <div key={idx} className="bg-white rounded-3xl p-4 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-slate-50">
                  <div className="flex gap-4 items-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0 relative">
                      <img
                        alt={exercise.name}
                        className="w-full h-full object-cover"
                        src={`https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&h=200&fit=crop`}
                      />
                      <div className="absolute inset-0 bg-black/10"></div>
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg leading-tight mb-1 text-slate-900">{exercise.name}</h3>
                        <div className="flex gap-2">
                          <button className="text-slate-400 hover:text-[#FF6B00] transition-colors">
                            <span className="material-icons-round text-xl">help_outline</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">
                        {exercise.notes || "Standard Form"}
                      </p>
                      <div className="flex gap-3 text-sm font-semibold">
                        <span className="bg-orange-50 text-[#FF6B00] px-2 py-1 rounded-lg">
                          {exercise.sets} Sets
                        </span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                          {exercise.reps} Reps
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <p className="text-slate-400">No workout generated for this day.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Tailwind Config & Fonts should be in layout.tsx but adding link here for icons */}
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
