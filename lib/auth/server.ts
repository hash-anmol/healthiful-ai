import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexServerClient } from "@/lib/convexServerClient";
import { getSessionFromCookies } from "./session";

export const getServerAuthContext = async () => {
  const session = await getSessionFromCookies();
  if (!session) {
    return {
      session: null,
      profile: null,
    };
  }

  try {
    const convex = getConvexServerClient();
    const profile = await convex.query(api.users.getMe, {
      authUserId: session.userId as Id<"authUsers">,
    });
    return {
      session,
      profile,
    };
  } catch {
    return {
      session: null,
      profile: null,
    };
  }
};
