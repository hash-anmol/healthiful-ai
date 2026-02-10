/** XP required to reach a given level */
export const xpForLevel = (level: number): number => {
  if (level <= 1) return 0;
  return Math.round(100 * level * 1.2);
};

/** Determine the level for a given total XP */
export const levelForXp = (xp: number): number => {
  let level = 1;
  let accumulated = 0;
  while (true) {
    const next = xpForLevel(level + 1);
    if (accumulated + next > xp) break;
    accumulated += next;
    level++;
  }
  return level;
};

/** Title for a given level */
export const titleForLevel = (level: number): string => {
  if (level <= 5) return "Beginner Lifter";
  if (level <= 10) return "Dedicated Athlete";
  if (level <= 20) return "Iron Warrior";
  if (level <= 35) return "Elite Performer";
  return "Legendary";
};

/** Coin / XP reward constants */
export const REWARDS = {
  EXERCISE_COMPLETE: { coins: 10, xp: 15 },
  WORKOUT_COMPLETE: { coins: 50, xp: 75 },
  PERSONAL_RECORD: { coins: 25, xp: 40 },
  STREAK_3: { coins: 30, xp: 50 },
  STREAK_7: { coins: 100, xp: 150 },
  FIRST_WORKOUT_OF_WEEK: { coins: 20, xp: 30 },
  RPE_LOGGED: { coins: 5, xp: 5 },
} as const;
