import { loadSession } from './fetchUserSession'

const LS_KEY = 'fetch.rewardProgress'

export type ChestTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export const CHEST_TIERS: readonly ChestTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const

export const CHEST_TIER_META: Record<ChestTier, {
  label: string
  coins: number
  bar: string
  glow: string
  bg: string
  border: string
  text: string
}> = {
  bronze:   { label: 'Bronze',   coins: 50,  bar: 'from-amber-700 via-amber-600 to-yellow-700',      glow: 'rgba(180,83,9,0.5)',   bg: '#44280a', border: 'rgba(180,83,9,0.6)',   text: '#d97706' },
  silver:   { label: 'Silver',   coins: 100, bar: 'from-slate-400 via-slate-300 to-gray-400',         glow: 'rgba(148,163,184,0.5)', bg: '#2a2e35', border: 'rgba(148,163,184,0.5)', text: '#94a3b8' },
  gold:     { label: 'Gold',     coins: 200, bar: 'from-yellow-300 via-amber-400 to-yellow-500',      glow: 'rgba(251,191,36,0.55)', bg: '#3d2a04', border: 'rgba(251,191,36,0.5)',  text: '#fbbf24' },
  platinum: { label: 'Platinum', coins: 350, bar: 'from-cyan-300 via-teal-200 to-sky-300',            glow: 'rgba(103,232,249,0.5)', bg: '#0c2a2e', border: 'rgba(103,232,249,0.4)', text: '#67e8f9' },
  diamond:  { label: 'Diamond',  coins: 500, bar: 'from-violet-400 via-purple-300 to-fuchsia-400',    glow: 'rgba(192,132,252,0.55)', bg: '#1e0a3a', border: 'rgba(192,132,252,0.5)', text: '#c084fc' },
}

export const COINS_PER_DAY = 10

export interface RewardProgress {
  streakDays: number
  weeksCompleted: number
  weeklyChestClaimed: boolean
  totalCoins: number
  currentTierIndex: number
}

function hashEmail(email: string): number {
  let h = 0
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0
  return h
}

function defaultProgress(): RewardProgress {
  const email = loadSession()?.email?.trim() ?? ''
  const h = email ? hashEmail(email) : 0x5bd1e995
  return {
    streakDays: (h % 5) + 1,
    weeksCompleted: h % 4,
    weeklyChestClaimed: false,
    totalCoins: ((h % 5) + 1) * COINS_PER_DAY + (h % 4) * 7 * COINS_PER_DAY,
    currentTierIndex: Math.min(h % 4, CHEST_TIERS.length - 1),
  }
}

let cached: RewardProgress | null = null

export function getRewardProgress(): RewardProgress {
  if (cached) return cached
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RewardProgress>
      cached = {
        streakDays: typeof parsed.streakDays === 'number' ? Math.min(7, Math.max(0, parsed.streakDays)) : defaultProgress().streakDays,
        weeksCompleted: typeof parsed.weeksCompleted === 'number' ? Math.min(5, Math.max(0, parsed.weeksCompleted)) : defaultProgress().weeksCompleted,
        weeklyChestClaimed: typeof parsed.weeklyChestClaimed === 'boolean' ? parsed.weeklyChestClaimed : false,
        totalCoins: typeof parsed.totalCoins === 'number' ? Math.max(0, parsed.totalCoins) : defaultProgress().totalCoins,
        currentTierIndex: typeof parsed.currentTierIndex === 'number' ? Math.min(CHEST_TIERS.length - 1, Math.max(0, parsed.currentTierIndex)) : defaultProgress().currentTierIndex,
      }
      return cached
    }
  } catch { /* ignore */ }
  cached = defaultProgress()
  return cached
}

function persist(p: RewardProgress) {
  cached = p
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p))
  } catch { /* ignore */ }
}

export function getCurrentTier(): ChestTier {
  return CHEST_TIERS[getRewardProgress().currentTierIndex]
}

export function advanceStreak(): RewardProgress {
  const p = { ...getRewardProgress() }
  if (p.streakDays < 7) {
    p.streakDays += 1
    p.totalCoins += COINS_PER_DAY
  }
  if (p.streakDays >= 7) {
    p.streakDays = 0
    p.weeksCompleted = Math.min(5, p.weeksCompleted + 1)
    p.weeklyChestClaimed = false
  }
  persist(p)
  return p
}

export function claimWeeklyChest(): RewardProgress {
  const p = { ...getRewardProgress() }
  const tier = CHEST_TIERS[p.currentTierIndex]
  p.totalCoins += CHEST_TIER_META[tier].coins
  p.weeklyChestClaimed = true
  p.weeksCompleted = 0
  p.currentTierIndex = Math.min(p.currentTierIndex + 1, CHEST_TIERS.length - 1)
  persist(p)
  return p
}

export function resetRewardProgress(): void {
  cached = null
  try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
}
