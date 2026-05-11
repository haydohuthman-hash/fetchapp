import type { MysteryCategoryId, MysteryEligibleListing, MysteryFindResult } from './types'
import { INSTANT_RELIST_CONFIG } from './instantRelistConfig'

export type InstantRelistOffer = {
  eligible: boolean
  creditCents: number
  /** Modelled seller share of buyer spend (planning — not legal tender). */
  sellerPayoutEstimateCents: number
  /** Modelled amount retained after Marketplace Credit (buyer-facing summary). */
  platformRetentionEstimateCents: number
  liquidityRate: number
}

function liquidityForListing(listing: MysteryEligibleListing): number {
  const eligible = (INSTANT_RELIST_CONFIG.eligibleCategories as readonly MysteryCategoryId[]).includes(
    listing.category,
  )
  if (!eligible) return 0
  const l = INSTANT_RELIST_CONFIG.categoryLiquidity[listing.category]
  return typeof l === 'number' ? l : 0.55
}

/**
 * relistCredit ≈ min( est * liquidity * demandAdj , spend * maxPct ),
 * then clamped by minimum platform margin and optional fraud multiplier.
 */
export function computeInstantRelistOffer(result: MysteryFindResult): InstantRelistOffer {
  const paid = Math.max(1, result.paidCents)
  const est = Math.max(1, result.estimatedValueCents)
  const liquidityRate = liquidityForListing(result.listing)

  const demandBoost = 1 + Math.min(INSTANT_RELIST_CONFIG.engagementBoostCap, result.listing.engagementScore / 650)
  const valueLeg = Math.floor(est * liquidityRate * demandBoost)
  const spendLeg = Math.floor(paid * INSTANT_RELIST_CONFIG.maxCreditPercent)
  let creditCents = Math.min(valueLeg, spendLeg)

  const ratingAdj = result.listing.sellerRating / 5
  const sellerPayoutEstimateCents = Math.floor(paid * (0.74 + ratingAdj * 0.06))

  const maxAffordable = Math.max(0, paid - INSTANT_RELIST_CONFIG.minPlatformMarginCents)
  creditCents = Math.min(creditCents, maxAffordable)

  creditCents = Math.floor(creditCents * INSTANT_RELIST_CONFIG.fraudSuspiciousCreditMultiplier)

  if (creditCents < INSTANT_RELIST_CONFIG.minRelistCreditCents) {
    return {
      eligible: false,
      creditCents: 0,
      sellerPayoutEstimateCents,
      platformRetentionEstimateCents: Math.max(0, paid),
      liquidityRate,
    }
  }

  const platformRetentionEstimateCents = Math.max(0, paid - creditCents)

  return {
    eligible: true,
    creditCents,
    sellerPayoutEstimateCents,
    platformRetentionEstimateCents,
    liquidityRate,
  }
}
