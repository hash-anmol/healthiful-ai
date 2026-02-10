"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

type AuthUser = {
  _id: Id<"authUsers">;
  email: string;
};

type AuthContextValue = {
  authUser: AuthUser | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/me", { credentials: "include" });
      const json = (await response.json()) as { user: AuthUser | null };
      setAuthUser(json.user ?? null);
    } catch {
      setAuthUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setAuthUser(null);
  }, []);

  const value = useMemo(
    () => ({
      authUser,
      loading,
      refreshAuth,
      logout,
    }),
    [authUser, loading, refreshAuth, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
