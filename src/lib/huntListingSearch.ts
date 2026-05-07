import type { PeerListing } from './listingsApi'
import { fetchPublishedListings } from './listingsApi'
import { MARKETPLACE_MOCK_PEER_LISTINGS } from './marketplaceMockPeerListings'

/** Listings newer than this (by created/updated) count as “new” for the hunter. */
const NEW_LISTING_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

export type HuntListingSearchCriteria = {
  huntQuery: string
  /** Explore hunt category chips — align with `demo-marketplace-seed` category slugs + `all`. */
  categoryId: 'all' | 'electronics' | 'collectibles' | 'fashion'
  keywordTags: string[]
  budgetCents: number
  /** When set, prefer just-listed items so Auto-buy / Auto-bid can try to complete first. */
  newListingsOnly: boolean
}

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'for',
  'with',
  'from',
  'that',
  'this',
  'your',
  'any',
  'to',
  'of',
  'in',
  'on',
  'at',
  'is',
  'are',
  'be',
])

export function mapHuntCategoryToApi(
  categoryId: HuntListingSearchCriteria['categoryId'],
): string | undefined {
  if (categoryId === 'all') return undefined
  return categoryId
}

function normalizeAlnumToken(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '').trim()
}

function tokenize(huntQuery: string, keywordTags: string[]): string[] {
  const parts = [...keywordTags, huntQuery]
    .join(' ')
    .toLowerCase()
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const out: string[] = []
  const seen = new Set<string>()
  for (const p of parts) {
    const bare = normalizeAlnumToken(p)
    if (bare.length < 2) continue
    if (STOPWORDS.has(bare)) continue
    if (!seen.has(bare)) {
      seen.add(bare)
      out.push(bare)
    }
  }
  return out
}

function listingHay(l: PeerListing): string {
  return [l.title, l.description, l.keywords, l.category, l.sku, l.locationLabel]
    .filter(Boolean)
    .join(' \n ')
    .toLowerCase()
}

/** OR-style score: each token that appears anywhere in the listing adds weight. */
function scoreListing(l: PeerListing, tokens: string[]): number {
  if (tokens.length === 0) return 0
  const hay = listingHay(l)
  const title = (l.title ?? '').toLowerCase()
  let s = 0
  for (const t of tokens) {
    if (t.length < 2) continue
    if (hay.includes(t)) s += 1
    if (title.includes(t)) s += 0.5
  }
  return s
}

function listingRecencyMs(l: PeerListing): number {
  return Math.max(l.createdAt ?? 0, l.updatedAt ?? 0)
}

function effectivePriceCents(l: PeerListing): number {
  const price = l.priceCents ?? 0
  const reserve = typeof l.reserveCents === 'number' && l.reserveCents > 0 ? l.reserveCents : 0
  return Math.max(price, reserve)
}

function inBudget(l: PeerListing, budgetCents: number): boolean {
  if (!Number.isFinite(budgetCents) || budgetCents <= 0) return true
  return effectivePriceCents(l) <= budgetCents
}

function filterByCategoryPool(list: PeerListing[], cat: string | undefined): PeerListing[] {
  if (!cat) return list
  return list.filter((l) => l.category === cat)
}

/**
 * Loads published listings from GET /api/listings (no text `q`, no maxPrice) so the server
 * returns a full category slice. Budget and keyword matching are applied client-side so
 * “oak sideboard” can still surface when the max price is low (ranked below in-budget picks).
 * Falls back to bundled demo listings if the API fails or returns nothing.
 */
export async function fetchListingsMatchingHunt(
  criteria: HuntListingSearchCriteria,
): Promise<{ listings: PeerListing[]; usedBroadPoolFallback: boolean }> {
  const cat = mapHuntCategoryToApi(criteria.categoryId)
  const tokens = tokenize(criteria.huntQuery, criteria.keywordTags)
  const budgetCents = criteria.budgetCents

  let pool: PeerListing[] = []
  try {
    const r = await fetchPublishedListings({
      category: cat,
      limit: 100,
    })
    pool = r.listings ?? []
  } catch {
    pool = []
  }

  if (pool.length === 0) {
    pool = filterByCategoryPool(MARKETPLACE_MOCK_PEER_LISTINGS, cat)
  }

  let rows = pool
  if (criteria.newListingsOnly) {
    const now = Date.now()
    const cutoff = now - NEW_LISTING_MAX_AGE_MS
    const recent = rows.filter((l) => listingRecencyMs(l) >= cutoff)
    if (recent.length > 0) rows = recent
  }

  const scored = rows.map((l) => ({
    l,
    score: tokens.length ? scoreListing(l, tokens) : 0,
    budgetOk: inBudget(l, budgetCents),
  }))

  const hasTokenSignal = tokens.length > 0
  const strong = hasTokenSignal ? scored.filter((x) => x.score > 0) : []
  const usedBroadPoolFallback = hasTokenSignal && strong.length === 0

  const sortPool = usedBroadPoolFallback || !hasTokenSignal ? scored : strong

  sortPool.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (criteria.newListingsOnly) {
      const nr = listingRecencyMs(b.l) - listingRecencyMs(a.l)
      if (nr !== 0) return nr
    }
    const ai = a.budgetOk ? 1 : 0
    const bi = b.budgetOk ? 1 : 0
    if (bi !== ai) return bi - ai
    return (b.l.updatedAt ?? b.l.createdAt) - (a.l.updatedAt ?? a.l.createdAt)
  })

  return {
    listings: sortPool.slice(0, 16).map((x) => x.l),
    usedBroadPoolFallback,
  }
}
