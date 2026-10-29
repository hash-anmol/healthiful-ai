"use client";

import React, { Component, useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { canAccessSadhana } from "@/lib/featureFlags";

/**
 * Lalita Sahasranama Sadhana: a standalone app (public/lalita) shown full screen.
 * It talks to this page with postMessage; this page reads and writes the user's
 * saved progress in Convex.
 */
function SyncedFrame() {
  const { authUser } = useAuth();
  const router = useRouter();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);

  const user = useQuery(
    api.users.getMe,
    authUser?._id ? { authUserId: authUser._id } : "skip"
  );
  // undefined = loading, null = nothing saved yet
  const saved = useQuery(api.lalita.getState, user ? { userId: user._id } : "skip");
  const saveState = useMutation(api.lalita.saveState);

  // Hand the saved state to the app once, after both sides are ready. Later live
  // updates are not pushed down: they would fight the session in progress.
  const sentRef = useRef(false);
  const sendInitialState = useCallback(() => {
    if (sentRef.current || !readyRef.current || saved === undefined) return;
    sentRef.current = true;
    let state: unknown = null;
    if (saved) {
      try {
        state = JSON.parse(saved.state);
      } catch {
        state = null;
      }
    }
    frameRef.current?.contentWindow?.postMessage(
      { type: "lalita:state", state },
      window.location.origin
    );
  }, [saved]);

  useEffect(() => {
    sendInitialState();
  }, [sendInitialState]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.source !== frameRef.current?.contentWindow) return;
      const msg = e.data as { type?: string; state?: { updatedAt?: number } };
      if (msg?.type === "lalita:ready") {
        readyRef.current = true;
        sendInitialState();
      } else if (msg?.type === "lalita:save" && user && msg.state) {
        saveState({
          userId: user._id,
          state: JSON.stringify(msg.state),
          updatedAt: msg.state.updatedAt ?? Date.now(),
        }).catch((err) => console.error("Failed to save sadhana state:", err));
      } else if (msg?.type === "lalita:exit") {
        router.push("/dashboard/sadhana");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sendInitialState, saveState, user, router]);

  return (
    <iframe
      ref={frameRef}
      src="/lalita/index.html"
      title="Lalita Sahasranama Sadhana"
      allow="fullscreen"
      className="fixed inset-0 z-[60] h-full w-full border-0 bg-[#120b0e]"
    />
  );
}

/** The sadhana without cloud sync: progress stays in this browser. */
function LocalFrame() {
  return (
    <iframe
      src="/lalita/index.html"
      title="Lalita Sahasranama Sadhana"
      allow="fullscreen"
      className="fixed inset-0 z-[60] h-full w-full border-0 bg-[#120b0e]"
    />
  );
}

/**
 * If the Convex backend does not have the lalita functions yet (for example the
 * production deployment has not been updated), the query throws while rendering.
 * Catch that and fall back to the local-only sadhana instead of crashing the page.
 */
class SyncBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("Lalita sync unavailable, running on this device only:", error);
  }
  render() {
    return this.state.failed ? <LocalFrame /> : this.props.children;
  }
}

export default function LalitaSadhanaPage() {
  const { authUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authUser && !canAccessSadhana(authUser.email)) router.replace("/dashboard");
  }, [authUser, router]);

  return (
    <SyncBoundary>
      <SyncedFrame />
    </SyncBoundary>
  );
}
