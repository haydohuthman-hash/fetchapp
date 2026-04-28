/**
 * LiveAuctionScreen — full-screen Whatnot-style live auction experience with a
 * three-stage state machine:
 *
 *   STAGE_1_AWAITING       (4s)  — between items, only chat + Awaiting card
 *   STAGE_2_ACTIVE_BIDDING (10s) — item card with countdown + yellow slide-to-bid
 *   STAGE_3_SOLD           (3s)  — winner card, sold price, Awaiting card
 *
 * Auto-cycles in that order. Press keys 1 / 2 / 3 to jump between stages for
 * QA. Always-visible chrome (seller, LIVE pill, watch-to-earn, action rail,
 * chat feed, chat input) lives outside the stage bottom card.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'

type Stage = 'awaiting' | 'bidding' | 'sold'

type LiveItem = {
  id: string
  title: string
  subtitle: string
  shippingLabel: string
  imageUrl: string
  startBidCents: number
  bidStepCents: number
}

type Props = {
  open: boolean
  onClose: () => void
  /** Optional override for the seller block; defaults to a curated demo. */
  seller?: {
    handle: string
    avatarUrl: string
    rating?: number
    badge?: string
    backgroundUrl?: string
  }
}

const DEFAULT_SELLER = {
  handle: 'winterraven92',
  avatarUrl:
    'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=128&q=80',
  rating: 5.0,
  badge: '<1d',
  backgroundUrl:
    'https://images.unsplash.com/photo-1602524818691-89e74931f3ed?w=1200&q=82',
}

const ITEM_QUEUE: LiveItem[] = [
  {
    id: 'larvikite-palm-stone',
    title: 'Larvikite Palm Stone',
    subtitle: 'Healing crystal · 45mm',
    shippingLabel: 'Shipping & Tax',
    imageUrl:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=82',
    startBidCents: 300,
    bidStepCents: 100,
  },
  {
    id: 'amethyst-cluster',
    title: 'Amethyst Cluster',
    subtitle: 'Brazilian · A-grade · 9cm',
    shippingLabel: 'Shipping & Tax',
    imageUrl:
      'https://images.unsplash.com/photo-1519568474571-3da3a0d8d6c1?w=400&q=82',
    startBidCents: 700,
    bidStepCents: 200,
  },
  {
    id: 'rose-quartz-heart',
    title: 'Rose Quartz Heart',
    subtitle: 'Polished · 60mm',
    shippingLabel: 'Shipping & Tax',
    imageUrl:
      'https://images.unsplash.com/photo-1549887534-1541e9326642?w=400&q=82',
    startBidCents: 400,
    bidStepCents: 100,
  },
]

const STAGE_DURATIONS: Record<Stage, number> = {
  awaiting: 4_000,
  bidding: 10_000,
  sold: 3_000,
}

function formatAud(cents: number): string {
  const n = Math.round(cents) / 100
  return `$${n.toFixed(0)}`
}

