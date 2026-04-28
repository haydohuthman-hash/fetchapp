/**
 * Fetchit Bid Wars unified data model.
 *
 * Strongly typed entities for the auction surfaces. Today they're hydrated from
 * mock data ([./mock.ts](./mock.ts)) so the UI can be built end-to-end without a
 * server. The shape mirrors what we'll persist in Supabase later, so screens
 * keep working when the data source flips over.
 */

export type AuctionStatus = 'live' | 'upcoming' | 'ending' | 'ended' | 'won' | 'lost'

export type CategorySlug =
  | 'sneakers'
  | 'watches'
  | 'trading-cards'
  | 'handbags'
  | 'electronics'
  | 'luxury'
  | 'streetwear'
  | 'collectibles'
  | 'gaming'
  | 'sports-memorabilia'

export type BidwarsUser = {
  id: string
  handle: string
  displayName: string
  avatarUrl: string
  battlesWon: number
  totalWonCents: number
  winRate: number
  watchlist: string[]
  level: number
  xp: number
  xpToNext: number
  streakDays: number
}

export type Seller = {
  id: string
  handle: string
  displayName: string
  avatarUrl: string
  rating: number
  followers: number
  isVerified: boolean
  liveNow: boolean
}

export type Category = {
  id: CategorySlug
  title: string
  imageUrl: string
  liveCount: number
  upcomingCount: number
}

export type Auction = {
  id: string
  title: string
  subtitle?: string
  imageUrls: string[]
  description?: string
  category: CategorySlug
  sellerId: string
  status: AuctionStatus
  startsAt: number
  endsAt: number
  startingBidCents: number
  currentBidCents: number
  topBidderId: string | null
  bidCount: number
  viewerCount: number
  estValueCents: number
  bidWarOpponentId?: string | null
  isFeatured?: boolean
}

export type Bid = {
  id: string
  auctionId: string
  bidderId: string
  amountCents: number
  placedAt: number
  outcome: 'leading' | 'outbid' | 'won'
}

export type WalletTxnKind =
  | 'deposit'
  | 'withdraw'
  | 'win-charge'
  | 'win-refund'
  | 'reward'
  | 'gift-card'
  | 'instant-cash'

export type WalletTransaction = {
  id: string
  kind: WalletTxnKind
  amountCents: number
  balanceAfterCents: number
  createdAt: number
  label: string
  auctionId?: string
}

export type Reward = {
  id: string
  title: string
  subtitle: string
  kind: 'badge' | 'perk' | 'streak'
  unlockedAt?: number
  iconEmoji: string
}

export type Notification = {
  id: string
  title: string
  body: string
  createdAt: number
  read: boolean
  ref?: { kind: 'auction'; auctionId: string } | { kind: 'order'; orderId: string }
}

export type Order = {
  id: string
  auctionId: string
  paidCents: number
  savedCents: number
  shippingAddress: string
  paymentMethodLast4?: string
  status: 'paid' | 'shipped' | 'delivered'
  placedAt: number
  trackingUrl?: string
}

export type ActivityKind = 'bid' | 'win' | 'outbid' | 'message' | 'reminder'

export type ActivityEntry = {
  id: string
  kind: ActivityKind
  createdAt: number
  title: string
  body: string
  ref?: { kind: 'auction'; auctionId: string }
}
