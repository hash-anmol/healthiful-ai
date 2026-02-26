"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { canAccessSadhana } from "@/lib/featureFlags";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Pause,
  Sun,
  Moon,
  Bell,
  BellOff,
  Plus,
  Minus,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { AchievementToast } from "@/components/dashboard/AchievementToast";

const MALA_BEADS = 108;

type Phase = "setup" | "active" | "complete";

/** Play a bell sound on a shared AudioContext (must be created on user gesture) */
function playBellOnCtx(ctx: AudioContext, frequency = 528, duration = 3, volume = 0.3) {
  try {
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = "sine";
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);

    // Harmonic overtone for richer bell
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = frequency * 2;
    osc2.type = "sine";
    gain2.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + duration * 0.6
    );
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + duration * 0.6);
  } catch { }
}

export default function MeditationPage() {
  const router = useRouter();
  const { authUser } = useAuth();

  // Feature gate
  useEffect(() => {
    if (authUser && !canAccessSadhana(authUser.email)) {
      router.replace("/dashboard");
    }
  }, [authUser, router]);

  const user = useQuery(
    api.users.getMe,
    authUser?._id ? { authUserId: authUser._id } : "skip"
  );
  const logSession = useMutation(api.meditation.logMeditationSession);
  const logChanting = useMutation(api.mantras.logChanting);

  const [phase, setPhase] = useState<Phase>("setup");
  const [darkMode, setDarkMode] = useState(true);
  const [malasGoal, setMalasGoal] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [pendingAchievements, setPendingAchievements] = useState<string[]>([]);

  const [alerts, setAlerts] = useState<number[]>([10]);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [firedAlerts, setFiredAlerts] = useState<Set<number>>(new Set());
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [newAlertMin, setNewAlertMin] = useState(15);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Persistent AudioContext — created on user gesture (Begin button)
  const audioCtxRef = useRef<AudioContext | null>(null);

  /** Get or create AudioContext (call from user gesture handler) */
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Timer
  useEffect(() => {
    if (phase === "active" && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, isPaused]);

  // Alert checker — uses persistent AudioContext
  useEffect(() => {
    if (!alertsEnabled || phase !== "active") return;
    const elapsedMin = Math.floor(elapsed / 60);
    for (const alertMin of alerts) {
      if (elapsedMin >= alertMin && !firedAlerts.has(alertMin)) {
        setFiredAlerts((prev) => new Set(prev).add(alertMin));
        const ctx = audioCtxRef.current;
        if (ctx) playBellOnCtx(ctx, 528, 3, 0.3);
      }
    }
  }, [elapsed, alerts, alertsEnabled, firedAlerts, phase]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startSession = () => {
    getAudioCtx(); // Init AudioContext on user gesture (tap) for mobile
    setPhase("active");
    setElapsed(0);
    setIsPaused(false);
    setFiredAlerts(new Set());
  };

  const endSession = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("complete");

    // Play completion bell — three ascending tones
    const ctx = audioCtxRef.current;
    if (ctx) {
      playBellOnCtx(ctx, 528, 3, 0.35);
      setTimeout(() => playBellOnCtx(ctx, 639, 2.5, 0.25), 800);
      setTimeout(() => playBellOnCtx(ctx, 741, 2, 0.2), 1500);
    }

    if (!user || elapsed < 10) return;

    const dateStr = format(new Date(), "yyyy-MM-dd");

    try {
      const result = await logSession({
        userId: user._id,
        date: dateStr,
        durationSeconds: elapsed,
        malasGoal,
        malasCompleted: malasGoal,
      });

      await logChanting({
        userId: user._id,
        date: dateStr,
        malas: malasGoal,
      });

      if (result.newAchievements.length > 0) {
        setPendingAchievements(result.newAchievements);
      }
    } catch (err) {
      console.error("Failed to log session:", err);
    }
  }, [user, elapsed, malasGoal, logSession, logChanting]);

  const handleBack = () => {
    if (phase === "active") {
      setShowExitWarning(true);
    } else {
      router.push("/dashboard/sadhana");
    }
  };

  const confirmExit = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setShowExitWarning(false);
    router.push("/dashboard/sadhana");
  };

  const addAlert = () => {
    if (!alerts.includes(newAlertMin)) {
      setAlerts((prev) => [...prev, newAlertMin].sort((a, b) => a - b));
    }
    setShowAddAlert(false);
  };

  const removeAlert = (min: number) => {
    setAlerts((prev) => prev.filter((a) => a !== min));
  };

  // Theme
  const bg = darkMode
    ? "bg-[#0a0a0f]"
    : "bg-gradient-to-b from-[#FEFCF8] via-[#FDF8EE] to-[#FEFCF8]";
  const text = darkMode ? "text-white" : "text-slate-800";
  const subtext = darkMode ? "text-white/40" : "text-slate-400";
  const cardBg = darkMode
    ? "bg-white/[0.03] border-white/[0.06]"
    : "bg-white/70 border-slate-200/60";
  const btnBg = darkMode
    ? "bg-white/[0.06] hover:bg-white/[0.1] border-white/[0.08]"
    : "bg-white hover:bg-slate-50 border-slate-200";

  return (
    <div
      className={`fixed inset-0 z-[60] ${bg} transition-colors duration-700 flex flex-col`}
    >
      <AchievementToast
        achievementIds={pendingAchievements}
        onDismiss={() => setPendingAchievements([])}
      />

      {/* Exit Warning Modal */}
      <AnimatePresence>
        {showExitWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  End Session?
                </h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">
                This will end your current meditation session and it{" "}
                <strong>won&apos;t be tracked</strong>. Are you sure?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitWarning(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-all"
                >
                  Continue
                </button>
                <button
                  onClick={confirmExit}
                  className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all"
                >
                  End & Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 h-14 mt-[env(safe-area-inset-top,0px)]">
        <button
          onClick={handleBack}
          className={`w-9 h-9 rounded-xl ${btnBg} border flex items-center justify-center ${text} transition-all active:scale-95`}
        >
          <ArrowLeft size={16} />
        </button>
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.35em] ${subtext}`}
        >
          {phase === "setup"
            ? "Prepare"
            : phase === "active"
              ? "Meditating"
              : "Complete"}
        </p>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`w-9 h-9 rounded-xl ${btnBg} border flex items-center justify-center ${text} transition-all active:scale-95`}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* ═══ SETUP PHASE ═══ */}
          {phase === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm space-y-6"
            >
              {/* Om symbol */}
              <div className="text-center mb-2">
                <span
                  className={`text-6xl ${darkMode ? "text-white/[0.07]" : "text-amber-200/50"}`}
                  style={{ fontFamily: "var(--font-noto-devanagari), serif" }}
                >
                  ॐ
                </span>
              </div>

              <h2
                className={`text-xl font-semibold text-center tracking-tight ${text}`}
              >
                Meditation Session
              </h2>
              <p className={`text-xs text-center ${subtext}`}>
                Set your japa goal and begin
              </p>

              {/* Mala Goal Selector */}
              <div className={`${cardBg} rounded-2xl border p-5`}>
                <p
                  className={`text-[9px] font-bold uppercase tracking-[0.3em] ${subtext} mb-4 text-center`}
                >
                  Japa Goal
                </p>
                <div className="flex items-center justify-center gap-8">
                  <button
                    onClick={() =>
                      setMalasGoal(Math.max(1, malasGoal - 1))
                    }
                    className={`w-10 h-10 rounded-xl ${btnBg} border flex items-center justify-center ${text} active:scale-95 transition-all`}
                  >
                    <Minus size={18} />
                  </button>
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${text}`}>
                      {malasGoal}
                    </div>
                    <div className={`text-[10px] ${subtext} mt-0.5`}>
                      mala{malasGoal !== 1 ? "s" : ""} •{" "}
                      {(malasGoal * MALA_BEADS).toLocaleString()} chants
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setMalasGoal(Math.min(21, malasGoal + 1))
                    }
                    className={`w-10 h-10 rounded-xl ${btnBg} border flex items-center justify-center ${text} active:scale-95 transition-all`}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {/* Alerts Config */}
              <div className={`${cardBg} rounded-2xl border p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <p
                    className={`text-[9px] font-bold uppercase tracking-[0.3em] ${subtext}`}
                  >
                    Alerts
                  </p>
                  <button
                    onClick={() => setAlertsEnabled(!alertsEnabled)}
                    className={`w-7 h-7 rounded-lg ${btnBg} border flex items-center justify-center ${text} active:scale-95 transition-all`}
                  >
                    {alertsEnabled ? (
                      <Bell size={12} />
                    ) : (
                      <BellOff size={12} />
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {alerts.map((min) => (
                    <div
                      key={min}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${alertsEnabled
                        ? darkMode
                          ? "bg-white/[0.06] text-white/60 border border-white/[0.08]"
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                        : darkMode
                          ? "bg-white/[0.02] text-white/20 border border-white/[0.03]"
                          : "bg-slate-50 text-slate-300 border border-slate-100"
                        }`}
                    >
                      {min}m
                      <button
                        onClick={() => removeAlert(min)}
                        className="hover:opacity-70"
                      >
                        <X size={8} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setShowAddAlert(!showAddAlert)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${btnBg} border ${text} active:scale-95 transition-all`}
                  >
                    <Plus size={8} /> Add
                  </button>
                </div>

                <AnimatePresence>
                  {showAddAlert && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 overflow-hidden"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={newAlertMin}
                          onChange={(e) =>
                            setNewAlertMin(
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                          className={`flex-1 h-9 rounded-lg px-3 text-xs font-bold ${darkMode
                            ? "bg-white/[0.06] text-white border border-white/[0.08]"
                            : "bg-white text-slate-800 border border-slate-200"
                            } focus:outline-none`}
                          min={1}
                        />
                        <span className={`text-[10px] ${subtext}`}>min</span>
                        <button
                          onClick={addAlert}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center active:scale-95 ${darkMode
                            ? "bg-white/10 text-white border border-white/10"
                            : "bg-slate-900 text-white"
                            }`}
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Begin Button — minimal, focused ── */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={startSession}
                className={`w-full py-3.5 rounded-2xl font-semibold text-sm tracking-wide transition-all active:scale-[0.98] ${darkMode
                  ? "bg-white/[0.08] text-white/80 border border-white/[0.1] hover:bg-white/[0.12]"
                  : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
              >
                Begin Meditation
              </motion.button>
            </motion.div>
          )}

          {/* ═══ ACTIVE PHASE ═══ */}
          {phase === "active" && (
            <motion.div
              key="active"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm flex flex-col items-center space-y-8"
            >
              {/* Rotating OM ring */}
              <div className="relative w-60 h-60 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 60,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: `1.5px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                    borderTopColor: darkMode
                      ? "rgba(255,255,255,0.25)"
                      : "rgba(0,0,0,0.2)",
                  }}
                />
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-6 rounded-full"
                  style={{
                    background: darkMode
                      ? "radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)"
                      : "radial-gradient(circle, rgba(0,0,0,0.02) 0%, transparent 70%)",
                  }}
                />
                <div className="text-center z-10">
                  <span
                    className={`text-5xl font-extralight tracking-widest ${text} tabular-nums`}
                  >
                    {formatTime(elapsed)}
                  </span>
                  <p className={`text-[10px] ${subtext} mt-2`}>
                    {malasGoal} mala{malasGoal !== 1 ? "s" : ""} •{" "}
                    {(malasGoal * MALA_BEADS).toLocaleString()} chants
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-6">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsPaused(!isPaused)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${darkMode
                    ? "bg-white/[0.06] border border-white/[0.1]"
                    : "bg-white border border-slate-200 shadow-sm"
                    }`}
                >
                  {isPaused ? (
                    <Play
                      size={24}
                      className={darkMode ? "text-white/70" : "text-slate-600"}
                      fill={darkMode ? "rgba(255,255,255,0.7)" : "#475569"}
                    />
                  ) : (
                    <Pause
                      size={24}
                      className={darkMode ? "text-white/60" : "text-slate-500"}
                    />
                  )}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={endSession}
                  className={`w-16 h-16 rounded-full flex items-center justify-center font-semibold text-xs transition-all ${darkMode
                    ? "bg-white/[0.08] text-white/70 border border-white/[0.12] hover:bg-white/[0.14]"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                >
                  End
                </motion.button>
              </div>

              {isPaused && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-xs font-medium ${subtext}`}
                >
                  Paused — tap play to continue
                </motion.p>
              )}

              {alertsEnabled && alerts.length > 0 && (
                <div className="flex gap-1.5">
                  {alerts.map((min) => (
                    <div
                      key={min}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${firedAlerts.has(min)
                        ? "bg-green-500/15 text-green-400 border border-green-500/15"
                        : darkMode
                          ? "bg-white/[0.03] text-white/20 border border-white/[0.05]"
                          : "bg-slate-50 text-slate-300 border border-slate-100"
                        }`}
                    >
                      🔔 {min}m {firedAlerts.has(min) && "✓"}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ COMPLETE PHASE ═══ */}
          {phase === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                className="text-5xl"
              >
                🙏
              </motion.div>

              <h2 className={`text-xl font-semibold ${text}`}>
                Session Complete
              </h2>

              <div className={`${cardBg} rounded-2xl border p-5 space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${subtext}`}>Duration</span>
                  <span className={`text-base font-bold ${text}`}>
                    {formatTime(elapsed)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${subtext}`}>Malas</span>
                  <span className={`text-base font-bold ${text}`}>
                    {malasGoal}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${subtext}`}>Chants logged</span>
                  <span className={`text-base font-bold ${text}`}>
                    {(malasGoal * MALA_BEADS).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push("/dashboard/sadhana")}
                className={`w-full py-3.5 rounded-2xl font-semibold text-sm tracking-wide transition-all ${darkMode
                  ? "bg-white/[0.08] text-white/80 border border-white/[0.1] hover:bg-white/[0.12]"
                  : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
              >
                Back to Sadhana
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
