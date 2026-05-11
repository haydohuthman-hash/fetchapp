import { CURATED_DROP_REELS } from './drops/constants'
import type { DropMediaKind, DropReel } from './drops/types'

/** Progressive sample MP4 (Google host) — same sources as {@link ../drops/devDemoDropsFeed}. */
const MOCK_LIVE_FEED_MP4_A =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
const MOCK_LIVE_FEED_MP4_B =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'

/**
 * Curated catalogue rows labelled for “live auction” demos, each given a playable `videoUrl`
 * so {@link dropsReelsForLiveAuctionFloor} and explore tap-to-watch handoffs behave like real streams.
 */
export function getMockStreamCapableLiveReels(): DropReel[] {
  const rows = CURATED_DROP_REELS.filter((r) => r.id.startsWith('curated_demo_live_'))
  return rows.map((r, i) => ({
    ...r,
    videoUrl: i % 2 === 0 ? MOCK_LIVE_FEED_MP4_A : MOCK_LIVE_FEED_MP4_B,
    mediaKind: 'video' as DropMediaKind,
  }))
}
import { listingImageAbsoluteUrl } from './listingsApi'
import { liveStreamViewerCountSeed, formatLiveViewerShort } from './marketplaceAuctionUi'

export type LiveFeedTag = 'live' | 'ending_soon' | 'hot' | 'just_started'
export type LiveFeedCategory = 'all' | 'furniture' | 'electronics' | 'fashion' | 'collectibles' | 'free' | 'ending_soon'

export type LiveFeedStream = {
  id: string
  listingId: string
  imageUrl: string
  /** Portrait / carousel thumb (defaults to square cover when unset). */
  portraitImageUrl?: string
  title: string
  streamTitle: string
  seller: string
  priceCents: number
  watchers: number
  watchersLabel: string
  tag: LiveFeedTag
  category: LiveFeedCategory
  location: string
  minutesAgo: number
  /** Demo countdown seconds for ring timer (ignored when `playbackUrl` is set). */
  endsInSec: number
  /** HLS playback URL from Mux when this row is backed by the drops API. */
  playbackUrl?: string
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const STREAM_TITLES: string[] = [
  'Vintage furniture finds',
  'Tech drop — live deals',
  'Sneaker clearout',
  'Home décor haul',
  'Free curbside pickup',
  'Garage-sale style stream',
]

const CATEGORIES: LiveFeedCategory[] = [
  'furniture', 'electronics', 'fashion', 'furniture', 'free', 'collectibles',
]

const LOCATIONS = ['Brisbane', 'Sydney', 'Melbourne', 'Gold Coast', 'Perth', 'Adelaide']

const REGION_LOCATION: Record<string, string> = {
  SEQ: 'Brisbane',
  NSW: 'Sydney',
  VIC: 'Melbourne',
  AU_WIDE: 'Australia',
}

function primaryListingIdFromReel(r: DropReel): string {
  if (r.commerce?.kind === 'buy_sell_listing') return r.commerce.listingId
  if (r.commerce?.kind === 'live_showcase') {
    const hit = r.commerce.items.find((x) => x.kind === 'buy_sell_listing')
    if (hit?.listingId) return hit.listingId
  }
  return ''
}

/** Listing-backed row with playable stream URL — HLS/Mux or progressive mp4/webm. */
export function dropReelIsLivestreamCapable(r: DropReel): boolean {
  const v = r.videoUrl?.trim()
  if (!v) return false
  const hlsLike = v.includes('.m3u8') || v.includes('stream.mux.com')
  const progressiveLike = /\.(mp4|webm)(\?|$)/i.test(v)
  if (!hlsLike && !progressiveLike) return false
  if (r.commerce?.kind === 'live_showcase') return true
  if (r.mediaKind === 'video' || r.mediaKind === 'live_replay') return true
  if (r.commerce?.kind === 'buy_sell_listing') return true
  return false
}

function streamPlaybackUrlFromReel(r: DropReel): string | undefined {
  const v = r.videoUrl?.trim()
  if (!v || !dropReelIsLivestreamCapable(r)) return undefined
  return v
}

function absListingImage(raw?: string): string {
  const t = raw?.trim()
  if (!t) return ''
  return listingImageAbsoluteUrl(t)
}

export function dropReelToLiveFeedStream(r: DropReel, i: number): LiveFeedStream {
  const h = hash(r.id)
  const priceCents = Math.max(500, Number.parseInt(r.priceLabel.replace(/[^0-9]/g, ''), 10) * 100 || 9900)
  const watchers = liveStreamViewerCountSeed(r.id)
  const minutesAgo = 1 + (h % 18)

  let tag: LiveFeedTag = 'live'
  if (h % 7 === 0) tag = 'ending_soon'
  else if (h % 5 === 0) tag = 'hot'
  else if (minutesAgo <= 3) tag = 'just_started'

  const endsInSec = 45 + (h % 220)
  const listingId = primaryListingIdFromReel(r)
  const playbackUrl = streamPlaybackUrlFromReel(r)
  const squareCover =
    absListingImage(r.liveCoverSquareUrl) ||
    absListingImage(r.imageUrls?.[0]) ||
    absListingImage(r.poster) ||
    ''
  const portraitCover = absListingImage(r.liveCoverVerticalUrl) || squareCover

  return {
    id: r.id,
    listingId,
    imageUrl: squareCover,
    ...(portraitCover && portraitCover !== squareCover ? { portraitImageUrl: portraitCover } : {}),
    title: r.title,
    streamTitle: STREAM_TITLES[i % STREAM_TITLES.length]!,
    seller: r.seller,
    priceCents,
    watchers,
    watchersLabel: formatLiveViewerShort(watchers),
    tag,
    category: CATEGORIES[i % CATEGORIES.length]!,
    location: REGION_LOCATION[r.region] ?? LOCATIONS[h % LOCATIONS.length]!,
    minutesAgo,
    endsInSec,
    ...(playbackUrl ? { playbackUrl } : {}),
  }
}

export function buildLiveFeedStreams(): LiveFeedStream[] {
  const reels = CURATED_DROP_REELS.filter((r) => r.commerce?.kind === 'buy_sell_listing')
  return reels.map((r, i) => dropReelToLiveFeedStream(r, i))
}

/** Reels with stream URL + commerce/media context — marketplace live rail + random live jump. */
export function dropsReelsForLiveAuctionFloor(reels: DropReel[]): DropReel[] {
  return reels.filter(dropReelIsLivestreamCapable)
}

export function formatAud(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export const LIVE_FEED_FILTER_CHIPS: { id: LiveFeedCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'collectibles', label: 'Collectibles' },
  { id: 'free', label: 'Free' },
  { id: 'ending_soon', label: 'Ending Soon' },
]
