/**
 * Scaled from $300 max-spend reference (product examples). For display-only previews.
 */

const REF_MAX_USD = 300

function clampMax(usd: number): number {
  return Math.min(Math.max(Math.round(usd), 20), 500)
}

function scale(fromAtRef300: number, maxUsd: number): number {
  return Math.round((fromAtRef300 * clampMax(maxUsd)) / REF_MAX_USD)
}

function fmtUsd(n: number): string {
  return `$${n.toLocaleString('en-AU')}`
}

export type MysteryUpsideTierPreview = {
  id: 'lower' | 'fair' | 'great' | 'rare'
  title: string
  /** e.g. "15% chance" for reference UI */
  chanceLabel: string
  primaryLine: string
  secondaryLine: string
  secondaryEmphasis: 'neutral' | 'green' | 'violet' | 'amber'
}

export function getMysteryUpsidePreviewCards(maxUsdRaw: number): MysteryUpsideTierPreview[] {
  const maxUsd = clampMax(maxUsdRaw)

  const lowerLo = scale(210, maxUsd)
  const lowerHi = scale(260, maxUsd)
  const lowerRelist = scale(190, maxUsd)

  const fairLo = scale(270, maxUsd)
  const fairHi = scale(330, maxUsd)
  const fairRelist = scale(230, maxUsd)

  const greatLo = scale(340, maxUsd)
  const greatHi = scale(480, maxUsd)
  const greatUpsideLo = scale(40, maxUsd)
  const greatUpsideHi = scale(180, maxUsd)

  const rareFloor = scale(500, maxUsd)
  const rareUpsideFloor = scale(200, maxUsd)

  return [
    {
      id: 'lower',
      title: 'Lower Value',
      chanceLabel: '15% chance',
      primaryLine: `You may receive: ${fmtUsd(lowerLo)}–${fmtUsd(lowerHi)}`,
      secondaryLine: `Instant relist: ~${fmtUsd(lowerRelist)} credit`,
      secondaryEmphasis: 'neutral',
    },
    {
      id: 'fair',
      title: 'Fair Value',
      chanceLabel: '55% chance',
      primaryLine: `You may receive: ${fmtUsd(fairLo)}–${fmtUsd(fairHi)}`,
      secondaryLine: `Instant relist: ~${fmtUsd(fairRelist)} credit`,
      secondaryEmphasis: 'neutral',
    },
    {
      id: 'great',
      title: 'Great Find',
      chanceLabel: '25% chance',
      primaryLine: `You may receive: ${fmtUsd(greatLo)}–${fmtUsd(greatHi)}`,
      secondaryLine: `Potential resale upside: +${fmtUsd(greatUpsideLo)}–${fmtUsd(greatUpsideHi)}`,
      secondaryEmphasis: 'green',
    },
    {
      id: 'rare',
      title: 'Rare Find',
      chanceLabel: '5% chance',
      primaryLine: `You may receive: ${fmtUsd(rareFloor)}+`,
      secondaryLine: `Potential resale upside: +${fmtUsd(rareUpsideFloor)}+`,
      secondaryEmphasis: 'violet',
    },
  ]
}
