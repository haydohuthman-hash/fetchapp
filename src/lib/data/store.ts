/**
 * In-memory Bid Wars store. Tiny pub/sub so any screen can read live state and
 * react to optimistic updates. We persist a slice (wallet balance, watchlist)
 * to localStorage so cold reloads stay coherent for the demo.
 *
 * Backed by mock data today; flip the seeds in [./mock.ts](./mock.ts) to fetch
 * from Supabase when the API lands without changing call sites.
 */

import { useMemo, useRef, useSyncExternalStore } from 'react'
import {
  ACTIVITY,
  AUCTIONS,
  CATEGORIES,
  NOTIFICATIONS,
  ORDERS,
  REWARDS,
  SELF_USER,
  SELLERS,
  WALLET_TXNS,
} from './mock'
import type {
  ActivityEntry,
  Auction,
  AuctionStatus,
  BidwarsUser,
  CategorySlug,
  Notification,
  Order,
  Reward,
  Seller,
  UserPerks,
  WalletTransaction,
} from './types'

const STORAGE_KEY = 'fetchit.bidwars.state.v1'
const STARTER_GEMS = 100
const STARTER_FREE_SPINS = 3
const STARTER_FLAG_KEY = 'fetchit.pokies.starterGranted.v1'
/** Legacy localStorage key for the old in-component pokies wallet. */
const LEGACY_POKIES_KEY = 'fetchit.pokies.state.v1'

type Listener = () => void

type StoreState = {
  user: BidwarsUser
  auctions: Auction[]
  sellers: Seller[]
  rewards: Reward[]
  notifications: Notification[]
  orders: Order[]
  walletTxns: WalletTransaction[]
  activity: ActivityEntry[]
  walletBalanceCents: number
  winningBalanceCents: number
  userPerks: UserPerks
  /** Set of auction ids that should render the "boosted" treatment. */
  boostedAuctionIds: string[]
}

const listeners = new Set<Listener>()

const DEFAULT_PERKS: UserPerks = {
  gemBalance: STARTER_GEMS,
  freeSpins: STARTER_FREE_SPINS,
  bidBoosts: 0,
  shippingCredits: 0,
  vipExpiresAt: null,
  topBidderExpiresAt: null,
  sellerBoostExpiresAt: null,
  jackpotsHit: 0,
  mysteryPending: 0,
}

type LegacyPokiesWallet = Partial<{
  freeSpins: number
  bidBoosts: number
  shippingCredits: number
  sellerBoostMinutes: number
  vipMinutes: number
  topBidderMinutes: number
  mysteryPending: number
  jackpotsHit: number
}>

function tryLoadLegacyPokies(): UserPerks | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LEGACY_POKIES_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { wallet?: LegacyPokiesWallet }
    const w = parsed.wallet
    if (!w) return null
    const minutesToExpiry = (n: number | undefined): number | null =>
      n && n > 0 ? Date.now() + n * 60_000 : null
    return {
      gemBalance: STARTER_GEMS,
      freeSpins: w.freeSpins ?? STARTER_FREE_SPINS,
      bidBoosts: w.bidBoosts ?? 0,
      shippingCredits: w.shippingCredits ?? 0,
      vipExpiresAt: minutesToExpiry(w.vipMinutes),
      topBidderExpiresAt: minutesToExpiry(w.topBidderMinutes),
      sellerBoostExpiresAt: minutesToExpiry(w.sellerBoostMinutes),
      jackpotsHit: w.jackpotsHit ?? 0,
      mysteryPending: w.mysteryPending ?? 0,
    }
  } catch {
    return null
  }
}

type Persisted = {
  walletBalanceCents?: number
  watchlist?: string[]
  userPerks?: UserPerks
  boostedAuctionIds?: string[]
}

function loadPersisted(): Persisted {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    const p = parsed as Record<string, unknown>
    const out: Persisted = {}
    if (typeof p.walletBalanceCents === 'number') out.walletBalanceCents = p.walletBalanceCents
    if (Array.isArray(p.watchlist)) out.watchlist = p.watchlist.filter((x): x is string => typeof x === 'string')
    if (p.userPerks && typeof p.userPerks === 'object') {
      out.userPerks = { ...DEFAULT_PERKS, ...(p.userPerks as Partial<UserPerks>) }
    }
    if (Array.isArray(p.boostedAuctionIds)) {
      out.boostedAuctionIds = p.boostedAuctionIds.filter((x): x is string => typeof x === 'string')
    }
    return out
  } catch {
    return {}
  }
}

