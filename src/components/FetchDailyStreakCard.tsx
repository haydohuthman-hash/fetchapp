import { useEffect, useMemo, useRef } from 'react'
import { getRewardProgress, COINS_PER_DAY } from '../lib/rewardProgress'
import { playStreakCelebrationSound } from '../lib/playStreakCelebrationSound'

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
  compact: _compact = false,
  celebrateOnMount = false,
}: FetchDailyStreakCardProps) {
  const rootRef = useRef<HTMLElement>(null)
  const progress = useMemo(() => getRewardProgress(), [])
  const completed = progress.streakDays
  const weekLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

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

  const streakLabel = completed === 0 ? 'New week' : `${completed} day${completed !== 1 ? 's' : ''}`

  return (
    <article
      ref={rootRef}
      className={[
        'relative isolate overflow-hidden rounded-xl',
        'bg-[#1a1612]',
        'shadow-[inset_0_1px_0_rgba(251,191,36,0.06),0_0_0_1px_rgba(251,191,36,0.12)]',
        'px-2.5 py-2',
        className,
      ].join(' ')}
      aria-label="Daily streak reward progress"
    >
      <div className="fetch-daily-streak-card__swoosh pointer-events-none absolute inset-0 z-[2] opacity-0" aria-hidden />

      <div className="relative z-[1]">
        {/* Header row */}
        <div className="flex items-baseline justify-between">
          <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-amber-500/60">Daily Streak</p>
          <p className="text-[7px] font-semibold text-amber-400/50">+{COINS_PER_DAY} 🪙/day</p>
        </div>
        <p className="mt-0.5 text-[15px] font-black leading-none tracking-[-0.02em] text-amber-50">
          {streakLabel}
        </p>
        <p className="mt-0.5 text-[8px] font-semibold text-amber-400/40">
          {completed === 0 ? 'Start your streak' : 'Keep it going'}
        </p>

        {/* Day markers */}
        <div className="relative mt-2">
          <div className="pointer-events-none absolute inset-x-0 top-[0.5rem] h-px bg-amber-800/25" aria-hidden />
          {completed > 1 ? (
            <div
              className="pointer-events-none absolute top-[0.5rem] h-[2px] -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-500/70 to-yellow-500/50"
              style={{ left: `${(100 / 14)}%`, width: `${((completed - 1) / 7) * 100}%` }}
              aria-hidden
            />
          ) : null}
          <ul className="relative flex justify-between" aria-label="Seven day streak">
            {weekLabels.map((label, i) => {
              const done = i < completed
              const isLast = done && i === completed - 1
              return (
                <li key={i} className="flex min-w-0 flex-col items-center gap-px">
                  <div
                    className={[
                      'relative flex size-[1rem] items-center justify-center rounded-full transition-all duration-200',
                      done
                        ? 'bg-amber-700/40 shadow-[0_0_6px_rgba(245,158,11,0.25)]'
                        : 'border border-amber-800/25 bg-black/30',
                      isLast ? 'ring-[1.5px] ring-amber-400/50 ring-offset-1 ring-offset-[#1a1612]' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {done ? (
                      <MiniFlame className="h-2 w-2" />
                    ) : (
                      <span className="text-[5px] font-bold tabular-nums text-amber-700/35">{i + 1}</span>
                    )}
                  </div>
                  <span className="text-[5px] font-semibold uppercase text-amber-600/35">{label}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </article>
  )
}
