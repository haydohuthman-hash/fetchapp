import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { CURATED_DROP_REELS } from '../lib/drops/constants'
import type { DropReel } from '../lib/drops/types'
import {
  STARTING_SOON_BATTLES,
  formatAudCents,
  formatCountLabel,
  formatMmSs,
  type StartingSoonBattle,
} from '../lib/fetchBidWarsBattles'
import { FetchBidWarsBattleOverlay } from './FetchBidWarsBattleOverlay'

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

/* ─── Live Now — 2-column grid ─────────────────────────────────── */

function LiveNowCard({ reel, onOpen }: { reel: DropReel; onOpen: () => void }) {
  const poster = reelPoster(reel)
  const seller = sellerLine(reel)
  const viewers = viewerCount(reel.id)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="fetch-apple-warp-btn flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-violet-200/50 transition-[transform,box-shadow] active:scale-[0.98]"
    >
      <div className="relative aspect-[9/14] w-full overflow-hidden bg-violet-100">
        {poster ? (
          <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" draggable={false} />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-violet-300">No preview</div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="pointer-events-none absolute left-1.5 top-1.5 z-[2] flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 shadow-sm">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <span className="text-[10px] font-bold uppercase leading-none text-white">Live</span>
        </div>
        <div className="pointer-events-none absolute right-1.5 top-1.5 z-[2] flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 backdrop-blur-sm">
          <svg className="h-3 w-3 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="text-[10px] font-bold tabular-nums leading-none text-white">{viewers}</span>
        </div>
        <p className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] truncate px-2 pb-2 text-[13px] font-semibold leading-tight text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
          {seller}
        </p>
      </div>
      <div className="px-2.5 py-2">
        <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-[#1c1528]">{reel.title}</p>
        <p className="mt-0.5 text-[11px] font-medium text-violet-600">{reel.priceLabel}</p>
      </div>
    </button>
  )
}

export const LiveNowGrid = memo(function LiveNowGrid({ onOpenDrops }: { onOpenDrops: () => void }) {
  const reels = useMemo(() => [...CURATED_DROP_REELS].slice(0, 6), [])

  if (reels.length === 0) {
    return <p className="px-3 py-8 text-center text-sm text-zinc-400">No one is live right now. Check back soon.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 px-3">
      {reels.map((r) => (
        <LiveNowCard key={r.id} reel={r} onOpen={onOpenDrops} />
      ))}
    </div>
  )
})

/* ─── Starting Soon — Bid Wars "Up next" hero + list ──────────── */

function useBattleCountdown(startsInSec: number) {
  const [remaining, setRemaining] = useState(startsInSec)
  useEffect(() => {
    setRemaining(startsInSec)
  }, [startsInSec])
  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining((s) => (s <= 0 ? startsInSec : s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [startsInSec])
  return remaining
}

function UpNextHeroCard({
  battle,
  onGetReady,
}: {
  battle: StartingSoonBattle
  onGetReady: () => void
}) {
  const remaining = useBattleCountdown(battle.startsInSec)
  const aboutToStart = remaining <= 3

  return (
    <article
      className="relative min-h-[11.5rem] overflow-hidden rounded-3xl bg-gradient-to-b from-white via-violet-50 to-violet-100 p-4 pb-3.5 shadow-[0_18px_40px_-22px_rgba(76,29,149,0.45)] ring-1 ring-violet-200/70"
      aria-label={`Up next: ${battle.title}, starts in ${formatMmSs(remaining)}`}
    >
      {/* Attendees — top-right corner */}
      <div className="absolute right-[10.5rem] top-4 z-[2] flex items-center gap-1">
        <div className="flex -space-x-1.5">
          {battle.attendeeAvatars.slice(0, 3).map((a, i) => (
            <img
              key={i}
              src={a}
              alt=""
              className="h-5 w-5 rounded-full border-[1.5px] border-white object-cover"
              loading="lazy"
              draggable={false}
            />
          ))}
        </div>
        <p className="text-[10px] font-semibold text-zinc-500">+{battle.attendees}</p>
      </div>

      <div className="relative z-[1] min-w-0 pr-[10.5rem]">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#4c1d95]/80">
          Up next
        </p>
        <p
          className={[
            'fetch-battle-heading mt-0.5 font-black leading-none tabular-nums tracking-[-0.03em] text-[#1c1528] transition-colors',
            aboutToStart ? 'text-[#ef4444]' : '',
          ].join(' ')}
          style={{ fontSize: '2.5rem' }}
        >
          {formatMmSs(remaining)}
        </p>
        <p className="mt-2 text-[15px] font-extrabold leading-tight text-[#1c1528]">
          {battle.title}
        </p>
        {battle.subtitle ? (
          <p className="text-[13px] font-semibold leading-tight text-[#1c1528]">{battle.subtitle}</p>
        ) : null}
        <p className="mt-1 text-[11px] font-semibold text-zinc-500">
          Est. value{' '}
          <span className="font-bold tabular-nums text-[#1c1528]">
            {formatAudCents(battle.estValueCents)}
          </span>
        </p>
      </div>

      {/* Item image */}
      <div className="pointer-events-none absolute bottom-3 right-3 h-[7.5rem] w-[10rem] overflow-hidden rounded-2xl">
        <img
          src={battle.imageUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />
      </div>

      <div className="relative z-[1] mt-4">
        <button
          type="button"
          onClick={onGetReady}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.1em] text-white shadow-[0_14px_28px_-12px_rgba(76,29,149,0.7)] active:scale-[0.97]"
        >
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
        </button>
      </div>

      {/* Decorative halo */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#4c1d95]/15 blur-2xl"
      />
    </article>
  )
}

function StartingSoonRow({
  battle,
  reminded,
  onRemind,
}: {
  battle: StartingSoonBattle
  reminded: boolean
  onRemind: (id: string) => void
}) {
  const remaining = useBattleCountdown(battle.startsInSec)
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-violet-100">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-violet-100">
        <img
          src={battle.imageUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />
        <span className="absolute left-1 top-1 rounded bg-black/80 px-1 py-0.5 text-[9px] font-black tabular-nums leading-none text-white">
          {formatMmSs(remaining)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold leading-tight text-[#1c1528]">
          {battle.title}
        </p>
        {battle.subtitle ? (
          <p className="truncate text-[12px] font-medium leading-tight text-zinc-500">
            {battle.subtitle}
          </p>
        ) : null}
        <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
          Est. value{' '}
          <span className="font-bold tabular-nums text-[#1c1528]">
            {formatAudCents(battle.estValueCents)}
          </span>
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-zinc-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M16 11a4 4 0 10-4-4 4 4 0 004 4zM3 20a7 7 0 0114 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="tabular-nums">{formatCountLabel(battle.attendees)}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRemind(battle.id)}
        aria-label={reminded ? `Reminder set for ${battle.title}` : `Remind me when ${battle.title} starts`}
        className={[
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] active:scale-[0.94]',
          reminded
            ? 'bg-[#4c1d95] text-white shadow-sm'
            : 'bg-violet-50 text-[#4c1d95] ring-1 ring-violet-200',
        ].join(' ')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    </div>
  )
}

export const UpcomingLivesList = memo(function UpcomingLivesList() {
  const [battles] = useState(STARTING_SOON_BATTLES)
  const [reminded, setReminded] = useState<Record<string, boolean>>({})
  const [activeBattleIndex, setActiveBattleIndex] = useState<number | null>(null)

  const hero = battles[0]
  const rest = battles.slice(1)
  const activeBattle = activeBattleIndex != null ? battles[activeBattleIndex] : null
  const nextBattle =
    activeBattleIndex != null ? battles[(activeBattleIndex + 1) % battles.length] : undefined

  const handleRemind = useCallback((id: string) => {
    setReminded((r) => ({ ...r, [id]: !r[id] }))
  }, [])

  if (!hero) {
    return (
      <p className="px-3 py-8 text-center text-sm text-zinc-400">
        No battles scheduled yet.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-3">
      <UpNextHeroCard battle={hero} onGetReady={() => setActiveBattleIndex(0)} />

      <div className="mt-1 flex items-center justify-between px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500">
          More starting soon
        </p>
        <button
          type="button"
          className="text-[11px] font-bold text-[#4c1d95] active:opacity-80"
        >
          See all <span aria-hidden>›</span>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {rest.map((b) => (
          <StartingSoonRow
            key={b.id}
            battle={b}
            reminded={Boolean(reminded[b.id])}
            onRemind={handleRemind}
          />
        ))}
      </div>

      {activeBattle ? (
        <FetchBidWarsBattleOverlay
          key={activeBattle.id}
          battle={activeBattle}
          countdownFromSec={3}
          nextBattle={nextBattle}
          onAdvanceToNextBattle={() =>
            setActiveBattleIndex((i) =>
              i == null ? null : (i + 1) % battles.length,
            )
          }
          onClose={() => setActiveBattleIndex(null)}
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
