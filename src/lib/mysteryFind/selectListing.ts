import type {
  MysteryBudget,
  MysteryEligibleListing,
  MysteryCategoryId,
  MysteryCategorySelectId,
  MysteryFindResult,
  MysteryVibeId,
} from './types'
import type { MysteryRevealTierId } from './outcomeTier'
import { MYSTERY_CATEGORY_ORDER } from './constants'
import { MYSTERY_MOCK_INVENTORY } from './mockInventory'
import {
  dealScoreFromValues,
  drawRevealTier,
  estimatedValueForRevealTier,
  random01,
} from './mysteryEconomy'

function vibeMultiplier(
  vibe: MysteryVibeId,
  listing: MysteryEligibleListing,
  budgetMaxCents: number,
): number {
  const discount =
    listing.compareAtCents > 0
      ? (listing.compareAtCents - listing.priceCents) / Math.max(1, listing.compareAtCents)
      : 0
  const freshness = 1 / (1 + listing.listedAgoMs / (86400000 * 14))
  const local = listing.shipsLocalFast ? 1.12 : 1
  switch (vibe) {
    case 'safe_pick':
      return 0.55 + (listing.sellerRating / 5) * 0.45 + freshness * 0.08
    case 'best_deal':
      return 0.3 + discount * 1.4 + (listing.sellerRating / 5) * 0.15
    case 'rare_find':
      return 0.4 + (1 - freshness) * 0.35 + random01(listing.id, 3) * 0.2
    case 'trending':
      return 0.35 + Math.min(1, listing.engagementScore / 120) * 0.65
    case 'local_treasure':
      return local * (0.45 + freshness * 0.25 + (listing.shipsLocalFast ? 0.35 : 0))
    case 'luxury_surprise':
      return (
        0.25 +
        Math.min(1, listing.priceCents / Math.max(1, budgetMaxCents)) * 0.55 +
        (listing.category === 'luxury' ? 0.3 : 0.06)
      )
    default:
      return 0.5
  }
}

function baseScore(listing: MysteryEligibleListing): number {
  const sr = listing.sellerRating / 5
  const freshness = 1 / (1 + listing.listedAgoMs / (86400000 * 30))
  const engagement = Math.min(1, listing.engagementScore / 100)
  const discount =
    listing.compareAtCents > listing.priceCents
      ? (listing.compareAtCents - listing.priceCents) / Math.max(1, listing.compareAtCents)
      : 0
  const circulationBonus =
    listing.mysterySource === 'mystery_relist' ? Math.min(0.12, 0.04 + (listing.circulationCount ?? 0) * 0.02) : 0
  return sr * 0.28 + freshness * 0.22 + engagement * 0.22 + discount * 0.28 + circulationBonus
}

function weightedPick(rows: { weight: number; item: MysteryEligibleListing }[], sessionId: string): MysteryEligibleListing {
  const total = rows.reduce((s, r) => s + Math.max(0, r.weight), 0)
  if (total <= 0 || rows.length === 0) {
    throw new Error('mystery_pick_empty')
  }
  let t = random01(sessionId, 99) * total
  for (const r of rows) {
    t -= Math.max(0, r.weight)
    if (t <= 0) return r.item
  }
  return rows[rows.length - 1]!.item
}

/** Prefer luxury / elevated lanes when targeting a rare headline (falls back to full pool). */
function poolForRevealTier(pool: MysteryEligibleListing[], tier: MysteryRevealTierId): MysteryEligibleListing[] {
  if (tier !== 'rare') return pool
  const pref = pool.filter(
    (l) =>
      l.mysteryLuxuryEligible === true ||
      l.mysteryRarityLane === 'luxury' ||
      l.category === 'luxury' ||
      l.mysteryRarityLane === 'elevated',
  )
  return pref.length > 0 ? pref : pool
}

function mysterySellerEconomicsOk(l: MysteryEligibleListing): boolean {
  if (l.mysteryFindEligible === false) return false
  const minP = l.mysteryMinPayoutCents ?? Math.floor(l.priceCents * 0.55)
  const modeledSellerShare = Math.floor(l.priceCents * 0.76)
  return modeledSellerShare >= minP
}

/** Resolve “Surprise me” to a category that has mock inventory in budget. */
export function resolvePickCategory(
  selection: MysteryCategorySelectId,
  budget: MysteryBudget,
  sessionId: string,
): MysteryCategoryId {
  if (selection !== 'surprise' && selection !== 'all') return selection

  const eligibleCats = MYSTERY_CATEGORY_ORDER.filter((cat) => {
    const pool = filterEligibleForBudget(
      MYSTERY_MOCK_INVENTORY.filter((x) => x.category === cat),
      budget,
    )
    return pool.length > 0
  })

  if (eligibleCats.length === 0) {
    throw new Error('mystery_no_eligible_listings')
  }

  const idx = Math.floor(random01(sessionId, 142) * eligibleCats.length)
  return eligibleCats[idx]!
}

export function filterEligibleForBudget(
  listings: MysteryEligibleListing[],
  budget: MysteryBudget,
): MysteryEligibleListing[] {
  return listings.filter(
    (l) =>
      l.status === 'active' &&
      !l.restricted &&
      l.sellerOnboarded &&
      l.sellerRating >= 3.6 &&
      l.priceCents >= budget.minCents &&
      l.priceCents <= budget.maxCents &&
      (l.compareAtCents <= 0 || l.compareAtCents >= l.priceCents) &&
      mysterySellerEconomicsOk(l),
  )
}

export function pickMysteryListing(input: {
  category: MysteryCategorySelectId
  budget: MysteryBudget
  vibe?: MysteryVibeId
  sessionId: string
}): MysteryFindResult {
  const vibe: MysteryVibeId = input.vibe ?? 'best_deal'
  const revealTier = drawRevealTier(input.sessionId)
  const category = resolvePickCategory(input.category, input.budget, input.sessionId)

  const poolRaw = filterEligibleForBudget(
    MYSTERY_MOCK_INVENTORY.filter((x) => x.category === category),
    input.budget,
  )
  const pool = poolForRevealTier(poolRaw, revealTier)
  if (pool.length === 0) {
    throw new Error('mystery_no_eligible_listings')
  }

  const ranked = pool.map((listing) => {
    const vm = vibeMultiplier(vibe, listing, input.budget.maxCents)
    const boost = listing.mysteryBoostPriority ?? 0.55
    const weight = Math.pow(0.12 + baseScore(listing) * vm * (0.42 + boost * 0.58), 1.85)
    return { weight, listing }
  })

  ranked.sort((a, b) => b.weight - a.weight)
  const top = ranked.slice(0, Math.min(12, ranked.length))
  const picked = weightedPick(
    top.map((r) => ({ weight: r.weight, item: r.listing })),
    input.sessionId,
  )

  const paidCents = picked.priceCents
  const estimatedValueCents = estimatedValueForRevealTier(paidCents, revealTier, input.sessionId)
  const dealScore = dealScoreFromValues(paidCents, estimatedValueCents)

  return {
    sessionId: input.sessionId,
    listing: { ...picked, soldViaMysteryFind: true },
    paidCents,
    estimatedValueCents,
    dealScore,
    revealTier,
  }
}
