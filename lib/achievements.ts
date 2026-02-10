export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  coinBonus: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  first_blood: {
    id: 'first_blood',
    title: 'First Blood',
    description: 'Complete your first exercise',
    icon: 'Sword',
    coinBonus: 10,
    rarity: 'common',
  },
  full_send: {
    id: 'full_send',
    title: 'Full Send',
    description: 'Complete a full workout',
    icon: 'Rocket',
    coinBonus: 25,
    rarity: 'common',
  },
  week_warrior: {
    id: 'week_warrior',
    title: 'Week Warrior',
    description: 'Work out 5 days in a week',
    icon: 'Shield',
    coinBonus: 50,
    rarity: 'rare',
  },
  streak_master: {
    id: 'streak_master',
    title: 'Streak Master',
    description: 'Hit a 7-day workout streak',
    icon: 'Flame',
    coinBonus: 75,
    rarity: 'rare',
  },
  iron_century: {
    id: 'iron_century',
    title: 'Iron Century',
    description: 'Lift 10,000 kg total volume in a week',
    icon: 'Anvil',
    coinBonus: 100,
    rarity: 'epic',
  },
  pr_machine: {
    id: 'pr_machine',
    title: 'PR Machine',
    description: 'Hit 5 personal records',
    icon: 'TrendingUp',
    coinBonus: 75,
    rarity: 'epic',
  },
  coin_collector: {
    id: 'coin_collector',
    title: 'Coin Collector',
    description: 'Earn 1,000 lifetime coins',
    icon: 'Coins',
    coinBonus: 50,
    rarity: 'rare',
  },
  level_10: {
    id: 'level_10',
    title: 'Double Digits',
    description: 'Reach level 10',
    icon: 'Crown',
    coinBonus: 100,
    rarity: 'epic',
  },
  consistency_king: {
    id: 'consistency_king',
    title: 'Consistency King',
    description: 'Maintain a 30-day workout streak',
    icon: 'Trophy',
    coinBonus: 200,
    rarity: 'legendary',
  },
};

export const RARITY_COLORS: Record<AchievementDef['rarity'], { bg: string; text: string; border: string; glow: string }> = {
  common: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', glow: 'shadow-slate-200' },
  rare: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', glow: 'shadow-blue-200' },
  epic: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', glow: 'shadow-purple-200' },
  legendary: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', glow: 'shadow-amber-200' },
};
