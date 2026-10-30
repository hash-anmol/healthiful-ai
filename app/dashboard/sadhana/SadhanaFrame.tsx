"use client";

import React, { Component, useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/components/auth/AuthProvider";

type GetState = FunctionReference<"query", "public", { userId: Id<"users"> }, { state: string } | null>;
type SaveState = FunctionReference<
  "mutation",
  "public",
  { userId: Id<"users">; state: string; updatedAt: number },
  number
>;

type FrameProps = {
  /** The standalone app, e.g. "/lalita/index.html" */
  src: string;
  title: string;
  /** Message prefix the app uses: "<prefix>:ready", ":state", ":save", ":exit" */
  prefix: string;
  /** Page colour shown while the app loads */
  background: string;
  getState: GetState;
  saveState: SaveState;
};

/**
 * A guided sadhana is a standalone app (under public/) shown full screen in an iframe.
 * It talks to this page with postMessage; this page reads and writes the user's
 * saved progress in Convex.
 */
function SyncedFrame({ src, title, prefix, background, getState, saveState }: FrameProps) {
  const { authUser } = useAuth();
  const router = useRouter();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);

  const user = useQuery(api.users.getMe, authUser?._id ? { authUserId: authUser._id } : "skip");
  // undefined = loading, null = nothing saved yet
  const saved = useQuery(getState, user ? { userId: user._id } : "skip");
  const save = useMutation(saveState);

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
    frameRef.current?.contentWindow?.postMessage({ type: `${prefix}:state`, state }, window.location.origin);
  }, [saved, prefix]);

  useEffect(() => {
    sendInitialState();
  }, [sendInitialState]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.source !== frameRef.current?.contentWindow) return;
      const msg = e.data as { type?: string; state?: { updatedAt?: number } };
      if (msg?.type === `${prefix}:ready`) {
        readyRef.current = true;
        sendInitialState();
      } else if (msg?.type === `${prefix}:save` && user && msg.state) {
        save({
          userId: user._id,
          state: JSON.stringify(msg.state),
          updatedAt: msg.state.updatedAt ?? Date.now(),
        }).catch((err) => console.error(`Failed to save ${title} state:`, err));
      } else if (msg?.type === `${prefix}:exit`) {
        router.push("/dashboard/sadhana");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sendInitialState, save, user, router, prefix, title]);

  return <Frame ref={frameRef} src={src} title={title} background={background} />;
}

const Frame = React.forwardRef<HTMLIFrameElement, { src: string; title: string; background: string }>(
  function Frame({ src, title, background }, ref) {
    return (
      <iframe
        ref={ref}
        src={src}
        title={title}
        allow="fullscreen; screen-wake-lock"
        className="fixed inset-0 z-[60] h-full w-full border-0"
        style={{ background }}
      />
    );
  }
);

/**
 * If the Convex backend does not have this sadhana's functions yet (for example the
 * production deployment has not been updated), the query throws while rendering.
 * Catch that and fall back to the app without cloud sync instead of crashing the page.
 */
class SyncBoundary extends Component<
  { fallback: React.ReactNode; title: string; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn(`${this.props.title} sync unavailable, running on this device only:`, error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function SadhanaFrame(props: FrameProps) {
  return (
    <SyncBoundary
      title={props.title}
      fallback={<Frame src={props.src} title={props.title} background={props.background} />}
    >
      <SyncedFrame {...props} />
    </SyncBoundary>
  );
}