function persist(state: StoreState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        walletBalanceCents: state.walletBalanceCents,
        watchlist: state.user.watchlist,
        userPerks: state.userPerks,
        boostedAuctionIds: state.boostedAuctionIds,
      } satisfies Persisted),
    )
  } catch {
    /* ignore quota / private mode */
  }
}

function resolveStarterPerks(persisted: Persisted): UserPerks {
  if (persisted.userPerks) return { ...DEFAULT_PERKS, ...persisted.userPerks }
  if (typeof window === 'undefined') return DEFAULT_PERKS
  // First time we see this user — try to inherit from the old in-component
  // pokies wallet so existing rewards aren't lost on the upgrade.
  const legacy = tryLoadLegacyPokies()
  if (legacy) return legacy
  // Otherwise grant the 100-gem starter pack on first encounter.
  try {
    localStorage.setItem(STARTER_FLAG_KEY, '1')
  } catch {
    /* ignore */
  }
  return DEFAULT_PERKS
}

const persisted = loadPersisted()

const state: StoreState = {
  user: { ...SELF_USER, watchlist: persisted.watchlist ?? SELF_USER.watchlist },
  auctions: AUCTIONS,
  sellers: SELLERS,
  rewards: REWARDS,
  notifications: NOTIFICATIONS,
  orders: ORDERS,
  walletTxns: WALLET_TXNS,
  activity: ACTIVITY,
  walletBalanceCents:
    persisted.walletBalanceCents ?? WALLET_TXNS.at(-1)?.balanceAfterCents ?? 27_000,
  winningBalanceCents: 8_500,
  userPerks: resolveStarterPerks(persisted),
  boostedAuctionIds: persisted.boostedAuctionIds ?? [],
}

function emit() {
  for (const l of listeners) l()
}

function subscribe(l: Listener): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

function useStore<T>(selector: (s: StoreState) => T): T {
  const select = useMemo(() => selector, [selector])
  return useSyncExternalStore(subscribe, () => select(state), () => select(state))
}

/* ----------------------------- public hooks ------------------------------ */

export function useBidwarsUser(): BidwarsUser {
  return useStore((s) => s.user)
}

export function useWatchlist(): string[] {
  return useStore((s) => s.user.watchlist)
}

export function useIsWatching(auctionId: string): boolean {
  return useStore((s) => s.user.watchlist.includes(auctionId))
}

export function useAuctions(): Auction[] {
  return useStore((s) => s.auctions)
}

export function useAuction(auctionId: string | null | undefined): Auction | undefined {
  return useStore((s) => (auctionId ? s.auctions.find((a) => a.id === auctionId) : undefined))
}

export function useAuctionsByCategory(category: CategorySlug): Auction[] {
  return useStore((s) => s.auctions.filter((a) => a.category === category))
}

export function useAuctionsByStatus(status: AuctionStatus): Auction[] {
  return useStore((s) => s.auctions.filter((a) => a.status === status))
}

export function useTrendingAuctions(): Auction[] {
  return useStore((s) =>
    [...s.auctions].sort((a, b) => b.viewerCount - a.viewerCount).slice(0, 8),
  )
}

export function useUpcomingAuctions(): Auction[] {
  return useStore((s) =>
    s.auctions
      .filter((a) => a.status === 'upcoming')
      .sort((a, b) => a.startsAt - b.startsAt),
  )
}

export function useCategories() {
  return CATEGORIES
}

export function useSellers(): Seller[] {
  return useStore((s) => s.sellers)
}

export function useSeller(sellerId: string | null | undefined): Seller | undefined {
  return useStore((s) =>
    sellerId ? s.sellers.find((seller) => seller.id === sellerId) : undefined,
  )
}

export function useRewards(): Reward[] {
  return useStore((s) => s.rewards)
}

export function useNotifications(): Notification[] {
  return useStore((s) => s.notifications)
}

export function useUnreadNotificationCount(): number {
  return useStore((s) => s.notifications.filter((n) => !n.read).length)
}

export function useOrders(): Order[] {
  return useStore((s) => s.orders)
}

export function useOrder(orderId: string | null | undefined): Order | undefined {
  return useStore((s) =>
    orderId ? s.orders.find((o) => o.id === orderId) : undefined,
  )
}

export function useWalletTxns(): WalletTransaction[] {
  return useStore((s) => s.walletTxns)
}

export function useWalletBalanceCents(): number {
  return useStore((s) => s.walletBalanceCents)
}

export function useWinningBalanceCents(): number {
  return useStore((s) => s.winningBalanceCents)
}

