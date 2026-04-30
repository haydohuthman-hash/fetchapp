/**
 * Bid Wars matchmaking overlay — fullscreen "100-player" experience.
 *
 * Phases (driven by `joinMatchmakingRoom` events):
 *   1. searching   — lobby fills to 100 with bot avatars + radar pings
 *   2. listingVote — single PeerListing card + thumbs up / down with ring timer
 *   3. listingDecision — short "match found" / "skipped" stinger + save CTA
 *   4. bidWar      — hype reveal + live bid pad against simulated rivals
 *   5. result      — win / lost confirmation, saved items strip, match again CTA
 *
 * White / light theme: cream-violet background, dark text, emerald + rose
 * accents for vote and bid pads. Plays the global "war" ambient bed via
 * `ambientRegisterBidWars` while open, and fires synthesised SFX on every
 * transition (`fetchBattleSounds.ts`).
 */

import { memo, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PeerListing } from '../lib/listingsApi'
import {
  joinMatchmakingRoom,
  type ListingDecision,
  type ListingVoteState,
  type MatchmakingEvent,
  type MatchmakingPhase,
  type MatchmakingPlayer,
  type MatchmakingRoom,
} from '../lib/fetchBidWarsMatchmaking'
import {
  formatAudCents,
  formatCountLabel,
  type LiveBidState,
} from '../lib/fetchBidWarsBattles'
import { MARKETPLACE_MOCK_PEER_LISTINGS } from '../lib/marketplaceMockPeerListings'
import {
  loadSavedBidWarsListings,
  saveBidWarsListing,
  type SavedBidWarsListing,
} from '../lib/fetchBidWarsSavedListings'
import { ambientRegisterBidWars } from '../lib/audio/fetchAmbientMusic'
import {
  initBattleAudio,
  playBidPlaced,
  playBidWarHorn,
  playFinalImpact,
  playListingReveal,
  playMatchmakingPing,
  playRivalBid,
  playTimerTick,
  playUserJoined,
  playVotePass,
  playVoteReject,
  playWinFanfare,
} from '../lib/fetchBattleSounds'

const MAX_PLAYERS = 100
const VOTE_DURATION_MS = 8_000
const BID_WAR_DURATION_MS = 30_000

type Props = {
  open: boolean
  onClose: () => void
}

export const FetchBidWarsMatchmakingOverlay = memo(FetchBidWarsMatchmakingOverlayInner)

