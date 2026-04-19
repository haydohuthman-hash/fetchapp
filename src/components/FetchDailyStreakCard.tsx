import { useEffect, useId, useMemo, useRef } from 'react'
import { loadSession } from '../lib/fetchUserSession'
import { playStreakCelebrationSound } from '../lib/playStreakCelebrationSound'
import { FETCH_REWARD_CARD_SHELL, FETCH_REWARD_CARD_SHELL_LIGHT } from './fetchRewardCardShell'

function streakDemoFromSession(): { completedInWeek: number } {
  const email = loadSession()?.email?.trim() ?? ''
  let h = 0
  for (let i = 0; i < email.length; i += 1) h = (h * 31 + email.charCodeAt(i)) >>> 0
  if (!email) h = 0x5bd1e995
  /** 5–7 completed markers for demo variety */
  const completedInWeek = 5 + (h % 3)
  return { completedInWeek }
}

function StreakFlameIcon({ gradientId, className = 'h-9 w-9' }: { gradientId: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="12" y1="40" x2="36" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fcd34d" />
          <stop offset="0.5" stopColor="#fb923c" />
          <stop offset="1" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M24 6c-1.2 3.2-4 5.8-4 10.5 0 2.2 1 4.2 2.2 5.8-.5-4 1.8-8.2 5.5-10.8C26.5 15 24 19.5 24 24c0-4 2.8-7.8 6.5-9.5 1.8 2.8 2.5 6.2 2.5 9.5 0 8.2-6.5 14.5-14.8 15.8-.5.1-1 .1-1.5.1C8 39.8 4 34.5 4 28.5c0-5 3-9.5 7.5-11.5C12 12 17.5 8 24 6Z"
      />
      <path
        fill={`url(#${gradientId})`}
        fillOpacity="0.45"
        d="M24 28c2.5 3.8 7 6.2 12 6.8-2-5.5-.5-11.8 4-15.8-3 2.5-5 6.5-5 11.2 0 .8 0 1.6.2 2.4-5.5-.8-10-4.8-11.2-10.6Z"
      />
    </svg>
  )
}

export type FetchDailyStreakCardProps = {
  className?: string
  /** Narrow column layout for pairing with Weekly Goal (`grid-cols-2`). */
  compact?: boolean
  /** One-time swoosh + pulse when the card mounts (home open). */
  celebrateOnMount?: boolean
}

/** Yellow progress styling shared between compact + full streak bars. */
const STREAK_BAR_FILL_CLASS =
  'rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]'

/**
 * Daily streak reward surface — paired visually with `FetchRankProgressCard`.
 */
