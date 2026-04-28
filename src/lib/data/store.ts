/**
 * In-memory Bid Wars store. Tiny pub/sub so any screen can read live state and
 * react to optimistic updates. We persist a slice (wallet balance, watchlist)
 * to localStorage so cold reloads stay coherent for the demo.
 *
 * Backed by mock data today; flip the seeds in [./mock.ts](./mock.ts) to fetch
 * from Supabase when the API lands without changing call sites.
 */

import { useEffect, useMemo, useSyncExternalStore } from 'react'
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
  WalletTransaction,
} from './types'

const STORAGE_KEY = 'fetchit.bidwars.state.v1'

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
}

const listeners = new Set<Listener>()

function loadPersisted(): { walletBalanceCents?: number; watchlist?: string[] } {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as { walletBalanceCents?: number; watchlist?: string[] }
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
      }),
    )
  } catch {
    /* ignore quota / private mode */
  }
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

export function useNowEverySecond(): number {
  const subscribeNow = useMemo(
    () => (cb: () => void) => {
      const id = window.setInterval(cb, 1_000)
      return () => window.clearInterval(id)
    },
    [],
  )
  const value = useSyncExternalStore(subscribeNow, () => Date.now(), () => Date.now())
  // Touch the value to satisfy React's hot reload edge cases.
  useEffect(() => undefined, [value])
  return value
}