function FetchBidWarsMatchmakingOverlayInner({ open, onClose }: Props) {
  const portalTarget = typeof document !== 'undefined' ? document.body : null

  /* ── Ambient bed: war music while open ─────────────────────────────── */
  useEffect(() => {
    if (!open) return undefined
    ambientRegisterBidWars(1)
    return () => ambientRegisterBidWars(-1)
  }, [open])

  /* ── Room lifecycle ────────────────────────────────────────────────── */
  const roomRef = useRef<MatchmakingRoom | null>(null)
  const [matchKey, setMatchKey] = useState(0)
  const [phase, setPhase] = useState<MatchmakingPhase>('searching')
  const [players, setPlayers] = useState<MatchmakingPlayer[]>([])
  const [vote, setVote] = useState<ListingVoteState | null>(null)
  const [decision, setDecision] = useState<ListingDecision | null>(null)
  const [live, setLive] = useState<LiveBidState | null>(null)
  const [resultViewerWon, setResultViewerWon] = useState<boolean | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  /* ── Saved-items state ─────────────────────────────────────────────── */
  const [saved, setSaved] = useState<SavedBidWarsListing[]>(() =>
    loadSavedBidWarsListings(),
  )
  const [savedToast, setSavedToast] = useState<string | null>(null)
  const savedToastTimerRef = useRef<number | null>(null)

  function handleSaveListing(listing: PeerListing) {
    const next = saveBidWarsListing(listing)
    setSaved(next)
    setSavedToast(`Saved "${listing.title.slice(0, 36)}"`)
    if (savedToastTimerRef.current != null) {
      window.clearTimeout(savedToastTimerRef.current)
    }
    savedToastTimerRef.current = window.setTimeout(() => {
      setSavedToast(null)
      savedToastTimerRef.current = null
    }, 1700)
  }

  useEffect(() => {
    return () => {
      if (savedToastTimerRef.current != null) {
        window.clearTimeout(savedToastTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!open) return undefined
    initBattleAudio()
    setPhase('searching')
    setPlayers([])
    setVote(null)
    setDecision(null)
    setLive(null)
    setResultViewerWon(null)

    const room = joinMatchmakingRoom({
      maxPlayers: MAX_PLAYERS,
      listings: MARKETPLACE_MOCK_PEER_LISTINGS,
      timing: {
        voteDurationMs: VOTE_DURATION_MS,
        bidWarDurationMs: BID_WAR_DURATION_MS,
      },
    })
    roomRef.current = room

    let lastJoinSfxAt = 0
    let lastPingAt = 0
    let lastTickSec = -1
    const unsub = room.subscribe((event: MatchmakingEvent) => {
      switch (event.type) {
        case 'phase':
          setPhase(event.phase)
          if (event.phase === 'bidWar') playBidWarHorn()
          break
        case 'lobbyTick': {
          setPlayers(event.players)
          const now = Date.now()
          if (now - lastJoinSfxAt > 110) {
            playUserJoined()
            lastJoinSfxAt = now
          }
          if (now - lastPingAt > 800) {
            playMatchmakingPing()
            lastPingAt = now
          }
          break
        }
        case 'listingProposed':
          setVote(event.vote)
          setDecision(null)
          playListingReveal()
          break
        case 'voteUpdate':
          setVote(event.vote)
          break
        case 'listingDecision':
          setDecision(event.decision)
          if (event.decision.passed) playVotePass()
          else playVoteReject()
          break
        case 'bidWarStart':
          setLive(event.live)
          setSecondsLeft(event.live.itemEndsInSec)
          break
        case 'bidWarTick':
          setLive(event.live)
          setSecondsLeft(event.secondsLeft)
          if (event.secondsLeft !== lastTickSec && event.secondsLeft <= 10 && event.secondsLeft > 0) {
            lastTickSec = event.secondsLeft
            playTimerTick(event.secondsLeft)
          }
          break
        case 'bidWarBid':
          setLive(event.live)
          if (event.bidderId !== 'you') playRivalBid()
          break
        case 'bidWarEnd':
          setResultViewerWon(event.result.viewerWon)
          if (event.result.viewerWon) playWinFanfare()
          else playFinalImpact()
          break
      }
    })

    return () => {
      unsub()
      room.leave()
      roomRef.current = null
    }
  }, [open, matchKey])

  if (!open || !portalTarget) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex flex-col overflow-hidden text-zinc-900"
      role="dialog"
      aria-modal
      aria-label="Bid Wars matchmaking"
    >
      <MatchmakingBackground phase={phase} />

      <button
        type="button"
        onClick={onClose}
        aria-label="Leave Bid Wars matchmaking"
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-[6] flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-700 shadow-[0_10px_24px_-12px_rgba(76,29,149,0.3)] ring-1 ring-zinc-200 active:scale-95"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 6l12 12M18 6l-12 12"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {saved.length > 0 ? (
        <div
          aria-live="polite"
          className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-[6] flex h-10 items-center gap-2 rounded-full bg-white px-3 text-[12px] font-bold text-zinc-700 shadow-[0_10px_24px_-12px_rgba(76,29,149,0.3)] ring-1 ring-zinc-200"
        >
          <HeartIcon filled className="h-4 w-4 text-rose-500" />
          {saved.length} saved
        </div>
      ) : null}

      {savedToast ? <SavedToast text={savedToast} /> : null}

      <div className="relative z-[2] flex min-h-0 flex-1 flex-col overflow-hidden">
        {phase === 'searching' ? (
          <SearchPhase players={players} max={MAX_PLAYERS} />
        ) : null}
        {phase === 'listingVote' && vote ? (
          <ListingVotePhase
            vote={vote}
            totalPlayers={players.length}
            isSaved={saved.some((s) => s.id === vote.listing.id)}
            onSave={() => handleSaveListing(vote.listing)}
            onVote={(c) => roomRef.current?.vote(c)}
          />
        ) : null}
        {phase === 'listingDecision' && decision ? (
          <ListingDecisionPhase
            decision={decision}
            isSaved={saved.some((s) => s.id === decision.listing.id)}
            onSave={() => handleSaveListing(decision.listing)}
          />
        ) : null}
        {phase === 'bidWar' && live ? (
          <BidWarLiveStage
            live={live}
            secondsLeft={secondsLeft}
            onBid={() => {
              const next = live.currentBidCents + live.bidIncrementCents
              roomRef.current?.placeBid(next)
              playBidPlaced()
            }}
          />
        ) : null}
        {phase === 'result' && live ? (
          <ResultPhase
            won={resultViewerWon === true}
            finalBidCents={live.currentBidCents}
            productTitle={live.productTitle}
            productImageUrl={live.productImageUrl}
            saved={saved}
            onMatchAgain={() => setMatchKey((k) => k + 1)}
            onClose={onClose}
          />
        ) : null}
      </div>
    </div>,
    portalTarget,
  )
}

/* ============================================================================
 * Background — soft cream + violet wash, phase-aware accent
 * ============================================================================ */

function MatchmakingBackground({ phase }: { phase: MatchmakingPhase }) {
  const accentLeft =
    phase === 'bidWar'
      ? 'bg-rose-200/55'
      : phase === 'result'
        ? 'bg-emerald-200/55'
        : 'bg-violet-200/55'
  const accentRight =
    phase === 'bidWar'
      ? 'bg-fuchsia-200/55'
      : phase === 'result'
        ? 'bg-emerald-100/65'
        : 'bg-fuchsia-100/65'
  return (
    <div aria-hidden className="absolute inset-0 -z-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#fdfbff] via-[#f5efff] to-[#ffffff]" />
      <div className={`absolute -left-1/4 top-1/4 h-[55vmin] w-[55vmin] rounded-full ${accentLeft} blur-3xl`} />
      <div className={`absolute -right-1/4 bottom-0 h-[55vmin] w-[55vmin] rounded-full ${accentRight} blur-3xl`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.45),transparent_70%)]" />
    </div>
  )
}

