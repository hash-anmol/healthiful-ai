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
    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const convex = getConvexServerClient();
    const passwordDigest = createPasswordDigest(normalizedEmail, password);
    const user = await convex.mutation(api.auth.validateCredentials, {
      email: normalizedEmail,
      passwordDigest,
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = createSessionToken({ userId: user._id, email: user.email });
    const response = NextResponse.json({ ok: true, user });
    response.cookies.set(sessionCookieName, token, cookieOptions);
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
