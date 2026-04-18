import { useId, useMemo } from 'react'
import { loadSession } from '../lib/fetchUserSession'
import { FETCH_REWARD_CARD_GLOSS, FETCH_REWARD_CARD_SHELL, FETCH_REWARD_CARD_VIGNETTE } from './fetchRewardCardShell'

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
        style={{ filter: 'drop-shadow(0 0 10px rgba(251,146,60,0.55)) drop-shadow(0 0 18px rgba(168,85,247,0.35))' }}
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
}

/**
 * Daily streak reward surface — paired visually with `FetchRankProgressCard`.
 */
export function FetchDailyStreakCard({ className = '', compact = false }: FetchDailyStreakCardProps) {
  const uid = useId()
  const flameGradId = `fetch-streak-flame-${uid.replace(/:/g, '')}`
  const { completedInWeek } = useMemo(() => streakDemoFromSession(), [])
  const weekLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  const pad = compact ? 'px-2.5 pb-3 pt-3' : 'px-3.5 pb-4 pt-4'
  const iconBox = compact ? 'size-[3.25rem]' : 'size-[4.5rem]'
  const flameSvg = compact ? 'h-7 w-7' : 'h-9 w-9'
  const headlineSize = compact ? 'text-xl' : 'text-[1.375rem]'
  const dotSize = compact ? 'size-[1.25rem]' : 'size-[1.65rem]'
  const dotFont = compact ? 'text-[8px]' : 'text-[9px]'
  const labelFont = compact ? 'text-[7px]' : 'text-[8px]'
  const trackTop = compact ? 'top-[0.625rem]' : 'top-[0.825rem]'
  const microSub = compact ? 'text-[10px]' : 'text-[11px]'
  const titleTrack = compact ? 'tracking-[0.14em]' : 'tracking-[0.18em]'

  return (
    <article
      className={[FETCH_REWARD_CARD_SHELL, pad, 'min-h-0 min-w-0', className].join(' ')}
      aria-label="Daily streak reward progress"
    >
      <div className={FETCH_REWARD_CARD_GLOSS} aria-hidden />
      <div className={FETCH_REWARD_CARD_VIGNETTE} aria-hidden />

      <div className="relative flex gap-3">
        {/* Icon tile — same vocabulary as rank card reward capsule */}
        <div
          className={`relative flex ${iconBox} shrink-0 items-center justify-center rounded-2xl border border-white/[0.10] bg-black/45 shadow-[0_0_28px_rgba(251,146,60,0.22),0_0_22px_rgba(168,85,247,0.18),inset_0_1px_0_rgba(255,255,255,0.14)]`}
          aria-hidden
        >
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_40%_25%,rgba(251,191,36,0.22)_0%,transparent_62%)]" />
          <StreakFlameIcon gradientId={flameGradId} className={flameSvg} />
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-bold uppercase ${titleTrack} text-white/38`}>Daily Streak</p>
          <p
            className={`mt-0.5 bg-gradient-to-br from-white via-white to-white/70 bg-clip-text ${headlineSize} font-black leading-none tracking-[-0.03em] text-transparent`}
          >
            7 days
          </p>
          <p className={`mt-0.5 ${microSub} font-medium leading-snug text-white/48`}>Keep it going</p>

          {/* Week path — centers at (2i+1)/14; active segment from day 1 → last completed */}
          <div className={`relative ${compact ? 'mt-2.5' : 'mt-3.5'}`}>
            <div
              className={`pointer-events-none absolute inset-x-0 ${trackTop} h-px rounded-full bg-white/[0.07]`}
              aria-hidden
            />
            {completedInWeek > 1 ? (
              <div
                className={`pointer-events-none absolute ${trackTop} h-[2px] -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-400/85 via-orange-500/75 to-violet-500/65 shadow-[0_0_14px_rgba(251,146,60,0.45)]`}
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
                  <li key={`streak-day-${i}`} className="flex min-w-0 flex-col items-center gap-0.5">
                    <div
                      className={[
                        `relative flex ${dotSize} items-center justify-center rounded-full transition-all duration-300`,
                        done
                          ? 'border border-amber-400/45 bg-[linear-gradient(155deg,rgba(251,191,36,0.35)_0%,rgba(249,115,22,0.22)_45%,rgba(168,85,247,0.2)_100%)] shadow-[0_0_14px_rgba(251,146,60,0.35),inset_0_1px_0_rgba(255,255,255,0.22)]'
                          : 'border border-white/[0.12] bg-black/50 shadow-inner',
                        isLastDone ? 'ring-2 ring-amber-400/25 ring-offset-2 ring-offset-[#0f1014]' : '',
                      ].join(' ')}
                    >
                      {done ? (
                        <>
                          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.35)_0%,transparent_55%)] opacity-90" />
                          <span className={`relative ${dotFont} font-black tabular-nums text-white/95`}>{i + 1}</span>
                          {isLastDone ? (
                            <span
                              className="pointer-events-none absolute -inset-[3px] rounded-full opacity-55 blur-[6px] bg-gradient-to-tr from-amber-400/45 via-orange-500/28 to-violet-500/35"
                              aria-hidden
                            />
                          ) : null}
                        </>
                      ) : (
                        <span className={`${dotFont} font-bold tabular-nums text-white/28`}>{i + 1}</span>
                      )}
                    </div>
                    <span className={`${labelFont} font-semibold uppercase tracking-[0.05em] text-white/28`}>{label}</span>
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
