import { useId } from 'react'
import { FETCH_REWARD_CARD_SHELL } from './fetchRewardCardShell'

function PremiumTreasureChest({ uid, size }: { uid: string; size: 'md' | 'sm' }) {
  const gid = `wk-chest-${uid.replace(/:/g, '')}`
  return (
    <svg
      viewBox="0 0 72 72"
      className={size === 'sm' ? 'relative z-[1] h-[3.25rem] w-[3.25rem]' : 'relative z-[1] h-[4.25rem] w-[4.25rem]'}
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
  compact?: boolean
}

/**
 * Weekly goal unlock — paired with rank + streak cards (demo: 4/5 progress).
 */
export function FetchWeeklyGoalCard({ className = '', compact = false }: FetchWeeklyGoalCardProps) {
  const uid = useId()
  const current = 4
  const target = 5
  const pct = Math.round((current / target) * 100)

  const pad = compact ? 'px-2.5 pb-3 pt-3' : 'px-3.5 pb-4 pt-4'
  const headline = compact ? 'text-xl' : 'text-[1.375rem]'
  const micro = compact ? 'text-[10px]' : 'text-[11px]'
  const titleTrack = compact ? 'tracking-[0.14em]' : 'tracking-[0.18em]'
  const barMt = compact ? 'mt-2.5' : 'mt-3.5'
  const chestWrap = compact ? 'size-[3.75rem]' : 'size-[4.75rem]'
  const chestCol = compact ? 'shrink-0' : 'w-[5.25rem]'

  return (
    <article
      className={[FETCH_REWARD_CARD_SHELL, pad, 'min-h-0 min-w-0', className].join(' ')}
      aria-label="Weekly goal reward progress"
    >
      <div className="relative flex gap-2 sm:gap-3">
        <div className="min-w-0 flex-1 pt-0.5">
          <p className={`text-[10px] font-bold uppercase ${titleTrack} text-white/38`}>Weekly Goal</p>
          <p className={`mt-0.5 ${headline} font-black tabular-nums leading-none tracking-[-0.03em] text-white`}>
            {current} / {target}
          </p>
          <p className={`mt-0.5 ${micro} font-medium leading-snug text-white/48`}>Go live or list items</p>

          <div className={`${barMt} space-y-1.5`}>
            <div
              className="h-2 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/[0.08]"
              role="progressbar"
              aria-valuenow={current}
              aria-valuemin={0}
              aria-valuemax={target}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-violet-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Reward chest */}
        <div className={`relative flex ${chestCol} shrink-0 flex-col items-center justify-center`}>
          <div
            className={`relative flex ${chestWrap} items-center justify-center rounded-xl border border-white/[0.10] bg-[#1a1d22] ${compact ? 'mx-auto' : ''}`}
          >
            <PremiumTreasureChest uid={uid} size={compact ? 'sm' : 'md'} />
          </div>
        </div>
      </div>
    </article>
  )
}
