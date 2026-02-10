import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getConvexServerClient } from "@/lib/convexServerClient";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const convex = getConvexServerClient();
    const user = await convex.query(api.auth.getAuthUser, {
      authUserId: session.userId as Id<"authUsers">,
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
