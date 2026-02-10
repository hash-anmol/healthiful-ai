"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const { authUser, loading, refreshAuth } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && authUser) {
      router.replace("/onboarding");
    }
  }, [authUser, loading, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error ?? "Authentication failed");
        return;
      }

      await refreshAuth();
      router.replace("/onboarding");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {mode === "login"
            ? "Sign in to continue your personalized training journey."
            : "Create your account to save workouts and progress."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password (min 8 characters)"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />

          {error ? <p className="text-sm font-medium text-red-500">{error}</p> : null}

          <Button type="submit" className="w-full h-12 text-base font-bold" disabled={submitting}>
            {submitting ? "Please wait..." : mode === "login" ? "Sign In" : "Sign Up"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-sm font-semibold text-[var(--primary)]"
          onClick={() => setMode((prev) => (prev === "login" ? "signup" : "login"))}
          disabled={submitting}
        >
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
