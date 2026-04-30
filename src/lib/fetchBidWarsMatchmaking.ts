/**
 * Bid Wars matchmaking — server-shaped client emitter.
 *
 * Drives the brand-new full-screen matchmaking overlay (`FetchBidWarsMatchmakingOverlay`):
 *   1. lobby search — fills `maxPlayers` (you + bots) over a few seconds
 *   2. listing vote — proposes one `PeerListing` at a time; bots + viewer vote thumbs up/down
 *   3. tally — if up > down → emits `listingDecision` with `passed=true` and goes into bidding;
 *               otherwise emits `passed=false` and rotates to the next listing
 *   4. bid war — short live bidding loop using `applyNewBid` from `fetchBidWarsBattles`
 *   5. result — emits `bidWarEnd` and the consumer closes the overlay
 *
 * Shape mirrors what an SSE / WebSocket "room" would push so the only swap to go real-multiplayer
 * is replacing this file with a network adapter that emits the same events.
 */

import type { PeerListing } from './listingsApi'
import {
  applyNewBid,
  formatAudCents,
  type LiveBidState,
} from './fetchBidWarsBattles'

/* ─── Public types ───────────────────────────────────────────────────────── */

export type MatchmakingPlayer = {
  id: string
  name: string
  handle: string
  avatar: string
  /** `true` when this is the viewer's own avatar. */
  isYou?: boolean
}

export type MatchmakingPhase =
  | 'searching'
  | 'listingVote'
  | 'listingDecision'
  | 'bidWar'
  | 'result'

export type ListingVoteState = {
  listing: PeerListing
  /** Listings already shown this session (so we can bias against repeats). */
  rotationIndex: number
  durationMs: number
  startedAt: number
  upVotes: number
  downVotes: number
  /** What the local viewer voted, if anything. */
  viewerVote: 'up' | 'down' | null
}

export type ListingDecision = {
  listing: PeerListing
  upVotes: number
  downVotes: number
  passed: boolean
}

export type BidWarEndResult = {
  listing: PeerListing
  finalBidCents: number
  topBidderId: string
  viewerWon: boolean
}

export type MatchmakingEvent =
  | { type: 'lobbyTick'; players: MatchmakingPlayer[]; total: number }
  | { type: 'listingProposed'; vote: ListingVoteState }
  | { type: 'voteUpdate'; vote: ListingVoteState }
  | { type: 'listingDecision'; decision: ListingDecision }
  | { type: 'bidWarStart'; live: LiveBidState; listing: PeerListing }
  | { type: 'bidWarTick'; live: LiveBidState; secondsLeft: number }
  | { type: 'bidWarBid'; live: LiveBidState; bidderId: string; amountCents: number }
  | { type: 'bidWarEnd'; result: BidWarEndResult }
  | { type: 'phase'; phase: MatchmakingPhase }

export type MatchmakingRoom = {
  subscribe: (cb: (event: MatchmakingEvent) => void) => () => void
  /** Local viewer registers a vote on the current listing. */
  vote: (choice: 'up' | 'down') => void
  /** Local viewer places a bid (cents). */
  placeBid: (amountCents: number) => void
  /** Stop simulator and clear all timers. */
  leave: () => void
}

export type JoinMatchmakingOptions = {
  maxPlayers?: number
  listings: PeerListing[]
  /** Override timing for tests / demos. */
  timing?: Partial<{
    lobbyFillMs: number
    voteDurationMs: number
    decisionHoldMs: number
    bidWarDurationMs: number
    rivalBidIntervalMs: number
  }>
}

/* ─── Bot pool & helpers ─────────────────────────────────────────────────── */

const BOT_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286ad2?w=96&q=80',
]

const BOT_FIRST_NAMES = [
  'Mike', 'Sarah', 'Alex', 'Jordan', 'Zara', 'Liam', 'Nova', 'Reece', 'Kai',
  'Imo', 'Theo', 'Mila', 'Ezra', 'Ash', 'Sage', 'Indi', 'Wren', 'Remy',
  'Jules', 'Tate', 'Quinn', 'Harlow', 'Ari', 'Cleo', 'Dax',
]
const BOT_LAST_INITIALS = ['B.', 'M.', 'T.', 'K.', 'R.', 'O.', 'L.', 'S.', 'P.']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function makeBotPlayer(seq: number): MatchmakingPlayer {
  const first = pick(BOT_FIRST_NAMES)
  const last = pick(BOT_LAST_INITIALS)
  const avatar = BOT_AVATARS[seq % BOT_AVATARS.length]
  return {
    id: `bot_${seq}_${Math.random().toString(36).slice(2, 6)}`,
    name: `${first} ${last}`,
    handle: `@${first.toLowerCase()}${seq}`,
    avatar,
  }
}

