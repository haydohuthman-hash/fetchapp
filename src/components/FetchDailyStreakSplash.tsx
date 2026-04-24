import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import boomerangUrl from '../assets/fetchit-boomerang-logo.png'
import {
  STREAK_LADDER_STOPS,
  claimStreakMilestone,
  streakEncouragement,
  tickDailyStreak,
  type StreakRecord,
} from '../lib/fetchDailyStreak'

/* -------------------------- Phase machine -------------------------------------- */

type Phase =
  | 'welcome'
  | 'reveal'
  | 'milestone'
  | 'reward'
  | 'claimed'
  | 'farewell'
  | 'done'

const PHASE_DURATION_MS: Partial<Record<Phase, number>> = {
  welcome: 900,
  reveal: 2000,
  milestone: 1100,
  claimed: 1800,
  farewell: 1600,
}

type Props = {
  /** Called once the splash dismisses (no-op if nothing to show today). */
  onDone?: () => void
  /** Show even if already opened today (debug / settings entry point). */
  force?: boolean
}

/* -------------------------- Root component ------------------------------------- */

function FetchDailyStreakSplashInner({ onDone, force = false }: Props) {
  const tickRef = useRef<ReturnType<typeof tickDailyStreak> | null>(null)
  if (tickRef.current == null) tickRef.current = tickDailyStreak()

  const initial = tickRef.current
  const shouldShow = force || initial.advancedToday

  const [record, setRecord] = useState<StreakRecord>(initial.record)
  const [phase, setPhase] = useState<Phase>(shouldShow ? 'welcome' : 'done')
  const [claiming, setClaiming] = useState(false)
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone }, [onDone])

  const pendingMilestone = initial.pendingMilestone

  // Auto-advance timed phases.
  useEffect(() => {
    if (phase === 'done' || phase === 'reward') return
    const ms = PHASE_DURATION_MS[phase]
    if (ms == null) return
    const id = window.setTimeout(() => {
      setPhase((prev) => nextPhase(prev, pendingMilestone != null))
    }, ms)
    return () => window.clearTimeout(id)
  }, [phase, pendingMilestone])

  useEffect(() => {
    if (phase === 'done') onDoneRef.current?.()
  }, [phase])

  const handleClaim = () => {
    if (!pendingMilestone || claiming) return
    setClaiming(true)
    const next = claimStreakMilestone(pendingMilestone.day)
    setRecord(next)
    window.setTimeout(() => setPhase('claimed'), 420)
  }

  const handleSkip = () => setPhase('done')

  if (!shouldShow || phase === 'done') return null

  const count = record.count
  const message = streakEncouragement(count)

  const portalTarget =
    typeof document !== 'undefined' ? document.body : null
  if (!portalTarget) return null

  return createPortal(
    <div
      className="fetch-streak-splash fixed inset-0 z-[9998] flex items-center justify-center"
      role="dialog"
      aria-modal
      aria-label="Daily streak"
    >
      {/* Backdrop */}
      <div
        className="fetch-streak-splash__backdrop absolute inset-0"
        aria-hidden
        onClick={handleSkip}
      />

      {/* Confetti burst (only for celebration phases) */}
      {phase !== 'welcome' ? <StreakConfetti key={phase} intensity={phase === 'milestone' || phase === 'claimed' ? 'high' : 'medium'} /> : null}

      {/* Skip button */}
      <button
        type="button"
        onClick={handleSkip}
        aria-label="Dismiss"
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-[3] flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#4c1d95] ring-1 ring-white/60 backdrop-blur-sm active:scale-95"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Stage */}
      <div className="relative z-[2] flex w-full max-w-[22rem] flex-col items-center px-5">
        {phase === 'welcome' ? <WelcomeCard /> : null}
        {phase === 'reveal' ? <StreakRevealCard count={count} message={message} /> : null}
        {phase === 'milestone' && pendingMilestone ? (
          <MilestoneCard label={pendingMilestone.label} count={count} />
        ) : null}
        {phase === 'reward' && pendingMilestone ? (
          <RewardCard
            coins={pendingMilestone.coins}
            claiming={claiming}
            onClaim={handleClaim}
          />
        ) : null}
        {phase === 'claimed' && pendingMilestone ? (
          <ClaimedCard coins={pendingMilestone.coins} balance={record.coinsBalance} />
        ) : null}
        {phase === 'farewell' ? <FarewellCard /> : null}

        {/* Footer progress ladder */}
        <StreakLadder current={count} highlight={phase !== 'welcome'} />
      </div>
    </div>,
    portalTarget,
  )
}