export function useActivity(): ActivityEntry[] {
  return useStore((s) => s.activity)
}

export function useUserPerks(): UserPerks {
  return useStore((s) => s.userPerks)
}

export function useGemBalance(): number {
  return useStore((s) => s.userPerks.gemBalance)
}

export function useFreeSpins(): number {
  return useStore((s) => s.userPerks.freeSpins)
}

export function useBidBoostCount(): number {
  return useStore((s) => s.userPerks.bidBoosts)
}

export function useShippingCreditCount(): number {
  return useStore((s) => s.userPerks.shippingCredits)
}

/** Re-evaluated every second so countdown chips stay live. */
export function useIsVipActive(): boolean {
  const expires = useStore((s) => s.userPerks.vipExpiresAt)
  const now = useNowEverySecond()
  return expires != null && expires > now
}

export function useIsTopBidderActive(): boolean {
  const expires = useStore((s) => s.userPerks.topBidderExpiresAt)
  const now = useNowEverySecond()
  return expires != null && expires > now
}

export function useIsSellerBoosted(): boolean {
  const expires = useStore((s) => s.userPerks.sellerBoostExpiresAt)
  const now = useNowEverySecond()
  return expires != null && expires > now
}

export function useIsAuctionBoosted(auctionId: string | null | undefined): boolean {
  return useStore((s) => (auctionId ? s.boostedAuctionIds.includes(auctionId) : false))
}

/* --------------------------------- actions -------------------------------- */

function pushActivity(entry: ActivityEntry) {
  state.activity = [entry, ...state.activity].slice(0, 80)
}

function pushNotification(n: Notification) {
  state.notifications = [n, ...state.notifications].slice(0, 60)
}

function pushWalletTxn(txn: WalletTransaction) {
  state.walletTxns = [txn, ...state.walletTxns].slice(0, 60)
  state.walletBalanceCents = txn.balanceAfterCents
}