function formatMmSs(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function LiveAuctionScreen({ open, onClose, seller }: Props) {
  const [stage, setStage] = useState<Stage>('awaiting')
  const [stageStartedAt, setStageStartedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [itemIndex, setItemIndex] = useState(0)
  const [currentBidCents, setCurrentBidCents] = useState(ITEM_QUEUE[0].startBidCents)
  const [followed, setFollowed] = useState(false)
  const [chatLines, setChatLines] = useState<Array<{ id: string; name: string; text: string; mod?: boolean; system?: 'join' }>>([])
  const [chatDraft, setChatDraft] = useState('')
  const chatSeed = useRef(0)
  const stageRef = useRef<Stage>(stage)
  stageRef.current = stage
  const item = ITEM_QUEUE[itemIndex]
  const sellerInfo = { ...DEFAULT_SELLER, ...(seller ?? {}) }

  // Tick clock
  useEffect(() => {
    if (!open) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [open])

  // Stage auto-advance
  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => {
      setStage((prev) => {
        if (prev === 'awaiting') return 'bidding'
        if (prev === 'bidding') return 'sold'
        return 'awaiting'
      })
    }, STAGE_DURATIONS[stage])
    return () => window.clearTimeout(id)
  }, [open, stage, stageStartedAt])

  // When stage flips, reset relevant state
  useEffect(() => {
    if (!open) return
    setStageStartedAt(Date.now())
    if (stage === 'bidding') {
      setCurrentBidCents(item.startBidCents)
    }
    if (stage === 'awaiting' && stageRef.current !== 'awaiting') {
      // Move to next item after a sold cycle.
      setItemIndex((i) => (i + 1) % ITEM_QUEUE.length)
    }
  }, [open, stage, item.startBidCents])

  // Mock other users bumping the price during bidding stage
  useEffect(() => {
    if (!open || stage !== 'bidding') return
    const id = window.setInterval(() => {
      setCurrentBidCents((c) => c + item.bidStepCents)
    }, 2_400 + Math.random() * 1_400)
    return () => window.clearInterval(id)
  }, [open, stage, item.bidStepCents])

  // Seed chat + drip lines while open
  useEffect(() => {
    if (!open) return
    const seedNames = [
      'shanhicks1991',
      'thingsikeptthingsifoun',
      'hayban47551',
      'spicymangopaw',
      'biscsmocaptain',
      'agnesbusza',
      'towave',
    ]
    const seedLines = [
      { name: 'shanhicks1991', text: 'Nooo. Someone will snatch it up. Clothes have to fit us, not the other way round!', mod: true },
      { name: 'shanhicks1991', text: "I don't think I've seen this before!", mod: true },
      { name: 'shanhicks1991', text: 'Gorgeous', mod: true },
      { name: 'hayban47551', text: 'joined 👋', system: 'join' as const },
      { name: 'thingsikeptthingsifoun', text: 'How much would that be?' },
      { name: 'thingsikeptthingsifoun', text: 'Do you have any clear quartz sphere?' },
      { name: 'spicymangopaw', text: 'joined 👋', system: 'join' as const },
      { name: 'biscsmocaptain', text: 'Jeans sz 8-10 ❤️' },
      { name: 'agnesbusza', text: 'I meant women size 8.' },
      { name: 'towave', text: 'joined 👋', system: 'join' as const },
    ]
    setChatLines(
      seedLines.map((l, i) => ({
        id: `seed_${i}`,
        ...l,
      })),
    )
    chatSeed.current = seedLines.length
    const id = window.setInterval(() => {
      const which = seedNames[Math.floor(Math.random() * seedNames.length)]
      const isJoin = Math.random() < 0.35
      const msg = isJoin
        ? { name: which, text: 'joined 👋', system: 'join' as const }
        : {
            name: which,
            text: [
              '🔥🔥',
              'beautiful',
              'sniped me lol',
              'ship to AU?',
              'love this drop',
              'dropping fits',
            ][Math.floor(Math.random() * 6)],
          }
      chatSeed.current += 1
      setChatLines((prev) => [...prev.slice(-30), { id: `live_${chatSeed.current}`, ...msg }])
    }, 2_800)
    return () => window.clearInterval(id)
  }, [open])

  // Manual key shortcuts: 1 / 2 / 3
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '1') setStage('awaiting')
      else if (e.key === '2') setStage('bidding')
      else if (e.key === '3') setStage('sold')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Lock body scroll
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const elapsed = now - stageStartedAt
  const biddingRemainingSec = stage === 'bidding'
    ? Math.max(0, Math.ceil((STAGE_DURATIONS.bidding - elapsed) / 1000))
    : 0
  const watchEarnRemaining = useMemo(
    () => Math.max(0, 26 - Math.floor((now / 1000) % 27)),
    [now],
  )

  const onSendChat = useCallback(() => {
    const trimmed = chatDraft.trim()
    if (!trimmed) return
    chatSeed.current += 1
    setChatLines((prev) => [...prev.slice(-30), { id: `you_${chatSeed.current}`, name: 'you', text: trimmed }])
    setChatDraft('')
  }, [chatDraft])

  const onConfirmBid = useCallback(() => {
    setCurrentBidCents((c) => c + item.bidStepCents)
  }, [item.bidStepCents])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9995] flex flex-col overflow-hidden bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Fetchit live auction"
    >
      <LiveBackground imageUrl={sellerInfo.backgroundUrl} />

      <div className="pointer-events-none absolute inset-0 z-[1]">
        {/* Top scrim + bottom scrim */}
        <span className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/90 via-black/45 to-transparent" />
        <span className="absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-black via-black/82 to-transparent" />
      </div>

      <LiveTopBar
        seller={sellerInfo}
        followed={followed}
        onFollow={() => setFollowed((v) => !v)}
        viewersLabel={stage === 'sold' ? '1.1K' : stage === 'bidding' ? '980' : '1.2K'}
        onClose={onClose}
      />

      <WatchToEarnCard remainingSec={watchEarnRemaining} />

      <LiveActionRail shopBadge={stage === 'bidding' ? 14 : stage === 'sold' ? 24 : 16} />

      <FloatingChat lines={chatLines} stage={stage} />

      <div className="absolute inset-x-0 bottom-0 z-[5] flex flex-col gap-2 px-3 pb-[max(0.7rem,env(safe-area-inset-bottom,0px))] pt-2">
        {stage === 'bidding' ? (
          <>
            <ChatInputBar value={chatDraft} onChange={setChatDraft} onSend={onSendChat} />
            <ActiveBidCard
              item={item}
              currentBidCents={currentBidCents}
              remainingSec={biddingRemainingSec}
              onConfirmBid={onConfirmBid}
            />
          </>
        ) : null}
        {stage === 'sold' ? (
          <SoldTransitionCard item={item} winningBidCents={currentBidCents} winnerHandle="shanhicks1991" />
        ) : null}
        {(stage === 'awaiting' || stage === 'sold') ? <AwaitingNextItemCard /> : null}
        {stage !== 'bidding' ? (
          <ChatInputBar value={chatDraft} onChange={setChatDraft} onSend={onSendChat} />
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

/* ----------------------------- Background ---------------------------- */

function LiveBackground({ imageUrl }: { imageUrl?: string }) {
  return (
    <div className="absolute inset-0 z-0">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover opacity-90"
          draggable={false}
        />
      ) : (
        <div className="h-full w-full bg-zinc-950" />
      )}
    </div>
  )
}