function nextPhase(cur: Phase, hasMilestone: boolean): Phase {
  switch (cur) {
    case 'welcome':
      return 'reveal'
    case 'reveal':
      return hasMilestone ? 'milestone' : 'farewell'
    case 'milestone':
      return 'reward'
    case 'reward':
      return 'claimed'
    case 'claimed':
      return 'farewell'
    case 'farewell':
      return 'done'
    default:
      return 'done'
  }
}

/* -------------------------- Cards --------------------------------------------- */

function WelcomeCard() {
  return (
    <article className="fetch-streak-card fetch-streak-card--light fetch-streak-anim-pop relative w-full rounded-[28px] bg-white px-6 py-7 text-center shadow-[0_30px_60px_-30px_rgba(76,29,149,0.5)] ring-1 ring-violet-100">
      <div className="mb-4 flex items-center justify-center gap-2">
        <img
          src={boomerangUrl}
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 object-contain"
          draggable={false}
        />
        <span className="flex flex-col items-start leading-none">
          <span className="text-[17px] font-extrabold tracking-[-0.04em] text-[#1c1528]">fetchit</span>
          <span className="text-[11px] font-bold tracking-[0.18em] text-[#4c1d95]">BID WARS</span>
        </span>
      </div>

      <MascotOrb />

      <p className="mt-5 text-[22px] font-bold tracking-[-0.02em] text-[#1c1528]">Hey!</p>
      <p className="text-[14px] text-zinc-500">
        Welcome back <span aria-hidden>👋</span>
      </p>
    </article>
  )
}

function StreakRevealCard({ count, message }: { count: number; message: string }) {
  return (
    <article className="fetch-streak-card fetch-streak-card--light fetch-streak-anim-pop relative w-full rounded-[28px] bg-white px-6 pb-8 pt-6 text-center shadow-[0_30px_60px_-30px_rgba(76,29,149,0.5)] ring-1 ring-violet-100">
      <p className="text-[14px] font-semibold text-[#1c1528]">Your Daily Streak</p>
      <div className="mx-auto mt-4 flex items-center justify-center">
        <FlameBadge count={count} />
      </div>
      <p className="mt-4 text-[22px] font-extrabold leading-none tracking-[-0.02em] text-[#f97316]">
        {count === 1 ? 'day!' : 'days!'}
      </p>
      <p className="mt-2 text-[14px] font-medium text-zinc-600">{message}</p>
      <div className="mt-4 flex items-center justify-center">
        <MascotOrb compact />
      </div>
    </article>
  )
}

function MilestoneCard({ label, count }: { label: string; count: number }) {
  return (
    <article className="fetch-streak-card fetch-streak-anim-pop relative w-full overflow-hidden rounded-[28px] bg-gradient-to-b from-[#5b21b6] via-[#4c1d95] to-[#3b0764] px-6 py-9 text-center shadow-[0_30px_60px_-24px_rgba(76,29,149,0.8)] ring-1 ring-white/10">
      <span className="fetch-streak-rays pointer-events-none absolute inset-0" aria-hidden />
      <p className="relative z-[1] text-[13px] font-bold uppercase tracking-[0.2em] text-white/75">
        {label}
      </p>
      <p className="relative z-[1] mt-2 text-[42px] font-black leading-none tracking-[-0.03em] text-white">
        {count}
      </p>
      <p className="relative z-[1] mt-1 text-[15px] font-semibold text-white/85">day streak</p>
    </article>
  )
}