export function FetchDailyStreakCard({
  className = '',
  compact = false,
  celebrateOnMount = false,
}: FetchDailyStreakCardProps) {
  const uid = useId()
  const rootRef = useRef<HTMLElement>(null)
  const flameGradId = `fetch-streak-flame-${uid.replace(/:/g, '')}`
  const { completedInWeek } = useMemo(() => streakDemoFromSession(), [])
  const weekLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  const shell = compact ? FETCH_REWARD_CARD_SHELL_LIGHT : FETCH_REWARD_CARD_SHELL
  const pad = compact ? 'px-2 pb-1.5 pt-1.5' : 'px-3.5 pb-4 pt-4'
  const iconBox = compact ? 'size-[2.5rem]' : 'size-[4.5rem]'
  const flameSvg = compact ? 'h-5 w-5' : 'h-9 w-9'
  const headlineSize = compact ? 'text-base' : 'text-[1.375rem]'
  const dotSize = compact ? 'size-[1rem]' : 'size-[1.65rem]'
  const dotFont = compact ? 'text-[6px]' : 'text-[9px]'
  const labelFont = compact ? 'text-[5px]' : 'text-[8px]'
  const trackTop = compact ? 'top-[0.48rem]' : 'top-[0.825rem]'
  const microSub = compact ? 'text-[8px] leading-tight' : 'text-[11px]'
  const titleTrack = compact ? 'tracking-[0.1em]' : 'tracking-[0.18em]'
  const rowGap = compact ? 'gap-1.5' : 'gap-3'
  const weekMt = compact ? 'mt-1.5' : 'mt-3.5'

  useEffect(() => {
    if (!celebrateOnMount) return
    let cancelled = false
    const root = rootRef.current
    const run = () => {
      if (cancelled || !root) return
      root.classList.add('fetch-daily-streak-card--celebrate')
      playStreakCelebrationSound()
      window.setTimeout(() => {
        root.classList.remove('fetch-daily-streak-card--celebrate')
      }, 900)
    }
    const id = window.requestAnimationFrame(() => window.requestAnimationFrame(run))
    return () => {
      cancelled = true
      window.cancelAnimationFrame(id)
    }
  }, [celebrateOnMount])

  return (
    <article
      ref={rootRef}
      className={[shell, pad, 'min-h-0 min-w-0', compact ? 'rounded-lg' : '', className].filter(Boolean).join(' ')}
      aria-label="Daily streak reward progress"
    >
      {/* Swoosh highlight passes over card on celebration */}
      <div className="fetch-daily-streak-card__swoosh pointer-events-none absolute inset-0 z-[2] opacity-0" aria-hidden />

      <div className={`relative z-[1] flex ${rowGap}`}>
        {/* Icon tile */}
        <div
          className={`relative flex ${iconBox} shrink-0 items-center justify-center ${compact ? 'rounded-md' : 'rounded-xl'} ${
            compact
              ? 'border border-amber-200/90 bg-gradient-to-b from-amber-50 to-orange-50/90'
              : 'border border-white/[0.10] bg-[#1a1d22]'
          }`}
          aria-hidden
        >
          <StreakFlameIcon gradientId={flameGradId} className={flameSvg} />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-bold uppercase ${titleTrack} ${
              compact ? 'text-zinc-500' : 'text-white/38'
            }`}
          >
            Daily Streak
          </p>
          <p
            className={`mt-px ${headlineSize} font-black leading-none tracking-[-0.03em] ${compact ? 'text-zinc-900' : 'text-white'}`}
          >
            7 days
          </p>
          <p className={`mt-px ${microSub} font-medium ${compact ? 'text-zinc-600' : 'text-white/48'}`}>Keep it going</p>

          {/* Thin yellow progress bar (compact) */}
          <div className={`${compact ? 'mt-1.5' : 'mt-2'} h-1 overflow-hidden rounded-full ${compact ? 'bg-amber-100 ring-1 ring-amber-200/80' : 'bg-black/40 ring-1 ring-white/[0.08]'}`}>
            <div className={`h-full ${STREAK_BAR_FILL_CLASS}`} style={{ width: `${Math.min(100, (completedInWeek / 7) * 100)}%` }} />
          </div>

          {/* Week path */}
          <div className={`relative ${weekMt}`}>
            <div
              className={`pointer-events-none absolute inset-x-0 ${trackTop} h-px rounded-full ${
                compact ? 'bg-amber-100' : 'bg-white/[0.07]'
              }`}
              aria-hidden
            />
            {completedInWeek > 1 ? (
              <div
                className={`pointer-events-none absolute ${trackTop} ${compact ? 'h-[3px]' : 'h-[2px]'} -translate-y-1/2 rounded-full ${STREAK_BAR_FILL_CLASS}`}
                style={{
                  left: `${(100 / 14) * 1}%`,
                  width: `${((completedInWeek - 1) / 7) * 100}%`,
                }}
                aria-hidden
              />
            ) : null}
            <ul className="relative flex justify-between gap-px" aria-label="Seven day streak">
              {weekLabels.map((label, i) => {
                const done = i < completedInWeek
                const isLastDone = done && i === completedInWeek - 1
                return (
                  <li key={`streak-day-${i}`} className={`flex min-w-0 flex-col items-center ${compact ? 'gap-px' : 'gap-0.5'}`}>
                    <div
                      className={[
                        `relative flex ${dotSize} items-center justify-center rounded-full transition-all duration-300`,
                        compact
                          ? done
                            ? 'border border-amber-300/90 bg-gradient-to-b from-amber-50 to-amber-100/90 shadow-sm'
                            : 'border border-zinc-200 bg-white shadow-inner'
                          : done
                            ? 'border border-white/15 bg-[#323741]'
                            : 'border border-white/[0.12] bg-black/50 shadow-inner',
                        isLastDone && compact ? 'ring-2 ring-amber-400/70 ring-offset-1 ring-offset-white' : '',
                        isLastDone && !compact ? 'ring-2 ring-[#00ff6a]/35 ring-offset-2 ring-offset-[#25282f]' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {done ? (
                        <>
                          {!compact ? <span className="absolute inset-0 rounded-full bg-white/[0.06]" /> : null}
                          <span
                            className={`relative ${dotFont} font-black tabular-nums ${
                              compact ? 'text-amber-950' : 'text-white/95'
                            }`}
                          >
                            {i + 1}
                          </span>
                        </>
                      ) : (
                        <span className={`${dotFont} font-bold tabular-nums ${compact ? 'text-zinc-400' : 'text-white/28'}`}>
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <span
                      className={`${labelFont} font-semibold uppercase tracking-[0.05em] ${
                        compact ? 'text-zinc-400' : 'text-white/28'
                      }`}
                    >
                      {label}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </article>
  )
}