/* ----------------------------- Top bar ---------------------------- */

function LiveTopBar({
  seller,
  followed,
  onFollow,
  viewersLabel,
  onClose,
}: {
  seller: { handle: string; avatarUrl: string; rating?: number; badge?: string }
  followed: boolean
  onFollow: () => void
  viewersLabel: string
  onClose: () => void
}) {
  return (
    <div className="absolute inset-x-0 top-0 z-[3] flex items-start justify-between gap-2 px-3 pt-[max(0.85rem,env(safe-area-inset-top,0px))]">
      <div className="flex min-w-0 items-start gap-2">
        <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-700 ring-2 ring-white/20">
          <img src={seller.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        </span>
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="line-clamp-1 text-[12.5px] font-black text-white">{seller.handle}</span>
            <button
              type="button"
              onClick={onFollow}
              className={[
                'rounded-full px-2 py-[2px] text-[9.5px] font-black uppercase tracking-[0.08em] ring-1',
                followed
                  ? 'bg-white/15 text-white ring-white/25'
                  : 'bg-[#7c3aed] text-white ring-[#7c3aed]/40 shadow-[0_0_12px_rgba(124,58,237,0.4)]',
              ].join(' ')}
              aria-pressed={followed}
            >
              {followed ? 'Following' : 'Follow'}
            </button>
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[10.5px] font-bold text-white/70">
            <span aria-hidden>★</span>
            <span>{(seller.rating ?? 5).toFixed(1)}</span>
            <span aria-hidden>·</span>
            <span>{seller.badge ?? '<1d'}</span>
          </span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="rounded-md bg-rose-600 px-1.5 py-1 text-[9.5px] font-black uppercase leading-none tracking-wide text-white shadow-[0_8px_18px_-10px_rgba(225,29,72,0.8)]">
          <span className="fetch-live-pulse mr-1 inline-block h-1.5 w-1.5 rounded-full bg-white align-middle" />
          Live
        </span>
        <span className="flex items-center gap-1 rounded-md bg-black/45 px-1.5 py-1 text-[9.5px] font-black tabular-nums text-white ring-1 ring-white/15 backdrop-blur-md">
          <svg
            className="h-3 w-3 text-white/85"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {viewersLabel}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Minimise live"
          className="grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/15 backdrop-blur-md active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/* ----------------------------- Watch-to-earn ---------------------------- */

function WatchToEarnCard({ remainingSec }: { remainingSec: number }) {
  const fraction = Math.min(1, Math.max(0, (26 - remainingSec) / 26))
  return (
    <div className="absolute left-3 top-[5.15rem] z-[3]">
      <div className="rounded-2xl bg-black/42 p-2 ring-1 ring-white/10 backdrop-blur-md">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="grid h-4 w-4 place-items-center rounded-md bg-[#7c3aed] text-[9px] text-white">
            💎
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/85">
            Watch to earn
          </span>
        </span>
        <p className="mt-1 text-[12px] font-black tabular-nums text-white">
          {formatMmSs(remainingSec)}
        </p>
        <span className="mt-1 block h-1 w-20 overflow-hidden rounded-full bg-white/10">
          <span
            className="block h-full bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] transition-[width] duration-500"
            style={{ width: `${fraction * 100}%` }}
            aria-hidden
          />
        </span>
      </div>
    </div>
  )
}

/* ----------------------------- Right action rail ---------------------------- */

function LiveActionRail({ shopBadge }: { shopBadge: number }) {
  const items: Array<{ icon: string; label: string; badge?: number }> = [
    { icon: '⋯', label: 'More' },
    { icon: '↗', label: 'Share' },
    { icon: '🛍️', label: 'Shop', badge: shopBadge },
  ]
  return (
    <div className="absolute right-2 top-[8.15rem] z-[3] flex flex-col items-center gap-2">
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          aria-label={it.label}
          className="relative flex w-10 flex-col items-center gap-0.5 rounded-2xl bg-black/35 px-1 py-1.5 text-[9px] font-bold text-white/90 ring-1 ring-white/10 backdrop-blur-md transition-transform active:scale-95"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-[13px]">
            {it.icon}
          </span>
          {it.label}
          {it.badge ? (
            <span className="absolute right-1 top-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-[#7c3aed] px-1 text-[9px] font-black text-white ring-2 ring-black/60">
              {it.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

/* ----------------------------- Floating chat ---------------------------- */

function FloatingChat({ lines, stage }: { lines: Array<{ id: string; name: string; text: string; mod?: boolean; system?: 'join' }>; stage: Stage }) {
  const visible = lines.slice(stage === 'bidding' ? -4 : -3)
  // Keep chat high enough to never collide with bottom cards.
  const bottomOffset = stage === 'bidding' ? '16.75rem' : stage === 'sold' ? '16.5rem' : '10rem'
  return (
    <div
      className="pointer-events-none absolute left-3 right-[4.6rem] z-[2] flex max-h-[30vh] flex-col-reverse gap-1"
      style={{ bottom: `calc(${bottomOffset} + env(safe-area-inset-bottom, 0px))` }}
    >
      {[...visible].reverse().map((c) =>
        c.system === 'join' ? (
          <div
            key={c.id}
            className="fetch-live-chat-in flex max-w-fit items-center gap-2 rounded-full bg-black/38 px-2.5 py-1 text-[11px] font-bold text-white/80 ring-1 ring-white/10 backdrop-blur-md"
          >
            <span className="font-black text-white">{c.name}</span>
            <span className="text-white/70">{c.text}</span>
          </div>
        ) : (
          <div
            key={c.id}
            className="fetch-live-chat-in flex max-w-[20rem] items-start gap-2 rounded-2xl bg-black/38 px-2.5 py-1.5 ring-1 ring-white/10 backdrop-blur-md"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-[10px] font-black text-white/80">
              {c.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-[11px] font-black text-white">
                {c.name}
                {c.mod ? (
                  <span className="rounded-md bg-[#4c1d95] px-1.5 py-[1px] text-[9px] font-black uppercase tracking-[0.08em] text-white">
                    Mod
                  </span>
                ) : null}
              </span>
              <span className="block text-[11.5px] font-medium leading-snug text-white/82">
                {c.text}
              </span>
            </span>
          </div>
        ),
      )}
    </div>
  )
}

/* ----------------------------- Chat input ---------------------------- */

function ChatInputBar({
  value,
  onChange,
  onSend,
}: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSend()
      }}
      className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 ring-1 ring-white/15 backdrop-blur-md"
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Say something…"
        aria-label="Send a message"
        className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-white outline-none placeholder:text-white/55"
      />
      <button
        type="button"
        aria-label="Open mascot reactions"
        className="grid h-7 w-7 place-items-center rounded-full bg-white/15 text-[15px] ring-1 ring-white/15 active:scale-95"
      >
        👀
      </button>
      {value.trim() ? (
        <button
          type="submit"
          aria-label="Send message"
          className="grid h-7 w-7 place-items-center rounded-full bg-white text-[#4c1d95] active:scale-95"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M3 11l18-8-8 18-2-8-8-2z" />
          </svg>
        </button>
      ) : null}
    </form>
  )
}

/* ----------------------------- Awaiting card ---------------------------- */

function AwaitingNextItemCard() {
  return (
    <div className="rounded-[1.35rem] bg-black/62 p-4 text-center ring-1 ring-white/12 backdrop-blur-xl shadow-[0_-18px_42px_-30px_rgba(0,0,0,0.9)]">
      <span aria-hidden className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-[#7c3aed]/30 text-[#a78bfa] ring-1 ring-[#a78bfa]/30">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="2" />
          <path d="M12 9v4l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 3h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <p className="mt-2 text-[14px] font-black tracking-tight text-white">Awaiting Next Item</p>
      <p className="mt-1 text-[12px] font-medium text-white/55">Next item coming up soon…</p>
    </div>
  )
}

/* ----------------------------- Active bid card ---------------------------- */

function ActiveBidCard({
  item,
  currentBidCents,
  remainingSec,
  onConfirmBid,
}: {
  item: LiveItem
  currentBidCents: number
  remainingSec: number
  onConfirmBid: () => void
}) {
  const nextBidCents = currentBidCents + item.bidStepCents
  const urgent = remainingSec <= 5
  return (
    <div className="rounded-[1.35rem] bg-black/62 p-3 ring-1 ring-white/12 backdrop-blur-xl shadow-[0_-18px_42px_-30px_rgba(0,0,0,0.9)]">
      <div className="flex items-start gap-3">
        <span className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-zinc-800 ring-1 ring-white/10">
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[14px] font-black tracking-tight text-white">{item.title}</p>
          <p className="line-clamp-1 text-[11.5px] font-semibold text-white/65">{item.subtitle}</p>
          <p className="mt-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/45">
            {item.shippingLabel}
          </p>
        </div>
        <span
          className={[
            'shrink-0 rounded-xl px-3 py-2 text-[17px] font-black tabular-nums',
            urgent ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/40' : 'bg-amber-300/15 text-amber-200 ring-1 ring-amber-300/40',
          ].join(' ')}
        >
          {formatMmSs(remainingSec)}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="flex shrink-0 flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">
            Current Bid
          </span>
          <span className="text-[24px] font-black tabular-nums text-[#a78bfa]">
            {formatAud(currentBidCents)}
          </span>
        </span>
        <span className="min-w-0 text-right">
          <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
            Next bid
          </span>
          <span className="block text-[13px] font-black text-white">
            {formatAud(nextBidCents)}
          </span>
        </span>
      </div>

      <div className="mt-2 grid grid-cols-[6.2rem_minmax(0,1fr)] items-center gap-2">
        <button
          type="button"
          className="h-[52px] rounded-full bg-black/50 px-3 text-[10.5px] font-black uppercase tracking-[0.08em] text-white ring-1 ring-white/15 active:scale-95"
        >
          Custom
        </button>
        <BidSlider nextBidLabel={`Bid: ${formatAud(nextBidCents)}`} onConfirm={onConfirmBid} />
      </div>

      <p className="mt-1.5 text-center text-[11px] font-bold text-[#a78bfa]">
        ⚡ + $1 Bid Boost active
      </p>
    </div>
  )
}

/* ----------------------------- Bid slider ---------------------------- */

function BidSlider({ nextBidLabel, onConfirm }: { nextBidLabel: string; onConfirm: () => void }) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [trackW, setTrackW] = useState(0)
  const [px, setPx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const dragRef = useRef<{ pid: number; startX: number; startPx: number } | null>(null)
  const pxRef = useRef(0)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => setTrackW(el.getBoundingClientRect().width)
    measure()
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      return () => ro.disconnect()
    }
    return undefined
  }, [])

  const SLIDE_FRAC = 0.22
  const slideZone = Math.max(0, trackW * SLIDE_FRAC)
  const fillPct =
    (1 - SLIDE_FRAC) * 100 + (slideZone > 0 ? (px / slideZone) * SLIDE_FRAC * 100 : 0)
  const trans = dragging ? 'none' : 'width 0.32s cubic-bezier(0.22, 1, 0.36, 1)'

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (confirmed) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragRef.current = { pid: e.pointerId, startX: e.clientX, startPx: pxRef.current }
    setDragging(true)
  }
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || d.pid !== e.pointerId) return
    const next = Math.max(0, Math.min(slideZone, d.startPx + (e.clientX - d.startX)))
    pxRef.current = next
    setPx(next)
  }
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || d.pid !== e.pointerId) return
    setDragging(false)
    dragRef.current = null
    if (slideZone > 0 && pxRef.current / slideZone >= 0.85) {
      pxRef.current = slideZone
      setPx(slideZone)
      setConfirmed(true)
      onConfirm()
      window.setTimeout(() => {
        setConfirmed(false)
        pxRef.current = 0
        setPx(0)
      }, 700)
    } else {
      pxRef.current = 0
      setPx(0)
    }
  }

  return (
    <div
      ref={trackRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fillPct)}
      aria-label={nextBidLabel}
      className="fetch-bid-slider-track relative ml-auto flex h-[52px] w-full min-w-[9.25rem] shrink-0 select-none touch-none items-center overflow-hidden rounded-full"
    >
      {/* Yellow fill that grows as you slide */}
      <span
        aria-hidden
        className="fetch-bid-slider-fill absolute inset-y-0 left-0 rounded-full bg-[#FFD600]"
        style={{ width: `${fillPct}%`, transition: trans }}
      />
      <span className="pointer-events-none relative z-[1] flex w-full items-center justify-center gap-1 text-[14px] font-black tracking-tight text-zinc-950">
        {confirmed ? (
          <>Bid placed!</>
        ) : (
          <>
            {nextBidLabel}
            <span aria-hidden className="text-[16px] font-black">&gt;&gt;</span>
          </>
        )}
      </span>
    </div>
  )
}

