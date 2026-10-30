"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { canAccessSadhana } from "@/lib/featureFlags";
import SadhanaFrame from "../SadhanaFrame";

/** Nitya pranayama and Swadhisthana mantra meditation: the standalone app in public/nitya, full screen. */
export default function NityaSadhanaPage() {
  const { authUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authUser && !canAccessSadhana(authUser.email)) router.replace("/dashboard");
  }, [authUser, router]);

  return (
    <SadhanaFrame
      src="/nitya/index.html"
      title="Nitya Sadhana"
      prefix="nitya"
      background="#0a0d1e"
      getState={api.nitya.getState}
      saveState={api.nitya.saveState}
    />
  );
}
