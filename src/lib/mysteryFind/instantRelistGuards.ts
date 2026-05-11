import { INSTANT_RELIST_CONFIG } from './instantRelistConfig'

const STORAGE_DAY = 'fetch.mystery.instantRelist.day.v1'
const STORAGE_COUNT = 'fetch.mystery.instantRelist.count.v1'
const SESSIONS = 'fetch.mystery.instantRelist.sessions.v1'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function parseSessions(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(SESSIONS)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function writeSessions(s: Set<string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SESSIONS, JSON.stringify([...s]))
}

export type InstantRelistAttemptResult =
  | { ok: true }
  | { ok: false; reason: 'daily_limit' | 'already_relisted' | 'disabled' }

/** Demo guardrails — replace with server policy later. */
export function tryBeginInstantRelist(sessionId: string): InstantRelistAttemptResult {
  if (!INSTANT_RELIST_CONFIG.blockDuplicateSessionRelist) return { ok: true }

  if (typeof window === 'undefined') return { ok: true }

  const done = parseSessions()
  if (done.has(sessionId)) return { ok: false, reason: 'already_relisted' }

  let day = window.localStorage.getItem(STORAGE_DAY)
  let count = Number(window.localStorage.getItem(STORAGE_COUNT) ?? '0')

  if (day !== todayKey()) {
    day = todayKey()
    count = 0
    window.localStorage.setItem(STORAGE_DAY, day)
  }

  if (count >= INSTANT_RELIST_CONFIG.maxInstantRelistsPerUserPerDay) {
    return { ok: false, reason: 'daily_limit' }
  }

  return { ok: true }
}

export function finalizeInstantRelistSession(sessionId: string): void {
  if (typeof window === 'undefined') return
  const done = parseSessions()
  done.add(sessionId)
  writeSessions(done)

  let day = window.localStorage.getItem(STORAGE_DAY)
  let count = Number(window.localStorage.getItem(STORAGE_COUNT) ?? '0')
  if (day !== todayKey()) {
    day = todayKey()
    count = 0
  }
  count += 1
  window.localStorage.setItem(STORAGE_DAY, day)
  window.localStorage.setItem(STORAGE_COUNT, String(count))
}
