import { useId } from 'react'

/** Same shell as FetchRankProgressCard / FetchDailyStreakCard */
const CARD_SHELL = [
  'relative isolate overflow-hidden rounded-[1.35rem]',
  'border border-white/[0.09]',
  'bg-[linear-gradient(155deg,#16181d_0%,#0b0c0f_48%,#12141a_100%)]',
  'shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_48px_-28px_rgba(0,0,0,0.85),0_0_40px_-12px_rgba(168,85,247,0.18),0_0_28px_-8px_rgba(251,191,36,0.12)]',
  'px-3.5 pb-4 pt-4',
].join(' ')

const GLOSS_LAYER =
  'pointer-events-none absolute inset-0 rounded-[1.35rem] bg-[radial-gradient(120%_80%_at_18%_-10%,rgba(251,191,36,0.14)_0%,transparent_52%),radial-gradient(90%_70%_at_100%_0%,rgba(168,85,247,0.12)_0%,transparent_48%),linear-gradient(to_bottom,rgba(255,255,255,0.06)_0%,transparent_38%)]'

const VIGNETTE_LAYER =
  'pointer-events-none absolute inset-x-0 bottom-0 h-1/2 rounded-b-[1.35rem] bg-gradient-to-t from-black/35 to-transparent'

function PremiumTreasureChest({ uid }: { uid: string }) {
  const gid = `wk-chest-${uid.replace(/:/g, '')}`
  return (
    <svg
      viewBox="0 0 72 72"
      className="relative z-[1] h-[4.25rem] w-[4.25rem]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${gid}-metal`} x1="14" y1="54" x2="56" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3f3f46" />
          <stop offset="0.45" stopColor="#27272a" />
          <stop offset="1" stopColor="#0f0f12" />
        </linearGradient>
        <linearGradient id={`${gid}-gold`} x1="22" y1="22" x2="50" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fcd34d" />
          <stop offset="0.5" stopColor="#ea580c" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id={`${gid}-lid`} x1="36" y1="22" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#52525b" />
          <stop offset="1" stopColor="#1f1f23" />
        </linearGradient>
      </defs>
      {/* Angled lid */}
      <path
        fill={`url(#${gid}-lid)`}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="0.6"
        d="M18 38 14 26 58 26 54 38z"
      />
      <path stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeLinecap="round" d="M16 27h40" />
      {/* Body */}
      <path
        fill={`url(#${gid}-metal)`}
        stroke="rgba(212,175,55,0.28)"
        strokeWidth="0.75"
        d="M14 38h44v21c0 3.3-2.7 6-6 6H20c-3.3 0-6-2.7-6-6V38Z"
      />
      {/* Trim */}
      <path stroke={`url(#${gid}-gold)`} strokeWidth="1.1" strokeLinecap="round" fill="none" d="M36 38v13" opacity="0.88" />
      <path stroke={`url(#${gid}-gold)`} strokeWidth="0.85" strokeLinecap="round" fill="none" d="M26 34h20" opacity="0.65" />
      {/* Lock */}
      <rect x="31" y="43" width="10" height="11" rx="2" fill="#0c0c0e" stroke={`url(#${gid}-gold)`} strokeWidth="0.65" />
      <circle cx="36" cy="48.5" r="2.2" fill="none" stroke={`url(#${gid}-gold)`} strokeWidth="0.85" opacity="0.92" />
      <circle cx="36" cy="48.5" r="0.9" fill={`url(#${gid}-gold)`} opacity="0.55" />
    </svg>
  )
}

export type FetchWeeklyGoalCardProps = {
  className?: string
}

/**
 * Weekly goal unlock — paired with rank + streak cards (demo: 4/5 progress).
 */
export function FetchWeeklyGoalCard({ className = '' }: FetchWeeklyGoalCardProps) {
  const uid = useId()
  const current = 4
  const target = 5
  const pct = Math.round((current / target) * 100)

  return (
    <article className={[CARD_SHELL, className].join(' ')} aria-label="Weekly goal reward progress">
      <div className={GLOSS_LAYER} aria-hidden />
      <div className={VIGNETTE_LAYER} aria-hidden />

      <div className="relative flex gap-3">
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/38">Weekly Goal</p>
          <p className="mt-1 bg-gradient-to-br from-white via-white to-white/72 bg-clip-text text-[1.375rem] font-black tabular-nums leading-none tracking-[-0.03em] text-transparent">
            {current} / {target}
          </p>
          <p className="mt-1 text-[11px] font-medium leading-snug text-white/48">Go live or list items</p>

          <div className="mt-3.5 space-y-1.5">
            <div
              className="h-2 overflow-hidden rounded-full bg-black/55 ring-1 ring-white/[0.07]"
              role="progressbar"
              aria-valuenow={current}
              aria-valuemin={0}
              aria-valuemax={target}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-violet-500 shadow-[0_0_14px_rgba(251,146,60,0.4)]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Reward chest — premium capsule + sparkles */}
        <div className="relative flex w-[5.25rem] shrink-0 flex-col items-center justify-center">
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_35%,rgba(251,191,36,0.18)_0%,transparent_62%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-1 top-2 h-1.5 w-1.5 rounded-full bg-amber-200/90 blur-[2px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-2 top-6 h-1 w-1 rounded-full bg-violet-300/80 blur-[1px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-8 left-1 h-1 w-1 rounded-full bg-orange-300/75 blur-[1px]"
            aria-hidden
          />

          <div
            className="relative flex size-[4.75rem] items-center justify-center rounded-2xl border border-white/[0.08] bg-black/45 shadow-[0_0_26px_rgba(168,85,247,0.22),0_0_20px_rgba(251,191,36,0.14),inset_0_1px_0_rgba(255,255,255,0.11)]"
            style={{ filter: 'drop-shadow(0 0 14px rgba(251,191,36,0.18))' }}
          >
            <PremiumTreasureChest uid={uid} />
          </div>
        </div>
      </div>
    </article>
  )
}