function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`
}

export function placeBid(auctionId: string, amountCents: number): boolean {
  const auction = state.auctions.find((a) => a.id === auctionId)
  if (!auction) return false
  if (amountCents <= auction.currentBidCents) return false
  state.auctions = state.auctions.map((a) =>
    a.id === auctionId
      ? {
          ...a,
          currentBidCents: amountCents,
          topBidderId: state.user.id,
          bidCount: a.bidCount + 1,
        }
      : a,
  )
  pushActivity({
    id: genId('act'),
    kind: 'bid',
    createdAt: Date.now(),
    title: 'You placed a bid',
    body: `$${(amountCents / 100).toFixed(0)} on ${auction.title}`,
    ref: { kind: 'auction', auctionId },
  })
  emit()
  persist(state)
  return true
}

export function setAuctionStatus(auctionId: string, status: AuctionStatus): void {
  state.auctions = state.auctions.map((a) =>
    a.id === auctionId ? { ...a, status } : a,
  )
  emit()
}

export function recordWin(auctionId: string): { paidCents: number; savedCents: number } | null {
  const auction = state.auctions.find((a) => a.id === auctionId)
  if (!auction) return null
  const paid = auction.currentBidCents
  const saved = Math.max(0, auction.estValueCents - paid)
  pushActivity({
    id: genId('act'),
    kind: 'win',
    createdAt: Date.now(),
    title: 'You won!',
    body: `${auction.title} · $${(paid / 100).toFixed(0)}`,
    ref: { kind: 'auction', auctionId },
  })
  pushNotification({
    id: genId('ntf'),
    title: 'You won an auction',
    body: `${auction.title} — view your order`,
    createdAt: Date.now(),
    read: false,
    ref: { kind: 'auction', auctionId },
  })
  pushWalletTxn({
    id: genId('wtx'),
    kind: 'win-charge',
    amountCents: -paid,
    balanceAfterCents: state.walletBalanceCents - paid,
    createdAt: Date.now(),
    label: `Won · ${auction.title}`,
    auctionId,
  })
  state.user = { ...state.user, battlesWon: state.user.battlesWon + 1, totalWonCents: state.user.totalWonCents + paid }
  state.auctions = state.auctions.map((a) =>
    a.id === auctionId ? { ...a, status: 'won' } : a,
  )
  // Apply a Prize Spin "Free shipping" credit if one is available. This both
  // marks the order with the green line item and decrements the credit.
  let freeShippingApplied = false
  if (state.userPerks.shippingCredits > 0) {
    state.userPerks = {
      ...state.userPerks,
      shippingCredits: state.userPerks.shippingCredits - 1,
    }
    freeShippingApplied = true
  }
  state.orders = [
    {
      id: genId('ord'),
      auctionId,
      paidCents: paid,
      savedCents: saved,
      shippingAddress: '12 Adelaide St, Brisbane QLD 4000',
      paymentMethodLast4: '4242',
      status: 'paid',
      placedAt: Date.now(),
      freeShippingApplied,
    },
    ...state.orders,
  ]
  emit()
  persist(state)
  return { paidCents: paid, savedCents: saved }
}

export function recordOutbid(auctionId: string, opponentHandle: string): void {
  const auction = state.auctions.find((a) => a.id === auctionId)
  if (!auction) return
  pushActivity({
    id: genId('act'),
    kind: 'outbid',
    createdAt: Date.now(),
    title: 'You were outbid',
    body: `${auction.title} — ${opponentHandle} is leading`,
    ref: { kind: 'auction', auctionId },
  })
  pushNotification({
    id: genId('ntf'),
    title: "You've been outbid",
    body: `${auction.title} — bid again to lead.`,
    createdAt: Date.now(),
    read: false,
    ref: { kind: 'auction', auctionId },
  })
  emit()
}

export function toggleWatch(auctionId: string): boolean {
  const watching = state.user.watchlist.includes(auctionId)
  state.user = {
    ...state.user,
    watchlist: watching
      ? state.user.watchlist.filter((id) => id !== auctionId)
      : [auctionId, ...state.user.watchlist],
  }
  emit()
  persist(state)
  return !watching
}

export function depositWallet(amountCents: number, label: string): void {
  pushWalletTxn({
    id: genId('wtx'),
    kind: 'deposit',
    amountCents,
    balanceAfterCents: state.walletBalanceCents + amountCents,
    createdAt: Date.now(),
    label,
  })
  emit()
  persist(state)
}

export function withdrawWallet(amountCents: number, label: string): boolean {
  if (amountCents > state.walletBalanceCents) return false
  pushWalletTxn({
    id: genId('wtx'),
    kind: 'withdraw',
    amountCents: -amountCents,
    balanceAfterCents: state.walletBalanceCents - amountCents,
    createdAt: Date.now(),
    label,
  })
  emit()
  persist(state)
  return true
}

export function instantCash(amountCents: number): boolean {
  if (amountCents > state.walletBalanceCents) return false
  pushWalletTxn({
    id: genId('wtx'),
    kind: 'instant-cash',
    amountCents: -amountCents,
    balanceAfterCents: state.walletBalanceCents - amountCents,
    createdAt: Date.now(),
    label: 'Instant cash to bank',
  })
  emit()
  persist(state)
  return true
}

export function markAllNotificationsRead(): void {
  state.notifications = state.notifications.map((n) => ({ ...n, read: true }))
  emit()
}

/* ------------------------- perk + gem-economy actions --------------------- */

function patchPerks(patch: Partial<UserPerks>): void {
  state.userPerks = { ...state.userPerks, ...patch }
  emit()
  persist(state)
}

export function grantGems(amount: number, label = 'Gems'): void {
  if (!Number.isFinite(amount) || amount <= 0) return
  patchPerks({ gemBalance: state.userPerks.gemBalance + Math.floor(amount) })
  pushActivity({
    id: genId('act'),
    kind: 'reminder',
    createdAt: Date.now(),
    title: `+${Math.floor(amount)} gems`,
    body: label,
  })
}

/**
 * Spend `amount` gems. Returns true on success, false if insufficient.
 * Caller is responsible for surfacing the paywall when this returns false.
 */
export function spendGems(amount: number, _label = 'Prize Spin'): boolean {
  void _label
  if (!Number.isFinite(amount) || amount <= 0) return false
  if (state.userPerks.gemBalance < amount) return false
  patchPerks({ gemBalance: state.userPerks.gemBalance - Math.floor(amount) })
  return true
}

export function grantFreeSpins(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) return
  patchPerks({ freeSpins: state.userPerks.freeSpins + Math.floor(amount) })
}

export function consumeFreeSpin(): boolean {
  if (state.userPerks.freeSpins <= 0) return false
  patchPerks({ freeSpins: state.userPerks.freeSpins - 1 })
  return true
}

export function grantBidBoosts(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) return
  patchPerks({ bidBoosts: state.userPerks.bidBoosts + Math.floor(amount) })
}

export function consumeBidBoost(): boolean {
  if (state.userPerks.bidBoosts <= 0) return false
  patchPerks({ bidBoosts: state.userPerks.bidBoosts - 1 })
  return true
}

export function grantShippingCredits(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) return
  patchPerks({ shippingCredits: state.userPerks.shippingCredits + Math.floor(amount) })
}

export function consumeShippingCredit(): boolean {
  if (state.userPerks.shippingCredits <= 0) return false
  patchPerks({ shippingCredits: state.userPerks.shippingCredits - 1 })
  return true
}

function extendExpiry(current: number | null, deltaMs: number): number {
  const base = current && current > Date.now() ? current : Date.now()
  return base + Math.max(0, deltaMs)
}

export function extendVip(durationMs: number): void {
  patchPerks({ vipExpiresAt: extendExpiry(state.userPerks.vipExpiresAt, durationMs) })
}

export function extendTopBidder(durationMs: number): void {
  patchPerks({ topBidderExpiresAt: extendExpiry(state.userPerks.topBidderExpiresAt, durationMs) })
}

export function extendSellerBoost(durationMs: number): void {
  patchPerks({ sellerBoostExpiresAt: extendExpiry(state.userPerks.sellerBoostExpiresAt, durationMs) })
}

export function recordJackpotHit(): void {
  patchPerks({ jackpotsHit: state.userPerks.jackpotsHit + 1 })
}

/**
 * Mark a freshly created auction/listing as boosted, if the user has an active
 * seller-boost perk. Idempotent.
 */
export function flagAuctionBoosted(auctionId: string): boolean {
  if (!auctionId) return false
  const expires = state.userPerks.sellerBoostExpiresAt
  if (!expires || expires <= Date.now()) return false
  if (state.boostedAuctionIds.includes(auctionId)) return true
  state.boostedAuctionIds = [auctionId, ...state.boostedAuctionIds].slice(0, 60)
  emit()
  persist(state)
  return true
}

/**
 * Mock IAP. Real implementation should swap this for a Stripe / Apple / Google
 * IAP call before granting gems. Today it just adds the gems and pushes a
 * "deposit"-style activity entry so the user can see the purchase.
 */
export function purchaseGemPack(args: {
  amount: number
  priceLabel: string
  description?: string
}): void {
  grantGems(args.amount, args.description ?? `Bought ${args.amount} gems · ${args.priceLabel}`)
}

/**
 * Sweep expired time-based perks. Cheap to call from a 60-second tick.
 * Caller can run this from anywhere; it only emits when something actually
 * changed so React subscribers won't churn.
 */
export function expirePerksIfDue(): void {
  const now = Date.now()
  const p = state.userPerks
  let changed = false
  const patch: Partial<UserPerks> = {}
  if (p.vipExpiresAt && p.vipExpiresAt <= now) {
    patch.vipExpiresAt = null
    changed = true
  }
  if (p.topBidderExpiresAt && p.topBidderExpiresAt <= now) {
    patch.topBidderExpiresAt = null
    changed = true
  }
  if (p.sellerBoostExpiresAt && p.sellerBoostExpiresAt <= now) {
    patch.sellerBoostExpiresAt = null
    changed = true
  }
  if (changed) patchPerks(patch)
}

// App-wide, module-level sweep so perks expire even when the pokies surface
// isn't open. Runs once per minute and is a no-op when nothing has changed.
// Wrapped in try/catch so a misbehaving environment can never block the page.
if (typeof window !== 'undefined') {
  try {
    expirePerksIfDue()
    window.setInterval(() => {
      try {
        expirePerksIfDue()
      } catch {
        /* ignore */
      }
    }, 60_000)
  } catch {
    /* ignore */
  }
}

/* --------------------- formatters used across surfaces -------------------- */

export function formatAud(cents: number): string {
  const n = Math.round(cents) / 100
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: n >= 1000 ? 0 : 0,
  }).format(n)
}

export function formatMmSs(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Wall-clock tick every second for live countdowns.
 * The snapshot value is stable between interval fires — `getSnapshot` must not
 * return a fresh `Date.now()` on every read or React can hit "Maximum update
 * depth exceeded" (Strict Mode calls getSnapshot more than once per render).
 */
export function useNowEverySecond(): number {
  const snapRef = useRef(typeof Date.now === 'function' ? Date.now() : 0)
  const subscribe = useMemo(
    () => (notify: () => void) => {
      snapRef.current = Date.now()
      const id = window.setInterval(() => {
        snapRef.current = Date.now()
        notify()
      }, 1_000)
      return () => window.clearInterval(id)
    },
    [],
  )
  return useSyncExternalStore(
    subscribe,
    () => snapRef.current,
    () => snapRef.current,
  )
}