const VIEWER_PLAYER: MatchmakingPlayer = {
  id: 'you',
  name: 'You',
  handle: '@you',
  avatar:
    'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=96&q=80',
  isYou: true,
}

/** Bias a listing toward the "thumbs up" side based on price, condition, and category. */
function listingUpBias(listing: PeerListing): number {
  let bias = 0.55 // default slightly above 50/50
  const priceDollars = listing.priceCents / 100
  if (priceDollars < 100) bias += 0.12
  else if (priceDollars < 500) bias += 0.06
  else if (priceDollars > 5000) bias -= 0.08
  const cat = (listing.category || '').toLowerCase()
  if (cat === 'sneakers' || cat === 'cards' || cat === 'collectibles' || cat === 'fashion')
    bias += 0.08
  if (cat === 'furniture') bias -= 0.04
  if (listing.compareAtCents && listing.compareAtCents > listing.priceCents) bias += 0.05
  return Math.max(0.18, Math.min(0.86, bias))
}

/** Build an initial `LiveBidState` from a `PeerListing` + its starting price. */
function buildLiveStateFromListing(listing: PeerListing): LiveBidState {
  const open = Math.max(500, Math.round(listing.priceCents * 0.6))
  const incrementCents = open >= 50000 ? 5000 : open >= 10000 ? 1000 : open >= 1000 ? 250 : 100
  return {
    battleNumber: `#BW-${listing.id.slice(-5).toUpperCase()}`,
    productTitle: listing.title,
    productImageUrl: listing.images?.[0]?.url ?? '',
    itemEndsInSec: 30,
    totalWatching: 100,
    currentBidCents: open,
    topBidderId: 'mm_bot_seed',
    bidders: [
      {
        id: 'mm_bot_seed',
        name: pick(BOT_FIRST_NAMES) + ' ' + pick(BOT_LAST_INITIALS),
        handle: '@earlybird',
        avatar: BOT_AVATARS[0],
        bidCents: open,
      },
    ],
    bidIncrementCents: incrementCents,
  }
}

/* ─── Default timings ────────────────────────────────────────────────────── */

const DEFAULT_LOBBY_FILL_MS = 5_000
const DEFAULT_VOTE_DURATION_MS = 8_000
const DEFAULT_DECISION_HOLD_MS = 1_400
const DEFAULT_BID_WAR_DURATION_MS = 30_000
const DEFAULT_RIVAL_BID_INTERVAL_MS = 2_400

/* ─── Public API ─────────────────────────────────────────────────────────── */

