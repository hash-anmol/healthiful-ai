export type AchievementCategory = 'workout' | 'sadhana' | 'meditation' | 'general';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  coinBonus: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: AchievementCategory;
}

export const ACHIEVEMENT_CATEGORIES: { key: AchievementCategory; label: string; emoji: string }[] = [
  { key: 'workout', label: 'Workout', emoji: '💪' },
  { key: 'sadhana', label: 'Japa & Sadhana', emoji: '📿' },
  { key: 'meditation', label: 'Meditation', emoji: '🧘' },
  { key: 'general', label: 'General', emoji: '⭐' },
];

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  // ── Workout Achievements ──────────────────────────────────
  first_blood: {
    id: 'first_blood',
    title: 'First Blood',
    description: 'Complete your first exercise',
    icon: 'Sword',
    coinBonus: 10,
    rarity: 'common',
    category: 'workout',
  },
  full_send: {
    id: 'full_send',
    title: 'Full Send',
    description: 'Complete a full workout',
    icon: 'Rocket',
    coinBonus: 25,
    rarity: 'common',
    category: 'workout',
  },
  week_warrior: {
    id: 'week_warrior',
    title: 'Week Warrior',
    description: 'Work out 5 days in a week',
    icon: 'Shield',
    coinBonus: 50,
    rarity: 'rare',
    category: 'workout',
  },
  streak_master: {
    id: 'streak_master',
    title: 'Streak Master',
    description: 'Hit a 7-day workout streak',
    icon: 'Flame',
    coinBonus: 75,
    rarity: 'rare',
    category: 'workout',
  },
  iron_century: {
    id: 'iron_century',
    title: 'Iron Century',
    description: 'Lift 10,000 kg total volume in a week',
    icon: 'Anvil',
    coinBonus: 100,
    rarity: 'epic',
    category: 'workout',
  },
  pr_machine: {
    id: 'pr_machine',
    title: 'PR Machine',
    description: 'Hit 5 personal records',
    icon: 'TrendingUp',
    coinBonus: 75,
    rarity: 'epic',
    category: 'workout',
  },
  consistency_king: {
    id: 'consistency_king',
    title: 'Consistency King',
    description: 'Maintain a 30-day workout streak',
    icon: 'Trophy',
    coinBonus: 200,
    rarity: 'legendary',
    category: 'workout',
  },

  // ── General Achievements ──────────────────────────────────
  coin_collector: {
    id: 'coin_collector',
    title: 'Coin Collector',
    description: 'Earn 1,000 lifetime coins',
    icon: 'Coins',
    coinBonus: 50,
    rarity: 'rare',
    category: 'general',
  },
  level_10: {
    id: 'level_10',
    title: 'Double Digits',
    description: 'Reach level 10',
    icon: 'Crown',
    coinBonus: 100,
    rarity: 'epic',
    category: 'general',
  },

  // ── Sadhana Achievements ──────────────────────────────────
  first_japa: {
    id: 'first_japa',
    title: 'प्रथम जप',
    description: 'Complete your first mantra chanting session',
    icon: 'SadhanaOm',
    coinBonus: 15,
    rarity: 'common',
    category: 'sadhana',
  },
  weekly_sadhak: {
    id: 'weekly_sadhak',
    title: 'Weekly Sadhak',
    description: 'Chant every day for a full week',
    icon: 'SadhanaOm',
    coinBonus: 50,
    rarity: 'common',
    category: 'sadhana',
  },
  mala_master: {
    id: 'mala_master',
    title: 'Mala Master',
    description: 'Chant 10+ malas in a single day',
    icon: 'SadhanaMala',
    coinBonus: 40,
    rarity: 'rare',
    category: 'sadhana',
  },
  sadhana_streak_9: {
    id: 'sadhana_streak_9',
    title: 'Navadina Sadhak',
    description: '9-day chanting streak — Navratri spirit',
    icon: 'SadhanaNavratri',
    coinBonus: 75,
    rarity: 'rare',
    category: 'sadhana',
  },
  dawn_devotee: {
    id: 'dawn_devotee',
    title: 'Dawn Devotee',
    description: 'Chant consistently for a full week',
    icon: 'SadhanaOm',
    coinBonus: 60,
    rarity: 'rare',
    category: 'sadhana',
  },
  sadhana_streak_21: {
    id: 'sadhana_streak_21',
    title: 'Ekadashi Vrati',
    description: '21-day unbroken chanting streak',
    icon: 'SadhanaAnushthana',
    coinBonus: 125,
    rarity: 'epic',
    category: 'sadhana',
  },
  sadhana_streak_40: {
    id: 'sadhana_streak_40',
    title: 'Anushthana Siddh',
    description: '40-day continuous chanting — complete Anushthana',
    icon: 'SadhanaAnushthana',
    coinBonus: 250,
    rarity: 'legendary',
    category: 'sadhana',
  },
  lakh_chanter: {
    id: 'lakh_chanter',
    title: 'Lakhpati Sadhak',
    description: 'Cross 1,00,000 total chants',
    icon: 'SadhanaOm',
    coinBonus: 150,
    rarity: 'epic',
    category: 'sadhana',
  },
  panch_lakh: {
    id: 'panch_lakh',
    title: 'Panch Lakh Japi',
    description: 'Cross 5,00,000 total chants',
    icon: 'SadhanaSiddhi',
    coinBonus: 400,
    rarity: 'legendary',
    category: 'sadhana',
  },
  mantra_siddhi: {
    id: 'mantra_siddhi',
    title: 'Mantra Siddhi',
    description: 'Complete 9,00,000 chants — full Navarna Mantra mastery',
    icon: 'SadhanaSiddhi',
    coinBonus: 1000,
    rarity: 'legendary',
    category: 'sadhana',
  },

  // ── Meditation Achievements ───────────────────────────────
  first_dhyana: {
    id: 'first_dhyana',
    title: 'प्रथम ध्यान',
    description: 'Complete your first meditation session',
    icon: 'MeditationLotus',
    coinBonus: 15,
    rarity: 'common',
    category: 'meditation',
  },
  ten_min_sit: {
    id: 'ten_min_sit',
    title: 'Still Mind',
    description: 'Meditate for 10 minutes in one sitting',
    icon: 'MeditationLotus',
    coinBonus: 30,
    rarity: 'common',
    category: 'meditation',
  },
  thirty_min_sit: {
    id: 'thirty_min_sit',
    title: 'Deep Dhyana',
    description: 'Meditate for 30 minutes in one sitting',
    icon: 'MeditationFlame',
    coinBonus: 75,
    rarity: 'rare',
    category: 'meditation',
  },
  hour_sit: {
    id: 'hour_sit',
    title: 'Tapasvi',
    description: 'Meditate for a full hour in one sitting',
    icon: 'MeditationTemple',
    coinBonus: 200,
    rarity: 'epic',
    category: 'meditation',
  },
  dhyana_week: {
    id: 'dhyana_week',
    title: 'Dhyana Warrior',
    description: '7-day consecutive meditation streak',
    icon: 'MeditationFlame',
    coinBonus: 75,
    rarity: 'rare',
    category: 'meditation',
  },
  dhyana_sadhak: {
    id: 'dhyana_sadhak',
    title: 'Dhyana Sadhak',
    description: '21-day unbroken meditation streak',
    icon: 'MeditationTemple',
    coinBonus: 200,
    rarity: 'legendary',
    category: 'meditation',
  },
  progressive_3: {
    id: 'progressive_3',
    title: 'Rising Stillness',
    description: 'Increase meditation by 1+ min daily for 3 days',
    icon: 'MeditationLotus',
    coinBonus: 50,
    rarity: 'rare',
    category: 'meditation',
  },
  progressive_7: {
    id: 'progressive_7',
    title: 'Ascending Yogi',
    description: 'Increase meditation by 1+ min daily for 7 days',
    icon: 'MeditationTemple',
    coinBonus: 150,
    rarity: 'epic',
    category: 'meditation',
  },
  centurion_meditator: {
    id: 'centurion_meditator',
    title: 'Centurion Meditator',
    description: 'Accumulate 100 total minutes of meditation',
    icon: 'MeditationFlame',
    coinBonus: 100,
    rarity: 'epic',
    category: 'meditation',
  },
};

export const RARITY_COLORS: Record<AchievementDef['rarity'], { bg: string; text: string; border: string; glow: string }> = {
  common: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', glow: 'shadow-slate-200' },
  rare: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', glow: 'shadow-blue-200' },
  epic: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', glow: 'shadow-purple-200' },
  legendary: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', glow: 'shadow-amber-200' },
};

// Pixel art icon paths for Sadhana/Meditation achievements (in /public/achievements/)
export const SADHANA_ACHIEVEMENT_ICONS: Record<string, string> = {
  SadhanaOm: '/achievements/first_japa.png',
  SadhanaMala: '/achievements/mala_master.png',
  SadhanaNavratri: '/achievements/navratri.png',
  SadhanaAnushthana: '/achievements/anushthana.png',
  SadhanaSiddhi: '/achievements/mantra_siddhi.png',
  MeditationLotus: '/achievements/mantra_siddhi.png',
  MeditationFlame: '/achievements/navratri.png',
  MeditationTemple: '/achievements/anushthana.png',
};
