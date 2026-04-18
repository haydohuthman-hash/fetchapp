import { CURATED_DROP_REELS } from './drops/constants'
import { liveStreamViewerCountSeed, formatLiveViewerShort } from './marketplaceAuctionUi'

export type LiveFeedTag = 'live' | 'ending_soon' | 'hot' | 'just_started'
export type LiveFeedCategory = 'all' | 'furniture' | 'electronics' | 'fashion' | 'collectibles' | 'free' | 'ending_soon'

export type LiveFeedStream = {
  id: string
  listingId: string
  imageUrl: string
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
  /** Demo countdown seconds for ring timer. */
  endsInSec: number
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

export function buildLiveFeedStreams(): LiveFeedStream[] {
  const reels = CURATED_DROP_REELS.filter((r) => r.commerce?.kind === 'buy_sell_listing')

  return reels.map((r, i) => {
    const h = hash(r.id)
    const priceCents = Math.max(500, Number.parseInt(r.priceLabel.replace(/[^0-9]/g, ''), 10) * 100 || 9900)
    const watchers = liveStreamViewerCountSeed(r.id)
    const minutesAgo = 1 + (h % 18)

    let tag: LiveFeedTag = 'live'
    if (h % 7 === 0) tag = 'ending_soon'
    else if (h % 5 === 0) tag = 'hot'
    else if (minutesAgo <= 3) tag = 'just_started'

    const endsInSec = 45 + (h % 220)

    return {
      id: r.id,
      listingId: r.commerce?.kind === 'buy_sell_listing' ? r.commerce.listingId : '',
      imageUrl: r.imageUrls?.[0]?.trim() ?? '',
      title: r.title,
      streamTitle: STREAM_TITLES[i % STREAM_TITLES.length]!,
      seller: r.seller,
      priceCents,
      watchers,
      watchersLabel: formatLiveViewerShort(watchers),
      tag,
      category: CATEGORIES[i % CATEGORIES.length]!,
      location: LOCATIONS[h % LOCATIONS.length]!,
      minutesAgo,
      endsInSec,
    }
  })
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
