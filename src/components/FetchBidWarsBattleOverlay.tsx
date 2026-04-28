import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import boomerangUrl from '../assets/fetchit-boomerang-logo.png'
import {
  buildInitialLiveBidState,
  buildSeedLobbyChat,
  formatAudCents,
  formatCountLabel,
  formatMmSs,
  makeLobbyChatMessage,
  nextBidMinCents,
  type LiveBidState,
  type LobbyChatAuthor,
  type LobbyChatMessage,
  type StartingSoonBattle,
} from '../lib/fetchBidWarsBattles'
import {
  initBattleAudio,
  playBattleBegins,
  playBidPlaced,
  playChatPing,
  playCinematicTension,
  playConfettiPops,
  playCountdownBeep,
  playFinalImpact,
  playHeartbeat,
  playLobbyLaunch,
  playOutbid,
  playRivalBid,
  playTimeBonus,
  playTimerTick,
  playUserJoined,
  playWinFanfare,
} from '../lib/fetchBattleSounds'

/**
 * Remaining-seconds thresholds used to derive the overlay's pre-live stage
 * from the shared battle clock. Keeping the overlay phase *derived* (rather
 * than locally ticked) is what lets us stop mutating shared state when the
 * user opens / closes the overlay — the feed card and the overlay always
 * read from the same `remaining` source of truth.
 *
 *  remaining > COUNTDOWN_THRESHOLD_SEC   → `lobby`
 *  1 < remaining ≤ COUNTDOWN_THRESHOLD_SEC → `countdown` (3 → 2 → 1)
 *  remaining ≤ GO_THRESHOLD_SEC          → `go` (1s "BATTLE BEGINS" flourish)
 *  sharedPhase === 'live'                 → `live`
 *  sharedPhase === 'done'                 → `done`
 */
const COUNTDOWN_THRESHOLD_SEC = 4
const GO_THRESHOLD_SEC = 1

/**
 * Seconds added to the live deadline when a bid lands with ≤ 10s remaining.
 * Must match the value driving `endsAtEpoch` extensions in `useBattleSync`
 * over in `FeedTabViews.tsx` — it's only used here for the "+5s" label.
 */
const TIME_BONUS_SEC = 5

type Phase = 'lobby' | 'countdown' | 'go' | 'live' | 'done'

type BidEntry = {
  id: string
  name: string
  avatar: string
  amountCents: number
  at: number
}

type Props = {
  battle: StartingSoonBattle
  /** Seconds to count down before going live (default 3). */
  countdownFromSec?: number
  /**
   * Shared battle phase from the feed clock. The overlay still runs its own
   * lobby → countdown → go intro on top of this, but the `live` and `done`
   * stages are driven entirely by this prop so the overlay and the feed
   * cards stay in lockstep.
   */
  phase: 'upcoming' | 'live' | 'done'
  /** Remaining seconds for the shared battle (live countdown or pre-live wait). */
  remaining: number
  /** Shared live bid state; present when `phase === 'live'`. */
  live?: LiveBidState
  /** Increments in the shared state when a +5s anti-snipe bonus is applied. */
  bonusPulseSeq?: number
  /**
   * Called when the viewer taps BID. The parent hook mutates the shared live
   * state (which then flows back in via `live`) so the card, the sheet, and
   * the overlay all show the same current bid.
   */
  onViewerBid: (amountCents: number) => void
  /** Optional next battle shown in the "up next" preview after a win. */
  nextBattle?: StartingSoonBattle
  /** Called when user taps "Keep going" on the win screen. */
  onAdvanceToNextBattle?: () => void
  onClose: () => void
}

const VIEWER_ID = 'me_viewer'
const VIEWER_AVATAR = 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=96&q=80'

