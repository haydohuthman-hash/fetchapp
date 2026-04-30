import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CURATED_DROP_REELS } from '../lib/drops/constants'
import type { DropReel } from '../lib/drops/types'
import fetchitLiveNoOneOnlineUrl from '../assets/fetchit-live-no-one-online-hero.png'
import {
  STARTING_SOON_BATTLES,
  applyNewBid,
  buildInitialLiveBidState,
  formatAudCents,
  formatCountLabel,
  formatMmSs,
  type LiveBidState,
  type StartingSoonBattle,
} from '../lib/fetchBidWarsBattles'
import { ambientRegisterBidWars } from '../lib/audio/fetchAmbientMusic'
import { FetchBidWarsBattleOverlay } from './FetchBidWarsBattleOverlay'
import { StartingSoonListingSheet } from './StartingSoonListingSheet'
import { useIsAuctionBoosted } from '../lib/data'

/**
 * Small reusable "BOOSTED" badge shown on listings/auctions that were
 * published while the user had an active Prize Spin "Seller Boost" perk.
 */
function BoostedBadge({ id }: { id: string }) {
  const boosted = useIsAuctionBoosted(id)
  if (!boosted) return null
  return (
    <span
      className="absolute right-1 top-1 z-[3] inline-flex items-center gap-1 rounded-md bg-amber-400 px-1.5 py-[3px] text-[9.5px] font-black uppercase tracking-[0.08em] text-amber-950 shadow-[0_4px_12px_-4px_rgba(217,119,6,0.55)] ring-1 ring-amber-500"
      aria-label="Seller boosted listing"
    >
      <span aria-hidden>⚡</span> Boosted
    </span>
  )
}

function reelPoster(r: DropReel): string | undefined {
  return r.imageUrls?.[0]?.trim() || r.poster?.trim() || undefined
}

function sellerLine(r: DropReel): string {
  const s = r.seller.trim()
  return s.length > 0 ? s : 'Creator'
}

function viewerCount(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return String(24 + (h % 480))
}

/** Stable default when no `reels` prop is passed — real live data should replace this. */
const LIVE_NOW_DEFAULT_EMPTY_REELS: readonly DropReel[] = []

/* ─── Live Now — 2-column grid ─────────────────────────────────── */

