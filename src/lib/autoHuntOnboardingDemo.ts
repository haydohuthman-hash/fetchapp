/** Demo copy + activity rows for listing hunt onboarding (Explore). */
export type HuntActivityKind = 'found' | 'bid' | 'bought' | 'watching'

export type HuntActivityRow = {
  id: string
  kind: HuntActivityKind
  title: string
  subtitle: string
  imageUrl?: string
  listingId?: string
  amountCents?: number
}

export const AUTO_HUNT_DEMO_TARGET = {
  productName: 'Nike Dunk Low',
  specs: 'Size 8.5 • Any color',
  maxBudgetCents: 12000,
} as const

export const AUTO_HUNT_DEMO_WIN_PRICE_CENTS = 10800

/** Step 1: surfaced “hunt” outcomes (found / bid / bought). */
export const AUTO_HUNT_DEMO_ACTIVITY: HuntActivityRow[] = [
  {
    id: 'act_found',
    kind: 'found',
    title: 'Mid-century oak sideboard — 180cm',
    subtitle: 'Matched · ArbourHomes · 2h ago',
    listingId: 'demo_pub_lst_1',
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&q=80',
  },
  {
    id: 'act_bid',
    kind: 'bid',
    title: 'Ergonomic mesh office chair',
    subtitle: 'Auction in progress · your max is set',
    amountCents: 18500,
    listingId: 'demo_pub_lst_4',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&q=80',
  },
  {
    id: 'act_won',
    kind: 'bought',
    title: 'Nike Dunk Low',
    subtitle: 'You won · paid at checkout',
    amountCents: AUTO_HUNT_DEMO_WIN_PRICE_CENTS,
    listingId: 'demo_pub_lst_12',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80',
  },
]
