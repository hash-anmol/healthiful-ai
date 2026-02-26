/**
 * Feature flags — controls feature visibility per user.
 *
 * Currently gates Sadhana features to a single account in production.
 */

const SADHANA_WHITELIST = new Set([
  "anmolmalik.oss@gmail.com",
]);

/**
 * Returns true if the given email is allowed to see Sadhana features
 * (Japa Tracker, Meditation Timer, Sadhana achievements, Sadhana analytics).
 *
 * In development (`NODE_ENV !== 'production'`) this always returns true
 * so all features are visible during local development.
 */
export function canAccessSadhana(email: string | null | undefined): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (!email) return false;
  return SADHANA_WHITELIST.has(email.toLowerCase());
}