function FetchBidWarsBattleOverlayInner({
  battle,
  countdownFromSec = 3,
  phase: sharedPhase,
  remaining,
  live: liveFromProps,
  bonusPulseSeq,
  onViewerBid,
  nextBattle,
  onAdvanceToNextBattle,
  onClose,
}: Props) {
  /* ---------- Phase + display values derived from shared clock ─────────
   * The overlay no longer ticks its own intro timer. Instead every stage
   * is a pure function of `sharedPhase` + `remaining`. This means:
   *   • Opening / closing the overlay never mutates shared state.
   *   • The feed card's countdown and the overlay countdown are always
   *     the same number (they both read from `remaining`).
   *   • `go` → `live` happens the instant the shared clock flips — no
   *     drift window where the overlay is live but `liveFromProps` is
   *     still undefined.
   * -------------------------------------------------------------------- */
  const timeLeftSec = Math.max(0, Math.floor(remaining))
  /**
   * Once the shared clock hits `done`, the feed's rotation effect immediately
   * resets that battle back to `upcoming` so the queue keeps flowing for other
   * viewers. In the overlay we need the WonStage to stay visible until the
   * user dismisses it, so we latch `hasFinished` the moment we see `done` and
   * never un-latch. All subsequent `upcoming` snaps from rotation are ignored.
   */
  const [hasFinished, setHasFinished] = useState(sharedPhase === 'done')
  useEffect(() => {
    if (sharedPhase === 'done') setHasFinished(true)
  }, [sharedPhase])
  const phase: Phase = hasFinished
    ? 'done'
    : sharedPhase === 'live'
      ? 'live'
      : timeLeftSec <= GO_THRESHOLD_SEC
        ? 'go'
        : timeLeftSec <= COUNTDOWN_THRESHOLD_SEC
          ? 'countdown'
          : 'lobby'
  /** Whole seconds left of lobby before the 3-2-1 countdown takes over. */
  const lobbySec = Math.max(0, timeLeftSec - COUNTDOWN_THRESHOLD_SEC)
  /**
   * Countdown display value while `phase === 'countdown'` — we clamp to the
   * caller-specified `countdownFromSec` (default 3) so opening the overlay
   * exactly at remaining=4 still reads "3".
   */
  const countdown = Math.max(
    1,
    Math.min(countdownFromSec, timeLeftSec - GO_THRESHOLD_SEC),
  )
  const [chat, setChat] = useState<LobbyChatMessage[]>(() => buildSeedLobbyChat())
  const chatSeqRef = useRef(100)

  /**
   * `live` is shared — fall back to a local seed during the lobby/countdown
   * stages so the LiveStage has something to render the instant shared state
   * kicks in (bidder list, starting bid, etc). Once shared state arrives, we
   * always prefer it so the card and overlay agree to the cent.
   */
  const fallbackLiveRef = useRef<LiveBidState | null>(null)
  if (!fallbackLiveRef.current) fallbackLiveRef.current = buildInitialLiveBidState(battle)
  const live: LiveBidState = liveFromProps ?? fallbackLiveRef.current

  const [justBid, setJustBid] = useState(false)

  /* ---------- Bid log (recent bids feed) ----------
   * Seed from shared live state when the user joins mid-battle, so the log's
   * top entry matches the hero card's current bid instead of the static
   * starting bid. Falls back to the local seed during lobby/countdown.
   */
  const [bidLog, setBidLog] = useState<BidEntry[]>(() => {
    const init = liveFromProps ?? fallbackLiveRef.current!
    return [...init.bidders]
      .sort((a, b) => b.bidCents - a.bidCents)
      .slice(0, 4)
      .map((b, i) => ({
        id: b.id,
        name: b.name,
        avatar: b.avatar,
        amountCents: b.bidCents,
        at: Date.now() - (i + 1) * 4000,
      }))
  })

  /* Sync bid log whenever topBidderId changes in shared live state */
  const prevTopRef = useRef(live.topBidderId)
  useEffect(() => {
    if (live.topBidderId === prevTopRef.current) return
    prevTopRef.current = live.topBidderId
    const bidder = live.bidders.find((b) => b.id === live.topBidderId)
    if (!bidder) return
    setBidLog((prev) =>
      [
        {
          id: bidder.id,
          name: bidder.id === VIEWER_ID ? 'You' : bidder.name,
          avatar: bidder.id === VIEWER_ID ? VIEWER_AVATAR : bidder.avatar,
          amountCents: live.currentBidCents,
          at: Date.now(),
        },
        ...prev,
      ].slice(0, 10),
    )
  }, [live.topBidderId, live.bidders, live.currentBidCents])

  /* ---------- +5s bonus pulse (driven by shared hook) ---------- */
  const [bonusPulse, setBonusPulse] = useState(0)
  const prevBonusSeqRef = useRef<number>(bonusPulseSeq ?? 0)
  useEffect(() => {
    const cur = bonusPulseSeq ?? 0
    if (cur === prevBonusSeqRef.current) return
    prevBonusSeqRef.current = cur
    setBonusPulse((n) => n + 1)
    playTimeBonus()
  }, [bonusPulseSeq])

  /* ---------- Custom bid amount (stepper) ----------
   * Seed at the next-min for whatever shared state we have on mount, so a
   * mid-battle joiner doesn't see an absurdly low starting bid on the
   * stepper (e.g. 8500 defaults when shared is already at 10500).
   */
  const [bidCustomCents, setBidCustomCents] = useState(() =>
    nextBidMinCents(liveFromProps ?? fallbackLiveRef.current!),
  )
  useEffect(() => {
    const nextMin = nextBidMinCents(live)
    setBidCustomCents((prev) => Math.max(prev, nextMin))
  }, [live])

  /* ---------- Lobby phase — incoming chat messages ---------- */
  useEffect(() => {
    if (phase !== 'lobby') return
    const schedule = () => {
      const delay = 900 + Math.random() * 1800
      return window.setTimeout(() => {
        const seq = chatSeqRef.current++
        const msg = makeLobbyChatMessage(seq)
        setChat((prev) => [...prev, msg].slice(-40))
        if (msg.system === 'join') playUserJoined()
        else playChatPing()
        id = schedule()
      }, delay)
    }
    let id = schedule()
    return () => window.clearTimeout(id)
  }, [phase])

  /* ---------- Phase-transition sound effects ─────────────────────────
   * Phase is now a pure derivation of shared state, so there's no single
   * "setPhase" to hook into. We keep a `prevPhase` ref and fire one-shot
   * SFX the moment the derived value changes between ticks.
   * -------------------------------------------------------------------- */
  const prevPhaseRef = useRef<Phase>(phase)
  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = phase
    if (prev === phase) return
    if (prev === 'lobby' && phase === 'countdown') playLobbyLaunch()
  }, [phase])

  const handleBid = useCallback(() => {
    // Overlay `phase` is derived from `sharedPhase`, so a single check covers
    // both. Still guard on timeLeft so we don't send a bid on the 0-second
    // frame that precedes sharedPhase flipping to 'done'.
    if (sharedPhase !== 'live' || timeLeftSec <= 0) return
    const amt = bidCustomCents
    onViewerBid(amt)
    setJustBid(true)
    playBidPlaced()
    window.setTimeout(() => setJustBid(false), 750)
  }, [sharedPhase, timeLeftSec, bidCustomCents, onViewerBid])

  /* ---------- Sound effects ---------- */

  // Unlock AudioContext on first mount (user gesture already happened via "Get ready" tap)
  useEffect(() => { initBattleAudio() }, [])

  // Countdown beeps (3, 2, 1)
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown >= 1 && countdown <= 3) playCountdownBeep(countdown as 1 | 2 | 3)
  }, [phase, countdown])

  // Battle begins — whoosh + chord + falcon
  useEffect(() => {
    if (phase === 'go') playBattleBegins()
  }, [phase])

  // Win fanfare + confetti
  useEffect(() => {
    if (phase === 'done') {
      playWinFanfare()
      window.setTimeout(() => playConfettiPops(), 350)
    }
  }, [phase])

  // Per-second live timer sounds: tick + heartbeat + cinematic swell + final impact
  useEffect(() => {
    if (phase !== 'live') return
    if (timeLeftSec <= 0) {
      playFinalImpact()
      return
    }
    if (timeLeftSec <= 10) {
      playTimerTick(timeLeftSec)
      playHeartbeat(timeLeftSec)
    }
    if (timeLeftSec <= 5) {
      playCinematicTension(timeLeftSec)
    }
  }, [phase, timeLeftSec])

  // Bid sounds: outbid vs rival bid (reuse prevTopRef already tracking changes)
  const soundPrevTopRef = useRef(live.topBidderId)
  useEffect(() => {
    if (phase !== 'live') return
    if (live.topBidderId === soundPrevTopRef.current) return
    const wasViewer = soundPrevTopRef.current === VIEWER_ID
    soundPrevTopRef.current = live.topBidderId
    if (live.topBidderId === VIEWER_ID) return // handled by handleBid
    if (wasViewer) {
      playOutbid()
    } else {
      playRivalBid()
    }
  }, [phase, live.topBidderId])

  /* ---------- Capture winning bid when battle ends ──────────────────
   * Snapshot the current bid the moment the shared state hits 'done' so
   * the WonStage shows the final number even if later state mutates.
   * ---------------------------------------------------------------- */
  const winningBidRef = useRef(0)
  useEffect(() => {
    if (sharedPhase !== 'done') return
    if (winningBidRef.current === 0) {
      winningBidRef.current = live.currentBidCents
    }
  }, [sharedPhase, live.currentBidCents])

  const portalTarget = typeof document !== 'undefined' ? document.body : null
  if (!portalTarget) return null

  return createPortal(
    <div
      className="fetch-battle-overlay fixed inset-0 z-[9997] flex flex-col"
      role="dialog"
      aria-modal
      aria-label={`Battle ${battle.battleNumber}`}
    >
      <BattleBackground phase={phase} />

      {phase !== 'done' && (
        <BattleHeader
          battleNumber={battle.battleNumber}
          totalWatching={live.totalWatching}
          onClose={onClose}
          isLive={phase === 'live' || phase === 'lobby'}
          isLobby={phase === 'lobby'}
        />
      )}

      <div className="relative z-[2] flex min-h-0 flex-1 flex-col overflow-hidden">
        {phase === 'lobby' ? (
          <LobbyStage battle={battle} lobbySec={lobbySec} chat={chat} />
        ) : null}
        {phase === 'countdown' ? (
          <CountdownStage count={countdown} from={countdownFromSec} imageUrl={battle.imageUrl} />
        ) : null}
        {phase === 'go' ? <BattleBeginsStage imageUrl={battle.imageUrl} /> : null}
        {phase === 'live' ? (
          <LiveStage
            battle={battle}
            live={live}
            timeLeftSec={timeLeftSec}
            justBid={justBid}
            bidCustomCents={bidCustomCents}
            setBidCustomCents={setBidCustomCents}
            bidLog={bidLog}
            bonusPulse={bonusPulse}
            onBid={handleBid}
          />
        ) : null}
        {phase === 'done' ? (
          <WonStage
            battle={battle}
            winningBidCents={winningBidRef.current || live.currentBidCents}
            nextBattle={nextBattle}
            onViewOrder={onClose}
            onKeepGoing={() => {
              if (onAdvanceToNextBattle) {
                onAdvanceToNextBattle()
              } else {
                onClose()
              }
            }}
          />
        ) : null}
      </div>
    </div>,
    portalTarget,
  )
}

