import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createAccount = mutation({
  args: {
    email: v.string(),
    passwordDigest: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("authUsers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      throw new Error("An account with this email already exists");
    }

    return await ctx.db.insert("authUsers", {
      email,
      passwordDigest: args.passwordDigest,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    });
  },
});

export const validateCredentials = mutation({
  args: {
    email: v.string(),
    passwordDigest: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("authUsers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) return null;
    if (user.passwordDigest !== args.passwordDigest) return null;

    await ctx.db.patch(user._id, { lastLoginAt: Date.now() });

    return {
      _id: user._id,
      email: user.email,
    };
  },
});

export const getAuthUser = query({
  args: {
    authUserId: v.id("authUsers"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.authUserId);
    if (!user) return null;
    return {
      _id: user._id,
      email: user.email,
    };
  },
});
