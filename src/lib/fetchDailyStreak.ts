/**
 * Daily streak — local-only persistence + rollover/reset logic.
 *
 * The splash screen drives from this: on mount it reads current state,
 * advances the day if a new calendar day has begun, and returns the
 * computed record + whether it should be shown today at all.
 */

const STORAGE_KEY = 'fetch:dailyStreak:v1'

/** Days that unlock a treasure-chest reward. Kept ascending. */
export const STREAK_MILESTONES: { day: number; coins: number; label: string }[] = [
  { day: 3, coins: 10, label: 'Big milestone!' },
  { day: 7, coins: 50, label: 'Big milestone!' },
  { day: 14, coins: 120, label: 'Two-week streak!' },
  { day: 30, coins: 320, label: 'Monthly legend!' },
  { day: 60, coins: 700, label: 'Unstoppable!' },
  { day: 100, coins: 1500, label: 'Hall of Fame!' },
]

export type StreakRecord = {
  count: number
  lastOpenDate: string
  highestStreak: number
  claimedMilestones: number[]
  coinsBalance: number
}

const DEFAULT_RECORD: StreakRecord = {
  count: 0,
  lastOpenDate: '',
  highestStreak: 0,
  claimedMilestones: [],
  coinsBalance: 0,
}

function todayKey(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function daysBetween(a: string, b: string): number {
  if (!a || !b) return Infinity
  const pa = Date.parse(`${a}T00:00:00`)
  const pb = Date.parse(`${b}T00:00:00`)
  if (!Number.isFinite(pa) || !Number.isFinite(pb)) return Infinity
  return Math.round((pb - pa) / (24 * 60 * 60 * 1000))
}

function safeRead(): StreakRecord {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_RECORD }
    const parsed = JSON.parse(raw) as Partial<StreakRecord>
    return {
      count: Number.isFinite(parsed.count) ? Math.max(0, Number(parsed.count)) : 0,
      lastOpenDate: typeof parsed.lastOpenDate === 'string' ? parsed.lastOpenDate : '',
      highestStreak: Number.isFinite(parsed.highestStreak) ? Math.max(0, Number(parsed.highestStreak)) : 0,
      claimedMilestones: Array.isArray(parsed.claimedMilestones)
        ? parsed.claimedMilestones.filter((n) => typeof n === 'number' && Number.isFinite(n))
        : [],
      coinsBalance: Number.isFinite(parsed.coinsBalance) ? Math.max(0, Number(parsed.coinsBalance)) : 0,
    }
  } catch {
    return { ...DEFAULT_RECORD }
  }
}

function safeWrite(next: StreakRecord): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable — splash still works, just won't persist */
  }
}

export type StreakTickResult = {
  record: StreakRecord
  /** True when we advanced to a new day (streak bumped) or just reset (fresh day 1). */
  advancedToday: boolean
  /** True when we already showed the streak splash today. */
  alreadyShownToday: boolean
  /** New milestone unlocked this tick that has NOT yet been claimed. */
  pendingMilestone: { day: number; coins: number; label: string } | null
}

/** Idempotent-within-day: call on app open. Returns the current record + whether to show splash. */
export function tickDailyStreak(now = new Date()): StreakTickResult {
  const today = todayKey(now)
  const prev = safeRead()
  const alreadyShownToday = prev.lastOpenDate === today

  let nextCount = prev.count
  let advancedToday = false
  if (alreadyShownToday) {
    // same-day open: no change
  } else {
    const gap = daysBetween(prev.lastOpenDate, today)
    if (!prev.lastOpenDate || gap > 1) {
      nextCount = 1
    } else if (gap === 1) {
      nextCount = prev.count + 1
    } else {
      nextCount = Math.max(1, prev.count)
    }
    advancedToday = true
  }

  const nextHighest = Math.max(prev.highestStreak, nextCount)
  const record: StreakRecord = {
    ...prev,
    count: nextCount,
    lastOpenDate: today,
    highestStreak: nextHighest,
  }

  if (advancedToday) safeWrite(record)

  const milestone = STREAK_MILESTONES.find(
    (m) => record.count === m.day && !record.claimedMilestones.includes(m.day),
  )
  const pendingMilestone = milestone
    ? { day: milestone.day, coins: milestone.coins, label: milestone.label }
    : null

  return { record, advancedToday, alreadyShownToday, pendingMilestone }
}

/** Mark a milestone as claimed and add its coins to the balance. */
export function claimStreakMilestone(day: number): StreakRecord {
  const cur = safeRead()
  const meta = STREAK_MILESTONES.find((m) => m.day === day)
  if (!meta) return cur
  if (cur.claimedMilestones.includes(day)) return cur
  const next: StreakRecord = {
    ...cur,
    claimedMilestones: [...cur.claimedMilestones, day].sort((a, b) => a - b),
    coinsBalance: cur.coinsBalance + meta.coins,
  }
  safeWrite(next)
  return next
}

/** Streak ladder progress for the footer dots (1 → 2 → 3 → 7 → chest). */
export const STREAK_LADDER_STOPS = [1, 2, 3, 7] as const

export function streakEncouragement(count: number): string {
  if (count >= 100) return 'Immortal!'
  if (count >= 60) return 'Hall of Fame!'
  if (count >= 30) return 'Legend!'
  if (count >= 14) return 'Unstoppable!'
  if (count >= 7) return 'Legend!'
  if (count >= 4) return 'On a roll!'
  if (count >= 3) return 'Unstoppable!'
  if (count >= 2) return 'You’re on fire!'
  return 'Keep it going!'
}

/** Test-only reset. Not wired into the UI. */
export function __resetDailyStreakForTests(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* no-op */
  }
}
