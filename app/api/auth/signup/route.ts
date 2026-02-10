import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { createPasswordDigest } from "@/lib/auth/password";
import { createSessionToken, sessionCookieName } from "@/lib/auth/session";
import { getConvexServerClient } from "@/lib/convexServerClient";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Email and a password with at least 8 characters are required." },
        { status: 400 }
      );
    }

    const convex = getConvexServerClient();
    const passwordDigest = createPasswordDigest(normalizedEmail, password);
    const authUserId = await convex.mutation(api.auth.createAccount, {
      email: normalizedEmail,
      passwordDigest,
    });

    const token = createSessionToken({ userId: authUserId, email: normalizedEmail });
    const response = NextResponse.json({
      ok: true,
      user: { _id: authUserId, email: normalizedEmail },
    });
    response.cookies.set(sessionCookieName, token, cookieOptions);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
