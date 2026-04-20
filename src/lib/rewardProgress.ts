import { loadSession } from './fetchUserSession'

const LS_KEY = 'fetch.rewardProgress'

export interface RewardProgress {
  /** Days completed in the current streak week (0–7). Resets to 0 after hitting 7. */
  streakDays: number
  /** Weeks completed toward the weekly goal (0–5). Resets to 0 after claiming. */
  weeksCompleted: number
  /** Whether the weekly chest has been claimed this cycle. */
  weeklyChestClaimed: boolean
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

/** Call when the user "completes" a day. Returns the new progress. */
export function advanceStreak(): RewardProgress {
  const p = { ...getRewardProgress() }
  if (p.streakDays < 7) {
    p.streakDays += 1
  }
  if (p.streakDays >= 7) {
    p.streakDays = 0
    p.weeksCompleted = Math.min(5, p.weeksCompleted + 1)
    p.weeklyChestClaimed = false
  }
  persist(p)
  return p
}

/** Call when the user claims the weekly chest. */
export function claimWeeklyChest(): RewardProgress {
  const p = { ...getRewardProgress() }
  p.weeklyChestClaimed = true
  p.weeksCompleted = 0
  persist(p)
  return p
}

/** Reset for testing. */
export function resetRewardProgress(): void {
  cached = null
  try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
}
