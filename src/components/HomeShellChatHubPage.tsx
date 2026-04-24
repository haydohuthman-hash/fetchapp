import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { loadSession } from '../lib/fetchUserSession'
import {
  createMessageThread,
  fetchMessageThread,
  fetchMessageThreads,
  type MessageThreadKind,
  type MessageThreadSummary,
} from '../lib/messagesApi'
import { MARKETPLACE_MOCK_PEER_LISTINGS } from '../lib/marketplaceMockPeerListings'
import { listingImageAbsoluteUrl, type PeerListing } from '../lib/listingsApi'
import { AccountNavIconFilled } from './icons/HomeShellNavIcons'
import { ChatThreadView } from './ChatThreadView'

type HubScreen = 'hub' | 'thread'
type ActivityTab = 'messages' | 'notifications' | 'purchases'

export type HomeShellChatHubPageProps = {
  bottomNav: ReactNode
  onMenuAccount?: () => void
  onChatWithField: () => void
  initialThreadId?: string | null
  onConsumedInitialThread?: () => void
  listingUnread?: number
  supportUnread?: number
  onFetchIt?: (listing: PeerListing) => void
}

const ACTIVITY_TABS: { id: ActivityTab; label: string }[] = [
  { id: 'messages', label: 'Messages' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'purchases', label: 'Purchases' },
]