/* ============================================================================
   Shared chrome
   ============================================================================ */

function BattleBackground({ phase }: { phase: Phase }) {
  const isDark = phase === 'live'
  const bg = isDark
    ? 'radial-gradient(ellipse at 50% -5%, #3b0764 0%, #1e0a3c 40%, #0f0520 100%)'
    : phase === 'lobby'
      ? 'linear-gradient(180deg,#f8f5ff 0%,#f1ecff 44%,#ffffff 100%)'
      : 'radial-gradient(120% 80% at 50% 15%, #ede9fe 0%, #c4b5fd 40%, #7c3aed 100%)'
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 transition-colors duration-700"
        style={{ background: bg }}
      />
      <BattleConfetti key={phase} phase={phase} />
      <BattleSparkles phase={phase} />
    </>
  )
}

function BattleHeader({
  battleNumber,
  totalWatching,
  onClose,
  isLive,
  isLobby,
}: {
  battleNumber: string
  totalWatching?: number
  onClose: () => void
  tone?: 'light'
  isLive?: boolean
  isLobby?: boolean
}) {
  const textColor = isLive ? 'text-white' : 'text-[#1c1528]'
  const chipBg = isLive ? 'bg-white/15 ring-white/25' : 'bg-white/70 ring-white/40'
  const showWatchers = isLive && typeof totalWatching === 'number' && totalWatching > 0
  if (isLobby) {
    return (
      <button
        type="button"
        onClick={onClose}
        aria-label="Close battle"
        className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-[4] flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#4c1d95] shadow-[0_10px_24px_-16px_rgba(76,29,149,0.75)] ring-1 ring-[#4c1d95]/12 backdrop-blur-sm active:scale-95"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
    )
  }
  return (
    <header className="relative z-[3] flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close battle"
        className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm active:scale-95 ring-1 ${chipBg} ${textColor}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>

      {/* Center pill */}
      <div className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-bold backdrop-blur-sm ring-1 ${chipBg} ${textColor}`}>
        Battle {battleNumber}
      </div>

      {/* Right icons */}
      <div className="flex items-center gap-2">
        {showWatchers ? (
          <span
            className={`flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-bold tabular-nums backdrop-blur-sm ring-1 ${chipBg} ${textColor}`}
            aria-label={`${totalWatching} watching`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.9" />
            </svg>
            {formatCountLabel(totalWatching)}
          </span>
        ) : null}
        <button
          type="button"
          aria-label="Notifications"
          className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm ring-1 active:scale-95 ${chipBg} ${textColor}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Share"
          className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm ring-1 active:scale-95 ${chipBg} ${textColor}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </header>
  )
}

/* ============================================================================
   Lobby stage — pre-battle chat + upcoming listing + countdown
   ============================================================================ */

function LobbyStage({
  battle,
  lobbySec,
  chat,
}: {
  battle: StartingSoonBattle
  lobbySec: number
  chat: LobbyChatMessage[]
}) {
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chat.length])

  const urgent = lobbySec <= 5
  // Long lobbies (user joined well ahead of live) show MM:SS so the label
  // stays legible and matches the hero card countdown format.
  const displayLong = lobbySec > 59
  const displayValue = displayLong ? formatMmSs(lobbySec) : `${lobbySec}`

  return (
    <div className="relative flex min-h-0 flex-1 flex-col px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-[max(3.75rem,env(safe-area-inset-top,0px)+3rem)]">
      {/* Upcoming listing preview card */}
      <div className="relative mb-3 overflow-hidden rounded-3xl bg-white p-3 shadow-[0_18px_40px_-26px_rgba(76,29,149,0.45)] ring-1 ring-[#4c1d95]/12">
        <div className="flex items-center gap-3">
          <div className="relative h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-2xl bg-violet-50 ring-2 ring-[#4c1d95]/12">
            <img
              src={battle.imageUrl}
              alt=""
              draggable={false}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#4c1d95]">
              Up next · Battle {battle.battleNumber}
            </p>
            <p className="mt-0.5 truncate text-[18px] font-black uppercase leading-tight text-zinc-950">
              {battle.title}
            </p>
            {battle.subtitle ? (
              <p className="truncate text-[13px] font-bold text-zinc-600">
                {battle.subtitle}
              </p>
            ) : null}
            <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-zinc-500">
              <span>Est. {formatAudCents(battle.estValueCents)}</span>
              <span aria-hidden>·</span>
              <span>🔥 {formatCountLabel(battle.attendees)} in lobby</span>
            </div>
          </div>
          <div
            className={[
              'flex shrink-0 flex-col items-center justify-center rounded-xl px-3 py-2 transition-colors',
              urgent ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'bg-[#4c1d95] text-white ring-1 ring-[#4c1d95]/20',
            ].join(' ')}
            aria-label={`${lobbySec} seconds until battle`}
          >
            <span className={['text-[9px] font-black uppercase tracking-[0.12em]', urgent ? 'text-red-500/70' : 'text-white/70'].join(' ')}>Starts in</span>
            <span
              key={`lobby-${lobbySec}`}
              className={[
                'fetch-battle-lobby-sec font-black leading-none tabular-nums',
                displayLong ? 'text-[22px]' : 'text-[28px]',
                urgent ? 'text-red-600' : 'text-white',
              ].join(' ')}
            >
              {displayValue}
            </span>
            {displayLong ? null : (
              <span className={['text-[9px] font-bold uppercase tracking-[0.1em]', urgent ? 'text-red-500/55' : 'text-white/55'].join(' ')}>sec</span>
            )}
          </div>
        </div>

        {/* Condition + short description — shown when available to build anticipation */}
        {(battle.condition || battle.description) ? (
          <div className="mt-2.5 border-t border-[#4c1d95]/10 pt-2.5">
            {battle.condition ? (
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-600">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M5 12l5 5L19 7"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {battle.condition}
              </p>
            ) : null}
            {battle.description ? (
              <p className="line-clamp-2 text-[12px] font-medium leading-snug text-zinc-600">
                {battle.description}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Chat header */}
      <div className="mb-1.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#4c1d95]">Live chat</p>
        </div>
        <p className="text-[11px] font-bold text-zinc-500">
          {formatCountLabel(battle.attendees)} in lobby
        </p>
      </div>

      {/* Chat feed */}
      <div className="fetch-battle-lobby-chat relative flex min-h-0 flex-1 flex-col overflow-y-auto rounded-3xl bg-white px-2.5 py-2 shadow-[0_18px_40px_-30px_rgba(76,29,149,0.5)] ring-1 ring-[#4c1d95]/12 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chat.map((msg) => (
          <LobbyChatBubble key={msg.id} msg={msg} />
        ))}
        <div ref={chatEndRef} className="h-0 w-0" aria-hidden />
      </div>

      {/* Chat input (read-only — hype bar) */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-3 py-2.5 shadow-sm ring-1 ring-[#4c1d95]/12">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-[#4c1d95]/50">
            <path
              d="M4 12a8 8 0 0114 5l1 4-4-1a8 8 0 01-11-8z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="truncate text-[13px] font-semibold text-zinc-500">Hype up the lobby…</span>
          <span className="ml-auto text-[16px]" aria-hidden>
            🔥
          </span>
        </div>
      </div>
    </div>
  )
}

function LobbyChatBubble({ msg }: { msg: LobbyChatMessage }) {
  if (msg.system === 'join') {
    return (
      <div className="fetch-battle-lobby-msg mb-1 flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
        <img
          src={msg.author.avatar}
          alt=""
          draggable={false}
          className="h-4 w-4 rounded-full object-cover"
        />
        <span className="truncate">
          <span className="font-black text-emerald-800">{msg.author.name}</span> {msg.text}
        </span>
        <span className="ml-auto shrink-0 text-emerald-600/75">+1</span>
      </div>
    )
  }
  return (
    <div className="fetch-battle-lobby-msg mb-1.5 flex items-start gap-2">
      <img
        src={msg.author.avatar}
        alt=""
        draggable={false}
        className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover ring-2 ring-[#4c1d95]/10"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[12px] font-black text-zinc-900">{msg.author.name}</span>
          {msg.author.tagLabel ? <AuthorTag tag={msg.author.tagLabel} tone={msg.author.tagTone} /> : null}
        </div>
        <p className="text-[13px] font-medium leading-snug text-zinc-700">{msg.text}</p>
      </div>
    </div>
  )
}

function AuthorTag({ tag, tone = 'violet' }: { tag: string; tone?: LobbyChatAuthor['tagTone'] }) {
  const palette: Record<NonNullable<LobbyChatAuthor['tagTone']>, string> = {
    violet: 'bg-violet-100 text-[#4c1d95] ring-violet-200',
    amber: 'bg-amber-100 text-amber-800 ring-amber-200',
    emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    rose: 'bg-rose-100 text-rose-800 ring-rose-200',
  }
  return (
    <span
      className={[
        'rounded px-1 py-[1px] text-[9px] font-bold uppercase tracking-[0.08em] ring-1',
        palette[tone ?? 'violet'],
      ].join(' ')}
    >
      {tag}
    </span>
  )
}

/* ============================================================================
   Countdown stage — "BATTLE BEGINS IN" + ring with 3/2/1
   ============================================================================ */

function CountdownStage({ count, from, imageUrl }: { count: number; from: number; imageUrl: string }) {
  const display = Math.max(1, count)
  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-between px-6 pb-6 pt-2">
      <div className="mt-4 text-center">
        <p className="fetch-battle-title text-[42px] font-black leading-[0.95] tracking-[-0.02em] text-[#1e1b4b] sm:text-[48px]">
          BATTLE
        </p>
        <p className="fetch-battle-title mt-0.5 text-[38px] font-black leading-[0.95] tracking-[-0.02em] text-[#4c1d95] sm:text-[44px]">
          BEGINS IN
        </p>
      </div>

      <MascotFrame key={display} pose={display === 1 ? 'leap' : 'pose'} imageUrl={imageUrl} />

      <div className="flex flex-col items-center gap-4">
        <CountdownRing key={display} value={display} from={from} />
        <div className="text-center">
          <p className="text-[16px] font-bold text-[#1c1528]">
            {display > 1 ? 'Get ready…' : 'Almost there…'}
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-[#1e1b4b]/80">
            {display > 1 ? 'The next item is about to drop!' : 'Line up your best bid!'}
          </p>
        </div>
      </div>
    </div>
  )
}

function CountdownRing({ value, from }: { value: number; from: number }) {
  const size = 128
  const stroke = 7
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(1, Math.max(0, value / from))
  const dash = c * pct

  return (
    <div
      className="fetch-battle-ring relative flex items-center justify-center rounded-full bg-white/85 shadow-[0_18px_38px_-16px_rgba(76,29,149,0.55)] ring-1 ring-white/60 backdrop-blur-sm"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(124,58,237,0.18)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#fetch-ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: 'stroke-dasharray 700ms cubic-bezier(0.33,1,0.68,1)' }}
        />
        <defs>
          <linearGradient id="fetch-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>
        </defs>
      </svg>
      <span
        key={value}
        className="fetch-battle-ring__num relative z-[1] select-none text-[58px] font-black leading-none tracking-[-0.04em] text-[#4c1d95]"
      >
        {value}
      </span>
    </div>
  )
}

/* ============================================================================
   "BATTLE BEGINS NOW!" flash
   ============================================================================ */

function BattleBeginsStage({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-6">
      <MascotFrame pose="fly" size="large" imageUrl={imageUrl} />
      <div className="relative z-[2] -mt-6 text-center">
        <p className="fetch-battle-title text-[44px] font-black leading-[0.95] tracking-[-0.02em] text-[#1e1b4b] sm:text-[52px]">
          BATTLE
        </p>
        <p className="fetch-battle-title mt-1 text-[46px] font-black leading-[0.95] tracking-[-0.02em] text-[#4c1d95] sm:text-[54px]">
          BEGINS
        </p>
        <p className="fetch-battle-now fetch-battle-title mt-1 text-[56px] font-black leading-[0.95] tracking-[-0.02em] text-[#f97316] sm:text-[64px]">
          NOW!
        </p>
      </div>
    </div>
  )
}

/* ============================================================================
   Live bidding stage — redesigned
   ============================================================================ */

function LiveStage({
  battle,
  live,
  timeLeftSec,
  justBid,
  bidCustomCents,
  setBidCustomCents,
  bidLog,
  bonusPulse,
  onBid,
}: {
  battle: StartingSoonBattle
  live: LiveBidState
  timeLeftSec: number
  justBid: boolean
  bidCustomCents: number
  setBidCustomCents: (v: number) => void
  bidLog: BidEntry[]
  bonusPulse: number
  onBid: () => void
}) {
  const itemEnded = timeLeftSec <= 0
  const viewerIsTop = live.topBidderId === VIEWER_ID
  const topBidder = live.bidders.find((b) => b.id === live.topBidderId)
  const recentBids = bidLog.slice(0, 3)

  const stepDown = () =>
    setBidCustomCents(Math.max(live.currentBidCents + live.bidIncrementCents, bidCustomCents - live.bidIncrementCents))
  const stepUp = () => setBidCustomCents(bidCustomCents + live.bidIncrementCents)

  /* Real gallery thumbnails — uses battle.photos when available, else falls back to the single hero */
  const photos = useMemo(
    () =>
      battle.photos && battle.photos.length > 0
        ? battle.photos
        : [battle.imageUrl],
    [battle.photos, battle.imageUrl],
  )
  const [activePhotoIdx, setActivePhotoIdx] = useState(0)
  const heroPhoto = photos[Math.min(activePhotoIdx, photos.length - 1)] ?? battle.imageUrl

  return (
    <div className="relative z-[2] flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* ── HERO ─────────────────────────────────────────── */}
      <div className="relative z-20 shrink-0 overflow-visible" style={{ height: '52%' }}>
        {/* Subtle inner glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 70% 50%, rgba(109,40,217,0.15) 0%, transparent 70%)',
          }}
        />

        {/* Product image — full width, swaps when a thumbnail is tapped */}
        <img
          key={heroPhoto}
          src={heroPhoto}
          alt={battle.title}
          draggable={false}
          className="fetch-battle-hero-img absolute inset-x-0 top-0 h-[75%] w-full object-cover object-center"
        />

        {/* Bottom scrim so the title stays readable over any image */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%]"
          style={{
            background:
              'linear-gradient(to top, rgba(15,5,32,0.95) 0%, rgba(15,5,32,0.65) 45%, rgba(15,5,32,0) 100%)',
          }}
        />

        {/* Top row: LIVE pill + watcher counts */}
        <div className="absolute left-4 right-4 top-2 flex items-center justify-between">
          <span className="fetch-battle-live-pill flex items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1 text-[12px] font-extrabold uppercase tracking-wide text-white shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            LIVE
          </span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-bold text-white backdrop-blur-sm ring-1 ring-white/20">
              🔥 {formatCountLabel(Math.floor(live.bidders.length * 83))} bidding
            </span>
          </div>
        </div>

        {/* Title — small thumb strip straddles the sheet; keep clear of the seam */}
        <div className="absolute bottom-10 left-4 max-w-[60%]">
          <p
            className="text-[26px] font-black uppercase leading-[1.0] text-white"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
          >
            {battle.title}
          </p>
          {battle.subtitle ? (
            <p
              className="text-[18px] font-bold uppercase leading-tight text-white/85"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}
            >
              {battle.subtitle}
            </p>
          ) : null}
        </div>

        {/*
         * Compact gallery — centered on the hero / white-sheet seam so half
         * sits on the dark hero and half on the sheet (broadcast-style “filmstrip”).
         */}
        <div className="pointer-events-none absolute left-0 right-0 top-full z-30 flex justify-center -translate-y-1/2">
          <div className="pointer-events-auto flex max-w-full gap-1 px-2">
            {photos.map((src, i) => {
              const active = i === activePhotoIdx
              return (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setActivePhotoIdx(i)}
                  aria-label={`Show photo ${i + 1} of ${photos.length}`}
                  aria-pressed={active}
                  className={[
                    'h-6 w-6 shrink-0 overflow-hidden rounded-md transition-[opacity,transform,box-shadow] sm:h-7 sm:w-7',
                    'active:scale-95',
                    active
                      ? 'ring-2 ring-white shadow-[0_2px_8px_rgba(0,0,0,0.45)]'
                      : 'opacity-55 ring-1 ring-white/35 hover:opacity-80',
                  ].join(' ')}
                >
                  <img src={src} alt="" draggable={false} className="h-full w-full object-cover" />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── WHITE BOTTOM SHEET (z-10 so seam-straddling thumbs from hero paint above) ─ */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col rounded-t-3xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-7 shadow-[0_-20px_40px_-10px_rgba(76,29,149,0.3)]">
        {/* Current bid row */}
        <div className="mb-3 flex items-end gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#6d28d9" aria-hidden>
                <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
              </svg>
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                Current bid
              </span>
            </div>
            <p className="text-[38px] font-black leading-none tabular-nums text-[#4c1d95]">
              {formatAudCents(live.currentBidCents)}
            </p>
          </div>
          {topBidder && (
            <p className="mb-1.5 text-[12px] font-semibold text-zinc-400">
              by{' '}
              <span className="font-bold text-[#1c1528]">
                {topBidder.id === VIEWER_ID ? 'You' : topBidder.name}
              </span>
              {viewerIsTop ? ' 🔥🔥' : ''}
            </p>
          )}
          {/* Countdown */}
          <div className="relative ml-auto shrink-0 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">Ends in</p>
            <p
              className={[
                'fetch-battle-timer text-[22px] font-black tabular-nums leading-none',
                timeLeftSec <= 10 ? 'text-red-500' : 'text-[#1c1528]',
              ].join(' ')}
              key={`timer-${bonusPulse}`}
            >
              {formatMmSs(timeLeftSec)}
            </p>
            {bonusPulse > 0 ? (
              <span
                key={`bonus-${bonusPulse}`}
                className="fetch-battle-bonus pointer-events-none absolute -top-1 right-0 text-[14px] font-black text-emerald-500"
                aria-hidden
              >
                +{TIME_BONUS_SEC}s
              </span>
            ) : null}
          </div>
        </div>

        {/* Bid log */}
        <div className="mb-3 flex flex-col gap-1.5">
          {recentBids.map((entry) => {
            const isTop = entry.id === live.topBidderId
            const diffSec = Math.floor((Date.now() - entry.at) / 1000)
            const timeLabel = diffSec < 3 ? 'Just now' : `${diffSec}s ago`
            return (
              <div
                key={`${entry.id}-${entry.at}`}
                className={[
                  'flex items-center gap-2.5 rounded-xl px-3 py-2',
                  isTop ? 'bg-violet-50 ring-1 ring-violet-200' : 'bg-zinc-50',
                ].join(' ')}
              >
                <img
                  src={entry.avatar}
                  alt=""
                  draggable={false}
                  className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white"
                />
                <span className="flex-1 truncate text-[13px] font-bold text-[#1c1528]">
                  {entry.name}
                  {isTop ? ' 🔥🔥' : ''}
                </span>
                <span
                  className={[
                    'text-[13px] font-bold tabular-nums',
                    isTop ? 'text-[#4c1d95]' : 'text-zinc-600',
                  ].join(' ')}
                >
                  {formatAudCents(entry.amountCents)}
                </span>
                <span className="w-14 text-right text-[11px] text-zinc-400">{timeLabel}</span>
              </div>
            )
          })}
        </div>

        <div className="mb-3 border-t border-zinc-100" />

        {/* Bid stepper */}
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={stepDown}
            disabled={itemEnded}
            aria-label="Decrease bid"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-[22px] font-bold text-[#1c1528] active:scale-95 disabled:opacity-40"
          >
            −
          </button>
          <div className="flex flex-1 items-center justify-center rounded-2xl bg-zinc-50 py-2.5 ring-1 ring-zinc-200">
            <span className="text-[22px] font-black tabular-nums text-[#1c1528]">
              {formatAudCents(bidCustomCents)}
            </span>
          </div>
          <button
            type="button"
            onClick={stepUp}
            disabled={itemEnded}
            aria-label="Increase bid"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-[22px] font-bold text-[#1c1528] active:scale-95 disabled:opacity-40"
          >
            +
          </button>
        </div>

        {/* BID button */}
        <button
          type="button"
          onClick={onBid}
          disabled={itemEnded}
          aria-label={`Bid ${formatAudCents(bidCustomCents)}`}
          className={[
            'fetch-battle-bid-btn relative flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[16px] font-extrabold uppercase tracking-[0.08em] text-white transition-transform active:scale-[0.98] disabled:opacity-50',
            itemEnded
              ? 'bg-zinc-400'
              : 'bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] shadow-[0_18px_40px_-16px_rgba(76,29,149,0.7)]',
            justBid ? 'fetch-battle-bid-btn--flash' : '',
          ].join(' ')}
        >
          {itemEnded ? (
            'Sold'
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M13 2L4.09 12.26a1 1 0 00.78 1.63L11 14l-2 8 9-10.26A1 1 0 0017.13 10.1L11 10l2-8z" />
              </svg>
              BID {formatAudCents(bidCustomCents)}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/* ============================================================================
   Mascot frame — uses the Fetch boomerang logo inside a celebratory orb since
   we don't yet ship the penguin art. Swap the <img> src once the asset lands.
   ============================================================================ */

function MascotFrame({
  pose,
  size = 'medium',
  imageUrl,
}: {
  pose: 'pose' | 'leap' | 'fly'
  size?: 'medium' | 'large'
  imageUrl?: string
}) {
  const dim = size === 'large' ? 200 : 156
  return (
    <div
      className={[
        'fetch-battle-mascot relative flex items-center justify-center',
        pose === 'leap' ? 'fetch-battle-mascot--leap' : '',
        pose === 'fly' ? 'fetch-battle-mascot--fly' : '',
      ].join(' ')}
      style={{ width: dim, height: dim }}
      aria-hidden
    >
      <span className="fetch-battle-mascot__halo pointer-events-none absolute inset-[-10%] rounded-full border-2 border-dashed border-[#4c1d95]/30" />
      {imageUrl ? (
        <div className="relative z-[1] h-[88%] w-[88%] overflow-hidden rounded-2xl shadow-[0_20px_50px_-18px_rgba(76,29,149,0.6)] ring-4 ring-white">
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
      ) : (
        <>
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/90 via-violet-100/80 to-violet-200/70 shadow-[0_20px_50px_-18px_rgba(76,29,149,0.55),inset_0_6px_18px_rgba(76,29,149,0.08)]" />
          <img
            src={boomerangUrl}
            alt=""
            className="relative z-[1] h-[70%] w-[70%] object-contain drop-shadow-[0_10px_16px_rgba(76,29,149,0.35)]"
            draggable={false}
          />
        </>
      )}
    </div>
  )
}

/* ============================================================================
   You Won stage
   ============================================================================ */

function WonStage({
  battle,
  winningBidCents,
  nextBattle,
  onViewOrder,
  onKeepGoing,
}: {
  battle: StartingSoonBattle
  winningBidCents: number
  nextBattle?: StartingSoonBattle
  onViewOrder: () => void
  onKeepGoing: () => void
}) {
  const steps: { icon: 'payment' | 'shipping' | 'track'; label: string; sub: string; done: boolean }[] = [
    { icon: 'payment', label: 'Payment', sub: 'Complete your payment', done: true },
    { icon: 'shipping', label: 'Shipping', sub: "We'll ship it to you", done: false },
    { icon: 'track', label: 'Track', sub: 'Track your order', done: false },
  ]

  const KEEP_GOING_AUTO_SEC = 5
  const [autoSec, setAutoSec] = useState(nextBattle ? KEEP_GOING_AUTO_SEC : 0)
  useEffect(() => {
    if (!nextBattle) return
    if (autoSec <= 0) {
      onKeepGoing()
      return
    }
    const id = window.setTimeout(() => setAutoSec((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [nextBattle, autoSec, onKeepGoing])
  const ringPct = nextBattle ? (KEEP_GOING_AUTO_SEC - autoSec) / KEEP_GOING_AUTO_SEC : 0
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-[max(3.5rem,env(safe-area-inset-top,56px))]">
      {/* Hero text */}
      <div className="mb-5 text-center">
        <p
          className="fetch-battle-title text-[56px] font-black leading-[0.9] tracking-[-0.02em] text-white"
          style={{ textShadow: '0 4px 20px rgba(0,0,0,0.35)' }}
        >
          YOU WON!
        </p>
        <p className="mt-2 text-[17px] font-semibold text-white/90">Congratulations 🎉</p>
      </div>

      {/* Product card */}
      <div className="mb-4 overflow-hidden rounded-3xl bg-white shadow-[0_32px_64px_-24px_rgba(76,29,149,0.55)]">
        <div className="px-5 pb-0.5 pt-5">
          <p className="text-[18px] font-black uppercase leading-tight text-[#1c1528]">
            {battle.title}
            {battle.subtitle ? <span className="block text-[15px] font-bold text-zinc-400">{battle.subtitle}</span> : null}
          </p>
        </div>
        <div className="relative mx-4 mb-0 mt-3 h-52 overflow-hidden rounded-2xl bg-zinc-50">
          <img
            src={battle.imageUrl}
            alt={battle.title}
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
        <div className="px-5 pb-5 pt-3 text-center">
          <p className="text-[13px] font-semibold text-zinc-400">Winning bid</p>
          <p className="mt-0.5 text-[44px] font-black leading-none text-[#4c1d95]">
            {formatAudCents(winningBidCents)}
          </p>
        </div>
      </div>

      {/* What's next */}
      <div className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100">
        <p className="px-4 pb-1.5 pt-4 text-[14px] font-bold text-[#1c1528]">What's next?</p>
        {steps.map((s, i) => (
          <div
            key={s.label}
            className={['flex items-center gap-3 px-4 py-3.5', i > 0 ? 'border-t border-zinc-100' : ''].join(' ')}
          >
            <WonStepIcon type={s.icon} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-[#1c1528]">{s.label}</p>
              <p className="text-[11px] text-zinc-400">{s.sub}</p>
            </div>
            <WonCheckIcon filled={s.done} />
          </div>
        ))}
      </div>

      {/* CTAs */}
      <button
        type="button"
        onClick={onViewOrder}
        className="mb-3 w-full rounded-2xl bg-gradient-to-b from-[#5b21b6] to-[#4c1d95] py-4 text-[15px] font-extrabold uppercase tracking-[0.1em] text-white shadow-[0_18px_40px_-16px_rgba(76,29,149,0.7)] active:scale-[0.98]"
      >
        View Order
      </button>
      <button
        type="button"
        onClick={onKeepGoing}
        className="flex w-full items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 text-left text-white ring-2 ring-white/35 backdrop-blur-sm active:scale-[0.98]"
      >
        {nextBattle ? (
          <>
            <img
              src={nextBattle.imageUrl}
              alt=""
              draggable={false}
              className="h-11 w-11 shrink-0 rounded-xl object-cover ring-2 ring-white/40"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/70">
                Lobby in {autoSec}s · Next battle
              </p>
              <p className="truncate text-[13px] font-extrabold">
                {nextBattle.title}
                {nextBattle.subtitle ? (
                  <span className="font-semibold text-white/70"> · {nextBattle.subtitle}</span>
                ) : null}
              </p>
            </div>
            <KeepGoingCountdownRing seconds={autoSec} progressPct={ringPct} />
          </>
        ) : (
          <span className="flex-1 text-center text-[15px] font-extrabold uppercase tracking-[0.1em]">
            Keep Going
          </span>
        )}
      </button>
    </div>
  )
}

function KeepGoingCountdownRing({ seconds, progressPct }: { seconds: number; progressPct: number }) {
  const size = 36
  const stroke = 3
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = c * Math.min(1, Math.max(0, progressPct))
  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={`Next battle in ${seconds} seconds`}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="white"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: 'stroke-dasharray 900ms linear' }}
        />
      </svg>
      <span
        key={seconds}
        className="fetch-battle-lobby-sec relative z-[1] text-[13px] font-black leading-none tabular-nums"
      >
        {seconds}
      </span>
    </div>
  )
}

function WonStepIcon({ type }: { type: 'payment' | 'shipping' | 'track' }) {
  if (type === 'payment') {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="2" y="5" width="20" height="14" rx="2" stroke="#6d28d9" strokeWidth="1.9" />
          <path d="M2 10h20" stroke="#6d28d9" strokeWidth="1.9" strokeLinecap="round" />
          <rect x="5" y="14" width="4" height="2" rx="1" fill="#6d28d9" />
        </svg>
      </span>
    )
  }
  if (type === 'shipping') {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M1 3h13v13H1z" stroke="#ea580c" strokeWidth="1.9" strokeLinejoin="round" />
          <path d="M14 8h4l3 4v4h-7V8z" stroke="#ea580c" strokeWidth="1.9" strokeLinejoin="round" />
          <circle cx="5.5" cy="18.5" r="1.5" stroke="#ea580c" strokeWidth="1.5" />
          <circle cx="18.5" cy="18.5" r="1.5" stroke="#ea580c" strokeWidth="1.5" />
        </svg>
      </span>
    )
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="11" cy="11" r="7" stroke="#2563eb" strokeWidth="1.9" />
        <path d="M16.5 16.5L21 21" stroke="#2563eb" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function WonCheckIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4c1d95]">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 12l5 5L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  ) : (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-zinc-300">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 12l5 5L19 7" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

/* ============================================================================
   Decorative effects
   ============================================================================ */

function BattleConfetti({ phase }: { phase: Phase }): ReactNode {
  const count = phase === 'go' ? 50 : phase === 'done' ? 60 : phase === 'live' ? 18 : 28
  const palette =
    phase === 'live'
      ? ['#f59e0b', '#fbbf24', '#fde047', '#fb923c', '#ec4899', '#ef4444']
      : phase === 'done'
        ? ['#a78bfa', '#c4b5fd', '#fbbf24', '#f472b6', '#60a5fa', '#4ade80', '#fb923c', '#f87171']
        : ['#a78bfa', '#c4b5fd', '#fbbf24', '#f472b6', '#60a5fa', '#4ade80']

  const pieces = useMemo(() => {
    const arr: {
      left: string
      delay: string
      dur: string
      color: string
      w: number
      h: number
      dx: string
      rot: string
      shape: 'square' | 'rect' | 'dot'
    }[] = []
    for (let i = 0; i < count; i += 1) {
      const shape: 'square' | 'rect' | 'dot' =
        Math.random() < 0.3 ? 'dot' : Math.random() < 0.55 ? 'square' : 'rect'
      const w = shape === 'dot' ? 6 : shape === 'rect' ? 6 : 9
      const h = shape === 'dot' ? 6 : shape === 'rect' ? 16 : 9
      arr.push({
        left: `${Math.random() * 100}%`,
        delay: `${(Math.random() * 0.5).toFixed(2)}s`,
        dur: `${(1.8 + Math.random() * 1.8).toFixed(2)}s`,
        color: palette[Math.floor(Math.random() * palette.length)],
        w,
        h,
        dx: `${(Math.random() * 180 - 90).toFixed(1)}px`,
        rot: `${Math.floor(Math.random() * 360)}deg`,
        shape,
      })
    }
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, phase])

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="fetch-battle-confetti absolute top-0"
          style={{
            left: p.left,
            width: p.w,
            height: p.h,
            backgroundColor: p.color,
            borderRadius: p.shape === 'dot' ? '50%' : '2px',
            animationDelay: p.delay,
            animationDuration: p.dur,
            ['--dx' as string]: p.dx,
            ['--rot' as string]: p.rot,
          }}
        />
      ))}
    </div>
  )
}

function BattleSparkles({ phase }: { phase: Phase }) {
  if (phase !== 'live' && phase !== 'go' && phase !== 'done') return null
  const stars = [
    { top: '12%', left: '8%', size: 18, delay: '0s' },
    { top: '28%', left: '86%', size: 14, delay: '0.35s' },
    { top: '52%', left: '6%', size: 12, delay: '0.65s' },
    { top: '62%', left: '90%', size: 18, delay: '0.2s' },
    { top: '8%', left: '70%', size: 10, delay: '0.5s' },
  ]
  return (
    <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
      {stars.map((s, i) => (
        <span
          key={i}
          className="fetch-battle-star absolute"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay }}
        >
          <svg viewBox="0 0 24 24" className="h-full w-full">
            <path
              d="M12 2l2.5 7h7l-5.8 4.2L18 21l-6-4.6L6 21l2.3-7.8L2.5 9h7z"
              fill={phase === 'live' ? '#f59e0b' : '#a78bfa'}
            />
          </svg>
        </span>
      ))}
    </div>
  )
}

export const FetchBidWarsBattleOverlay = memo(FetchBidWarsBattleOverlayInner)
