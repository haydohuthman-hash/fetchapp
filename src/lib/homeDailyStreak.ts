/** Calendar day key in local time (YYYY-MM-DD). Shared with daily rewards. */
export function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const DAILY_STREAK_STORAGE_KEY = 'fetch.home.dailyStreak.v1'

/** Set when streak advances; Explore consumes to show the popup even if another shell ran the bump first. */
const STREAK_CELEBRATE_PENDING_KEY = 'fetch.pendingStreakCelebrate.v1'

function setPendingStreakCelebrate(count: number, date: string) {
  try {
    window.localStorage.setItem(STREAK_CELEBRATE_PENDING_KEY, JSON.stringify({ date, count }))
  } catch {
    /* ignore */
  }
}

/** Clears and returns true when a pending celebration matches today’s `count` (e.g. Explore after For You bumped). */
export function consumePendingStreakCelebrateIfMatches(expectedCount: number): boolean {
  if (typeof window === 'undefined') return false
  const today = todayKey()
  try {
    const raw = window.localStorage.getItem(STREAK_CELEBRATE_PENDING_KEY)
    if (!raw) return false
    const p = JSON.parse(raw) as Partial<{ date: string; count: number }>
    if (p.date !== today) {
      window.localStorage.removeItem(STREAK_CELEBRATE_PENDING_KEY)
      return false
    }
    if (p.count !== expectedCount) return false
    window.localStorage.removeItem(STREAK_CELEBRATE_PENDING_KEY)
    return true
  } catch {
    return false
  }
}

type DailyStreakPersisted = {
  lastDate: string
  count: number
}

function calendarDayAddYmd(ymd: string, deltaDays: number): string {
  const [ys, ms, ds] = ymd.split('-')
  const y = Number(ys)
  const m = Number(ms)
  const d = Number(ds)
  const dt = new Date(y, m - 1, d + deltaDays)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export type DailyStreakBumpResult = {
  count: number
  /** New calendar-day visit extended the streak (first day counts). Not shown after missed-day reset to 1. */
  celebrate: boolean
}

function bumpDailyStreakCore(): DailyStreakBumpResult {
  const today = todayKey()
  try {
    const raw = window.localStorage.getItem(DAILY_STREAK_STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<DailyStreakPersisted>) : null
    const lastDate = typeof parsed?.lastDate === 'string' ? parsed.lastDate : null
    const prevCount =
      typeof parsed?.count === 'number' && Number.isFinite(parsed.count) ? Math.max(0, Math.floor(parsed.count)) : 0

    const validLast = lastDate && /^\d{4}-\d{2}-\d{2}$/.test(lastDate) ? lastDate : null
    const yesterday = calendarDayAddYmd(today, -1)

    if (!validLast) {
      const next: DailyStreakPersisted = { lastDate: today, count: 1 }
      window.localStorage.setItem(DAILY_STREAK_STORAGE_KEY, JSON.stringify(next))
      setPendingStreakCelebrate(1, today)
      return { count: 1, celebrate: true }
    }
    if (validLast === today) {
      return { count: Math.max(1, prevCount || 1), celebrate: false }
    }
    if (validLast === yesterday) {
      const nextCount = Math.max(1, prevCount || 1) + 1
      const next: DailyStreakPersisted = { lastDate: today, count: nextCount }
      window.localStorage.setItem(DAILY_STREAK_STORAGE_KEY, JSON.stringify(next))
      setPendingStreakCelebrate(nextCount, today)
      return { count: nextCount, celebrate: true }
    }
    const next: DailyStreakPersisted = { lastDate: today, count: 1 }
    window.localStorage.setItem(DAILY_STREAK_STORAGE_KEY, JSON.stringify(next))
    return { count: 1, celebrate: false }
  } catch {
    return { count: 1, celebrate: false }
  }
}

export function loadAndBumpDailyStreakWithCelebrate(): DailyStreakBumpResult {
  return bumpDailyStreakCore()
}

/** Visit-based streak — bumps when the calendar day advances; resets after a missed day. */
export function loadAndBumpDailyStreakCount(): number {
  return bumpDailyStreakCore().count
}

/** Read persisted streak count (no mutation). Defaults to 1. */
export function readDailyStreakCount(): number {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(DAILY_STREAK_STORAGE_KEY) : null
    const parsed = raw ? (JSON.parse(raw) as Partial<DailyStreakPersisted>) : null
    const n =
      typeof parsed?.count === 'number' && Number.isFinite(parsed.count)
        ? Math.floor(parsed.count)
        : 1
    return Math.max(1, n)
  } catch {
    return 1
  }
}
