"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { canAccessSadhana } from "@/lib/featureFlags";
import { useRouter } from "next/navigation";
import { format, subDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Plus,
  Minus,
  Trophy,
  Sparkles,
  Check,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Timer,
  TrendingUp,
  Play,
} from "lucide-react";
import { StreakBadge, CoinCounter } from "@/components/dashboard/CoinAnimation";
import { AchievementToast } from "@/components/dashboard/AchievementToast";
import Link from "next/link";

const MALA_BEADS = 108;
const MANTRA_COVER_IMG = "/mantra-cover.png";
const LOCAL_KEY_MANTRA_VISIBLE = "healthiful.mantraVisible";

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const duration = 1200;
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [value]);

  return (
    <span className="tabular-nums">{display.toLocaleString("en-IN")}</span>
  );
}

export default function SadhanaPage() {
  const { authUser } = useAuth();
  const router = useRouter();

  // Feature gate: redirect non-whitelisted users
  useEffect(() => {
    if (authUser && !canAccessSadhana(authUser.email)) {
      router.replace("/dashboard");
    }
  }, [authUser, router]);

  const user = useQuery(
    api.users.getMe,
    authUser?._id ? { authUserId: authUser._id } : "skip"
  );

  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isToday = dateStr === todayStr;

  const [activeTab, setActiveTab] = useState<"japa" | "meditation">("japa");

  const [mantraVisible, setMantraVisible] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY_MANTRA_VISIBLE);
      if (stored === "true") setMantraVisible(true);
    } catch { }
  }, []);
  const toggleMantra = () => {
    const next = !mantraVisible;
    setMantraVisible(next);
    try {
      localStorage.setItem(LOCAL_KEY_MANTRA_VISIBLE, String(next));
    } catch { }
  };

  const profile = useQuery(
    api.mantras.getMantraProfile,
    user ? { userId: user._id } : "skip"
  );
  const dateLog = useQuery(
    api.mantras.getLogForDate,
    user ? { userId: user._id, date: dateStr } : "skip"
  );
  const recentLogs = useQuery(
    api.mantras.getRecentLogs,
    user ? { userId: user._id } : "skip"
  );
  const gameProfile = useQuery(
    api.gamification.getGameProfile,
    user ? { userId: user._id } : "skip"
  );
  const meditationStats = useQuery(
    api.meditation.getMeditationStats,
    user ? { userId: user._id } : "skip"
  );
  const logChanting = useMutation(api.mantras.logChanting);

  const [malas, setMalas] = useState(3);
  const [isLogging, setIsLogging] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const [pendingAchievements, setPendingAchievements] = useState<string[]>([]);

  const totalChanted = profile?.totalChanted ?? 0;
  const siddhiGoal = profile?.siddhiGoal ?? 900000;
  const progressPercent = Math.min((totalChanted / siddhiGoal) * 100, 100);
  const currentStreak = profile?.currentStreak ?? 0;
  const longestStreak = profile?.longestStreak ?? 0;
  const dayCount = dateLog?.count ?? 0;
  const dayMalas = dateLog?.malas ?? 0;

  const handleLog = async () => {
    if (!user || isLogging) return;
    setIsLogging(true);
    try {
      const result = await logChanting({
        userId: user._id,
        date: dateStr,
        malas,
      });
      setJustLogged(true);
      setTimeout(() => setJustLogged(false), 3000);
      if (result.newAchievements.length > 0) {
        setPendingAchievements((prev) => [...prev, ...result.newAchievements]);
      }
    } catch (err) {
      console.error("Failed to log:", err);
    } finally {
      setIsLogging(false);
    }
  };

  const goToPrevDay = () => {
    const prev = subDays(selectedDate, 1);
    const thirtyDaysAgo = subDays(new Date(), 30);
    if (prev >= thirtyDaysAgo) setSelectedDate(prev);
  };
  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    if (next <= new Date()) setSelectedDate(next);
  };

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return format(d, "yyyy-MM-dd");
  });
  const logDates = new Set((recentLogs ?? []).map((l) => l.date));

  return (
    <div className="space-y-5 pb-8">
      <AchievementToast
        achievementIds={pendingAchievements}
        onDismiss={() => setPendingAchievements([])}
      />

      {/* ═══ Header ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#FF6B00]/60 mb-0.5">
            🙏 Daily Sadhana
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Mantra Japa
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <StreakBadge streak={currentStreak} />
          <CoinCounter coins={gameProfile?.coins ?? 0} />
        </div>
      </motion.div>

      {/* ═══ Breadcrumb Tabs ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="flex rounded-2xl overflow-hidden border border-slate-200 bg-slate-50"
      >
        <button
          onClick={() => setActiveTab("japa")}
          className={`flex-1 py-3 text-sm font-bold text-center transition-all ${activeTab === "japa"
            ? "bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white shadow-inner"
            : "text-slate-400 hover:text-slate-600"
            }`}
        >
          📿 Japa Tracker
        </button>
        <button
          onClick={() => setActiveTab("meditation")}
          className={`flex-1 py-3 text-sm font-bold text-center transition-all ${activeTab === "meditation"
            ? "bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white shadow-inner"
            : "text-slate-400 hover:text-slate-600"
            }`}
        >
          🧘 Meditation
        </button>
      </motion.div>

      {/* ═══ JAPA TAB ═══ */}
      {activeTab === "japa" && (
        <motion.div
          key="japa"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-5"
        >
          {/* Date Picker */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={goToPrevDay}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-center min-w-[160px]">
              <div className="text-lg font-bold text-slate-800">
                {isToday ? "Today" : format(selectedDate, "EEEE")}
              </div>
              <div className="text-xs text-slate-400">
                {format(selectedDate, "dd MMM yyyy")}
              </div>
            </div>
            <button
              onClick={goToNextDay}
              disabled={isToday}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* ═══ Mantra Card ═══ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative overflow-hidden rounded-3xl"
            style={{
              background:
                "linear-gradient(160deg, #2D0801 0%, #4D1605 40%, #2D0801 100%)",
            }}
          >
            {/* Warm center glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 70% 50% at 50% 55%, rgba(200,80,10,0.28) 0%, transparent 75%)",
              }}
            />

            <button
              onClick={toggleMantra}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-amber-400/30 text-white hover:bg-white/20 transition-all active:scale-90"
            >
              {mantraVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>

            <AnimatePresence>
              {!mantraVisible && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10"
                >
                  <img
                    src={MANTRA_COVER_IMG}
                    alt="Sacred OM"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <p className="text-white/70 text-xs font-medium">
                      Tap{" "}
                      <Eye size={12} className="inline mb-0.5" /> to reveal
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* OM watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] select-none pointer-events-none">
              <span
                style={{
                  fontSize: "220px",
                  fontFamily: "var(--font-noto-devanagari), serif",
                  lineHeight: 1,
                  color: "#FBBF24",
                }}
              >
                ॐ
              </span>
            </div>

            {/* Top accent bar — thin gold */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

            <div className="relative px-6 py-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-500/40" />
                <span className="text-amber-300 text-[9px] font-bold uppercase tracking-[0.35em]">
                  Navarna Mantra
                </span>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-500/40" />
              </div>

              <h2
                className="text-3xl md:text-4xl font-bold leading-relaxed transition-all duration-300"
                style={{
                  fontFamily: "var(--font-noto-devanagari), serif",
                  filter: mantraVisible ? "none" : "blur(16px)",
                  userSelect: mantraVisible ? "auto" : "none",
                  color: "#FEF3C7",
                  letterSpacing: "0.03em",
                }}
              >
                ऐं ह्रीं क्लीं
                <br />
                चामुण्डायै विच्चे
              </h2>

              <p
                className="text-white/80 text-xs mt-3 tracking-widest italic transition-all duration-300"
                style={{ filter: mantraVisible ? "none" : "blur(10px)" }}
              >
                Aiṁ Hrīṁ Klīṁ Cāmuṇḍāyai Vicce
              </p>

              <div className="mt-6 flex items-center justify-center gap-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-full"
                    style={{
                      width: i === 2 ? "7px" : "4px",
                      height: i === 2 ? "7px" : "4px",
                      background:
                        i === 2 ? "#FBBF24" : "rgba(251,191,36,0.2)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Bottom accent bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
          </motion.div>

          {/* ═══ Progress Card ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6"
            style={{
              background: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)",
            }}
          >
            <div className="text-center mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-1">
                Total Chanted
              </p>
              <div className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#DAA520] leading-none">
                <AnimatedCounter value={totalChanted} />
              </div>
              <p className="text-slate-500 text-sm mt-1">
                of {siddhiGoal.toLocaleString("en-IN")} for Mantra Siddhi
              </p>
            </div>

            <div className="relative mt-4">
              {/* Track */}
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,107,0,0.12)" }}>
                <motion.div
                  className="h-full rounded-full relative overflow-hidden"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1.4, ease: "easeOut", delay: 0.4 }}
                  style={{
                    background: "linear-gradient(90deg, #FF6B00 0%, #FF8C00 50%, #DAA520 100%)",
                    boxShadow: "0 0 10px rgba(255,107,0,0.5)",
                  }}
                >
                  {/* Shimmer */}
                  <div className="absolute inset-0 opacity-40" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)", animation: "shimmer 2s infinite" }} />
                </motion.div>
              </div>
              {/* Stats row */}
              <div className="flex justify-between mt-2 text-xs">
                <span className="font-bold text-[#FF6B00]">{progressPercent.toFixed(2)}%</span>
                <span className="text-slate-500 font-medium">{(siddhiGoal - totalChanted).toLocaleString("en-IN")} remaining</span>
              </div>
            </div>

            <div className="flex justify-between mt-3 px-1">
              {[
                { label: "1L", value: 100000 },
                { label: "5L", value: 500000 },
                { label: "9L ✨", value: 900000 },
              ].map((milestone) => {
                const reached = totalChanted >= milestone.value;
                return (
                  <div
                    key={milestone.label}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${reached
                      ? "bg-orange-50 text-[#FF6B00] border border-orange-100"
                      : "bg-slate-50 text-slate-400 border border-slate-100"
                      }`}
                  >
                    {milestone.label}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* ═══ Daily Log Card ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6"
          >
            <div className="text-center mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2">
                {isToday
                  ? "Today's Japa"
                  : `Japa on ${format(selectedDate, "dd MMM")}`}
              </p>

              {dayCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-green-50 border border-green-100 mb-4"
                >
                  <Check size={14} className="text-green-600" />
                  <span className="text-sm font-bold text-green-700">
                    Chanted {dayCount.toLocaleString("en-IN")} ({dayMalas}{" "}
                    mala{dayMalas !== 1 ? "s" : ""})
                  </span>
                </motion.div>
              )}
            </div>

            <div className="flex items-center justify-center gap-6 mb-5">
              <button
                onClick={() => setMalas(Math.max(1, malas - 1))}
                className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
              >
                <Minus size={20} />
              </button>
              <div className="text-center min-w-[120px]">
                <div className="text-4xl font-extrabold text-slate-800">
                  {malas}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  mala{malas !== 1 ? "s" : ""} •{" "}
                  {(malas * MALA_BEADS).toLocaleString("en-IN")} chants
                </div>
              </div>
              <button
                onClick={() => setMalas(Math.min(21, malas + 1))}
                className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
              >
                <Plus size={20} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {justLogged ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-green-500 text-white font-bold text-lg"
                >
                  <Check size={22} /> Logged 🙏
                </motion.div>
              ) : (
                <motion.button
                  key="log"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleLog}
                  disabled={isLogging || !user}
                  className="w-full py-4 rounded-2xl font-bold text-lg text-white shadow-xl shadow-orange-200/30 active:scale-[0.98] transition-all disabled:opacity-50 bg-gradient-to-r from-[#FF6B00] to-[#FF8533]"
                >
                  {isLogging ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Sparkles size={20} />
                      </motion.div>
                      Logging...
                    </span>
                  ) : dayCount > 0 ? (
                    `Log ${malas} More Mala${malas !== 1 ? "s" : ""} 🙏`
                  ) : (
                    `Log Chanting 🙏`
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ═══ Streak Card ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">
                  Sadhana Streak
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-slate-800">
                    {currentStreak}
                  </span>
                  <span className="text-sm font-bold text-slate-500">
                    day{currentStreak !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <motion.div
                animate={
                  currentStreak > 0 ? { scale: [1, 1.15, 1] } : {}
                }
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background:
                    currentStreak > 0
                      ? "linear-gradient(135deg, rgba(255,107,0,0.08), rgba(255,133,51,0.06))"
                      : "#f1f5f9",
                }}
              >
                <Flame
                  size={32}
                  className={
                    currentStreak > 0 ? "text-[#FF6B00]" : "text-slate-300"
                  }
                  fill={currentStreak > 0 ? "#FF8533" : "none"}
                />
              </motion.div>
            </div>

            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">
                Last 7 Days
              </p>
              <div className="flex items-center gap-2">
                {last7Days.map((day, i) => {
                  const didChant = logDates.has(day);
                  const isDayToday = day === todayStr;
                  return (
                    <button
                      key={day}
                      onClick={() =>
                        setSelectedDate(new Date(day + "T00:00:00"))
                      }
                      className="flex-1 flex flex-col items-center gap-1.5"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.6 + i * 0.05 }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${didChant
                          ? "bg-gradient-to-br from-[#FF6B00] to-[#FF8533] text-white shadow-md shadow-orange-200/50"
                          : isDayToday
                            ? "bg-orange-50 border-2 border-dashed border-[#FF6B00]/40 text-[#FF6B00]/60"
                            : "bg-slate-100 text-slate-300"
                          } ${day === dateStr ? "ring-2 ring-[#FF6B00] ring-offset-2" : ""}`}
                      >
                        {didChant ? "✓" : "·"}
                      </motion.div>
                      <span
                        className={`text-[9px] font-medium ${isDayToday ? "text-[#FF6B00]" : "text-slate-400"
                          }`}
                      >
                        {format(new Date(day + "T00:00:00"), "EEE")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {longestStreak > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-orange-50/60 border border-orange-100"
              >
                <Trophy size={18} className="text-[#FF6B00]" />
                <div>
                  <span className="text-xs font-bold text-[#FF6B00]">
                    Longest Streak
                  </span>
                  <span className="text-xs text-[#FF8533] ml-2">
                    {longestStreak} day{longestStreak !== 1 ? "s" : ""}
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* ═══ MEDITATION TAB ═══ */}
      {activeTab === "meditation" && (
        <motion.div
          key="meditation"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-5"
        >
          {/* Start Meditation CTA */}
          <Link href="/dashboard/sadhana/meditation">
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden rounded-3xl p-6 cursor-pointer"
              style={{
                background:
                  "linear-gradient(135deg, #1E293B 0%, #334155 50%, #475569 100%)",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
                <span
                  style={{
                    fontSize: "180px",
                    fontFamily: "var(--font-noto-devanagari), serif",
                    lineHeight: 1,
                    color: "#FF6B00",
                  }}
                >
                  ॐ
                </span>
              </div>

              <div className="relative text-center">
                <Timer
                  size={36}
                  className="text-[#FF8533]/70 mx-auto mb-3"
                />
                <h3 className="text-xl font-bold text-white mb-1">
                  Start Meditation
                </h3>
                <p className="text-white/40 text-sm mb-4">
                  Sit still, chant, and track your practice
                </p>
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF8533] text-sm font-bold">
                  <Play size={16} fill="#FF8533" /> Begin Session
                </div>
              </div>
            </motion.div>
          </Link>

          {/* Meditation Stats */}
          {meditationStats && meditationStats.totalSessions > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: meditationStats.totalSessions, label: "Sessions", emoji: "🧘" },
                  { value: meditationStats.totalMinutes, label: "Total Min", emoji: "⏱️" },
                  { value: meditationStats.longestSessionMinutes, label: "Longest (min)", emoji: "🏆" },
                  { value: meditationStats.streak, label: "Day Streak", emoji: "🔥" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                  >
                    <span className="text-lg block mb-0.5">{stat.emoji}</span>
                    <p className="text-2xl font-black text-slate-800">
                      {stat.value}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Progressive Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={16} className="text-[#FF6B00]" />
                  <p className="text-xs font-bold text-slate-600">
                    Progressive Tracking — Longest Sit (7 days)
                  </p>
                </div>
                <div className="flex items-end gap-2 h-24">
                  {meditationStats.progressiveData.map((day, i) => {
                    const maxMin = Math.max(
                      ...meditationStats.progressiveData.map(
                        (d) => d.longestMinutes
                      ),
                      1
                    );
                    const height = (day.longestMinutes / maxMin) * 100;
                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <span className="text-[9px] font-bold text-[#FF6B00]/60">
                          {day.longestMinutes > 0
                            ? `${day.longestMinutes}m`
                            : ""}
                        </span>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{
                            height: `${Math.max(height, 4)}%`,
                          }}
                          transition={{ delay: 0.3 + i * 0.05 }}
                          className="w-full rounded-lg"
                          style={{
                            background:
                              day.longestMinutes > 0
                                ? "linear-gradient(180deg, #FF6B00, #FF8533)"
                                : "#f1f5f9",
                            minHeight: "4px",
                          }}
                        />
                        <span className="text-[8px] text-slate-500 font-bold">
                          {format(
                            new Date(day.date + "T00:00:00"),
                            "EEE"
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Total Chants */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Chants via Meditation
                    </p>
                    <p className="text-2xl font-black text-slate-800">
                      {meditationStats.totalChants.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <span className="text-3xl">📿</span>
                </div>
              </motion.div>
            </>
          )}

          {!(meditationStats && meditationStats.totalSessions > 0) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
              <span className="text-4xl mb-3 block">🧘</span>
              <p className="text-sm font-bold text-slate-500 mb-1">
                No meditation sessions yet
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Start your first session to see your progress here
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
