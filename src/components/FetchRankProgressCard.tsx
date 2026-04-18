import { useMemo } from 'react'
import { loadSession } from '../lib/fetchUserSession'
import { FETCH_REWARD_CARD_SHELL_LIGHT } from './fetchRewardCardShell'

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

/** SVG boomerang */
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
      </defs>
      <path
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
 * Seller rank / XP progress — matches light streak + weekly cards on white feeds.
 */
export function FetchRankProgressCard({ className = '' }: FetchRankProgressCardProps) {
  const avatarSrc = useMemo(() => DEMO_AVATAR_URLS[avatarIndexFromSession()], [])
  const xpCurrent = 620
  const xpMax = 1000
  const pct = Math.min(100, Math.round((xpCurrent / xpMax) * 100))

  return (
    <article
      className={[FETCH_REWARD_CARD_SHELL_LIGHT, 'px-3.5 pb-4 pt-4', className].join(' ')}
      aria-label="Your Fetch rank and progress"
    >
      <div className="relative grid grid-cols-[auto,minmax(0,1fr),auto] gap-x-3 gap-y-3">
        <div className="relative row-span-1 shrink-0">
          <div className="relative size-[4.5rem] rounded-full ring-2 ring-zinc-200 ring-offset-2 ring-offset-white">
            <div className="relative size-full overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200/90">
              <img
                src={avatarSrc}
                alt=""
                className="size-full object-cover"
                loading="lazy"
                draggable={false}
              />
              <div
                className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-black/15 to-transparent"
                aria-hidden
              />
            </div>
          </div>
          <div className="absolute -bottom-0.5 left-1/2 z-[2] -translate-x-1/2 whitespace-nowrap rounded-md border border-zinc-200/95 bg-white px-2 py-0.5 shadow-sm">
            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-neutral-950">
              Rank 1
            </span>
          </div>
        </div>

        <div className="min-w-0 pt-0.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Level 4</p>
          <h3 className="mt-0.5 truncate text-[1.375rem] font-black leading-[1.1] tracking-[-0.03em] text-neutral-950">
            Hustler
          </h3>
        </div>

        <div className="flex w-[5.25rem] shrink-0 flex-col items-end gap-1.5 pt-0.5 text-right">
          <div
            className="relative flex size-[3.25rem] items-center justify-center rounded-xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50 to-teal-50/90"
            aria-hidden
          >
            <BoomerangRewardIcon className="relative z-[1] h-9 w-9" />
          </div>
          <p className="max-w-[5.5rem] text-[10px] font-semibold leading-snug text-zinc-600">
            2 more sales to unlock
          </p>
          <p className="max-w-[6rem] text-[11px] font-bold leading-tight tracking-[-0.02em] text-neutral-950">
            Rank 2 Boomerang
          </p>
        </div>

        {/* XP bar on the left — spans avatar + title columns only (not under reward stack) */}
        <div className="col-span-2 min-w-0 space-y-1.5">
          <div className="flex items-end justify-between gap-2">
            <span className="text-[11px] font-semibold tabular-nums text-zinc-700">
              {xpCurrent.toLocaleString()} / {xpMax.toLocaleString()} XP
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200/90"
            role="progressbar"
            aria-valuenow={xpCurrent}
            aria-valuemin={0}
            aria-valuemax={xpMax}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-violet-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  )
}
