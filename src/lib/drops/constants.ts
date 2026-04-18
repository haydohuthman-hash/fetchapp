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
 * Demo live drops — one reel per public demo listing (`demo_pub_lst_*`).
 * Thumbs use creator / livestream-style portraits (production may swap AI-generated stream stills).
 */
export const CURATED_DROP_REELS: readonly DropReel[] = [
  {
    id: 'curated_demo_furn_1',
    mediaKind: 'images',
    imageUrls: [
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=900&q=82',
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=900&q=82',
    ],
    title: 'Live — room sizing & staging tips',
    seller: '@ArbourHomes',
    authorId: 'demo_prof_arbour_homes',
    priceLabel: '$420',
    blurb: 'Walkthrough on stream — same-day Fetch delivery on the listing.',
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
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900&q=82',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=82',
    ],
    title: 'Live lounge tour — fabric close-ups',
    seller: '@ArbourHomes',
    authorId: 'demo_prof_arbour_homes',
    priceLabel: '$890',
    blurb: 'On-camera fabric checks — same-day delivery promo.',
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
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=82',
      'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=900&q=82',
    ],
    title: 'Live dining setup — seats & finish',
    seller: '@HedgeStudio',
    authorId: 'demo_prof_hedge_studio',
    priceLabel: '$650',
    blurb: 'Stream Q&A — same-day delivery badge on the listing.',
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
      'https://images.unsplash.com/photo-1531482615713-afdafd968424?w=900&q=82',
      'https://images.unsplash.com/photo-1523240795612-9a054b087db4?w=900&q=82',
    ],
    title: 'Live chair demo — ergonomics Q&A',
    seller: '@LoftLane',
    authorId: 'demo_prof_loft_lane',
    priceLabel: '$185',
    blurb: 'WFH fit on stream — same-day promo delivery.',
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
      'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=900&q=82',
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=900&q=82',
    ],
    title: 'Live desk cable management tour',
    seller: '@CoastlineCo',
    authorId: 'demo_prof_coast_line',
    priceLabel: '$320',
    blurb: 'Minimal setup on camera — same-day delivery promo.',
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
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=900&q=82',
      'https://images.unsplash.com/photo-1517245383667-4bda6b637b88?w=900&q=82',
    ],
    title: 'Live bedroom refresh walkthrough',
    seller: '@StudioNorth',
    authorId: 'demo_prof_studio_north',
    priceLabel: '$275',
    blurb: 'Stream tour — same-day promo on checkout flow.',
    likes: 131,
    growthVelocityScore: 1.07,
    watchTimeMsSeed: 36000,
    categories: ['local_pickup', 'community'],
    region: 'SEQ',
    commerce: { kind: 'buy_sell_listing', listingId: 'demo_pub_lst_6' },
  },
]

/** What to wire server-side next (payments, fraud, real MAU, geo). */
export const DROPS_BACKEND_NEXT_STEPS = [
  'Persist reels, watch time, and likes in Postgres with idempotent events.',
  'Enforce globally unique @handle via server + index; block reserved names (Fetch, admin).',
  'Stripe Checkout for boost SKUs; store boost_window_start/end and tier.',
  'Targeting: save advertiser regions + categories; match to viewer prefs / IP region.',
  'Smart views: blend impressions, completion rate, and cohort size for estimates.',
  'Moderation queue for boosted + official slots; rate limits per account.',
] as const