export function joinMatchmakingRoom(opts: JoinMatchmakingOptions): MatchmakingRoom {
  const maxPlayers = Math.max(2, Math.min(500, opts.maxPlayers ?? 100))
  const lobbyFillMs = opts.timing?.lobbyFillMs ?? DEFAULT_LOBBY_FILL_MS
  const voteDurationMs = opts.timing?.voteDurationMs ?? DEFAULT_VOTE_DURATION_MS
  const decisionHoldMs = opts.timing?.decisionHoldMs ?? DEFAULT_DECISION_HOLD_MS
  const bidWarDurationMs = opts.timing?.bidWarDurationMs ?? DEFAULT_BID_WAR_DURATION_MS
  const rivalBidIntervalMs = opts.timing?.rivalBidIntervalMs ?? DEFAULT_RIVAL_BID_INTERVAL_MS

  const listingPool = opts.listings.length ? [...opts.listings] : []
  if (!listingPool.length) {
    throw new Error('joinMatchmakingRoom: at least one PeerListing is required')
  }

  const listeners = new Set<(e: MatchmakingEvent) => void>()
  const timers = new Set<number>()
  let disposed = false
  let players: MatchmakingPlayer[] = [VIEWER_PLAYER]
  let rotationIndex = 0
  let activeVote: ListingVoteState | null = null
  let liveBidState: LiveBidState | null = null
  let activeListing: PeerListing | null = null
  let phase: MatchmakingPhase = 'searching'

  function emit(event: MatchmakingEvent) {
    listeners.forEach((cb) => {
      try {
        cb(event)
      } catch {
        /* swallow consumer errors */
      }
    })
  }

  function setPhase(next: MatchmakingPhase) {
    if (phase === next) return
    phase = next
    emit({ type: 'phase', phase: next })
  }

  function schedule(fn: () => void, ms: number) {
    if (disposed) return
    const id = window.setTimeout(() => {
      timers.delete(id)
      if (disposed) return
      fn()
    }, ms)
    timers.add(id)
  }

  function scheduleInterval(fn: () => void, ms: number): number {
    const id = window.setInterval(() => {
      if (disposed) return
      fn()
    }, ms)
    timers.add(id)
    return id
  }

  function clearTimer(id: number) {
    window.clearTimeout(id)
    window.clearInterval(id)
    timers.delete(id)
  }

  /* ── Phase 1: lobby fill ────────────────────────────────────────────── */

  function fillLobby() {
    setPhase('searching')
    emit({ type: 'lobbyTick', players, total: players.length })
    const totalToAdd = maxPlayers - players.length
    if (totalToAdd <= 0) {
      onLobbyFull()
      return
    }
    const stepMs = Math.max(20, Math.floor(lobbyFillMs / totalToAdd))
    let added = 0
    const interval = scheduleInterval(() => {
      // burst arrivals look more alive than 1-by-1 ticks
      const burst = added < totalToAdd * 0.3 ? 1 : added < totalToAdd * 0.7 ? 2 : 3
      for (let i = 0; i < burst && added < totalToAdd; i++) {
        players.push(makeBotPlayer(players.length))
        added++
      }
      emit({ type: 'lobbyTick', players, total: players.length })
      if (added >= totalToAdd) {
        clearTimer(interval)
        schedule(onLobbyFull, 350)
      }
    }, stepMs)
  }

  function onLobbyFull() {
    proposeNextListing()
  }

  /* ── Phase 2: propose a listing & collect votes ─────────────────────── */

  function pickNextListing(): PeerListing {
    const listing = listingPool[rotationIndex % listingPool.length]
    rotationIndex++
    return listing
  }

  function proposeNextListing() {
    const listing = pickNextListing()
    activeListing = listing
    const startedAt = Date.now()
    activeVote = {
      listing,
      rotationIndex,
      durationMs: voteDurationMs,
      startedAt,
      upVotes: 0,
      downVotes: 0,
      viewerVote: null,
    }
    setPhase('listingVote')
    emit({ type: 'listingProposed', vote: activeVote })
    runBotVoting(listing)
  }

  function runBotVoting(listing: PeerListing) {
    const bias = listingUpBias(listing)
    const totalBots = Math.max(0, players.length - 1)
    /** Schedule each bot to vote at a random offset, weighted toward the back half for tension. */
    for (let i = 0; i < totalBots; i++) {
      const r = Math.random()
      const delayFraction = r < 0.3 ? r * 0.4 + 0.05 : r * 0.55 + 0.4
      const delay = Math.max(120, Math.floor(voteDurationMs * delayFraction))
      schedule(() => castBotVote(bias), delay)
    }
    schedule(closeVote, voteDurationMs + 60)
  }

  function castBotVote(upBias: number) {
    if (!activeVote) return
    const choice: 'up' | 'down' = Math.random() < upBias ? 'up' : 'down'
    if (choice === 'up') activeVote.upVotes += 1
    else activeVote.downVotes += 1
    emit({ type: 'voteUpdate', vote: activeVote })
  }

  function closeVote() {
    if (!activeVote || !activeListing) return
    const passed = activeVote.upVotes > activeVote.downVotes
    const decision: ListingDecision = {
      listing: activeListing,
      upVotes: activeVote.upVotes,
      downVotes: activeVote.downVotes,
      passed,
    }
    setPhase('listingDecision')
    emit({ type: 'listingDecision', decision })
    schedule(() => {
      if (passed) startBidWar(activeListing as PeerListing)
      else proposeNextListing()
    }, decisionHoldMs)
  }

  /* ── Phase 4: live bidding ──────────────────────────────────────────── */

  function startBidWar(listing: PeerListing) {
    setPhase('bidWar')
    liveBidState = buildLiveStateFromListing(listing)
    /** Show 100% of lobby as watchers. */
    liveBidState = { ...liveBidState, totalWatching: players.length }
    emit({ type: 'bidWarStart', live: liveBidState, listing })

    const startedAt = Date.now()
    const tickId = scheduleInterval(() => {
      if (!liveBidState) return
      const elapsed = Date.now() - startedAt
      const secondsLeft = Math.max(0, Math.ceil((bidWarDurationMs - elapsed) / 1000))
      liveBidState = { ...liveBidState, itemEndsInSec: secondsLeft }
      emit({ type: 'bidWarTick', live: liveBidState, secondsLeft })
      if (secondsLeft <= 0) {
        clearTimer(tickId)
        endBidWar()
      }
    }, 250)

    /** Rival bid loop — fades over time so the user can hold the lead near the end. */
    const rivalLoop = scheduleInterval(() => {
      if (!liveBidState) return
      const elapsed = Date.now() - startedAt
      const progress = Math.min(1, elapsed / bidWarDurationMs)
      // lower probability as the war ages; if viewer is leading, slightly higher early
      const baseChance = 0.85 - progress * 0.55
      if (Math.random() > baseChance) return
      // Don't outbid the viewer in the final 4 seconds
      if (
        liveBidState.topBidderId === VIEWER_PLAYER.id &&
        elapsed > bidWarDurationMs - 4000
      ) {
        return
      }
      const next = liveBidState.currentBidCents + liveBidState.bidIncrementCents
      const bidder = players.find((p) => !p.isYou) ?? makeBotPlayer(players.length)
      liveBidState = applyNewBid(liveBidState, bidder.id, next)
      // ensure the bidder name shows nicely (applyNewBid only fills in "You" by id="you")
      if (bidder.id !== VIEWER_PLAYER.id) {
        liveBidState = {
          ...liveBidState,
          bidders: liveBidState.bidders.map((b) =>
            b.id === bidder.id ? { ...b, name: bidder.name, handle: bidder.handle, avatar: bidder.avatar } : b,
          ),
        }
      }
      emit({
        type: 'bidWarBid',
        live: liveBidState,
        bidderId: bidder.id,
        amountCents: next,
      })
    }, rivalBidIntervalMs)

    schedule(() => clearTimer(rivalLoop), bidWarDurationMs + 200)
  }

  function endBidWar() {
    if (!liveBidState || !activeListing) return
    setPhase('result')
    const result: BidWarEndResult = {
      listing: activeListing,
      finalBidCents: liveBidState.currentBidCents,
      topBidderId: liveBidState.topBidderId,
      viewerWon: liveBidState.topBidderId === VIEWER_PLAYER.id,
    }
    emit({ type: 'bidWarEnd', result })
  }

  /* ── External controls ──────────────────────────────────────────────── */

  function vote(choice: 'up' | 'down') {
    if (!activeVote || activeVote.viewerVote) return
    activeVote.viewerVote = choice
    if (choice === 'up') activeVote.upVotes += 1
    else activeVote.downVotes += 1
    emit({ type: 'voteUpdate', vote: activeVote })
  }

  function placeBid(amountCents: number) {
    if (!liveBidState) return
    const minNext = liveBidState.currentBidCents + liveBidState.bidIncrementCents
    const safe = Math.max(amountCents, minNext)
    liveBidState = applyNewBid(liveBidState, VIEWER_PLAYER.id, safe)
    emit({
      type: 'bidWarBid',
      live: liveBidState,
      bidderId: VIEWER_PLAYER.id,
      amountCents: safe,
    })
  }

  function subscribe(cb: (e: MatchmakingEvent) => void) {
    listeners.add(cb)
    // immediately deliver the current state so a late subscriber catches up
    cb({ type: 'phase', phase })
    cb({ type: 'lobbyTick', players, total: players.length })
    if (activeVote) cb({ type: 'voteUpdate', vote: activeVote })
    if (liveBidState && activeListing) {
      cb({ type: 'bidWarTick', live: liveBidState, secondsLeft: liveBidState.itemEndsInSec })
    }
    return () => {
      listeners.delete(cb)
    }
  }

  function leave() {
    if (disposed) return
    disposed = true
    timers.forEach((id) => {
      window.clearTimeout(id)
      window.clearInterval(id)
    })
    timers.clear()
    listeners.clear()
  }

  // Kick off async so subscribers can attach before events fire
  schedule(fillLobby, 50)

  return { subscribe, vote, placeBid, leave }
}

/** Helper exposed for the overlay's bottom strip. */
export function formatMatchmakingPrice(cents: number): string {
  return formatAudCents(cents)
}
