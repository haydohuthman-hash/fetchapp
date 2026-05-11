import type { MysteryFindSession } from './types'

const KEY = 'fetch.mystery.sessionLog.v1'
const MAX = 80

export function appendMysterySessionLog(entry: MysteryFindSession): void {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(KEY)
    const prev = raw ? (JSON.parse(raw) as MysteryFindSession[]) : []
    const safe = Array.isArray(prev) ? prev : []
    window.localStorage.setItem(KEY, JSON.stringify([entry, ...safe].slice(0, MAX)))
  } catch {
    /* quota */
  }
}