/* ----------------------------- Sold transition card ---------------------------- */

function SoldTransitionCard({
  item,
  winningBidCents,
  winnerHandle,
}: {
  item: LiveItem
  winningBidCents: number
  winnerHandle: string
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.35rem] bg-black/62 p-3 ring-1 ring-white/12 backdrop-blur-xl shadow-[0_-18px_42px_-30px_rgba(0,0,0,0.9)]">
      <SoldConfetti />
      <p className="text-center text-[14px] font-black tracking-tight text-[#a78bfa]">
        {winnerHandle} won!
      </p>
      <div className="mt-2 flex items-start gap-3">
        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[13.5px] font-black tracking-tight text-white">{item.title}</p>
          <p className="line-clamp-1 text-[11.5px] font-semibold text-white/65">{item.subtitle}</p>
          <p className="mt-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/45">
            {item.shippingLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[17px] font-black tabular-nums text-white">{formatAud(winningBidCents)}</p>
          <p className="text-[10.5px] font-black uppercase tracking-[0.12em] text-rose-400">Sold</p>
        </div>
      </div>
    </div>
  )
}

function SoldConfetti() {
  const palette = ['#a78bfa', '#7c3aed', '#f472b6', '#fbbf24', '#22d3ee']
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 16 }, (_, i) => {
        const seed = (i + 1) * 9301 + 49297
        const r = (n: number) => {
          const x = Math.sin(seed + n) * 10000
          return x - Math.floor(x)
        }
        return (
          <span
            key={i}
            className="fetch-live-confetti absolute"
            style={{
              left: `${(r(1) * 100).toFixed(2)}%`,
              top: '-12%',
              width: `${5 + Math.floor(r(2) * 5)}px`,
              height: `${10 + Math.floor(r(3) * 4)}px`,
              background: palette[Math.floor(r(4) * palette.length)],
              transform: `rotate(${(r(5) * 360).toFixed(0)}deg)`,
              borderRadius: r(6) > 0.5 ? '999px' : '2px',
              animationDelay: `${(r(7) * 0.8).toFixed(2)}s`,
            }}
          />
        )
      })}
    </span>
  )
}
