/**
 * Adventure rewards — localStorage-backed flags & backpack inventory.
 *
 * Used by the explore "Start adventure" flow to gate the **first-adventure
 * gift card** (illustrated map) and to persist the resulting backpack items
 * so they appear on subsequent visits.
 */

const FIRST_GIFT_KEY = 'fetch.adventure.firstGiftClaimed.v1'
const BACKPACK_KEY = 'fetch.backpack.items.v1'
const PROGRESS_KEY = 'fetch.adventure.progress.v1'
const MAX_ITEMS = 64
export const FIRST_ADVENTURE_XP_REWARD = 100

export type BackpackItemKind = 'map' | 'gem' | 'pass' | 'boost'

export type BackpackItem = {
  id: string
  kind: BackpackItemKind
  title: string
  subtitle?: string
  /** Earned-at timestamp (ms). */
  acquiredAt: number
  /** Optional thumbnail URL — for items with a photo (passes etc.). */
  imageUrl?: string
}

export type AdventureProgress = {
  level: number
  xp: number
  firstAdventureXpAwarded: boolean
}

/** The map gift handed out on first adventure. Kept stable so duplicates don't accumulate. */
export const FIRST_ADVENTURE_MAP_ITEM: BackpackItem = {
  id: 'reward_first_adventure_map',
  kind: 'map',
  title: 'Explorer Map',
  subtitle: 'Marks where Fetch finds rare drops',
  acquiredAt: 0,
}

const DEFAULT_PROGRESS: AdventureProgress = {
  level: 1,
  xp: 0,
  firstAdventureXpAwarded: false,
}

function safeWindow(): Window | null {
  if (typeof window === 'undefined') return null
  return window
}

/* ─── First-gift flag ───────────────────────────────────────────────── */

export function hasClaimedFirstAdventureGift(): boolean {
  const w = safeWindow()
  if (!w) return false
  try {
    return w.localStorage.getItem(FIRST_GIFT_KEY) === 'true'
  } catch {
    return false
  }
}

export function markFirstAdventureGiftClaimed(): void {
  const w = safeWindow()
  if (!w) return
  try {
    w.localStorage.setItem(FIRST_GIFT_KEY, 'true')
  } catch {
    /* ignore quota / private mode */
  }
}

export function resetFirstAdventureGiftFlag(): void {
  const w = safeWindow()
  if (!w) return
  try {
    w.localStorage.removeItem(FIRST_GIFT_KEY)
  } catch {
    /* ignore */
  }
}

/* ─── Backpack items ─────────────────────────────────────────────────── */

export function loadBackpackItems(): BackpackItem[] {
  const w = safeWindow()
  if (!w) return []
  try {
    const raw = w.localStorage.getItem(BACKPACK_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is BackpackItem =>
        !!entry &&
        typeof entry === 'object' &&
        typeof (entry as BackpackItem).id === 'string' &&
        typeof (entry as BackpackItem).title === 'string',
    )
  } catch {
    return []
  }
}

function persistBackpackItems(list: BackpackItem[]) {
  const w = safeWindow()
  if (!w) return
  try {
    w.localStorage.setItem(BACKPACK_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)))
  } catch {
    /* ignore */
  }
}

export function addBackpackItem(item: BackpackItem): BackpackItem[] {
  const existing = loadBackpackItems()
  if (existing.some((i) => i.id === item.id)) return existing
  const stamped: BackpackItem = { ...item, acquiredAt: item.acquiredAt || Date.now() }
  const next = [stamped, ...existing].slice(0, MAX_ITEMS)
  persistBackpackItems(next)
  return next
}

export function removeBackpackItem(id: string): BackpackItem[] {
  const existing = loadBackpackItems()
  const next = existing.filter((i) => i.id !== id)
  if (next.length === existing.length) return existing
  persistBackpackItems(next)
  return next
}

export function clearBackpackItems(): void {
  persistBackpackItems([])
}

export function isBackpackItemPresent(id: string): boolean {
  return loadBackpackItems().some((i) => i.id === id)
}

/* ─── Adventure progress / XP ────────────────────────────────────────── */

export function loadAdventureProgress(): AdventureProgress {
  const w = safeWindow()
  if (!w) return DEFAULT_PROGRESS
  try {
    const raw = w.localStorage.getItem(PROGRESS_KEY)
    if (!raw) return DEFAULT_PROGRESS
    const parsed = JSON.parse(raw) as Partial<AdventureProgress>
    const level = Number.isFinite(parsed.level) ? Math.max(1, Number(parsed.level)) : 1
    const xp = Number.isFinite(parsed.xp) ? Math.max(0, Number(parsed.xp)) : 0
    return {
      level,
      xp,
      firstAdventureXpAwarded: parsed.firstAdventureXpAwarded === true,
    }
  } catch {
    return DEFAULT_PROGRESS
  }
}

function persistAdventureProgress(progress: AdventureProgress) {
  const w = safeWindow()
  if (!w) return
  try {
    w.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    /* ignore */
  }
}

export function awardFirstAdventureXp(): AdventureProgress {
  const current = loadAdventureProgress()
  if (current.firstAdventureXpAwarded) return current
  const next: AdventureProgress = {
    level: Math.max(2, current.level),
    xp: current.xp + FIRST_ADVENTURE_XP_REWARD,
    firstAdventureXpAwarded: true,
  }
  persistAdventureProgress(next)
  return next
}

export function resetAdventureProgress(): void {
  persistAdventureProgress(DEFAULT_PROGRESS)
}
