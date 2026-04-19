import { useCallback, useId, useState } from 'react'
import { FETCH_REWARD_CARD_SHELL, FETCH_REWARD_CARD_SHELL_LIGHT } from './fetchRewardCardShell'
import { FetchWeeklyChestClaimOverlay } from './FetchWeeklyChestClaimOverlay'

const WEEKLY_BAR_FILL =
  'rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]'

/** Isometric-ish gold chest for weekly reward */
function GoldTreasureChest3D({ uid, size }: { uid: string; size: 'md' | 'sm' }) {
  const gid = `wk-gold-${uid.replace(/:/g, '')}`
  const scale = size === 'sm' ? 0.92 : 1
  return (
    <svg
      viewBox="0 0 88 84"
      className={size === 'sm' ? 'h-[3.25rem] w-[3.25rem]' : 'h-[4.25rem] w-[4.25rem]'}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ transform: `scale(${scale})`, transformOrigin: '50% 65%' }}
    >
      <defs>
        <linearGradient id={`${gid}-gold`} x1="12" y1="72" x2="76" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff7d6" />
          <stop offset="0.25" stopColor="#fcd34d" />
          <stop offset="0.55" stopColor="#ea580c" />
          <stop offset="1" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id={`${gid}-gold-face`} x1="44" y1="28" x2="72" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde68a" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id={`${gid}-lid-top`} x1="44" y1="12" x2="44" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fef9c3" />
          <stop offset="0.45" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id={`${gid}-shadow`} x1="44" y1="74" x2="44" y2="82" gradientUnits="userSpaceOnUse">
          <stop stopColor="#451a03" stopOpacity="0.45" />
          <stop offset="1" stopColor="#451a03" stopOpacity="0" />
        </linearGradient>
        <filter id={`${gid}-soft`} x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
      </defs>

      {/* Shadow */}
      <ellipse cx="44" cy="78" rx="28" ry="5" fill={`url(#${gid}-shadow)`} />

      {/* Back face (depth) */}
      <path
        fill="#713f12"
        d="m18 46 26-14 26 14v22l-26 14-26-14V46Z"
        opacity="0.92"
      />

      {/* Left face */}
      <path fill="#92400e" d="M18 46 44 32v46l-26 14V46Z" />

      {/* Right face — bright */}
      <path fill={`url(#${gid}-gold-face)`} d="M44 32l26 14v22L44 78V32Z" />

      {/* Front face */}
      <path
        fill={`url(#${gid}-gold)`}
        stroke="#78350f"
        strokeWidth="0.85"
        d="M18 46 44 60v40l-26-14V46Z"
      />

      {/* Front lip / bevel */}
      <path stroke="#fde68a" strokeOpacity="0.35" strokeWidth="0.6" d="M22 52h40" />

      {/* Lock */}
      <rect x="36" y="56" width="16" height="18" rx="2.5" fill="#1c1917" stroke="#fbbf24" strokeWidth="1" />
      <circle cx="44" cy="65" r="3.5" fill="none" stroke="#fde047" strokeWidth="1.2" />
      <circle cx="44" cy="65" r="1.2" fill="#fde047" />

      {/* Lid — angled top */}
      <path
        fill={`url(#${gid}-lid-top)`}
        stroke="#92400e"
        strokeWidth="0.85"
        d="M18 46 44 18l26 28-26 14-26-14Z"
      />
      <path fill="#fffbeb" fillOpacity="0.22" d="M44 18 70 46 44 60 18 46Z" />
      <path stroke="#fef08a" strokeOpacity="0.55" strokeWidth="0.75" strokeLinecap="round" d="M26 42h36" />

      {/* Rim highlight */}
      <path
        fill="none"
        stroke="#fde047"
        strokeOpacity="0.55"
        strokeWidth="0.65"
        d="M44 60 70 46"
        filter={`url(#${gid}-soft)`}
      />
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

  const [chestOpen, setChestOpen] = useState(false)

  const shell = compact ? FETCH_REWARD_CARD_SHELL_LIGHT : FETCH_REWARD_CARD_SHELL
  const pad = compact ? 'px-2 pb-1.5 pt-1.5' : 'px-3.5 pb-4 pt-4'
  const headline = compact ? 'text-base' : 'text-[1.375rem]'
  const micro = compact ? 'text-[8px] leading-tight' : 'text-[11px]'
  const titleTrack = compact ? 'tracking-[0.1em]' : 'tracking-[0.18em]'
  const barMt = compact ? 'mt-1.5' : 'mt-3.5'
  const barH = compact ? 'h-[5px]' : 'h-2'
  const titleSz = compact ? 'text-[8px]' : 'text-[10px]'
  const flexGap = compact ? 'gap-1.5' : 'gap-2 sm:gap-3'

  const openChest = useCallback(() => setChestOpen(true), [])
  const closeChest = useCallback(() => setChestOpen(false), [])

  return (
    <>
      <article
        className={[shell, pad, 'min-h-0 min-w-0', compact ? 'rounded-lg' : '', className].filter(Boolean).join(' ')}
        aria-label="Weekly goal reward progress"
      >
        <div className={`relative flex ${flexGap}`}>
          <div className={`min-w-0 flex-1 ${compact ? 'pt-0' : 'pt-0.5'}`}>
            <p className={`${titleSz} font-bold uppercase ${titleTrack} ${compact ? 'text-zinc-500' : 'text-white/38'}`}>
              Weekly Goal
            </p>
            <p
              className={`mt-px ${headline} font-black tabular-nums leading-none tracking-[-0.03em] ${
                compact ? 'text-zinc-900' : 'text-white'
              }`}
            >
              {current} / {target}
            </p>
            <p className={`mt-px ${micro} font-medium ${compact ? 'text-zinc-600' : 'text-white/48'}`}>
              Go live or list items
            </p>

            <div className={`${barMt} space-y-1`}>
              <div
                className={`${barH} overflow-hidden rounded-full ${
                  compact ? 'bg-amber-100 ring-1 ring-amber-200/80' : 'bg-black/40 ring-1 ring-white/[0.08]'
                }`}
                role="progressbar"
                aria-valuenow={current}
                aria-valuemin={0}
                aria-valuemax={target}
              >
                <div className={`h-full ${WEEKLY_BAR_FILL}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          {/* 3D chest + claim */}
          <div className={`flex shrink-0 flex-col items-center justify-center ${compact ? 'gap-1 pt-0.5' : 'gap-2 pt-1'}`}>
            <div
              className={`relative flex items-center justify-center ${compact ? 'rounded-lg p-0.5' : 'rounded-xl p-1'} ${
                compact
                  ? 'border border-amber-200/95 bg-gradient-to-b from-amber-50 via-yellow-50 to-amber-100/90 shadow-sm'
                  : 'border border-white/[0.10] bg-[#1a1d22]'
              }`}
            >
              <GoldTreasureChest3D uid={uid} size={compact ? 'sm' : 'md'} />
            </div>
            <button
              type="button"
              onClick={openChest}
              className={`min-h-[26px] rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 px-2.5 text-[9px] font-black uppercase tracking-wide text-amber-950 shadow-[0_4px_12px_-4px_rgba(217,119,6,0.55)] ring-1 ring-amber-300/80 transition-transform active:scale-[0.96] ${compact ? 'w-full max-[5.5rem]' : 'px-4 text-[10px]'}`}
            >
              Claim
            </button>
          </div>
        </div>
      </article>

      <FetchWeeklyChestClaimOverlay open={chestOpen} onClose={closeChest} />
    </>
  )
}
