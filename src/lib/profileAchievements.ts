/**
 * Client-side profile achievements for the redesigned profile screen.
 * The "welcome" entry is granted automatically the first time the user lands
 * on their profile — every account gets this first badge.
 */

const STORAGE_KEY = 'fetchit.profile.achievementState.v1'

export type UnlockedAchievement = {
  id: string
  unlockedAt: number
}

type PersistedShape = {
  unlocked: UnlockedAchievement[]
}

export const WELCOME_ID = 'welcome'

export type ProfileAchievementCatalogEntry = {
  id: string
  label: string
  subtitle: string
  /** Locked rows show muted treatment until criteria are met (future hooks). */
  locked?: boolean
}

/** Display catalog (welcome is always obtainable via {@link ensureNewUserWelcomeAchievement}). */
export const PROFILE_ACHIEVEMENT_CATALOG: ProfileAchievementCatalogEntry[] = [
  { id: WELCOME_ID, label: 'Fresh Start', subtitle: 'Welcome to Fetchit' },
  { id: 'auction_pro', label: 'Auction Pro', subtitle: 'Win 50 battles', locked: true },
  { id: 'fast_bidder', label: 'Fast Bidder', subtitle: 'Bid in final 10s', locked: true },
  { id: 'top_challenger', label: 'Top Challenger', subtitle: 'Climb the ranks', locked: true },
  { id: 'big_winner', label: 'Big Winner', subtitle: 'Score a grail auction', locked: true },
  { id: 'hot_streak', label: 'Hot Streak', subtitle: '7-day login streak', locked: true },
]

function readStored(): PersistedShape {
  if (typeof window === 'undefined') return { unlocked: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { unlocked: [] }
    const p = JSON.parse(raw) as unknown
    if (!p || typeof p !== 'object') return { unlocked: [] }
    const unlocked = (p as PersistedShape).unlocked
    if (!Array.isArray(unlocked)) return { unlocked: [] }
    return {
      unlocked: unlocked.filter(
        (x): x is UnlockedAchievement =>
          x != null &&
          typeof x === 'object' &&
          typeof (x as UnlockedAchievement).id === 'string' &&
          typeof (x as UnlockedAchievement).unlockedAt === 'number',
      ),
    }
  } catch {
    return { unlocked: [] }
  }
}

function persist(unlocked: UnlockedAchievement[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ unlocked } satisfies PersistedShape))
  } catch {
    /* ignore quota */
  }
}

/**
 * Ensures every user has exactly one automatic first badge (welcome).
 * Call from profile mount — idempotent.
 */
export function ensureNewUserWelcomeAchievement(): UnlockedAchievement[] {
  const { unlocked } = readStored()
  if (unlocked.some((x) => x.id === WELCOME_ID)) return unlocked

  const next: UnlockedAchievement[] = [...unlocked, { id: WELCOME_ID, unlockedAt: Date.now() }]
  persist(next)
  return next
}

export function isAchievementUnlocked(
  unlocked: UnlockedAchievement[],
  achievementId: string,
): boolean {
  return unlocked.some((x) => x.id === achievementId)
}
