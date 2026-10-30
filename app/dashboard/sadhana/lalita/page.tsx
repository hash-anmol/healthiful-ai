"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { canAccessSadhana } from "@/lib/featureFlags";
import SadhanaFrame from "../SadhanaFrame";

/** Lalita Sahasranama Sadhana: the standalone app in public/lalita, full screen. */
export default function LalitaSadhanaPage() {
  const { authUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authUser && !canAccessSadhana(authUser.email)) router.replace("/dashboard");
  }, [authUser, router]);

  return (
    <SadhanaFrame
      src="/lalita/index.html"
      title="Lalita Sahasranama Sadhana"
      prefix="lalita"
      background="#120b0e"
      getState={api.lalita.getState}
      saveState={api.lalita.saveState}
    />
  );
}
