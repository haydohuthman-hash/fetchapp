import { useMemo } from 'react'
import { loadSession } from '../lib/fetchUserSession'
import { FETCH_REWARD_CARD_GLOSS, FETCH_REWARD_CARD_SHELL, FETCH_REWARD_CARD_VIGNETTE } from './fetchRewardCardShell'

const DEMO_AVATAR_URLS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&q=82',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&q=82',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&q=82',
]

function avatarIndexFromSession(): number {
  const email = loadSession()?.email?.trim() ?? ''
  if (!email) return 0
  let h = 0
  for (let i = 0; i < email.length; i += 1) h = (h * 31 + email.charCodeAt(i)) >>> 0
  return h % DEMO_AVATAR_URLS.length
}

/** SVG boomerang — crisp vector for premium glow treatment */
function BoomerangRewardIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="fetchBoomBody" x1="8" y1="44" x2="48" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fcd34d" />
          <stop offset="0.45" stopColor="#fb923c" />
          <stop offset="1" stopColor="#c084fc" />
        </linearGradient>
        <filter id="fetchBoomGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        filter="url(#fetchBoomGlow)"
        fill="url(#fetchBoomBody)"
        d="M44 14c-6.5 8.5-18 14-28 16-3 .7-6 1-8 1.2-.8.1-1.5-.5-1.6-1.3-.1-.8.4-1.5 1.2-1.7 2-.4 5.5-1.4 9.6-3.2 9.8-4.4 17.6-11.8 21-19.6.4-.9 1.3-1.4 2.3-1.3 1 .2 1.7 1 1.8 2 .2 2.8 0 5.9-.8 9.7Z"
      />
      <path
        fill="url(#fetchBoomBody)"
        fillOpacity="0.35"
        d="M42 38c-8.5-2-16-8-20-14.5-.6-1-.2-2.3.8-2.9 1-.6 2.3-.3 3 .6 3.2 4 9 9 15.8 10.5 1 .3 1.6 1.2 1.4 2.2-.2 1-1.1 1.6-2 1.1Z"
      />
    </svg>
  )
}

export type FetchRankProgressCardProps = {
  className?: string
}

/**
 * Premium seller rank / XP progress — gamified marketplace surface (demo copy).
 */
export function FetchRankProgressCard({ className = '' }: FetchRankProgressCardProps) {
  const avatarSrc = useMemo(() => DEMO_AVATAR_URLS[avatarIndexFromSession()], [])
  const xpCurrent = 620
  const xpMax = 1000
  const pct = Math.min(100, Math.round((xpCurrent / xpMax) * 100))

  return (
    <article
      className={[FETCH_REWARD_CARD_SHELL, 'px-3.5 pb-4 pt-4', className].join(' ')}
      aria-label="Your Fetch rank and progress"
    >
      <div className={FETCH_REWARD_CARD_GLOSS} aria-hidden />
      <div className={FETCH_REWARD_CARD_VIGNETTE} aria-hidden />

      <div className="relative flex gap-3">
        {/* Avatar + ring */}
        <div className="relative shrink-0">
          <div
            className="relative size-[4.5rem] rounded-full p-[3px]"
            style={{
              background:
                'conic-gradient(from 210deg, #fbbf24, #f97316, #c084fc, #a855f7, #fbbf24)',
              boxShadow:
                '0 0 24px rgba(251,191,36,0.35), 0 0 40px rgba(168,85,247,0.22), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
          >
            <div className="relative size-full overflow-hidden rounded-full bg-[#0a0a0c] ring-1 ring-black/60">
              <img
                src={avatarSrc}
                alt=""
                className="size-full object-cover"
                loading="lazy"
                draggable={false}
              />
              <div
                className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-black/25 to-transparent"
                aria-hidden
              />
            </div>
          </div>
          <div className="absolute -bottom-0.5 left-1/2 z-[2] -translate-x-1/2 whitespace-nowrap rounded-md border border-amber-400/35 bg-[linear-gradient(180deg,rgba(28,22,12,0.95)_0%,rgba(12,10,8,0.98)_100%)] px-2 py-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.5),0_0_12px_rgba(251,191,36,0.25)]">
            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-amber-100/95">
              Rank 1
            </span>
          </div>
        </div>

        {/* Main copy */}
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/38">Level 4</p>
          <h3 className="mt-0.5 truncate bg-gradient-to-br from-white via-white to-white/75 bg-clip-text text-[1.375rem] font-black leading-[1.1] tracking-[-0.03em] text-transparent drop-shadow-[0_1px_24px_rgba(255,255,255,0.08)]">
            Hustler
          </h3>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-end justify-between gap-2">
              <span className="text-[11px] font-semibold tabular-nums text-white/88">
                {xpCurrent.toLocaleString()} / {xpMax.toLocaleString()} XP
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-black/55 ring-1 ring-white/[0.07]"
              role="progressbar"
              aria-valuenow={xpCurrent}
              aria-valuemin={0}
              aria-valuemax={xpMax}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-violet-500 shadow-[0_0_16px_rgba(251,146,60,0.45)]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Reward column */}
        <div className="flex w-[5.25rem] shrink-0 flex-col items-end gap-1.5 pt-0.5 text-right">
          <div
            className="relative flex size-[3.25rem] items-center justify-center rounded-2xl border border-white/[0.08] bg-black/40 shadow-[0_0_24px_rgba(168,85,247,0.25),0_0_18px_rgba(251,191,36,0.15),inset_0_1px_0_rgba(255,255,255,0.12)]"
            aria-hidden
          >
            <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_30%,rgba(251,191,36,0.2)_0%,transparent_65%)]" />
            <BoomerangRewardIcon className="relative z-[1] h-9 w-9" />
          </div>
          <p className="max-w-[5.5rem] text-[10px] font-semibold leading-snug text-white/55">
            2 more sales to unlock
          </p>
          <p className="max-w-[6rem] text-[11px] font-bold leading-tight tracking-[-0.02em] text-white/88">
            Rank 2 Boomerang
          </p>
        </div>
      </div>
    </article>
  )
}
