import { useEffect, useId, useMemo, useRef } from 'react'
import { getRewardProgress, COINS_PER_DAY } from '../lib/rewardProgress'
import { playStreakCelebrationSound } from '../lib/playStreakCelebrationSound'

function StreakFlameIcon({ gradientId, className = 'h-9 w-9' }: { gradientId: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="12" y1="40" x2="36" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fcd34d" />
          <stop offset="0.5" stopColor="#fb923c" />
          <stop offset="1" stopColor="#f59e0b" />
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

function MiniFlame({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path fill="#f59e0b" d="M12 2c-.6 1.6-2 3-2 5.2 0 1.1.5 2.1 1.1 2.9-.2-2 .9-4.1 2.7-5.4C13.2 7.5 12 9.8 12 12c0-2 1.4-3.9 3.2-4.8.9 1.4 1.3 3.1 1.3 4.8 0 4.1-3.2 7.2-7.4 7.9-.2 0-.5 0-.7 0C4 19.9 2 17.2 2 14.2c0-2.5 1.5-4.7 3.7-5.7C6 5.5 8.7 3.5 12 2Z" />
    </svg>
  )
}

export type FetchDailyStreakCardProps = {
  className?: string
  compact?: boolean
  celebrateOnMount?: boolean
}

export function FetchDailyStreakCard({
  className = '',
  compact = false,
  celebrateOnMount = false,
}: FetchDailyStreakCardProps) {
  const uid = useId()
  const rootRef = useRef<HTMLElement>(null)
  const flameGradId = `fetch-streak-flame-${uid.replace(/:/g, '')}`
  const progress = useMemo(() => getRewardProgress(), [])
  const completedInWeek = progress.streakDays
  const weekLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  const pad = compact ? 'px-2.5 pb-2.5 pt-2.5' : 'px-3.5 pb-4 pt-4'
  const iconBox = compact ? 'size-[2.75rem]' : 'size-[4.5rem]'
  const flameSvg = compact ? 'h-6 w-6' : 'h-9 w-9'
  const headlineSize = compact ? 'text-lg' : 'text-[1.375rem]'
  const dotSize = compact ? 'size-[1.125rem]' : 'size-[1.65rem]'
  const labelFont = compact ? 'text-[5.5px]' : 'text-[8px]'
  const trackTop = compact ? 'top-[0.55rem]' : 'top-[0.825rem]'
  const rowGap = compact ? 'gap-2' : 'gap-3'
  const weekMt = compact ? 'mt-2.5' : 'mt-3.5'
  const coinsToday = COINS_PER_DAY

  useEffect(() => {
    if (!celebrateOnMount) return
    let cancelled = false
    const root = rootRef.current
    const run = () => {
      if (cancelled || !root) return
      root.classList.add('fetch-daily-streak-card--celebrate')
      playStreakCelebrationSound()
      window.setTimeout(() => root.classList.remove('fetch-daily-streak-card--celebrate'), 900)
    }
    const id = window.requestAnimationFrame(() => window.requestAnimationFrame(run))
    return () => { cancelled = true; window.cancelAnimationFrame(id) }
  }, [celebrateOnMount])

  const streakLabel = completedInWeek === 0 ? 'New week' : `${completedInWeek} day${completedInWeek !== 1 ? 's' : ''}`

  return (
    <article
      ref={rootRef}
      className={[
        'fetch-reward-card-dark relative isolate overflow-hidden rounded-2xl',
        'bg-gradient-to-br from-[#1a1612] via-[#1e1a15] to-[#151210]',
        'shadow-[inset_0_1px_0_rgba(251,191,36,0.08),0_0_0_1px_rgba(251,191,36,0.15),0_4px_24px_-4px_rgba(0,0,0,0.7)]',
        pad,
        className,
      ].join(' ')}
      aria-label="Daily streak reward progress"
    >
      <div className="fetch-daily-streak-card__swoosh pointer-events-none absolute inset-0 z-[2] opacity-0" aria-hidden />

      <div className={`relative z-[1] flex ${rowGap}`}>
        {/* Flame icon in glowing ring */}
        <div
          className={`relative flex ${iconBox} shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-gradient-to-br from-amber-900/40 to-amber-950/60 shadow-[0_0_16px_rgba(251,191,36,0.2)]`}
          aria-hidden
        >
          <StreakFlameIcon gradientId={flameGradId} className={flameSvg} />
        </div>

        <div className="min-w-0 flex-1">
          <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-bold uppercase tracking-[0.14em] text-amber-400/70`}>
            Daily Streak
          </p>
          <p className={`mt-0.5 ${headlineSize} font-black leading-none tracking-[-0.03em] text-amber-50`}>
            {streakLabel}
          </p>
          <p className={`mt-0.5 ${compact ? 'text-[9px]' : 'text-[11px]'} font-semibold text-amber-300/50`}>
            Keep it going &middot; <span className="text-amber-400/80">+{coinsToday} coins/day</span>
          </p>

          {/* Week day markers — flames for done, circles for pending */}
          <div className={`relative ${weekMt}`}>
            {/* Connector line */}
            <div className={`pointer-events-none absolute inset-x-0 ${trackTop} h-px rounded-full bg-amber-800/30`} aria-hidden />
            {completedInWeek > 1 ? (
              <div
                className={`pointer-events-none absolute ${trackTop} h-[2px] -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-500/80 via-amber-400/70 to-yellow-500/60`}
                style={{ left: `${(100 / 14) * 1}%`, width: `${((completedInWeek - 1) / 7) * 100}%` }}
                aria-hidden
              />
            ) : null}
            <ul className="relative flex justify-between" aria-label="Seven day streak">
              {weekLabels.map((label, i) => {
                const done = i < completedInWeek
                const isLastDone = done && i === completedInWeek - 1
                return (
                  <li key={`streak-day-${i}`} className="flex min-w-0 flex-col items-center gap-0.5">
                    <div
                      className={[
                        `relative flex ${dotSize} items-center justify-center rounded-full transition-all duration-300`,
                        done
                          ? 'bg-gradient-to-b from-amber-600/50 to-amber-900/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                          : 'border border-amber-800/30 bg-black/40',
                        isLastDone ? 'ring-2 ring-amber-400/50 ring-offset-1 ring-offset-[#1a1612]' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {done ? (
                        <MiniFlame className={compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
                      ) : (
                        <span className={`${compact ? 'text-[6px]' : 'text-[8px]'} font-bold tabular-nums text-amber-700/40`}>
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <span className={`${labelFont} font-semibold uppercase tracking-[0.05em] text-amber-600/40`}>
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