function RewardCard({
  coins,
  claiming,
  onClaim,
}: {
  coins: number
  claiming: boolean
  onClaim: () => void
}) {
  return (
    <article className="fetch-streak-card fetch-streak-anim-pop relative w-full overflow-hidden rounded-[28px] bg-gradient-to-b from-[#6d28d9] via-[#4c1d95] to-[#2e1065] px-6 pb-7 pt-8 text-center shadow-[0_30px_60px_-24px_rgba(76,29,149,0.8)] ring-1 ring-white/10">
      <span className="fetch-streak-rays pointer-events-none absolute inset-0" aria-hidden />
      <p className="relative z-[1] text-[22px] font-extrabold tracking-[-0.02em] text-white">
        Streak Reward
      </p>
      <div className="relative z-[1] mx-auto my-6 flex h-[10rem] w-[10rem] items-end justify-center">
        <TreasureChestArt />
      </div>
      <p className="relative z-[1] text-[13px] font-semibold uppercase tracking-[0.14em] text-white/75">
        You earned
      </p>
      <p className="relative z-[1] mt-1 flex items-center justify-center gap-1.5 text-[24px] font-extrabold tabular-nums text-white">
        <CoinIcon className="h-6 w-6" />
        {coins}
      </p>
      <button
        type="button"
        onClick={onClaim}
        disabled={claiming}
        className={[
          'fetch-streak-claim-btn relative z-[1] mx-auto mt-5 block w-full max-w-[15rem] rounded-full bg-white py-3.5 text-[15px] font-extrabold uppercase tracking-[0.16em] text-[#4c1d95] transition-transform active:scale-[0.98] disabled:opacity-70',
          claiming ? '' : 'fetch-streak-anim-claim-pulse',
        ].join(' ')}
      >
        {claiming ? 'Claiming…' : 'Claim'}
      </button>
    </article>
  )
}

function ClaimedCard({ coins, balance }: { coins: number; balance: number }) {
  return (
    <article className="fetch-streak-card fetch-streak-anim-pop relative w-full overflow-hidden rounded-[28px] bg-gradient-to-b from-[#6d28d9] via-[#4c1d95] to-[#2e1065] px-6 py-8 text-center shadow-[0_30px_60px_-24px_rgba(76,29,149,0.8)] ring-1 ring-white/10">
      <span className="fetch-streak-rays pointer-events-none absolute inset-0" aria-hidden />
      <CoinGeyser count={14} />
      <p className="relative z-[2] text-[22px] font-extrabold text-white">Nice!</p>
      <p className="relative z-[2] mt-2 flex items-center justify-center gap-1.5 text-[17px] font-bold text-[#fde68a]">
        <CoinIcon className="h-5 w-5" />
        {coins} coins added
      </p>
      <p className="relative z-[2] text-[14px] font-medium text-white/80">to your balance</p>
      <div className="relative z-[2] mx-auto mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white ring-1 ring-white/20">
        <CoinIcon className="h-4 w-4" /> Balance: {balance.toLocaleString('en-AU')}
      </div>
    </article>
  )
}

function FarewellCard() {
  return (
    <article className="fetch-streak-card fetch-streak-card--light fetch-streak-anim-pop relative w-full rounded-[28px] bg-white px-6 py-8 text-center shadow-[0_30px_60px_-30px_rgba(76,29,149,0.5)] ring-1 ring-violet-100">
      <p className="text-[18px] font-bold tracking-[-0.02em] text-[#1c1528]">
        Keep your streak alive <span aria-hidden>🔥</span>
      </p>
      <p className="mt-3 text-[16px] font-extrabold tracking-[-0.02em] text-[#4c1d95]">
        See you tomorrow!
      </p>
      <div className="mt-4 flex items-center justify-center">
        <MascotOrb compact />
      </div>
    </article>
  )
}

/* -------------------------- Pieces -------------------------------------------- */

function FlameBadge({ count }: { count: number }) {
  return (
    <div className="fetch-streak-flame relative flex h-[9.5rem] w-[9.5rem] items-center justify-center">
      <svg viewBox="0 0 140 160" className="fetch-streak-flame__svg absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="fetch-flame-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="35%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <path
          d="M70 6c6 18 22 28 22 48 0 10-6 16-14 18 4-10 0-20-10-24 6 14-10 18-10 34 0 8 4 14 10 18-18-2-32-18-32-40 0-22 18-30 22-44 2 12 14 16 16 24 2-10-6-22-4-34z"
          fill="url(#fetch-flame-grad)"
        />
      </svg>
      <span className="fetch-streak-flame__number relative z-[1] select-none text-[72px] font-black leading-none tracking-[-0.04em] text-white [text-shadow:0_3px_14px_rgba(220,60,0,0.55)]">
        {count}
      </span>
    </div>
  )
}

