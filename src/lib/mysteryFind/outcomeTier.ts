/** Surprise-commerce reveal tiers — marketplace-safe naming only. */

export type MysteryRevealTierId = 'fair' | 'great' | 'lower' | 'rare'

const LEGACY_RATIO_TIERS: { minRatio: number; tier: MysteryRevealTierId }[] = [
  { minRatio: 1.35, tier: 'rare' },
  { minRatio: 1.1, tier: 'great' },
  { minRatio: 0.9, tier: 'fair' },
  { minRatio: 0, tier: 'lower' },
]

/** Infer tier from paid vs appraisal when `revealTier` is absent (older history rows). */
export function deriveRevealTierFromValues(paidCents: number, estimatedValueCents: number): MysteryRevealTierId {
  const paid = Math.max(1, paidCents)
  const ratio = estimatedValueCents / paid
  for (const row of LEGACY_RATIO_TIERS) {
    if (ratio >= row.minRatio) return row.tier
  }
  return 'lower'
}

export function outcomeTierHeadline(tier: MysteryRevealTierId): string {
  switch (tier) {
    case 'fair':
      return 'Fair Value Find.'
    case 'great':
      return 'You found a Great Find.'
    case 'lower':
      return 'Lower Value Find'
    case 'rare':
      return 'You found a Rare Find.'
    default:
      return 'Your reveal'
  }
}

/** Secondary line under headline on result (soft wording for lower tier). */
export function outcomeTierSubheadline(tier: MysteryRevealTierId): string | null {
  if (tier === 'lower') {
    return "Not your best reveal, but you can relist instantly."
  }
  return null
}

/** Commerce / Mystery Find result hero — premium surprise commerce, not wagering. */
export function commerceRevealHeadline(tier: MysteryRevealTierId): string {
  switch (tier) {
    case 'great':
      return 'You found a Great Find!'
    case 'rare':
      return 'You uncovered something rare.'
    case 'fair':
    case 'lower':
    default:
      return 'Solid reveal.'
  }
}

/** Short label for badges / history. */
export function revealTierShortLabel(tier: MysteryRevealTierId): string {
  switch (tier) {
    case 'fair':
      return 'Fair Value'
    case 'great':
      return 'Great Find'
    case 'lower':
      return 'Lower Value'
    case 'rare':
      return 'Rare Find'
    default:
      return 'Reveal'
  }
}
