import type { MarketplacePeerBrowseFilter } from '../components/ExploreBrowseBanner'

export type ClarifyOption = { id: string; label: string }

export type ClarifyStep = {
  id: string
  question: string
  options: ClarifyOption[]
}

export type ResolvedAdvancedFlow = {
  steps: ClarifyStep[]
  /** `answers` maps step id → chosen option id */
  buildBrowseFilter: (
    answers: Record<string, string>,
    rawQuery: string,
  ) => MarketplacePeerBrowseFilter
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function extractBedSize(raw: string): string | null {
  const q = normalize(raw)
  if (/\bqueen\b/.test(q)) return 'queen'
  if (/\bking\b/.test(q)) return 'king'
  if (/\b(double|full)\b/.test(q)) return 'double'
  if (/\b(single|twin)\b/.test(q)) return 'single'
  return null
}

function isBedFrameIntent(raw: string): boolean {
  const q = normalize(raw)
  if (/\b(bedframe|bedframes)\b/.test(q)) return true
  if (/\bbed\s+frame\b/.test(q)) return true
  if (/\bframe\b/.test(q) && /\bbed\b/.test(q)) return true
  return false
}

function bedBrowseQ(size: string | null, mattress: 'yes' | 'no' | 'either'): string {
  const sz = size ? `${size} ` : ''
  if (mattress === 'no') return `${sz}bed frame`.trim()
  if (mattress === 'yes') return `${sz}bed frame mattress`.trim()
  return `${sz}bed frame mattress bed`.trim()
}

/**
 * Keyword-driven clarification flows for Explore Ask Fetch.
 * Returns null → caller opens full Fetch assistant instead.
 */
export function resolveExploreAskAdvancedFlow(raw: string): ResolvedAdvancedFlow | null {
  const q = normalize(raw)
  if (!q) return null

  if (isBedFrameIntent(raw)) {
    return {
      steps: [
        {
          id: 'mattress',
          question: 'Do you need a mattress with that?',
          options: [
            { id: 'yes', label: 'Yes — include mattresses' },
            { id: 'no', label: 'No — frame only' },
            { id: 'either', label: 'Show bed frames and mattresses' },
          ],
        },
        {
          id: 'budget',
          question: 'Rough budget to narrow listings?',
          options: [
            { id: 'under300', label: 'Under $300' },
            { id: 'under600', label: 'Under $600' },
            { id: 'any', label: 'Any price' },
          ],
        },
      ],
      buildBrowseFilter: (answers, originalRaw) => {
        const size = extractBedSize(originalRaw)
        const m = answers.mattress as 'yes' | 'no' | 'either' | undefined
        const mode = m === 'yes' || m === 'no' || m === 'either' ? m : 'either'
        const qStr = bedBrowseQ(size, mode)
        const b = answers.budget
        const maxPriceCents =
          b === 'under300' ? 30_000 : b === 'under600' ? 60_000 : undefined
        return {
          category: 'furniture',
          q: qStr,
          ...(maxPriceCents != null ? { maxPriceCents } : {}),
        }
      },
    }
  }

  if (/\b(tv|television|smart\s*tv|oled|qled)\b/.test(q)) {
    return {
      steps: [
        {
          id: 'tv_setup',
          question: 'What kind of setup are you after?',
          options: [
            { id: 'mount', label: 'Wall mount' },
            { id: 'stand', label: 'TV on a stand' },
            { id: 'both', label: 'Show mounts and stands' },
          ],
        },
      ],
      buildBrowseFilter: (answers) => {
        const v = answers.tv_setup
        if (v === 'mount') return { category: 'electronics', q: 'TV wall mount bracket' }
        if (v === 'stand') return { category: 'electronics', q: 'TV stand television' }
        return { category: 'electronics', q: 'TV television mount stand' }
      },
    }
  }

  if (/\b(sofa|couch|lounge)\b/.test(q)) {
    return {
      steps: [
        {
          id: 'sofa_shape',
          question: 'Any preference on shape?',
          options: [
            { id: 'sectional', label: 'Sectional / modular' },
            { id: 'standard', label: 'Standard sofa' },
            { id: 'any', label: 'Show all sofas' },
          ],
        },
      ],
      buildBrowseFilter: (answers, originalRaw) => {
        const v = answers.sofa_shape
        const base = normalize(originalRaw).replace(/[^a-z0-9\s]/g, ' ').trim() || 'sofa'
        if (v === 'sectional') return { category: 'furniture', q: `sectional modular ${base}` }
        if (v === 'standard') return { category: 'furniture', q: `sofa couch ${base}` }
        return { category: 'furniture', q: 'sofa couch lounge' }
      },
    }
  }

  return null
}
