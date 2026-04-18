import { CURATED_DROP_REELS } from './drops/constants'
import type { DropReel } from './drops/types'
import { liveStreamViewerCountSeed } from './marketplaceAuctionUi'

export type LiveAuctionBadge = 'live' | 'ending_soon'

export type LiveAuctionDemoLot = {
  id: string
  listingId: string
  imageUrl: string
  title: string
  seller: string
  sellerRating: number
  watchers: number
  currentBidCents: number
  incrementCents: number
  /** Initial seconds on clock (demo). */
  endsInSec: number
  badge: LiveAuctionBadge
  bidsLast20s: number
}

function parsePriceLabelToCents(label: string): number {
  const n = Number.parseInt(label.replace(/[^0-9]/g, ''), 10)
  if (!Number.isFinite(n) || n <= 0) return 9900
  return n * 100
}

function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function buildLiveAuctionDemoLots(): LiveAuctionDemoLot[] {
  const reels = CURATED_DROP_REELS.filter((r) => r.commerce?.kind === 'buy_sell_listing') as (DropReel & {
    commerce: { kind: 'buy_sell_listing'; listingId: string }
  })[]

  return reels.map((r) => {
    const h = hashSeed(r.id)
    const listCents = parsePriceLabelToCents(r.priceLabel)
    const discount = 0.82 + (h % 12) / 100
    const currentBidCents = Math.max(500, Math.round(listCents * discount))
    const incrementCents = 500
    const watchers = liveStreamViewerCountSeed(r.id)
    const endsInSec = 45 + (h % 220)
    const badge: LiveAuctionBadge = endsInSec < 95 || (h % 5 === 0) ? 'ending_soon' : 'live'
    const bidsLast20s = 2 + (h % 8)
    const sellerRating = 4.6 + (h % 40) / 100

    return {
      id: r.id,
      listingId: r.commerce.listingId,
      imageUrl: r.imageUrls?.[0]?.trim() ?? '',
      title: r.title,
      seller: r.seller,
      sellerRating: Math.round(sellerRating * 10) / 10,
      watchers,
      currentBidCents,
      incrementCents,
      endsInSec,
      badge,
      bidsLast20s,
    }
  })
}

export function formatAuctionAud(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function formatEndsIn(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
