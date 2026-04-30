/**
 * Lightweight localStorage-backed save list for items that lose a Bid Wars vote.
 *
 * The matchmaking overlay (`FetchBidWarsMatchmakingOverlay`) lets the viewer
 * "save" a listing — either while voting or after the lobby skips it — so
 * they can revisit it later. We persist the minimum fields needed to render
 * a thumbnail card + price; if the marketplace later wants the full listing
 * it should re-fetch by id.
 */

import type { PeerListing } from './listingsApi'

const STORAGE_KEY = 'fetch.bidwars.savedListings.v1'
const MAX_SAVED = 32

export type SavedBidWarsListing = {
  id: string
  title: string
  priceCents: number
  imageUrl: string
  /** Optional context — useful for "saved on Wed at 9pm" style copy later. */
  savedAt: number
  /** Original category so saved chips can group later. */
  category?: string
  profileDisplayName?: string | null
}

function safeWindow(): Window | null {
  if (typeof window === 'undefined') return null
  return window
}

export function loadSavedBidWarsListings(): SavedBidWarsListing[] {
  const w = safeWindow()
  if (!w) return []
  try {
    const raw = w.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is SavedBidWarsListing =>
        !!entry &&
        typeof entry === 'object' &&
        typeof (entry as SavedBidWarsListing).id === 'string' &&
        typeof (entry as SavedBidWarsListing).title === 'string',
    )
  } catch {
    return []
  }
}

function persist(list: SavedBidWarsListing[]) {
  const w = safeWindow()
  if (!w) return
  try {
    w.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_SAVED)))
  } catch {
    /* ignore quota / private mode */
  }
}

export function isBidWarsListingSaved(listingId: string): boolean {
  return loadSavedBidWarsListings().some((l) => l.id === listingId)
}

export function saveBidWarsListing(listing: PeerListing): SavedBidWarsListing[] {
  const existing = loadSavedBidWarsListings()
  if (existing.some((l) => l.id === listing.id)) return existing
  const entry: SavedBidWarsListing = {
    id: listing.id,
    title: listing.title,
    priceCents: listing.priceCents,
    imageUrl: listing.images?.[0]?.url ?? '',
    savedAt: Date.now(),
    category: listing.category,
    profileDisplayName: listing.profileDisplayName ?? null,
  }
  const next = [entry, ...existing].slice(0, MAX_SAVED)
  persist(next)
  return next
}

export function unsaveBidWarsListing(listingId: string): SavedBidWarsListing[] {
  const existing = loadSavedBidWarsListings()
  const next = existing.filter((l) => l.id !== listingId)
  if (next.length === existing.length) return existing
  persist(next)
  return next
}

export function clearSavedBidWarsListings(): void {
  persist([])
}