/* ============================================================================
 * Phase 1: searching
 * ============================================================================ */

function SearchPhase({ players, max }: { players: MatchmakingPlayer[]; max: number }) {
  const fillPct = Math.min(100, Math.round((players.length / max) * 100))
  const recent = players.slice(-12).reverse()

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center px-6 pt-[max(3.25rem,env(safe-area-inset-top,0px)+0.5rem)]">
      <p className="text-[11px] font-black uppercase tracking-[0.32em] text-violet-600">
        Bid Wars Matchmaking
      </p>
      <h1 className="mt-2 text-center text-[28px] font-black leading-tight text-zinc-900">
        Searching for hype items
      </h1>
      <p className="mt-1 text-center text-[13px] text-zinc-600">
        Filling the lobby — first to {max} unlocks the war.
      </p>

      <div className="relative mt-8 flex h-[230px] w-[230px] items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-white shadow-[0_30px_60px_-30px_rgba(76,29,149,0.45)] ring-1 ring-violet-100" />
        <span className="absolute inset-3 rounded-full ring-1 ring-violet-200/70" />
        <span className="absolute inset-9 rounded-full ring-1 ring-violet-300/70" />
        <span
          className="absolute inset-0 rounded-full ring-2 ring-violet-400/70"
          style={{ animation: 'fetch-mm-radar 1.6s ease-out infinite' }}
        />
        <span
          className="absolute inset-0 rounded-full ring-2 ring-fuchsia-300/60"
          style={{ animation: 'fetch-mm-radar 1.6s ease-out 0.6s infinite' }}
        />
        <div className="relative flex flex-col items-center">
          <span className="text-[44px] font-black leading-none text-zinc-900">
            {players.length}
          </span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-violet-500">
            of {max}
          </span>
        </div>
      </div>

      <div className="mt-7 h-2 w-full max-w-[18rem] overflow-hidden rounded-full bg-violet-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-violet-400 transition-[width] duration-300 ease-out"
          style={{ width: `${fillPct}%` }}
        />
      </div>

      <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
        Recently joined
      </p>
      <div className="mt-3 flex max-w-[26rem] flex-wrap justify-center gap-1.5">
        {recent.map((p) => (
          <div
            key={p.id}
            className={[
              'flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold',
              p.isYou
                ? 'bg-amber-300 text-[#3b1700] ring-1 ring-amber-400'
                : 'bg-white text-zinc-700 ring-1 ring-zinc-200',
            ].join(' ')}
          >
            <img
              src={p.avatar}
              alt=""
              className="h-4 w-4 rounded-full object-cover"
              loading="lazy"
            />
            <span className="max-w-[7rem] truncate">{p.isYou ? 'You' : p.name}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fetch-mm-radar {
          0%   { transform: scale(0.55); opacity: 0.95; }
          100% { transform: scale(1.45); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

/* ============================================================================
 * Phase 2: listing vote
 * ============================================================================ */

function ListingVotePhase({
  vote,
  totalPlayers,
  isSaved,
  onSave,
  onVote,
}: {
  vote: ListingVoteState
  totalPlayers: number
  isSaved: boolean
  onSave: () => void
  onVote: (choice: 'up' | 'down') => void
}) {
  const total = Math.max(1, vote.upVotes + vote.downVotes)
  const upPct = (vote.upVotes / total) * 100
  const downPct = (vote.downVotes / total) * 100

  /** Local timer ring: counts down from durationMs / startedAt. */
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [])
  const elapsed = Math.max(0, now - vote.startedAt)
  const ringFrac = Math.max(0, 1 - elapsed / vote.durationMs)
  const secondsLeft = Math.max(0, Math.ceil((vote.durationMs - elapsed) / 1000))

  const listing = vote.listing
  const photo = listing.images?.[0]?.url

  return (
    <div className="relative flex min-h-0 flex-1 flex-col px-4 pt-[max(3.25rem,env(safe-area-inset-top,0px)+0.5rem)]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.32em] text-violet-600">
            Item #{vote.rotationIndex}
          </span>
          <span className="text-[12px] font-bold text-zinc-700">
            {formatCountLabel(totalPlayers)} players voting
          </span>
        </div>
        <CountdownRing fraction={ringFrac} secondsLeft={secondsLeft} />
      </div>

      <div
        className="mt-4 overflow-hidden rounded-[28px] bg-white shadow-[0_30px_60px_-30px_rgba(76,29,149,0.35)] ring-1 ring-zinc-200"
        key={listing.id}
        style={{ animation: 'fetch-mm-cardin 0.45s ease-out both' }}
      >
        <div className="relative h-[42vh] min-h-[230px] w-full overflow-hidden bg-zinc-100">
          {photo ? (
            <img
              src={photo}
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
            />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
          <button
            type="button"
            onClick={onSave}
            disabled={isSaved}
            aria-label={isSaved ? 'Saved' : 'Save listing'}
            className={[
              'absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full shadow-[0_10px_24px_-12px_rgba(0,0,0,0.5)] transition active:scale-95',
              isSaved
                ? 'bg-rose-500 text-white'
                : 'bg-white/95 text-rose-500 ring-1 ring-rose-200/60 hover:bg-white',
            ].join(' ')}
          >
            <HeartIcon filled={isSaved} className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-3 bottom-3 text-white">
            <p className="text-[18px] font-black leading-tight">{listing.title}</p>
            <div className="mt-1 flex items-center gap-2 text-[12px] font-semibold text-white/95">
              <span>{formatAudCents(listing.priceCents)}</span>
              {listing.compareAtCents && listing.compareAtCents > listing.priceCents ? (
                <span className="text-white/70 line-through">
                  {formatAudCents(listing.compareAtCents)}
                </span>
              ) : null}
              {listing.profileDisplayName ? (
                <span className="ml-auto truncate text-[11px] uppercase tracking-wide text-white/85">
                  @{listing.profileDisplayName}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="px-4 pb-3 pt-3">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide">
            <span className="text-emerald-600">Up · {vote.upVotes}</span>
            <span className="text-rose-500">{vote.downVotes} · Down</span>
          </div>
          <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-[width] duration-300"
              style={{ width: `${upPct}%` }}
            />
            <div
              className="h-full bg-gradient-to-l from-rose-400 to-rose-500 transition-[width] duration-300"
              style={{ width: `${downPct}%` }}
            />
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-[12px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
        Should we start a Bid War on this?
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 px-1">
        <button
          type="button"
          aria-label="Vote down — skip"
          disabled={vote.viewerVote != null}
          onClick={() => onVote('down')}
          className={[
            'flex h-16 items-center justify-center gap-2 rounded-3xl text-[15px] font-black uppercase tracking-wide transition active:scale-[0.97]',
            vote.viewerVote === 'down'
              ? 'bg-rose-500 text-white ring-2 ring-rose-200'
              : vote.viewerVote === 'up'
                ? 'bg-rose-100 text-rose-400'
                : 'bg-rose-500 text-white shadow-[0_18px_40px_-18px_rgba(225,29,72,0.55)]',
          ].join(' ')}
        >
          <ThumbIcon dir="down" />
          Skip
        </button>
        <button
          type="button"
          aria-label="Vote up — start a Bid War"
          disabled={vote.viewerVote != null}
          onClick={() => onVote('up')}
          className={[
            'flex h-16 items-center justify-center gap-2 rounded-3xl text-[15px] font-black uppercase tracking-wide transition active:scale-[0.97]',
            vote.viewerVote === 'up'
              ? 'bg-emerald-500 text-white ring-2 ring-emerald-200'
              : vote.viewerVote === 'down'
                ? 'bg-emerald-100 text-emerald-500'
                : 'bg-emerald-500 text-white shadow-[0_18px_40px_-18px_rgba(16,185,129,0.55)]',
          ].join(' ')}
        >
          <ThumbIcon dir="up" />
          Bid War
        </button>
      </div>

      <style>{`
        @keyframes fetch-mm-cardin {
          0%   { transform: translateY(20px) scale(0.96); opacity: 0; }
          60%  { transform: translateY(-4px) scale(1.01); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function CountdownRing({ fraction, secondsLeft }: { fraction: number; secondsLeft: number }) {
  const size = 56
  const stroke = 5
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * Math.max(0, Math.min(1, fraction))
  const urgent = secondsLeft <= 3
  return (
    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_10px_24px_-12px_rgba(76,29,149,0.25)] ring-1 ring-violet-100">
      <svg width={size} height={size} className="absolute inset-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(125,93,180,0.18)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={urgent ? '#fb7185' : '#7c3aed'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.18s linear' }}
        />
      </svg>
      <span
        className={[
          'relative text-[16px] font-black',
          urgent ? 'text-rose-500' : 'text-violet-700',
        ].join(' ')}
      >
        {secondsLeft}
      </span>
    </div>
  )
}

function ThumbIcon({ dir }: { dir: 'up' | 'down' }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={dir === 'down' ? 'rotate-180' : ''}
    >
      <path d="M2 21V10h4v11H2zm6 0V11l5-9 1.5.6c.3.1.5.4.5.7v6h6.4a1 1 0 011 1.2l-1.5 9A2 2 0 0118 21H8z" />
    </svg>
  )
}

function HeartIcon({ filled, className = '' }: { filled?: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s-7-4.5-9.5-9C.8 8.5 3 4 7 4c2 0 3.5 1.2 5 3 1.5-1.8 3-3 5-3 4 0 6.2 4.5 4.5 8-2.5 4.5-9.5 9-9.5 9z" />
    </svg>
  )
}

/* ============================================================================
 * Phase 3: decision stinger (with save fallback when skipped)
 * ============================================================================ */

function ListingDecisionPhase({
  decision,
  isSaved,
  onSave,
}: {
  decision: ListingDecision
  isSaved: boolean
  onSave: () => void
}) {
  const { passed } = decision
  const photo = decision.listing.images?.[0]?.url
  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6">
      <div
        className={[
          'rounded-full px-6 py-2 text-[12px] font-black uppercase tracking-[0.36em]',
          passed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white',
        ].join(' ')}
        style={{ animation: 'fetch-mm-stamp 0.45s ease-out both' }}
      >
        {passed ? 'Match found' : 'Skipped'}
      </div>
      <h2 className="text-center text-[26px] font-black leading-tight text-zinc-900">
        {passed ? 'Starting Bid War…' : 'Finding next item…'}
      </h2>
      <p className="text-[13px] font-semibold text-zinc-600">
        {decision.upVotes} up · {decision.downVotes} down
      </p>

      {!passed ? (
        <div className="mt-2 flex w-full max-w-[20rem] items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-zinc-200 shadow-[0_18px_40px_-18px_rgba(76,29,149,0.25)]">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
            {photo ? (
              <img src={photo} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-zinc-900">
              {decision.listing.title}
            </p>
            <p className="text-[12px] font-semibold text-zinc-500">
              {formatAudCents(decision.listing.priceCents)}
            </p>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaved}
            aria-label={isSaved ? 'Saved' : 'Save listing'}
            className={[
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95',
              isSaved
                ? 'bg-rose-500 text-white'
                : 'bg-rose-50 text-rose-500 ring-1 ring-rose-200',
            ].join(' ')}
          >
            <HeartIcon filled={isSaved} className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <style>{`
        @keyframes fetch-mm-stamp {
          0%   { transform: scale(1.4) rotate(-6deg); opacity: 0; }
          60%  { transform: scale(0.95) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

/* ============================================================================
 * Phase 4: live bidding
 * ============================================================================ */

function BidWarLiveStage({
  live,
  secondsLeft,
  onBid,
}: {
  live: LiveBidState
  secondsLeft: number
  onBid: () => void
}) {
  const nextBid = live.currentBidCents + live.bidIncrementCents
  const youAreLeading = live.topBidderId === 'you'
  const recent = [...live.bidders].slice(-5).reverse()

  return (
    <div className="relative flex min-h-0 flex-1 flex-col px-4 pt-[max(3.25rem,env(safe-area-inset-top,0px)+0.5rem)]">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-rose-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white shadow-[0_8px_20px_-10px_rgba(244,63,94,0.5)]">
          Live · Bid War
        </span>
        <span
          className={[
            'rounded-full px-3 py-1 text-[12px] font-black tabular-nums shadow-[0_6px_14px_-8px_rgba(76,29,149,0.3)]',
            secondsLeft <= 5
              ? 'bg-rose-500 text-white'
              : 'bg-white text-violet-700 ring-1 ring-violet-200',
          ].join(' ')}
        >
          0:{String(secondsLeft).padStart(2, '0')}
        </span>
      </div>

      <div className="mt-3 overflow-hidden rounded-[28px] bg-white ring-1 ring-zinc-200 shadow-[0_30px_60px_-30px_rgba(76,29,149,0.35)]">
        <div className="relative h-[34vh] min-h-[200px] w-full overflow-hidden bg-zinc-100">
          {live.productImageUrl ? (
            <img
              src={live.productImageUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
            />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
          <div className="absolute inset-x-3 bottom-3 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-fuchsia-200">
              Current bid
            </p>
            <p className="text-[34px] font-black leading-none">
              {formatAudCents(live.currentBidCents)}
            </p>
            <p className="mt-1 text-[12px] font-semibold text-white/90">{live.productTitle}</p>
          </div>
        </div>

        <div className="space-y-1.5 bg-white px-4 py-3">
          {recent.length === 0 ? (
            <p className="py-3 text-center text-[12px] text-zinc-500">Waiting for the first bid…</p>
          ) : (
            recent.map((b) => (
              <div key={`${b.id}-${b.bidCents}`} className="flex items-center gap-2 text-[12px]">
                <img
                  src={b.avatar}
                  alt=""
                  className="h-5 w-5 rounded-full object-cover"
                  loading="lazy"
                />
                <span className="flex-1 truncate font-semibold text-zinc-800">
                  {b.id === 'you' ? 'You' : b.name}
                </span>
                <span className="font-black tabular-nums text-violet-700">
                  {formatAudCents(b.bidCents)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 px-1">
        <button
          type="button"
          onClick={onBid}
          disabled={secondsLeft <= 0}
          className={[
            'fetch-apple-warp-btn flex h-16 w-full items-center justify-center gap-2 rounded-3xl text-[15px] font-black uppercase tracking-wide transition active:scale-[0.97]',
            secondsLeft <= 0
              ? 'bg-zinc-200 text-zinc-400'
              : youAreLeading
                ? 'bg-emerald-500 text-white shadow-[0_18px_40px_-18px_rgba(16,185,129,0.55)]'
                : 'bg-fuchsia-500 text-white shadow-[0_18px_40px_-18px_rgba(217,70,239,0.55)]',
          ].join(' ')}
        >
          {youAreLeading ? "You're leading" : `Bid ${formatAudCents(nextBid)}`}
        </button>
        <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Tap to outbid · +{formatAudCents(live.bidIncrementCents)}
        </p>
      </div>
    </div>
  )
}

/* ============================================================================
 * Phase 5: result — saved-items strip + match-again CTA
 * ============================================================================ */

function ResultPhase({
  won,
  finalBidCents,
  productTitle,
  productImageUrl,
  saved,
  onMatchAgain,
  onClose,
}: {
  won: boolean
  finalBidCents: number
  productTitle: string
  productImageUrl: string
  saved: SavedBidWarsListing[]
  onMatchAgain: () => void
  onClose: () => void
}) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center px-4 pt-[max(3.5rem,env(safe-area-inset-top,0px)+0.75rem)]">
      <span
        className={[
          'rounded-full px-6 py-2 text-[12px] font-black uppercase tracking-[0.32em]',
          won ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white',
        ].join(' ')}
        style={{ animation: 'fetch-mm-stamp 0.45s ease-out both' }}
      >
        {won ? 'You won' : 'Outbid'}
      </span>
      <h2 className="mt-3 text-center text-[28px] font-black leading-tight text-zinc-900">
        {won ? 'Bid War victory!' : 'Better luck next time'}
      </h2>

      <div className="mt-5 w-full max-w-[20rem] overflow-hidden rounded-3xl bg-white ring-1 ring-zinc-200 shadow-[0_30px_60px_-30px_rgba(76,29,149,0.35)]">
        <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-100">
          {productImageUrl ? (
            <img
              src={productImageUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
            />
          ) : null}
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600">Final bid</p>
          <p className="text-[26px] font-black tabular-nums text-zinc-900">
            {formatAudCents(finalBidCents)}
          </p>
          <p className="text-[12px] text-zinc-600">{productTitle}</p>
        </div>
      </div>

      {saved.length > 0 ? (
        <div className="mt-5 w-full">
          <div className="flex items-center justify-between px-1 pb-2">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
              Saved this session
            </p>
            <span className="text-[11px] font-bold text-zinc-500">
              {saved.length} item{saved.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {saved.map((s) => (
              <div
                key={s.id}
                className="flex w-[8.5rem] shrink-0 flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200 shadow-[0_12px_24px_-16px_rgba(76,29,149,0.3)]"
              >
                <div className="aspect-square w-full overflow-hidden bg-zinc-100">
                  {s.imageUrl ? (
                    <img
                      src={s.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="px-2.5 pb-2 pt-1.5">
                  <p className="truncate text-[12px] font-bold text-zinc-900">{s.title}</p>
                  <p className="text-[11px] font-semibold text-zinc-500">
                    {formatAudCents(s.priceCents)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-auto w-full max-w-[22rem] pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px)+0.5rem)]">
        <button
          type="button"
          onClick={onMatchAgain}
          className="fetch-apple-warp-btn flex h-14 w-full items-center justify-center rounded-3xl bg-violet-600 text-[15px] font-black uppercase tracking-wide text-white shadow-[0_18px_40px_-18px_rgba(124,58,237,0.55)] active:scale-[0.97]"
        >
          Match again
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 flex h-12 w-full items-center justify-center rounded-3xl bg-white text-[14px] font-black uppercase tracking-wide text-zinc-700 ring-1 ring-zinc-200 active:scale-[0.97]"
        >
          Back to Explore
        </button>
      </div>
    </div>
  )
}

/* ============================================================================
 * Saved toast
 * ============================================================================ */

function SavedToast({ text }: { text: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-x-0 top-[max(3.5rem,env(safe-area-inset-top,0px)+1rem)] z-[7] flex justify-center px-4"
    >
      <div
        className="flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-[12px] font-bold text-white shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]"
        style={{ animation: 'fetch-mm-toast 1.7s ease both' }}
      >
        <HeartIcon filled className="h-4 w-4 text-rose-400" />
        {text}
      </div>
      <style>{`
        @keyframes fetch-mm-toast {
          0%   { transform: translateY(-12px); opacity: 0; }
          15%  { transform: translateY(0); opacity: 1; }
          85%  { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-12px); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
