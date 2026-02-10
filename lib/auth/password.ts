import { createHmac } from "crypto";

const getPasswordSecret = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return secret;
};

export const createPasswordDigest = (email: string, password: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  return createHmac("sha256", getPasswordSecret())
    .update(`${normalizedEmail}:${password}`)
    .digest("hex");
};