function LiveNowCard({ reel, onOpen }: { reel: DropReel; onOpen: (reel: DropReel) => void }) {
  const poster = reelPoster(reel)
  const seller = sellerLine(reel)
  const viewers = viewerCount(reel.id)
  const title = reel.title?.trim() || 'Live'

  return (
    <button
      type="button"
      onClick={() => onOpen(reel)}
      className="flex flex-col bg-transparent p-0 text-left transition-transform active:scale-[0.98]"
      aria-label={`Live from ${seller}. ${reel.priceLabel}, ${viewers} viewers`}
    >
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
        {poster ? (
          <img
            src={poster}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">No photo</div>
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
          aria-hidden
        />
        <BoostedBadge id={reel.id} />
        <div className="pointer-events-none absolute left-1 top-1 z-[3] flex max-w-[calc(100%-0.5rem)] items-stretch overflow-hidden whitespace-nowrap rounded-md shadow-[0_6px_18px_-10px_rgba(76,29,149,0.6)] ring-1 ring-black/15">
          <span className="flex items-center bg-rose-600 px-1.5 py-[3px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-white">
            Live
          </span>
          <span className="flex items-center gap-1 bg-[#4c1d95] px-1.5 py-[3px] text-[11px] font-extrabold tabular-nums leading-none text-white">
            <svg
              className="h-3 w-3 shrink-0 text-white/90"
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
            {viewers}
          </span>
        </div>
        <p className="pointer-events-none absolute bottom-0 left-0 z-[4] max-w-full truncate px-2 pb-2 pt-8 text-left text-[13px] font-semibold leading-tight text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.9)]">
          {seller}
        </p>
      </div>
      <p className="mt-1.5 line-clamp-2 min-h-[2.15em] text-[12px] font-extrabold leading-tight tracking-[-0.01em] text-zinc-900">
        {title}
      </p>
    </button>
  )
}

export const LiveNowGrid = memo(function LiveNowGrid({
  onOpenDrops,
  onOpenLive,
  reels = LIVE_NOW_DEFAULT_EMPTY_REELS,
  onGetNotified,
}: {
  onOpenDrops: () => void
  onOpenLive?: (reel: DropReel) => void
  /** Currently live drops/reels from your backend; empty shows the offline hero. */
  reels?: readonly DropReel[]
  onGetNotified?: () => void
}) {
  const openLive = onOpenLive ?? (() => onOpenDrops())
  const [notifyAck, setNotifyAck] = useState(false)

  const handleGetNotified = useCallback(() => {
    onGetNotified?.()
    setNotifyAck(true)
  }, [onGetNotified])

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-3 py-5 dark:bg-zinc-900">
        <img
          src={fetchitLiveNoOneOnlineUrl}
          alt="No one is live online right now"
          className="mx-auto w-full max-w-[min(100%,26rem)] select-none object-contain"
          draggable={false}
        />
        {notifyAck ? (
          <p className="text-center text-[13px] font-medium text-zinc-600 dark:text-zinc-400">
            You&apos;re on the list — we&apos;ll ping you when someone goes live.
          </p>
        ) : (
          <button
            type="button"
            onClick={handleGetNotified}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#4c1d95] px-6 text-[14px] font-extrabold text-white shadow-[0_10px_22px_-12px_rgba(76,29,149,0.75)] ring-1 ring-black/10 transition-transform active:scale-[0.98] dark:ring-white/15"
          >
            Get notified
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 px-0">
      {reels.map((r) => (
        <LiveNowCard key={r.id} reel={r} onOpen={openLive} />
      ))}
    </div>
  )
})

/* ─── Starting Soon — Bid Wars "Up next" hero + list ──────────── */

/** Simulated duration a battle stays "live" in the feed before it rotates. */
const LIVE_DURATION_SEC = 18
/** +5s anti-snipe bonus applied when a bid lands with ≤ 10s remaining. */
const TIME_BONUS_SEC = 5
/** Viewer's id — matches the overlay's `VIEWER_ID`. */
const VIEWER_ID = 'me_viewer'

export type BattlePhase = 'upcoming' | 'live' | 'done'
export type BattleSyncState = {
  phase: BattlePhase
  /**
   * Derived remaining seconds. For `upcoming` it counts down to start;
   * for `live` it's `max(0, ceil((endsAtEpoch - now) / 1000))`; for `done`
   * always 0.
   */
  remaining: number
  /** Live bid state (participants, current bid, top bidder) — present only in `live` phase. */
  live?: LiveBidState
  /**
   * Absolute deadline for the live phase in ms (epoch). Derived remaining is
   * computed from this so all surfaces (card, row, sheet, overlay) agree to
   * the second, and so +5s bonuses are trivially synchronised.
   */
  endsAtEpoch?: number
  /**
   * Bumped whenever +5s is applied; consumers can watch this to trigger
   * their own visual pulse (e.g. the overlay's floating "+5s" tag).
   */
  bonusPulseSeq?: number
}

type InternalSyncState = BattleSyncState & {
  /** Seconds remaining in upcoming phase (raw tick counter for upcoming only). */
  upcomingRemaining?: number
}

/**
 * One source of truth for every battle's phase, timer, and live bid state.
 *
 * The hook owns:
 *   - Per-second upcoming countdowns and the upcoming → live transition
 *   - `endsAtEpoch` deadline timing for the live phase, re-rendered on a 1s `now` tick
 *   - A shared rival auto-bid interval for all live battles
 *   - A +5s anti-snipe extension when any bid lands with ≤ 10s remaining
 *   - Auto-rotation of the head battle once it hits `done`
 *
 * Consumers dispatch actions (`placeViewerBid`, `finalizeBattle`,
 * `resetBattle`) to mutate the shared state — the feed cards, the details
 * sheet, and the battle overlay all render from the same snapshot.
 */
function useBattleSync(battles: StartingSoonBattle[]) {
  const [order, setOrder] = useState<string[]>(() => battles.map((b) => b.id))
  const [stateById, setStateById] = useState<Record<string, InternalSyncState>>(() => {
    const m: Record<string, InternalSyncState> = {}
    for (const b of battles) {
      m[b.id] = {
        phase: 'upcoming',
        remaining: b.startsInSec,
        upcomingRemaining: b.startsInSec,
      }
    }
    return m
  })
  // `now` is bumped once per second so derived live `remaining` stays fresh.
  const [, setNowTick] = useState(() => Date.now())

  const stateRef = useRef(stateById)
  useEffect(() => {
    stateRef.current = stateById
  }, [stateById])

  /**
   * Ref mirror of `order` so the core tick (a long-lived interval set up in
   * an empty-deps effect) can always read the current head. Non-head battles
   * must not tick their countdowns or transition to live — only the head
   * runs. This is how we guarantee **at most one live battle at a time**.
   */
  const orderRef = useRef(order)
  useEffect(() => {
    orderRef.current = order
  }, [order])

  const battlesById = useMemo(() => {
    const m: Record<string, StartingSoonBattle> = {}
    for (const b of battles) m[b.id] = b
    return m
  }, [battles])
  const battlesByIdRef = useRef(battlesById)
  useEffect(() => {
    battlesByIdRef.current = battlesById
  }, [battlesById])

  /* ─── Core tick: upcoming countdown + phase transitions + live deadline ───
   * Every battle's upcoming countdown ticks normally so the queue cards
   * animate, but ONLY the head battle can actually transition to `live`.
   * A non-head battle that ticks down to 0 is clamped at 1s until it
   * rotates into the head slot — then it immediately flips live on the
   * next tick. This guarantees **at most one live battle at any time**,
   * matching real broadcast semantics where one fight is on stage.
   */
  useEffect(() => {
    const tickId = window.setInterval(() => {
      const now = Date.now()
      setNowTick(now)
      setStateById((prev) => {
        const headId = orderRef.current[0]
        const next: Record<string, InternalSyncState> = {}
        let changed = false
        for (const k in prev) {
          const cur = prev[k]
          const isHead = k === headId
          if (cur.phase === 'upcoming') {
            const prevRem = cur.upcomingRemaining ?? cur.remaining
            const upcomingRem = prevRem - 1
            if (upcomingRem > 0 || !isHead) {
              // Non-head battles are floored at 1s so they can't go live.
              // Head ticks normally until it reaches 0 below.
              const floored = !isHead ? Math.max(1, upcomingRem) : upcomingRem
              if (floored === prevRem) {
                next[k] = cur
              } else {
                next[k] = {
                  ...cur,
                  phase: 'upcoming',
                  remaining: floored,
                  upcomingRemaining: floored,
                }
                changed = true
              }
            } else {
              // Head transition to live: seed live state + set the deadline
              const b = battlesByIdRef.current[k]
              const live = b ? buildInitialLiveBidState(b) : cur.live
              const endsAt = now + LIVE_DURATION_SEC * 1000
              next[k] = {
                phase: 'live',
                remaining: LIVE_DURATION_SEC,
                live,
                endsAtEpoch: endsAt,
                bonusPulseSeq: 0,
                upcomingRemaining: undefined,
              }
              changed = true
            }
          } else if (cur.phase === 'live') {
            const endsAt = cur.endsAtEpoch ?? now
            const rem = Math.max(0, Math.ceil((endsAt - now) / 1000))
            if (rem > 0) {
              if (cur.remaining !== rem) {
                next[k] = { ...cur, remaining: rem }
                changed = true
              } else {
                next[k] = cur
              }
            } else {
              next[k] = { ...cur, phase: 'done', remaining: 0 }
              changed = true
            }
          } else {
            next[k] = cur
          }
        }
        return changed ? next : prev
      })
    }, 1000)
    return () => window.clearInterval(tickId)
  }, [])

  /* ─── Rival auto-bid loop for every live battle ──────────────────────── */
  const lastBidAtRef = useRef<Record<string, number>>({})
  useEffect(() => {
    const id = window.setInterval(() => {
      setStateById((prev) => {
        const now = Date.now()
        let changed = false
        const next: Record<string, InternalSyncState> = { ...prev }
        for (const k in prev) {
          const cur = prev[k]
          if (cur.phase !== 'live' || !cur.live || !cur.endsAtEpoch) continue
          const remaining = Math.max(0, Math.ceil((cur.endsAtEpoch - now) / 1000))
          if (remaining <= 0) continue

          // Gate: don't spam bids. Wait ≥ 2.4s since the last rival bid, then
          // a coin flip, matching the overlay's original simulator.
          const lastAt = lastBidAtRef.current[k] ?? 0
          if (now - lastAt < 2400) continue
          if (Math.random() < 0.45) continue

          // Favour outbidding the viewer when they're leading
          let rival: { id: string } | undefined
          if (cur.live.topBidderId === VIEWER_ID && Math.random() < 0.55) {
            const rivals = cur.live.bidders.filter((b) => b.id !== VIEWER_ID)
            rival = rivals[Math.floor(Math.random() * rivals.length)]
          } else if (cur.live.topBidderId !== VIEWER_ID) {
            const rivals = cur.live.bidders.filter(
              (b) => b.id !== cur.live!.topBidderId && b.id !== VIEWER_ID,
            )
            rival = rivals[Math.floor(Math.random() * rivals.length)]
          }
          if (!rival) continue

          lastBidAtRef.current[k] = now
          const bidAmt = cur.live.currentBidCents + cur.live.bidIncrementCents
          const nextLive = applyNewBid(cur.live, rival.id, bidAmt)
          // Apply +5s anti-snipe bonus when bid lands inside the last 10 seconds
          const extend = remaining <= 10
          const nextEndsAt = extend ? cur.endsAtEpoch + TIME_BONUS_SEC * 1000 : cur.endsAtEpoch
          const nextRemaining = Math.max(0, Math.ceil((nextEndsAt - now) / 1000))
          next[k] = {
            ...cur,
            live: nextLive,
            endsAtEpoch: nextEndsAt,
            remaining: nextRemaining,
            bonusPulseSeq: extend ? (cur.bonusPulseSeq ?? 0) + 1 : cur.bonusPulseSeq,
          }
          changed = true
        }
        return changed ? next : prev
      })
    }, 900)
    return () => window.clearInterval(id)
  }, [])

  /* ─── Rotation: push head battle to the back once it's done ──────────── */
  useEffect(() => {
    const head = order[0]
    if (!head) return
    const s = stateById[head]
    if (s?.phase !== 'done') return
    const newStart = 120 + Math.floor(Math.random() * 120) // 2–4 min
    setStateById((prev) => ({
      ...prev,
      [head]: {
        phase: 'upcoming',
        remaining: newStart,
        upcomingRemaining: newStart,
      },
    }))
    setOrder((o) => [...o.slice(1), head])
  }, [order, stateById])

  const getState = useCallback((id: string): BattleSyncState => {
    return stateRef.current[id] ?? { phase: 'upcoming', remaining: 0 }
  }, [])

  const resetBattle = useCallback((id: string, toSec: number) => {
    const v = Math.max(1, toSec)
    setStateById((prev) => ({
      ...prev,
      [id]: {
        phase: 'upcoming',
        remaining: v,
        upcomingRemaining: v,
      },
    }))
  }, [])

  /** Mark a battle as done so it rotates out on the next tick. */
  const finalizeBattle = useCallback((id: string) => {
    setStateById((prev) => ({
      ...prev,
      [id]: { ...prev[id], phase: 'done', remaining: 0 },
    }))
  }, [])

  /** Apply a viewer bid against the shared live state of `id`. */
  const placeViewerBid = useCallback((id: string, amountCents: number) => {
    setStateById((prev) => {
      const cur = prev[id]
      if (!cur || cur.phase !== 'live' || !cur.live || !cur.endsAtEpoch) return prev
      const now = Date.now()
      const remaining = Math.max(0, Math.ceil((cur.endsAtEpoch - now) / 1000))
      if (remaining <= 0) return prev
      const nextLive = applyNewBid(cur.live, VIEWER_ID, amountCents)
      const extend = remaining <= 10
      const nextEndsAt = extend ? cur.endsAtEpoch + TIME_BONUS_SEC * 1000 : cur.endsAtEpoch
      const nextRemaining = Math.max(0, Math.ceil((nextEndsAt - now) / 1000))
      lastBidAtRef.current[id] = now
      return {
        ...prev,
        [id]: {
          ...cur,
          live: nextLive,
          endsAtEpoch: nextEndsAt,
          remaining: nextRemaining,
          bonusPulseSeq: extend ? (cur.bonusPulseSeq ?? 0) + 1 : cur.bonusPulseSeq,
        },
      }
    })
  }, [])

  return { order, stateById, getState, resetBattle, finalizeBattle, placeViewerBid }
}

function UpNextHeroCard({
  battle,
  phase,
  remaining,
  live,
  onGetReady,
  onOpenDetails,
}: {
  battle: StartingSoonBattle
  phase: BattlePhase
  remaining: number
  live?: LiveBidState
  onGetReady: () => void
  onOpenDetails: () => void
}) {
  const aboutToStart = phase === 'upcoming' && remaining <= 3 && remaining > 0
  const isLive = phase === 'live' && !!live
  const topBidder = isLive
    ? live!.bidders.find((b) => b.id === live!.topBidderId)
    : undefined

  return (
    <article
      className={[
        'fetch-battle-hero relative overflow-hidden rounded-3xl p-3 transition-colors',
        isLive
          ? 'fetch-battle-hero--live border border-red-200/90 bg-gradient-to-br from-white via-[#fff7f7] to-[#ffe9e9] shadow-[0_18px_44px_-28px_rgba(239,68,68,0.35)]'
          : 'fetch-battle-hero--upnext border border-violet-200/80 bg-gradient-to-br from-white via-[#faf8ff] to-[#f3e8ff] shadow-[0_18px_44px_-28px_rgba(76,29,149,0.22)]',
        aboutToStart ? 'fetch-battle-hero--imminent' : '',
      ].join(' ')}
      aria-label={
        isLive
          ? `${battle.title} is live now, ${formatMmSs(remaining)} remaining — join the battle`
          : `Up next: ${battle.title}, starts in ${formatMmSs(remaining)}`
      }
    >
      <div className="relative z-[1] flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span
            className={[
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] shadow-sm ring-1 backdrop-blur-sm',
              isLive
                ? 'fetch-battle-live-pill bg-red-600 text-white ring-white/15'
                : 'bg-violet-600 text-white ring-violet-500/25 shadow-[0_1px_2px_rgba(76,29,149,0.12)]',
            ].join(' ')}
          >
            {isLive ? (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M13 2L4.09 12.26a1 1 0 00.78 1.63L11 14l-2 8 9-10.26A1 1 0 0017.13 10.1L11 10l2-8z" />
              </svg>
            )}
            {isLive ? 'Live auction' : 'Up next'}
          </span>
          <span
            key={`tm-${remaining}`}
            className={[
              'rounded-full px-2.5 py-1 text-[12px] font-black uppercase tracking-[0.08em] tabular-nums ring-1',
              isLive
                ? ['bg-white/95 ring-red-200/90', remaining <= 5 ? 'text-red-700' : 'text-red-600'].join(' ')
                : aboutToStart
                  ? 'bg-amber-50 text-amber-800 ring-amber-200/90'
                  : 'bg-white/95 text-violet-950 ring-violet-200/90 shadow-[0_2px_8px_-4px_rgba(76,29,149,0.12)]',
            ].join(' ')}
          >
            {formatMmSs(remaining)}
          </span>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_8.75rem] gap-3">
          <div className="min-w-0 self-center">
            <p
              className={[
                'text-[10px] font-black uppercase tracking-[0.16em]',
                isLive ? 'text-red-600/85' : 'text-violet-600/85',
              ].join(' ')}
            >
              {isLive ? 'Current bid' : 'Featured battle'}
            </p>
            <p
              key={isLive ? `bid-${live!.currentBidCents}` : `count-${remaining}`}
              className={[
                'mt-1 font-black leading-none tabular-nums tracking-[-0.035em]',
                isLive
                  ? 'fetch-battle-current-bid text-[2.2rem] text-red-700'
                  : 'text-[1.65rem] text-[#1c1528]',
              ].join(' ')}
              style={{
                textShadow: isLive ? '0 1px 0 rgba(255,255,255,0.8)' : undefined,
              }}
            >
              {isLive ? formatAudCents(live!.currentBidCents) : battle.title}
            </p>
            {!isLive ? (
              battle.subtitle ? (
                <p className="mt-1 text-[13px] font-bold leading-tight text-zinc-600">{battle.subtitle}</p>
              ) : null
            ) : (
              <>
                {topBidder ? (
                  <p className="mt-1 text-[11px] font-semibold leading-tight text-zinc-600">
                    Leading <span className="font-bold text-red-700">{topBidder.handle}</span>
                  </p>
                ) : null}
                <p className="mt-1.5 text-[13px] font-extrabold leading-tight text-[#1c1528]">
                  {battle.title}
                  {battle.subtitle ? (
                    <span className="ml-1 font-semibold text-zinc-500">· {battle.subtitle}</span>
                  ) : null}
                </p>
              </>
            )}
            <p
              className={[
                'mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-bold ring-1',
                isLive
                  ? 'bg-red-50/95 text-red-700 ring-red-200/90'
                  : 'bg-violet-50/95 text-violet-900 ring-violet-200/90',
              ].join(' ')}
            >
              Est. value&nbsp;
              <span className={`font-black tabular-nums ${isLive ? 'text-red-800' : 'text-violet-950'}`}>
                {formatAudCents(battle.estValueCents)}
              </span>
            </p>
          </div>

          {/* Item image — tap to open the listing details sheet */}
          <button
            type="button"
            onClick={onOpenDetails}
            aria-label={`View photos and details for ${battle.title}`}
            className={[
              'relative aspect-square overflow-hidden rounded-2xl bg-zinc-100 ring-1 transition-transform active:scale-[0.98]',
              isLive
                ? 'ring-red-300/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.75)]'
                : 'ring-violet-200/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)]',
            ].join(' ')}
          >
            <img
              src={battle.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              draggable={false}
            />
            <span
              className={[
                'pointer-events-none absolute inset-0 bg-gradient-to-t',
                isLive ? 'from-red-950/20 via-transparent to-white/35' : 'from-violet-950/10 via-transparent to-white/30',
              ].join(' ')}
            />
            {isLive ? (
              <span className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-red-300/90 [box-shadow:0_0_20px_rgba(239,68,68,0.22)]" />
            ) : null}
            {(battle.photos?.length ?? 0) > 1 ? (
              <span
                className={[
                  'pointer-events-none absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] backdrop-blur-sm',
                  isLive
                    ? 'bg-white/92 text-red-700 ring-1 ring-red-200/80'
                    : 'bg-black/50 text-white ring-1 ring-white/30',
                ].join(' ')}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M4 7h3l2-2h6l2 2h3v12H4z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2" />
                </svg>
                {battle.photos?.length ?? 1}
              </span>
            ) : null}
          </button>
        </div>

        <button
          type="button"
          onClick={onGetReady}
          className={[
            'flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-3 text-[12px] font-black uppercase tracking-[0.1em] active:scale-[0.97]',
            isLive
              ? 'fetch-battle-join-pulse bg-gradient-to-b from-red-500 via-red-600 to-red-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_0_0_#b91c1c] ring-1 ring-red-400/35'
              : 'bg-violet-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_0_0_#4c1d95] ring-1 ring-violet-500/30 hover:bg-violet-700',
          ].join(' ')}
        >
          {isLive ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M13 2L4.09 12.26a1 1 0 00.78 1.63L11 14l-2 8 9-10.26A1 1 0 0017.13 10.1L11 10l2-8z" />
              </svg>
              Join live now
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.65V5a2 2 0 10-4 0v.35A6 6 0 006 11v3.2c0 .53-.21 1.04-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Enter battle
            </>
          )}
        </button>
      </div>

      {/* Decorative halo + subtle bottom-left orb for depth */}
      <span
        aria-hidden
        className={[
          'pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-2xl transition-colors',
          isLive ? 'bg-red-300/35' : 'bg-violet-300/35',
        ].join(' ')}
      />
      <span
        aria-hidden
        className={[
          'pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full blur-3xl transition-colors',
          isLive ? 'bg-rose-200/60' : 'bg-fuchsia-200/50',
        ].join(' ')}
      />
    </article>
  )
}


function StartingSoonRow({
  battle,
  phase,
  remaining,
  live,
  reminded,
  onRemind,
  onJoin,
  onOpenDetails,
}: {
  battle: StartingSoonBattle
  phase: BattlePhase
  remaining: number
  live?: LiveBidState
  reminded: boolean
  onRemind: (id: string) => void
  onJoin?: () => void
  onOpenDetails: () => void
}) {
  const isLive = phase === 'live' && !!live
  const photoCount = battle.photos?.length ?? 0
  return (
    <div
      className={[
        'group relative flex flex-col overflow-hidden rounded-2xl bg-white text-left transition-[box-shadow,transform]',
        isLive
          ? 'ring-2 ring-red-300/90 shadow-[0_14px_28px_-18px_rgba(239,68,68,0.35)]'
          : 'ring-1 ring-violet-200/70 shadow-[0_8px_20px_-14px_rgba(76,29,149,0.35)]',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={isLive ? onJoin : onOpenDetails}
        aria-label={
          isLive
            ? `Join ${battle.title} live now, ${formatMmSs(remaining)} remaining`
            : `View photos and details for ${battle.title}`
        }
        className="relative block aspect-square w-full overflow-hidden bg-violet-100 active:scale-[0.99]"
      >
        <img
          src={battle.imageUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
          draggable={false}
        />
        <span
          aria-hidden
          className={[
            'pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t',
            isLive ? 'from-red-950/30 via-red-950/8 to-transparent' : 'from-violet-950/35 via-violet-950/8 to-transparent',
          ].join(' ')}
        />

        {isLive ? (
          <span className="fetch-battle-live-pill absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tabular-nums leading-none text-white shadow-[0_2px_8px_-4px_rgba(239,68,68,0.6)] ring-1 ring-red-400/35">
            <span className="relative flex h-1 w-1">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
              <span className="relative inline-flex h-1 w-1 rounded-full bg-white" />
            </span>
            {formatMmSs(remaining)}
          </span>
        ) : (
          <span className="absolute left-1.5 top-1.5 rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-black tabular-nums leading-none text-violet-950 shadow-sm ring-1 ring-violet-200/80 backdrop-blur-sm">
            {formatMmSs(remaining)}
          </span>
        )}

        <BoostedBadge id={battle.id} />

        {photoCount > 1 && !isLive ? (
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-white/92 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight text-violet-900 shadow-sm ring-1 ring-violet-200/80 backdrop-blur-sm">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 7h3l2-2h6l2 2h3v12H4z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2" />
            </svg>
            {photoCount}
          </span>
        ) : null}

        {isLive ? (
          <span className="fetch-battle-join-pulse pointer-events-none absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-b from-red-500 via-red-600 to-red-700 px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_0_0_#b91c1c] ring-1 ring-red-400/35">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M13 2L4.09 12.26a1 1 0 00.78 1.63L11 14l-2 8 9-10.26A1 1 0 0017.13 10.1L11 10l2-8z" />
            </svg>
            Join
          </span>
        ) : null}
      </button>

      <button
        type="button"
        onClick={() => onRemind(battle.id)}
        aria-label={
          reminded
            ? `Reminder set for ${battle.title}`
            : `Remind me when ${battle.title} starts`
        }
        className={[
          'absolute right-1.5 top-1.5 z-[2] flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] active:scale-[0.94] backdrop-blur-sm',
          reminded
            ? 'bg-[#4c1d95] text-white shadow-sm'
            : 'bg-white/85 text-[#4c1d95] ring-1 ring-violet-200',
        ].join(' ')}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.65V5a2 2 0 10-4 0v.35A6 6 0 006 11v3.2c0 .53-.21 1.04-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={reminded ? 'currentColor' : 'none'}
          />
        </svg>
      </button>

      <button
        type="button"
        onClick={onOpenDetails}
        aria-label={`View details for ${battle.title}`}
        className="flex flex-col gap-0.5 px-2.5 pb-2.5 pt-2 text-left active:opacity-80"
      >
        <p className="line-clamp-1 text-[12.5px] font-extrabold leading-tight tracking-tight text-[#1c1528]">
          {battle.title}
        </p>
        {battle.subtitle ? (
          <p className="line-clamp-1 text-[10.5px] font-medium leading-tight text-zinc-500">
            {battle.subtitle}
          </p>
        ) : null}
        <div className="mt-1 flex items-center justify-between gap-2">
          {isLive ? (
            <p
              key={`row-bid-${live!.currentBidCents}`}
              className="truncate text-[11.5px] font-extrabold leading-none text-red-600 tabular-nums"
            >
              {formatAudCents(live!.currentBidCents)}
            </p>
          ) : (
            <p className="truncate text-[10.5px] font-semibold leading-none text-zinc-500">
              Est.{' '}
              <span className="font-extrabold tabular-nums text-[#1c1528]">
                {formatAudCents(battle.estValueCents)}
              </span>
            </p>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] font-bold leading-none text-zinc-400 tabular-nums">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M16 11a4 4 0 10-4-4 4 4 0 004 4zM3 20a7 7 0 0114 0"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            {formatCountLabel(battle.attendees)}
          </span>
        </div>
      </button>
    </div>
  )
}

export const UpcomingLivesList = memo(function UpcomingLivesList() {
  const [battles] = useState(STARTING_SOON_BATTLES)
  const [reminded, setReminded] = useState<Record<string, boolean>>({})
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null)
  const [detailsBattleId, setDetailsBattleId] = useState<string | null>(null)

  const { order, stateById, resetBattle, finalizeBattle, placeViewerBid } =
    useBattleSync(battles)

  const battlesById = useMemo(() => {
    const m: Record<string, StartingSoonBattle> = {}
    for (const b of battles) m[b.id] = b
    return m
  }, [battles])

  const heroId = order[0]
  const hero = heroId ? battlesById[heroId] : undefined
  const restIds = order.slice(1)

  const activeBattle = activeBattleId ? battlesById[activeBattleId] ?? null : null
  const activeState = activeBattleId
    ? stateById[activeBattleId] ?? { phase: 'upcoming' as const, remaining: 0 }
    : null

  // The next battle preview for the "Keep going" card = whatever comes after
  // the active battle in the shared order (never the active battle itself).
  const nextBattleId = activeBattleId
    ? order.filter((id) => id !== activeBattleId)[0]
    : null
  const nextBattle = nextBattleId ? battlesById[nextBattleId] ?? undefined : undefined

  const detailsBattle = detailsBattleId ? battlesById[detailsBattleId] ?? null : null
  const detailsState = detailsBattleId
    ? stateById[detailsBattleId] ?? { phase: 'upcoming' as const, remaining: 0 }
    : null

  const handleRemind = useCallback((id: string) => {
    setReminded((r) => ({ ...r, [id]: !r[id] }))
  }, [])

  /**
   * Open the battle overlay. Pure view action — never mutates the shared
   * battle clock. The overlay derives its intro stages from shared `phase`
   * + `remaining`, so tapping Get Ready on a 02:30 card does NOT snap the
   * card down to 00:24. Other simulated viewers (and the hero card itself)
   * keep showing the same countdown.
   */
  const openBattle = useCallback((id: string) => {
    setActiveBattleId(id)
  }, [])

  /**
   * "Keep going" on the win screen is the one case where closing the overlay
   * DOES advance state: finalise the just-won battle so it rotates out, then
   * seed the next battle's upcoming clock and swap the overlay to it.
   */
  const handleAdvance = useCallback(() => {
    if (!activeBattleId) return
    const nextId = order.filter((id) => id !== activeBattleId)[0]
    finalizeBattle(activeBattleId)
    if (nextId) {
      const nb = battlesById[nextId]
      if (nb) resetBattle(nextId, nb.startsInSec)
      setActiveBattleId(nextId)
    } else {
      setActiveBattleId(null)
    }
  }, [activeBattleId, order, finalizeBattle, resetBattle, battlesById])

  /**
   * Close the overlay without ending the battle. Live battles continue
   * ticking in the feed — the card still shows BATTLE LIVE NOW with a
   * synced current bid and countdown, and the user can tap Join to drop
   * back in. Upcoming battles stay on their original countdown. This is
   * how real multi-viewer streams behave: leaving the view doesn't stop
   * the event.
   */
  const handleClose = useCallback(() => {
    setActiveBattleId(null)
  }, [])

  useEffect(() => {
    const on = activeBattleId != null
    if (!on) return undefined
    ambientRegisterBidWars(1)
    return () => ambientRegisterBidWars(-1)
  }, [activeBattleId])

  if (!hero) {
    return (
      <p className="px-3 py-8 text-center text-sm text-zinc-400">
        No battles scheduled yet.
      </p>
    )
  }

  const heroState = stateById[hero.id] ?? { phase: 'upcoming' as const, remaining: hero.startsInSec }

  return (
    <div className="flex flex-col gap-3 px-3">
      <UpNextHeroCard
        key={hero.id}
        battle={hero}
        phase={heroState.phase}
        remaining={heroState.remaining}
        live={heroState.live}
        onGetReady={() => openBattle(hero.id)}
        onOpenDetails={() => setDetailsBattleId(hero.id)}
      />

      <section className="rounded-3xl border border-violet-200/70 bg-white/95 p-3 shadow-[0_12px_28px_-20px_rgba(76,29,149,0.28)]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-violet-700">Round Queue</p>
            <p className="text-[12px] font-medium text-zinc-500">Pick a room and enter when ready.</p>
          </div>
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-violet-700 ring-1 ring-violet-200/90">
            {restIds.length} rooms
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {restIds.map((id) => {
            const b = battlesById[id]
            if (!b) return null
            const s = stateById[id] ?? { phase: 'upcoming' as const, remaining: b.startsInSec }
            return (
              <StartingSoonRow
                key={id}
                battle={b}
                phase={s.phase}
                remaining={s.remaining}
                live={s.live}
                reminded={Boolean(reminded[id])}
                onRemind={handleRemind}
                onJoin={() => openBattle(id)}
                onOpenDetails={() => setDetailsBattleId(id)}
              />
            )
          })}
        </div>
      </section>

      {detailsBattle && detailsState ? (
        <StartingSoonListingSheet
          battle={detailsBattle}
          phase={detailsState.phase}
          remaining={detailsState.remaining}
          live={detailsState.live}
          reminded={Boolean(reminded[detailsBattle.id])}
          onToggleRemind={() => handleRemind(detailsBattle.id)}
          onEnterBattle={() => {
            openBattle(detailsBattle.id)
            setDetailsBattleId(null)
          }}
          onClose={() => setDetailsBattleId(null)}
        />
      ) : null}

      {activeBattle && activeState ? (
        <FetchBidWarsBattleOverlay
          key={activeBattle.id}
          battle={activeBattle}
          countdownFromSec={3}
          phase={activeState.phase}
          remaining={activeState.remaining}
          live={activeState.live}
          bonusPulseSeq={activeState.bonusPulseSeq}
          onViewerBid={(amt) => placeViewerBid(activeBattle.id, amt)}
          nextBattle={nextBattle}
          onAdvanceToNextBattle={handleAdvance}
          onClose={handleClose}
        />
      ) : null}
    </div>
  )
})

/* ─── Following — streams from creators the user follows ──────── */

type FollowedCreator = {
  id: string
  name: string
  handle: string
  avatar: string
  isLive: boolean
  lastStreamTitle: string
}

function buildFollowedCreators(): FollowedCreator[] {
  const portraits = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=256&q=80',
  ]

  return CURATED_DROP_REELS.slice(0, 5).map((r, i) => ({
    id: `follow_${r.authorId}`,
    name: r.seller.replace(/^@/, ''),
    handle: r.seller,
    avatar: portraits[i % portraits.length],
    isLive: i < 2,
    lastStreamTitle: r.title,
  }))
}

function FollowingCreatorRow({ creator, onOpen }: { creator: FollowedCreator; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fetch-apple-warp-btn flex w-full items-center gap-3 rounded-xl bg-white px-3 py-3 text-left shadow-sm ring-1 ring-violet-200/40 transition-[transform] active:scale-[0.98]"
    >
      <div className="relative h-12 w-12 shrink-0">
        <img
          src={creator.avatar}
          alt=""
          className="h-12 w-12 rounded-full object-cover"
          loading="lazy"
          draggable={false}
        />
        {creator.isLive ? (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 ring-2 ring-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-semibold leading-snug text-[#1c1528]">{creator.name}</p>
          {creator.isLive ? (
            <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-600">Live</span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[12px] font-medium text-violet-500">{creator.handle}</p>
        <p className="mt-0.5 truncate text-[11px] text-zinc-400">{creator.lastStreamTitle}</p>
      </div>
      <svg className="h-5 w-5 shrink-0 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

export const FollowingLivesList = memo(function FollowingLivesList({ onOpenDrops }: { onOpenDrops: () => void }) {
  const creators = useMemo(buildFollowedCreators, [])

  const liveCreators = creators.filter((c) => c.isLive)
  const offlineCreators = creators.filter((c) => !c.isLive)

  return (
    <div className="flex flex-col gap-3 px-3">
      {liveCreators.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-red-500">Live now</p>
          {liveCreators.map((c) => (
            <FollowingCreatorRow key={c.id} creator={c} onOpen={onOpenDrops} />
          ))}
        </div>
      ) : null}
      {offlineCreators.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500">Offline</p>
          {offlineCreators.map((c) => (
            <FollowingCreatorRow key={c.id} creator={c} onOpen={onOpenDrops} />
          ))}
        </div>
      ) : null}
      {creators.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">Follow creators to see their streams here.</p>
      ) : null}
    </div>
  )
})
