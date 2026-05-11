import type { MysteryBudget } from './types'

const MIN_SPEND_AUD = 20
const SLIDER_CAP_DOLLARS = 500

/** Map slider USD (integer, 20–500+) → eligible budget band for MVP listing filter. */
export function budgetFromMaxSpendDollars(maxSpendDollars: number): MysteryBudget {
  const ui =
    Number.isFinite(maxSpendDollars) && maxSpendDollars > 0
      ? Math.min(Math.max(Math.round(maxSpendDollars), MIN_SPEND_AUD), SLIDER_CAP_DOLLARS)
      : 100
  /** Slight headroom above $500 for “500+” pool matching (inventory feel). Cap for demo. */
  const effectiveAud =
    ui >= SLIDER_CAP_DOLLARS ? Math.min(Math.floor(ui * 1.08), 650) : ui
  const maxCents = Math.round(effectiveAud * 100)
  const minCents = Math.max(Math.round(minAudToCents(MIN_SPEND_AUD)), Math.floor(maxCents * 0.18))
  const labelAud = ui >= SLIDER_CAP_DOLLARS ? `Up to $${SLIDER_CAP_DOLLARS}+` : `Up to $${ui}`

  return {
    preset: 'custom',
    minCents,
    maxCents,
    labelAud,
  }
}

function minAudToCents(aud: number): number {
  return Math.round(aud * 100)
}
