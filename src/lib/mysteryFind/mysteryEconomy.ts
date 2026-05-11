/**
 * Fetchit economy — target outcome mix + value modeling for reveals.
 * Values are buyer-facing appraisals for discovery UX; server should replace
 * with live comps / inventory rules in production.
 */

import type { MysteryRevealTierId } from './outcomeTier'

function hashId(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function random01(seed: string, salt: number): number {
  const x = Math.sin(hashId(`${seed}:${salt}`)) * 10000
  return x - Math.floor(x)
}

/** Target retail mix (Fair / Great / Lower / Rare) — matches product narrative. */
export const MYSTERY_OUTCOME_TARGET_PCT: Record<MysteryRevealTierId, number> = {
  fair: 55,
  great: 25,
  lower: 15,
  rare: 5,
}

/** Deterministic tier draw for a reveal session (55 / 25 / 15 / 5). */
export function drawRevealTier(sessionId: string): MysteryRevealTierId {
  const r = random01(sessionId, 701)
  if (r < 0.55) return 'fair'
  if (r < 0.8) return 'great'
  if (r < 0.95) return 'lower'
  return 'rare'
}

/**
 * Tier-calibrated appraisal vs buyer spend. Keeps headline + math aligned to
 * the drawn tier while the surface still shows a real SKU.
 */
export function estimatedValueForRevealTier(
  paidCents: number,
  tier: MysteryRevealTierId,
  sessionId: string,
): number {
  const paid = Math.max(1, paidCents)
  const bands: Record<MysteryRevealTierId, readonly [number, number]> = {
    fair: [0.93, 1.04],
    great: [1.08, 1.31],
    lower: [0.68, 0.89],
    rare: [1.35, 1.58],
  }
  const [lo, hi] = bands[tier]
  const t = random01(sessionId, 808)
  const mult = lo + (hi - lo) * t
  return Math.max(1, Math.round(paid * mult))
}

export function dealScoreFromValues(paidCents: number, estimatedValueCents: number): number {
  const paid = Math.max(1, paidCents)
  const ratio = estimatedValueCents / paid
  return Math.min(1, Math.max(0, (ratio - 0.85) / 0.55))
}
