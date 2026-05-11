import type { MysteryBudgetPresetId, MysteryCategoryId, MysteryCategorySelectId, MysteryVibeId } from './types'

export const MYSTERY_CATEGORY_ORDER: MysteryCategoryId[] = [
  'sneakers',
  'tech',
  'pokemon',
  'vintage',
  'fashion',
  'home',
  'gaming',
  'luxury',
]

export const MYSTERY_CATEGORY_LABEL: Record<MysteryCategoryId, string> = {
  sneakers: 'Sneakers',
  tech: 'Tech',
  pokemon: 'Pokémon',
  vintage: 'Vintage',
  fashion: 'Fashion',
  home: 'Home',
  gaming: 'Gaming',
  luxury: 'Luxury',
}

/** Category pills: Surprise Me + lanes (no “All” — use Surprise for any category). */
export const FETCHIT_CATEGORY_CHIPS: { id: MysteryCategorySelectId; label: string }[] = [
  { id: 'sneakers', label: 'Sneakers' },
  { id: 'tech', label: 'Tech' },
  { id: 'pokemon', label: 'Pokémon' },
  { id: 'vintage', label: 'Vintage' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'home', label: 'Home' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'surprise', label: 'Surprise Me' },
]

export const MYSTERY_LANE_CARDS: { id: MysteryCategorySelectId; label: string; emoji: string }[] = [
  { id: 'sneakers', label: 'Sneakers', emoji: '👟' },
  { id: 'tech', label: 'Tech', emoji: '💻' },
  { id: 'pokemon', label: 'Pokémon', emoji: '🃏' },
  { id: 'vintage', label: 'Vintage', emoji: '📻' },
  { id: 'fashion', label: 'Fashion', emoji: '👗' },
  { id: 'home', label: 'Home', emoji: '🏠' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'luxury', label: 'Luxury', emoji: '💎' },
  { id: 'surprise', label: 'Surprise Me', emoji: '✨' },
]

export const MYSTERY_BUDGET_PRESETS: { preset: MysteryBudgetPresetId; label: string; minCents: number; maxCents: number }[] =
  [
    { preset: 20, label: '$20', minCents: 1500, maxCents: 2500 },
    { preset: 50, label: '$50', minCents: 4000, maxCents: 6000 },
    { preset: 100, label: '$100', minCents: 9000, maxCents: 11000 },
    { preset: 250, label: '$250', minCents: 23000, maxCents: 27000 },
    { preset: 500, label: '$500', minCents: 48000, maxCents: 52000 },
    { preset: 'custom', label: 'Custom', minCents: 0, maxCents: 0 },
  ]

export const MYSTERY_VIBES: { id: MysteryVibeId; label: string; sub: string }[] = [
  { id: 'safe_pick', label: 'Safe pick', sub: 'High seller trust & proven demand' },
  { id: 'best_deal', label: 'Best deal', sub: 'Max discount vs estimated value' },
  { id: 'rare_find', label: 'Rare find', sub: 'Odd listings worth another look' },
  { id: 'trending', label: 'Trending', sub: 'Strong engagement right now' },
  { id: 'local_treasure', label: 'Local treasure', sub: 'Nearby or fast AU delivery' },
  { id: 'luxury_surprise', label: 'Luxury surprise', sub: 'Premium lane within budget' },
]

export const MYSTERY_TRUST_BULLETS: string[] = [
  'Real seller listing',
  'Within your selected budget',
  'Minimum value guarantee',
  'Relist instantly from your bag',
  'No duplicate picks in one session',
  'Protected by Fetchit buyer protection',
]
