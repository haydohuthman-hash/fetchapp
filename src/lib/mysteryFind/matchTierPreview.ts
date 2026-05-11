import type { MysteryCategoryId, MysteryCategorySelectId } from './types'

export type MysteryMatchTier = {
  id: 'common' | 'better' | 'rare' | 'dream'
  title: string
  blurb: string
  pct: number
}

const BASE: Record<MysteryCategoryId, readonly [number, number, number, number]> = {
  sneakers: [65, 25, 8, 2],
  tech: [62, 26, 9, 3],
  pokemon: [58, 28, 11, 3],
  vintage: [55, 30, 12, 3],
  fashion: [63, 27, 8, 2],
  home: [60, 28, 10, 2],
  gaming: [61, 27, 10, 2],
  luxury: [52, 32, 13, 3],
}

const SURPRISE: readonly [number, number, number, number] = [62, 26, 10, 2]

const TITLES: Record<MysteryMatchTier['id'], { title: string; blurb: string }> = {
  common: {
    title: 'Common finds',
    blurb: 'Great everyday listings most shoppers see in this lane.',
  },
  better: {
    title: 'Better finds',
    blurb: 'Strong picks with solid seller history.',
  },
  rare: {
    title: 'Rare finds',
    blurb: 'Harder-to-source pieces that stand out in search.',
  },
  dream: {
    title: 'Dream finds',
    blurb: 'Standout value moments when inventory lines up.',
  },
}

function adjustForBudget(maxCents: number, t: [number, number, number, number]): [number, number, number, number] {
  const a = [...t] as [number, number, number, number]
  // Slightly more upside when max spend is higher (still marketplace-safe wording).
  if (maxCents >= 25000) {
    a[0] -= 3
    a[3] += 3
  } else if (maxCents >= 10000) {
    a[0] -= 2
    a[2] += 1
    a[3] += 1
  }
  // Renormalize to 100
  const s = a.reduce((x, y) => x + y, 0)
  return a.map((x) => Math.round((x / s) * 100)) as [number, number, number, number]
}

function normalizeTo100(parts: number[]): number[] {
  const s = parts.reduce((a, b) => a + b, 0)
  if (s === 0) return parts
  const rounded = parts.map((p) => Math.round((p / s) * 100))
  let diff = 100 - rounded.reduce((a, b) => a + b, 0)
  let i = rounded.length - 1
  while (diff !== 0 && i >= 0) {
    rounded[i]! += diff > 0 ? 1 : -1
    diff += diff > 0 ? -1 : 1
    i -= 1
  }
  return rounded
}

/**
 * Illustrative listing-match mix for the selected lane and max price — NOT gambling odds.
 * Copy frames this as inventory-dependent matching.
 */
export function getListingMatchPreview(
  lane: MysteryCategorySelectId,
  maxCents: number,
): MysteryMatchTier[] {
  const seeds = adjustForBudget(
    maxCents,
    (lane === 'surprise' || lane === 'all' ? [...SURPRISE] : [...(BASE[lane as MysteryCategoryId] ?? SURPRISE)]) as [number, number, number, number],
  )
  const adjusted = normalizeTo100([...seeds])
  const ids: MysteryMatchTier['id'][] = ['common', 'better', 'rare', 'dream']

  return ids.map((id, i) => ({
    id,
    title: TITLES[id].title,
    blurb: TITLES[id].blurb,
    pct: adjusted[i] ?? 0,
  }))
}
