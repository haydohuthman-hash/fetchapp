/** Client-side signals for gated Pokies “Earn” tasks (device-local; upgrade with server ledger later). */

export const LIST_ITEM_PUBLISHED_AT_MS_KEY = 'fetchit.tasks.listItemPublishedAtMs'

export const WATCH_LIVE_TOTAL_SECONDS_KEY = 'fetchit.tasks.watchLiveTotalSeconds'

/** When user tapped “Earn” on the watch-live task; baseline for 5‑min unlock. */
const WATCH_LIVE_EARN_BASELINE_KEY = 'fetchit.pokies.watchLiveEarnBaselineSec'

const EARN_TASK_STARTED_AT_KEY = 'fetchit.pokies.earnTaskStartedAtMs'

/** Call when a marketplace listing was successfully published. */
export function markListItemPublishedNow(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LIST_ITEM_PUBLISHED_AT_MS_KEY, String(Date.now()))
  } catch {
    /* quota / private */
  }
}

export function readListItemPublishedAtMs(): number {
  if (typeof window === 'undefined') return 0
  try {
    const v = Number(window.localStorage.getItem(LIST_ITEM_PUBLISHED_AT_MS_KEY))
    return Number.isFinite(v) && v > 0 ? v : 0
  } catch {
    return 0
  }
}

export function getWatchLiveTotalSeconds(): number {
  if (typeof window === 'undefined') return 0
  try {
    const v = Number(window.localStorage.getItem(WATCH_LIVE_TOTAL_SECONDS_KEY))
    return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0
  } catch {
    return 0
  }
}

/** Add fractional seconds accumulated while viewing real HLS (capped per tick). */
export function addWatchLivePlaybackSeconds(delta: number): void {
  if (typeof window === 'undefined') return
  if (!Number.isFinite(delta) || delta <= 0) return
  const add = Math.min(5, delta)
  try {
    const next = getWatchLiveTotalSeconds() + add
    window.localStorage.setItem(WATCH_LIVE_TOTAL_SECONDS_KEY, String(Math.floor(next)))
  } catch {
    /* quota */
  }
}

function loadJsonRecord(key: string): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return {}
    const o = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(o)) {
      const n = Number(v)
      if (Number.isFinite(n) && n > 0) out[k] = n
    }
    return out
  } catch {
    return {}
  }
}

function saveJsonRecord(key: string, rec: Record<string, number>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(rec))
  } catch {
    /* quota */
  }
}

/** Persist “Earn” tap time for gated tasks (`list_item`). */
export function recordEarnTaskStartedAt(taskId: string): void {
  const prev = loadJsonRecord(EARN_TASK_STARTED_AT_KEY)
  prev[taskId] = Date.now()
  saveJsonRecord(EARN_TASK_STARTED_AT_KEY, prev)
}

export function earnTaskStartedAtMs(taskId: string): number {
  return loadJsonRecord(EARN_TASK_STARTED_AT_KEY)[taskId] ?? 0
}

export function setWatchLiveEarnBaselineFromNow(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(WATCH_LIVE_EARN_BASELINE_KEY, String(getWatchLiveTotalSeconds()))
  } catch {
    /* quota */
  }
}

export function watchLiveEarnBaselineSeconds(): number {
  if (typeof window === 'undefined') return 0
  try {
    const v = Number(window.localStorage.getItem(WATCH_LIVE_EARN_BASELINE_KEY))
    return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0
  } catch {
    return 0
  }
}

/** Seconds watched since the baseline captured at “Earn” for watch-live. */
export function watchLiveEarnProgressSeconds(): number {
  return Math.max(0, getWatchLiveTotalSeconds() - watchLiveEarnBaselineSeconds())
}

/** Verifiable Pokies tasks (others show “Soon” until wired to server/events). */
export const POKIES_VERIFIED_TASK_IDS = new Set<string>(['list_item', 'watch_live'])
