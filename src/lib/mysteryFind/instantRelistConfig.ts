/**
 * Instant Relist · Marketplace Credit — admin-tunable economy (MVP local config).
 * Tune server-side / Supabase later without changing UI copy.
 */

import type { MysteryCategoryId } from './types'

export const INSTANT_RELIST_CONFIG = {
  /** Max % of user spend that can be returned as Fetchit credit. */
  maxCreditPercent: 0.7,
  /** Floor Fetchit keeps before paying relist credit (risk / ops). */
  minPlatformMarginCents: 400,
  /** Minimum credit to show Instant Relist (avoid micro-credit noise). */
  minRelistCreditCents: 500,
  /** Hard cap on relist credits issued per user per rolling day (demo guard). */
  maxInstantRelistsPerUserPerDay: 5,
  /** Cooldown between relist credits (ms); 0 = off for local demo. */
  relistCooldownMs: 0,
  /** Block issuing two credits for the same Fetchit session id. */
  blockDuplicateSessionRelist: true,
  /** Diminishing credit multiplier when demand signal is weak. */
  engagementBoostCap: 0.12,
  /** Server hook: multiply credit for accounts flagged low-risk (1 = normal). */
  fraudSuspiciousCreditMultiplier: 1,
  eligibleCategories: [
    'sneakers',
    'tech',
    'pokemon',
    'vintage',
    'fashion',
    'home',
    'gaming',
    'luxury',
  ] as const satisfies readonly MysteryCategoryId[],
  categoryLiquidity: {
    sneakers: 0.7,
    tech: 0.65,
    pokemon: 0.6,
    vintage: 0.6,
    fashion: 0.55,
    home: 0.5,
    gaming: 0.58,
    luxury: 0.75,
  } satisfies Record<MysteryCategoryId, number>,
} as const