function MascotOrb({ compact = false }: { compact?: boolean }) {
  const size = compact ? 88 : 132
  return (
    <div
      className="fetch-streak-mascot-orb relative mx-auto"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-100 via-white to-violet-50 shadow-[inset_0_6px_18px_rgba(76,29,149,0.12)]"
      />
      <img
        src={boomerangUrl}
        alt=""
        className="absolute inset-0 m-auto h-[70%] w-[70%] object-contain"
        draggable={false}
      />
      <span className="fetch-streak-mascot-orb__ring pointer-events-none absolute inset-[-6%] rounded-full border-2 border-dashed border-[#4c1d95]/25" />
    </div>
  )
}

function TreasureChestArt() {
  return (
    <div className="fetch-streak-chest relative h-full w-full">
      <svg viewBox="0 0 160 140" className="fetch-streak-chest__svg h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="fetch-chest-lid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="100%" stopColor="#9ca3af" />
          </linearGradient>
          <linearGradient id="fetch-chest-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d1d5db" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>
          <linearGradient id="fetch-chest-coin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        <ellipse cx="80" cy="128" rx="58" ry="8" fill="rgba(0,0,0,0.35)" />

        {/* Chest body */}
        <rect x="22" y="70" width="116" height="48" rx="10" fill="url(#fetch-chest-body)" />
        <rect x="22" y="70" width="116" height="48" rx="10" fill="none" stroke="#4b5563" strokeWidth="2" />
        {/* Chest lid */}
        <path
          d="M22 78 Q80 30 138 78 L138 86 L22 86 Z"
          fill="url(#fetch-chest-lid)"
          stroke="#4b5563"
          strokeWidth="2"
        />
        {/* Fetch F logo on front */}
        <rect x="70" y="86" width="20" height="24" rx="3" fill="#4c1d95" />
        <path d="M75 90 L84 90 L75 99 L82 99 L77 106" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Coins overflowing */}
        {[
          { cx: 42, cy: 74, r: 9 },
          { cx: 60, cy: 64, r: 10 },
          { cx: 80, cy: 58, r: 11 },
          { cx: 102, cy: 64, r: 10 },
          { cx: 118, cy: 74, r: 9 },
          { cx: 52, cy: 78, r: 7 },
          { cx: 108, cy: 78, r: 7 },
        ].map((c, i) => (
          <g key={i}>
            <circle cx={c.cx} cy={c.cy} r={c.r} fill="url(#fetch-chest-coin)" stroke="#b45309" strokeWidth="1.2" />
            <text
              x={c.cx}
              y={c.cy + 3.5}
              textAnchor="middle"
              fontSize={c.r + 2}
              fontWeight="800"
              fill="#b45309"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              F
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function CoinIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="fetch-coin-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#fetch-coin-grad)" stroke="#b45309" strokeWidth="1.2" />
      <path
        d="M9 8h6l-6 6h4l-3 4"
        stroke="#b45309"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

function CoinGeyser({ count = 12 }: { count?: number }) {
  const coins = useMemo(() => {
    const arr: { left: string; delay: string; dur: string; size: number; dx: string }[] = []
    for (let i = 0; i < count; i += 1) {
      const left = 30 + Math.random() * 40
      const delay = Math.random() * 0.45
      const dur = 1.3 + Math.random() * 0.8
      const size = 18 + Math.floor(Math.random() * 16)
      const dx = `${(Math.random() * 80 - 40).toFixed(1)}px`
      arr.push({ left: `${left.toFixed(2)}%`, delay: `${delay}s`, dur: `${dur}s`, size, dx })
    }
    return arr
  }, [count])

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
      {coins.map((c, i) => (
        <span
          key={i}
          className="fetch-streak-coin-rise absolute bottom-6"
          style={{
            left: c.left,
            width: c.size,
            height: c.size,
            animationDelay: c.delay,
            animationDuration: c.dur,
            ['--dx' as string]: c.dx,
          }}
        >
          <CoinIcon className="h-full w-full drop-shadow-[0_6px_12px_rgba(245,158,11,0.45)]" />
        </span>
      ))}
    </div>
  )
}

function StreakConfetti({ intensity = 'medium' }: { intensity?: 'low' | 'medium' | 'high' }) {
  const count = intensity === 'high' ? 48 : intensity === 'low' ? 18 : 30
  const palette = ['#7c3aed', '#c084fc', '#fbbf24', '#f97316', '#22c55e', '#ec4899', '#38bdf8']
  const pieces = useMemo(() => {
    const arr: {
      left: string
      delay: string
      dur: string
      rot: string
      color: string
      w: number
      h: number
      dx: string
      shape: 'square' | 'rect' | 'dot'
    }[] = []
    for (let i = 0; i < count; i += 1) {
      const shape: 'square' | 'rect' | 'dot' =
        Math.random() < 0.35 ? 'dot' : Math.random() < 0.55 ? 'square' : 'rect'
      const w = shape === 'dot' ? 6 : shape === 'rect' ? 6 : 8
      const h = shape === 'dot' ? 6 : shape === 'rect' ? 14 : 8
      arr.push({
        left: `${Math.random() * 100}%`,
        delay: `${(Math.random() * 0.6).toFixed(2)}s`,
        dur: `${(1.8 + Math.random() * 1.6).toFixed(2)}s`,
        rot: `${Math.floor(Math.random() * 360)}deg`,
        color: palette[Math.floor(Math.random() * palette.length)],
        w,
        h,
        dx: `${(Math.random() * 140 - 70).toFixed(1)}px`,
        shape,
      })
    }
    return arr
  }, [count])

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="fetch-streak-confetti absolute top-0"
          style={{
            left: p.left,
            width: p.w,
            height: p.h,
            backgroundColor: p.color,
            borderRadius: p.shape === 'dot' ? '50%' : '2px',
            animationDelay: p.delay,
            animationDuration: p.dur,
            ['--rot' as string]: p.rot,
            ['--dx' as string]: p.dx,
          }}
        />
      ))}
    </div>
  )
}

