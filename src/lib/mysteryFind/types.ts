/**
 * Fetchit (marketplace reveal flow) — types for Supabase-ready MVP (mock-backed).
 * “Shopping discovery” UX, not gambling; all copy stays marketplace-safe.
 */

import type { MysteryRevealTierId } from './outcomeTier'

export type MysteryCategoryId =
  | 'sneakers'
  | 'tech'
  | 'pokemon'
  | 'vintage'
  | 'fashion'
  | 'home'
  | 'gaming'
  | 'luxury'

/** UI lane selection; `all` / `surprise` resolve to an eligible category at reveal time. */
export type MysteryCategorySelectId = MysteryCategoryId | 'surprise' | 'all'

export type MysteryBudgetPresetId = 20 | 50 | 100 | 250 | 500 | 'custom'

export type MysteryBudget = {
  preset: MysteryBudgetPresetId
  minCents: number
  maxCents: number
  labelAud: string
}

export type MysteryVibeId =
  | 'safe_pick'
  | 'best_deal'
  | 'rare_find'
  | 'trending'
  | 'local_treasure'
  | 'luxury_surprise'

export type MysteryFindSessionStatus =
  | 'idle'
  | 'selecting'
  | 'revealing'
  | 'revealed'
  | 'purchased'
  | 'cancelled'
  | 'instant_relist_pending'
  | 'instant_relist_completed'

/** Live session record — map 1:1 to a `mystery_find_sessions` row later. */
export type MysteryFindSession = {
  id: string
  userId: string | null
  category: MysteryCategoryId
  budgetMin: number
  budgetMax: number
  vibe: MysteryVibeId
  status: MysteryFindSessionStatus
  selectedListingId: string | null
  paidAmountCents: number | null
  estimatedValueCents: number | null
  createdAt: string
  updatedAt?: string
  /** Instant Relist Credit economy + audit (optional until server persists). */
  userSpendCents?: number | null
  sellerPayoutCents?: number | null
  platformMarginCents?: number | null
  resultType?: string | null
  instantRelistEligible?: boolean | null
  instantRelistCreditCents?: number | null
  relistAccepted?: boolean | null
  relistedListingId?: string | null
  creditIssuedCents?: number | null
}

export type MysteryEligibleListing = {
  id: string
  title: string
  imageUrl: string
  sellerId: string
  sellerDisplayName: string
  /** 0–5 */
  sellerRating: number
  /** Buyer-visible “was” / MSRP hint (cents). */
  compareAtCents: number
  /** Listing ask (cents). */
  priceCents: number
  category: MysteryCategoryId
  /** Listing age seed for ranking (ms since “listed”). */
  listedAgoMs: number
  /** Engagement proxy: views + saves composite. */
  engagementScore: number
  /** Local / fast ship hint for vibe matching. */
  shipsLocalFast: boolean
  status: 'active' | 'sold' | 'draft'
  sellerOnboarded: boolean
  restricted: boolean
  /** When sold via Fetchit reveals (seller UX). */
  soldViaMysteryFind?: boolean
  /** Seller opt-in: listing can be matched in Fetchit inventory. */
  mysteryFindEligible?: boolean
  /** Minimum seller payout model (cents) when matched via Fetchit checkout. */
  mysteryMinPayoutCents?: number
  /** Lane for ranking / rare pool preference. */
  mysteryRarityLane?: 'standard' | 'elevated' | 'luxury'
  /** 0–1 — seller boost for discovery ranking. */
  mysteryBoostPriority?: number
  /** Pool filter for premium / rare-targeted reveals. */
  mysteryLuxuryEligible?: boolean
  /** Circulating inventory from Instant Relist back into Fetchit. */
  mysterySource?: 'marketplace' | 'mystery_relist'
  /** Times this SKU re-entered Fetchit inventory (Instant Relist). */
  circulationCount?: number
}

export type MysteryFindResult = {
  sessionId: string
  listing: MysteryEligibleListing
  /** What the buyer pays for this reveal (usually ≤ compareAt). */
  paidCents: number
  /** Tier-calibrated appraisal used for badges + relist storytelling. */
  estimatedValueCents: number
  /** 0–1 discovery score from appraisal vs spend. */
  dealScore: number
  /** Engine outcome tier for this reveal (authoritative for UI). */
  revealTier?: MysteryRevealTierId
}