function ActivityTabBar({
  value,
  onChange,
  messagesBadge,
  notificationsBadge,
}: {
  value: ActivityTab
  onChange: (t: ActivityTab) => void
  messagesBadge?: number
  notificationsBadge?: number
}) {
  return (
    <nav
      className="flex w-full items-stretch border-b border-violet-100 bg-white px-0"
      role="tablist"
      aria-label="Activity"
    >
      {ACTIVITY_TABS.map((t) => {
        const active = t.id === value
        const badge =
          t.id === 'messages' ? messagesBadge : t.id === 'notifications' ? notificationsBadge : undefined
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={[
              'relative flex flex-1 items-center justify-center gap-1.5 border-0 bg-transparent px-1 pb-2.5 pt-3 text-[13px] font-semibold leading-none tracking-[-0.01em] transition-colors sm:text-sm',
              active ? 'text-[#4c1d95]' : 'text-zinc-400 hover:text-zinc-600',
            ].join(' ')}
          >
            <span>{t.label}</span>
            {badge != null && badge > 0 ? (
              <span className="flex h-[1.05rem] min-w-[1.05rem] items-center justify-center rounded-full bg-[#4c1d95] px-1 text-[10px] font-bold leading-none text-white">
                {badge > 99 ? '99+' : badge}
              </span>
            ) : null}
            {active ? (
              <span className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-[#4c1d95]" />
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}

function formatRelativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts)
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w}w`
  return new Date(ts).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
}

function formatAudFromCents(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function sellerHandleFromThread(t: MessageThreadSummary): string {
  if (t.kind === 'support') return 'Fetch support'
  const suffix = t.listingId ? t.listingId.slice(-4).toUpperCase() : t.id.slice(-4).toUpperCase()
  return `@seller-${suffix}`
}

function avatarInitials(name: string): string {
  const clean = name.replace(/^@/, '').trim()
  const parts = clean.split(/[\s-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function Avatar({ name, color = '#ede9fe' }: { name: string; color?: string }) {
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tracking-tight text-[#4c1d95]"
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {avatarInitials(name)}
    </div>
  )
}

/* --------------------------------- Notifications mock data ----------------------------- */

type ActivityNotification = {
  id: string
  kind: 'price_drop' | 'drop_ended' | 'follower' | 'bid' | 'delivery' | 'review'
  title: string
  body: string
  createdAt: number
  unread: boolean
  accent?: string
}

function useActivityNotifications(): ActivityNotification[] {
  return useMemo(() => {
    const now = Date.now()
    return [
      {
        id: 'n_bid_1',
        kind: 'bid',
        title: 'You’re being outbid',
        body: 'Vintage camera lens · current bid $142 · 4m left',
        createdAt: now - 2 * 60 * 1000,
        unread: true,
        accent: '#fee2e2',
      },
      {
        id: 'n_drop_1',
        kind: 'drop_ended',
        title: 'Your drop ended',
        body: 'Bidding War · Saturday arvo — 187 viewers, $642 sold',
        createdAt: now - 38 * 60 * 1000,
        unread: true,
        accent: '#ede9fe',
      },
      {
        id: 'n_price_1',
        kind: 'price_drop',
        title: 'Price drop',
        body: 'Mid-century sofa dropped 15% — was $480, now $408',
        createdAt: now - 3 * 60 * 60 * 1000,
        unread: false,
        accent: '#dcfce7',
      },
      {
        id: 'n_follower_1',
        kind: 'follower',
        title: 'New follower',
        body: '@sunroom.goods started following your profile',
        createdAt: now - 9 * 60 * 60 * 1000,
        unread: false,
        accent: '#e0f2fe',
      },
      {
        id: 'n_delivery_1',
        kind: 'delivery',
        title: 'Out for delivery',
        body: 'Wooden bookshelf is 12 min away — driver Sam',
        createdAt: now - 22 * 60 * 60 * 1000,
        unread: false,
        accent: '#fef3c7',
      },
      {
        id: 'n_review_1',
        kind: 'review',
        title: 'New 5★ review',
        body: '“Quick pickup, great chat. Thanks!” — @local.roo',
        createdAt: now - 2 * 24 * 60 * 60 * 1000,
        unread: false,
        accent: '#fce7f3',
      },
    ]
  }, [])
}

function NotificationIcon({ kind, className = '' }: { kind: ActivityNotification['kind']; className?: string }) {
  switch (kind) {
    case 'bid':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
          <path
            d="M14 3l7 7-4 4-7-7 4-4zM10 10l-6 6v4h4l6-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'drop_ended':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
          <path
            d="M3 7h18M3 12h18M3 17h12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="19" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      )
    case 'price_drop':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
          <path d="M7 17L17 7M7 7h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'follower':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
          <path
            d="M16 11a4 4 0 10-4-4 4 4 0 004 4zM3 20a7 7 0 0114 0M19 8v6M22 11h-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'delivery':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
          <path
            d="M3 7h11v9H3zM14 11h4l3 3v2h-7M7 19a2 2 0 104 0M16 19a2 2 0 104 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'review':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
          <path
            d="M12 3l2.5 5.5L20 9l-4.2 3.9L17 19l-5-3-5 3 1.2-6.1L4 9l5.5-.5L12 3z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )
  }
}

/* --------------------------------- Purchases mock data --------------------------------- */

type PurchaseStatus = 'processing' | 'in_transit' | 'delivered' | 'completed'

type Purchase = {
  id: string
  listing: PeerListing
  purchasedAt: number
  status: PurchaseStatus
  sellerHandle: string
  eta?: string
}

function useRecentPurchases(): Purchase[] {
  return useMemo(() => {
    const now = Date.now()
    const src = MARKETPLACE_MOCK_PEER_LISTINGS.slice(0, 5)
    const statuses: PurchaseStatus[] = ['in_transit', 'processing', 'delivered', 'completed', 'completed']
    const etas = ['Tomorrow · 9–11am', 'Today · preparing', undefined, undefined, undefined]
    return src.map((l, i) => ({
      id: `p_${l.id}`,
      listing: l,
      purchasedAt: now - (i * 2 + 1) * 24 * 60 * 60 * 1000 - (i * 3) * 60 * 60 * 1000,
      status: statuses[i] ?? 'completed',
      sellerHandle: l.profileDisplayName?.trim() || l.sellerEmail?.split('@')[0] || 'local seller',
      eta: etas[i],
    }))
  }, [])
}

function statusChipFor(status: PurchaseStatus): { label: string; bg: string; fg: string } {
  switch (status) {
    case 'processing':
      return { label: 'Processing', bg: '#fef3c7', fg: '#92400e' }
    case 'in_transit':
      return { label: 'On the way', bg: '#dbeafe', fg: '#1e3a8a' }
    case 'delivered':
      return { label: 'Delivered', bg: '#dcfce7', fg: '#166534' }
    case 'completed':
      return { label: 'Completed', bg: '#ede9fe', fg: '#4c1d95' }
  }
}

/* --------------------------------- Component ------------------------------------------ */

function HomeShellChatHubPageInner({
  bottomNav,
  onMenuAccount,
  onChatWithField,
  initialThreadId,
  onConsumedInitialThread,
  listingUnread = 0,
  supportUnread = 0,
  onFetchIt,
}: HomeShellChatHubPageProps) {
  const [screen, setScreen] = useState<HubScreen>('hub')
  const [tab, setTab] = useState<ActivityTab>('messages')
  const [threadKind, setThreadKind] = useState<MessageThreadKind>('listing')
  const [threads, setThreads] = useState<MessageThreadSummary[]>([])
  const [activeThread, setActiveThread] = useState<MessageThreadSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const consumedInitialRef = useRef<string | null>(null)
  const openedViaHandoffRef = useRef(false)

  const sessionEmail = loadSession()?.email?.trim() ?? ''
  const notifications = useActivityNotifications()
  const purchases = useRecentPurchases()
  const unreadNotifications = notifications.filter((n) => n.unread).length

  const loadThreads = useCallback(async () => {
    setErr(null)
    setBusy(true)
    try {
      const rows = await fetchMessageThreads('listing')
      setThreads(rows)
    } catch (e) {
      setThreads([])
      setErr(e instanceof Error ? e.message : 'Could not load chats')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (!initialThreadId) return
    if (consumedInitialRef.current === initialThreadId) return
    consumedInitialRef.current = initialThreadId
    let cancelled = false
    void (async () => {
      try {
        const { thread } = await fetchMessageThread(initialThreadId)
        if (cancelled) return
        openedViaHandoffRef.current = true
        setThreadKind(thread.kind)
        setActiveThread(thread)
        setScreen('thread')
        onConsumedInitialThread?.()
      } catch {
        if (!cancelled) setErr('Could not open that conversation.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [initialThreadId, onConsumedInitialThread])

  useEffect(() => {
    if (screen !== 'hub') return
    if (tab !== 'messages') return
    void loadThreads()
  }, [screen, tab, loadThreads])

  const openSellerThread = (t: MessageThreadSummary) => {
    setThreadKind(t.kind)
    setActiveThread(t)
    setScreen('thread')
  }

  const openOrCreateSupport = async () => {
    if (!sessionEmail) {
      setErr('Sign in to use support chat.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const { thread } = await createMessageThread({ kind: 'support' })
      setActiveThread(thread)
      setThreadKind('support')
      setScreen('thread')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not start support chat')
    } finally {
      setBusy(false)
    }
  }

  if (screen === 'thread' && activeThread) {
    return (
      <div
        className="fetch-home-buysell-page absolute inset-0 z-[60] flex min-h-0 flex-col bg-[#f8f6fd]"
        role="main"
      >
        <ChatThreadView
          thread={activeThread}
          onBack={() => {
            setActiveThread(null)
            if (openedViaHandoffRef.current) {
              openedViaHandoffRef.current = false
              setScreen('hub')
            } else {
              setScreen('hub')
              if (threadKind === 'listing') void loadThreads()
            }
          }}
          onFetchIt={onFetchIt}
        />
        {bottomNav ? (
          <div className="fetch-home-marketplace-shell-footer shrink-0 pb-[env(safe-area-inset-bottom,0px)]">
            {bottomNav}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className="fetch-home-buysell-page absolute inset-0 z-[60] flex min-h-0 flex-col bg-[#f8f6fd]"
      role="main"
      aria-label="Activity"
    >
      <header className="shrink-0 border-b border-violet-100 bg-white px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top,0px))] shadow-[0_6px_18px_-18px_rgba(76,29,149,0.45)] sm:px-4">
        <div className="mx-auto grid w-full min-w-0 max-w-lg grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
          <div className="h-10 w-10 shrink-0" aria-hidden />
          <div className="flex min-w-0 flex-col items-center justify-center text-center">
            <span className="text-[17px] font-bold tracking-[-0.02em] text-[#1c1528] sm:text-[18px]">
              Activity
            </span>
            <span className="mt-0.5 text-[11px] font-medium leading-none text-zinc-500">
              Chats · notifications · purchases
            </span>
          </div>
          {onMenuAccount ? (
            <button
              type="button"
              onClick={onMenuAccount}
              className="flex h-10 w-10 shrink-0 items-center justify-center justify-self-end rounded-full bg-violet-50 text-[#4c1d95] ring-1 ring-violet-200/70 transition-colors active:bg-violet-100"
              aria-label="Profile"
            >
              <AccountNavIconFilled className="h-5 w-5" />
            </button>
          ) : (
            <div className="h-10 w-10 shrink-0" aria-hidden />
          )}
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col overflow-hidden">
        <div className="shrink-0 bg-white">
          <ActivityTabBar
            value={tab}
            onChange={setTab}
            messagesBadge={listingUnread}
            notificationsBadge={unreadNotifications}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-3 sm:px-4">
          {err ? (
            <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {err}
            </p>
          ) : null}

          {tab === 'messages' ? (
            <section className="space-y-2" aria-label="Seller chats">
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-violet-100 transition-transform active:scale-[0.99]"
                onClick={() => onChatWithField()}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#4c1d95] text-white">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                    <path
                      d="M12 3l9 4-9 4-9-4 9-4zM3 12l9 4 9-4M3 17l9 4 9-4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-[#1c1528]">Chat with the field</p>
                  <p className="truncate text-[12px] text-zinc-500">
                    Bookings, questions, and the home assistant
                  </p>
                </div>
                <ChevronRight />
              </button>

              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-violet-100 transition-transform active:scale-[0.99] disabled:opacity-60"
                disabled={busy}
                onClick={() => void openOrCreateSupport()}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[#4c1d95]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                    <path
                      d="M12 3a8 8 0 00-8 8v4a3 3 0 003 3h1v-6H6v-1a6 6 0 0112 0v1h-2v6h1a3 3 0 003-3v-4a8 8 0 00-8-8z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-[#1c1528]">Contact Fetch support</p>
                  <p className="truncate text-[12px] text-zinc-500">
                    {supportUnread > 0 ? `${supportUnread} unread reply` : 'Start a live support thread'}
                  </p>
                </div>
                <ChevronRight />
              </button>

              <div className="pt-2">
                <p className="px-1 pb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500">
                  Seller chats
                </p>
                {busy && threads.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-zinc-500">Loading seller chats…</p>
                ) : threads.length === 0 ? (
                  <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-violet-100">
                    <p className="text-[14px] font-semibold text-[#1c1528]">No seller chats yet</p>
                    <p className="mt-1 text-[12px] text-zinc-500">
                      Tap “Message seller” on any listing to start one.
                    </p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {threads.map((t) => {
                      const handle = sellerHandleFromThread(t)
                      const preview = t.lastMessagePreview?.trim() || 'Tap to open conversation'
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-violet-100 transition-transform active:scale-[0.99]"
                            onClick={() => openSellerThread(t)}
                          >
                            <Avatar name={handle} />
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-baseline gap-2">
                                <p className="truncate text-[14.5px] font-semibold text-[#1c1528]">
                                  {handle}
                                </p>
                                <span className="shrink-0 text-[11px] text-zinc-400">
                                  {formatRelativeTime(t.lastMessageAt || t.updatedAt)}
                                </span>
                              </div>
                              <p
                                className={[
                                  'mt-0.5 truncate text-[12.5px]',
                                  t.unreadCount > 0 ? 'font-semibold text-[#1c1528]' : 'text-zinc-500',
                                ].join(' ')}
                              >
                                {preview}
                              </p>
                            </div>
                            {t.unreadCount > 0 ? (
                              <span className="flex h-[1.15rem] min-w-[1.15rem] shrink-0 items-center justify-center rounded-full bg-[#4c1d95] px-1.5 text-[10px] font-bold leading-none text-white">
                                {t.unreadCount > 99 ? '99+' : t.unreadCount}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </section>
          ) : null}

          {tab === 'notifications' ? (
            <section className="space-y-2" aria-label="Notifications">
              <ul className="flex flex-col gap-2">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <div
                      className={[
                        'flex items-start gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 transition-colors',
                        n.unread ? 'ring-violet-200' : 'ring-violet-100',
                      ].join(' ')}
                    >
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#4c1d95]"
                        style={{ backgroundColor: n.accent ?? '#ede9fe' }}
                      >
                        <NotificationIcon kind={n.kind} className="h-[1.35rem] w-[1.35rem]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <p className="min-w-0 truncate text-[14.5px] font-semibold text-[#1c1528]">
                            {n.title}
                          </p>
                          <span className="shrink-0 text-[11px] text-zinc-400">
                            {formatRelativeTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-zinc-600">
                          {n.body}
                        </p>
                      </div>
                      {n.unread ? (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#4c1d95]"
                          aria-label="Unread"
                        />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {tab === 'purchases' ? (
            <section className="space-y-2" aria-label="Recent purchases">
              {purchases.length === 0 ? (
                <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-violet-100">
                  <p className="text-[14px] font-semibold text-[#1c1528]">No purchases yet</p>
                  <p className="mt-1 text-[12px] text-zinc-500">
                    Your recent orders will show up here.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {purchases.map((p) => {
                    const chip = statusChipFor(p.status)
                    const img = p.listing.images?.[0]?.url
                    return (
                      <li key={p.id}>
                        <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-violet-100">
                          <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-violet-100">
                            {img ? (
                              <img
                                src={listingImageAbsoluteUrl(img)}
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover"
                                loading="lazy"
                                draggable={false}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[10px] text-violet-300">
                                No preview
                              </div>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-[#1c1528]">
                                {p.listing.title}
                              </p>
                              <span
                                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]"
                                style={{ backgroundColor: chip.bg, color: chip.fg }}
                              >
                                {chip.label}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[11.5px] text-zinc-500">
                              @{p.sellerHandle.replace(/^@/, '')} · {formatRelativeTime(p.purchasedAt)} ago
                            </p>
                            <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
                              <span className="text-[13px] font-bold tabular-nums text-[#4c1d95]">
                                {formatAudFromCents(p.listing.priceCents ?? 0)}
                              </span>
                              {p.eta ? (
                                <span className="truncate text-[11px] font-medium text-zinc-500">
                                  {p.eta}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-[#4c1d95] ring-1 ring-violet-200/70 active:bg-violet-100"
                                  onClick={() => onFetchIt?.(p.listing)}
                                >
                                  Buy again
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      </div>

      {bottomNav ? (
        <div className="fetch-home-marketplace-shell-footer shrink-0 pb-[env(safe-area-inset-bottom,0px)]">
          {bottomNav}
        </div>
      ) : null}
    </div>
  )
}

function ChevronRight() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden
      className="shrink-0 text-zinc-300"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
    </svg>
  )
}

export const HomeShellChatHubPage = memo(HomeShellChatHubPageInner)
