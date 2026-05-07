import type { DropCategoryId, DropReel, DropRegionCode } from './types'

/** Verified Fetch Drops admin — used for official promos (mirrors paid boost slots). */
export const FETCH_DROPS_OFFICIAL_AUTHOR_ID = 'fetch_official'

export const FETCH_DROPS_OFFICIAL_HANDLE = '@Fetch'

export const DROP_CATEGORY_LABELS: Record<DropCategoryId, string> = {
  supplies: 'Supplies',
  local_pickup: 'Local pickup',
  b2b: 'Business',
  promo: 'Promo',
  community: 'Community',
  services: 'Services',
}

export const DROP_REGION_LABELS: Record<DropRegionCode, string> = {
  SEQ: 'South East QLD',
  NSW: 'New South Wales',
  VIC: 'Victoria',
  AU_WIDE: 'Australia',
}

/**
 * Placeholder MAU for smart-view estimates until real analytics exist.
 * `0` means estimates show as unavailable (no demo audience numbers).
 */
export const DROPS_ESTIMATED_MAU = 0

/**
 * Demo furniture drops — one reel per public demo listing (`demo_pub_lst_*`).
 * Photo carousels + `buy_sell_listing` commerce handoff.
 */
export const CURATED_DROP_REELS: readonly DropReel[] = [
  {
    id: 'curated_demo_furn_1',
    mediaKind: 'images',
    imageUrls: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=82',
      'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=900&q=82',
    ],
    title: 'Oak sideboard — room fit',
    seller: '@ArbourHomes',
    authorId: 'demo_prof_arbour_homes',
    priceLabel: '$420',
    blurb: 'Same-day Fetch delivery promo on this demo listing.',
    likes: 142,
    growthVelocityScore: 1.08,
    watchTimeMsSeed: 38000,
    categories: ['local_pickup', 'community'],
    region: 'SEQ',
    commerce: { kind: 'buy_sell_listing', listingId: 'demo_pub_lst_1' },
  },
  {
    id: 'curated_demo_furn_2',
    mediaKind: 'images',
    imageUrls: [
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=900&q=82',
      'https://images.unsplash.com/photo-1618220179428-22790b461013?w=900&q=82',
    ],
    title: 'Forest green velvet sofa',
    seller: '@ArbourHomes',
    authorId: 'demo_prof_arbour_homes',
    priceLabel: '$890',
    blurb: 'Deep seat lounge — same-day delivery promo.',
    likes: 206,
    growthVelocityScore: 1.14,
    watchTimeMsSeed: 52000,
    categories: ['local_pickup', 'community'],
    region: 'SEQ',
    commerce: { kind: 'buy_sell_listing', listingId: 'demo_pub_lst_2' },
  },
  {
    id: 'curated_demo_furn_3',
    mediaKind: 'images',
    imageUrls: [
      'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=900&q=82',
      'https://images.unsplash.com/photo-1595428774223-244425d7b929?w=900&q=82',
    ],
    title: 'Round oak dining table',
    seller: '@HedgeStudio',
    authorId: 'demo_prof_hedge_studio',
    priceLabel: '$650',
    blurb: 'Seats six — demo same-day delivery badge live on the listing.',
    likes: 97,
    growthVelocityScore: 1.05,
    watchTimeMsSeed: 31000,
    categories: ['local_pickup', 'community'],
    region: 'SEQ',
    commerce: { kind: 'buy_sell_listing', listingId: 'demo_pub_lst_3' },
  },
  {
    id: 'curated_demo_furn_4',
    mediaKind: 'images',
    imageUrls: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=900&q=82',
      'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=900&q=82',
    ],
    title: 'Mesh ergonomic office chair',
    seller: '@LoftLane',
    authorId: 'demo_prof_loft_lane',
    priceLabel: '$185',
    blurb: 'WFH upgrade with same-day promo delivery.',
    likes: 164,
    growthVelocityScore: 1.11,
    watchTimeMsSeed: 44000,
    categories: ['local_pickup', 'community'],
    region: 'SEQ',
    commerce: { kind: 'buy_sell_listing', listingId: 'demo_pub_lst_4' },
  },
  {
    id: 'curated_demo_furn_5',
    mediaKind: 'images',
    imageUrls: [
      'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=900&q=82',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=900&q=82',
    ],
    title: 'Walnut desk cable tray',
    seller: '@CoastlineCo',
    authorId: 'demo_prof_coast_line',
    priceLabel: '$320',
    blurb: 'Minimal desk setup — same-day delivery promo.',
    likes: 88,
    growthVelocityScore: 1.03,
    watchTimeMsSeed: 29000,
    categories: ['local_pickup', 'community'],
    region: 'SEQ',
    commerce: { kind: 'buy_sell_listing', listingId: 'demo_pub_lst_5' },
  },
  {
    id: 'curated_demo_furn_6',
    mediaKind: 'images',
    imageUrls: [
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=82',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&q=82',
    ],
    title: 'Queen upholstered bed frame',
    seller: '@StudioNorth',
    authorId: 'demo_prof_studio_north',
    priceLabel: '$275',
    blurb: 'Bedroom refresh — same-day promo on checkout flow.',
    likes: 131,
    growthVelocityScore: 1.07,
    watchTimeMsSeed: 36000,
    categories: ['local_pickup', 'community'],
    region: 'SEQ',
    commerce: { kind: 'buy_sell_listing', listingId: 'demo_pub_lst_6' },
  },
  {
    id: 'curated_demo_live_11',
    mediaKind: 'images',
    imageUrls: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=82'],
    title: 'Wireless earbuds — live bid',
    seller: '@LoftLane',
    authorId: 'demo_prof_loft_lane',
    priceLabel: '$89',
    blurb: 'Live sellers demo — auctions close on-camera.',
    likes: 198,
    growthVelocityScore: 1.12,
    watchTimeMsSeed: 41200,
    categories: ['local_pickup', 'community'],
    region: 'SEQ',
    commerce: { kind: 'buy_sell_listing', listingId: 'demo_pub_lst_11' },
    commerceSaleMode: 'auction',
  },
  {
    id: 'curated_demo_live_12',
    mediaKind: 'images',
    imageUrls: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=82'],
    title: 'Sneakers live — bids open',
    seller: '@HedgeStudio',
    authorId: 'demo_prof_hedge_studio',
    priceLabel: '$129',
    blurb: 'Live floor demo — watchers can bid in-session.',
    likes: 256,
    growthVelocityScore: 1.16,
    watchTimeMsSeed: 48900,
    categories: ['local_pickup', 'community'],
    region: 'SEQ',
    commerce: { kind: 'buy_sell_listing', listingId: 'demo_pub_lst_12' },
    commerceSaleMode: 'auction',
  },
  {
    id: 'curated_demo_live_13',
    mediaKind: 'images',
    imageUrls: ['https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=900&q=82'],
    title: 'Sealed TCG — live countdown',
    seller: '@ArbourHomes',
    authorId: 'demo_prof_arbour_homes',
    priceLabel: '$249',
    blurb: 'Collectibles floor — bids lock when the timer ends.',
    likes: 312,
    growthVelocityScore: 1.18,
    watchTimeMsSeed: 55400,
    categories: ['local_pickup', 'community'],
    region: 'SEQ',
    commerce: { kind: 'buy_sell_listing', listingId: 'demo_pub_lst_13' },
    commerceSaleMode: 'auction',
  },
  {
    id: 'curated_demo_live_14',
    mediaKind: 'images',
    imageUrls: ['https://images.unsplash.com/photo-1625948515291-aebe09d956ec?w=900&q=82'],
    title: 'MagSafe bundle — bidding live',
    seller: '@StudioNorth',
    authorId: 'demo_prof_studio_north',
    priceLabel: '$45',
    blurb: 'Tech aisle live stream handoff demo.',
    likes: 121,
    growthVelocityScore: 1.09,
    watchTimeMsSeed: 37800,
    categories: ['local_pickup', 'community'],
    region: 'SEQ',
    commerce: { kind: 'buy_sell_listing', listingId: 'demo_pub_lst_14' },
    commerceSaleMode: 'auction',
  },
  {
    id: 'curated_demo_live_15',
    mediaKind: 'images',
    imageUrls: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=900&q=82'],
    title: 'Windbreaker — auction on air',
    seller: '@CoastlineCo',
    authorId: 'demo_prof_coast_line',
    priceLabel: '$62',
    blurb: 'Fashion aisle — live watchers only demo.',
    likes: 173,
    growthVelocityScore: 1.1,
    watchTimeMsSeed: 43100,
    categories: ['local_pickup', 'community'],
    region: 'SEQ',
    commerce: { kind: 'buy_sell_listing', listingId: 'demo_pub_lst_15' },
    commerceSaleMode: 'auction',
  },
  {
    id: 'curated_demo_live_16',
    mediaKind: 'images',
    imageUrls: ['https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&q=82'],
    title: 'Free boxes — community live',
    seller: '@LoftLane',
    authorId: 'demo_prof_loft_lane',
    priceLabel: 'Free',
    blurb: 'Curbside pickup — streamed for trust.',
    likes: 84,
    growthVelocityScore: 1.04,
    watchTimeMsSeed: 29200,
    categories: ['local_pickup', 'community'],
    region: 'SEQ',
    commerce: { kind: 'buy_sell_listing', listingId: 'demo_pub_lst_16' },
    commerceSaleMode: 'auction',
  },
]

/** Resolve curated drop reel wired to `demo_pub_lst_*` (first match wins). */
export function curatedDropReelForListingId(listingId: string): DropReel | undefined {
  return CURATED_DROP_REELS.find((r) => r.commerce?.kind === 'buy_sell_listing' && r.commerce.listingId === listingId)
}

/** What to wire server-side next (payments, fraud, real MAU, geo). */
export const DROPS_BACKEND_NEXT_STEPS = [
  'Persist reels, watch time, and likes in Postgres with idempotent events.',
  'Enforce globally unique @handle via server + index; block reserved names (Fetch, admin).',
  'Stripe Checkout for boost SKUs; store boost_window_start/end and tier.',
  'Targeting: save advertiser regions + categories; match to viewer prefs / IP region.',
  'Smart views: blend impressions, completion rate, and cohort size for estimates.',
  'Moderation queue for boosted + official slots; rate limits per account.',
] as const

