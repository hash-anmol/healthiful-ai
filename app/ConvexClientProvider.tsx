"use client";

import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { AuthProvider } from "@/components/auth/AuthProvider";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  if (!convexUrl) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-red-500">Convex Configuration Missing</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          The <code>NEXT_PUBLIC_CONVEX_URL</code> environment variable is missing.
        </p>
        <p className="mt-4">
          Please run <code className="bg-secondary px-2 py-1 rounded">npx convex dev</code> in your terminal to set up the backend.
        </p>
      </div>
    );
  }

  const convex = new ConvexReactClient(convexUrl);

  return (
    <ConvexProvider client={convex}>
      <AuthProvider>{children}</AuthProvider>
    </ConvexProvider>
  );
}