function StreakLadder({ current, highlight }: { current: number; highlight: boolean }) {
  return (
    <div
      className={[
        'fetch-streak-ladder mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white/90 px-4 py-2.5 shadow-[0_10px_28px_-18px_rgba(76,29,149,0.45)] ring-1 ring-violet-100 backdrop-blur',
        highlight ? 'fetch-streak-anim-ladder-in' : '',
      ].join(' ')}
    >
      {STREAK_LADDER_STOPS.map((stop, i) => {
        const reached = current >= stop
        return (
          <div key={stop} className="flex items-center gap-1.5">
            <div
              className={[
                'flex flex-col items-center gap-0.5',
                reached ? 'text-[#f97316]' : 'text-zinc-400',
              ].join(' ')}
            >
              <span className="relative flex h-7 w-7 items-center justify-center">
                <MiniFlame active={reached} />
                <span className="relative z-[1] text-[10px] font-black text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
                  {stop}
                </span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.06em]">
                {stop === 1 ? '1 DAY' : `${stop} DAYS`}
              </span>
            </div>
            {i < STREAK_LADDER_STOPS.length - 1 ? (
              <span className="text-zinc-300" aria-hidden>
                →
              </span>
            ) : null}
          </div>
        )
      })}
      <span className="ml-1 text-zinc-300" aria-hidden>
        →
      </span>
      <div
        className={[
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
          current >= 7 ? 'bg-[#4c1d95] text-white' : 'bg-violet-100 text-[#4c1d95]',
        ].join(' ')}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
          <path
            d="M4 10h16v8H4zM4 10l2-4h12l2 4M12 10v8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}

function MiniFlame({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 28" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="fetch-mini-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <path
        d="M12 1c1 3 4 5 4 9 0 2-1 3-3 3 1-2 0-4-2-5 1 3-2 3-2 6 0 1.5 1 2.5 2 3-3.5 0-6.5-3-6.5-7 0-4 3.5-5 4-8 .5 2 2.5 3 3 4.5.5-2-1-4-1-6z"
        fill={active ? 'url(#fetch-mini-flame)' : '#e4e4e7'}
      />
    </svg>
  )
}

export const FetchDailyStreakSplash = memo(FetchDailyStreakSplashInner)
