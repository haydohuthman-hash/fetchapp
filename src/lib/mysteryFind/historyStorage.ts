import type { MysteryFindResult } from './types'

const KEY = 'fetch.mysteryFind.history.v1'
const MAX = 20

export type MysteryHistoryRow = MysteryFindResult & { savedAt: string }

export function readMysteryHistory(): MysteryHistoryRow[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(Boolean) as MysteryHistoryRow[]
  } catch {
    return []
  }
}

export function appendMysteryHistory(entry: MysteryHistoryRow): void {
  if (typeof window === 'undefined') return
  try {
    const prev = readMysteryHistory()
    const next = [entry, ...prev].slice(0, MAX)
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
}
