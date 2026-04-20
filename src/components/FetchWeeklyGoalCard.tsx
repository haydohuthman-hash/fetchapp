import { useCallback, useMemo, useState } from 'react'
import {
  getRewardProgress,
  claimWeeklyChest,
  getCurrentTier,
  CHEST_TIERS,
  CHEST_TIER_META,
  type ChestTier,
} from '../lib/rewardProgress'
import { FetchWeeklyChestClaimOverlay } from './FetchWeeklyChestClaimOverlay'

const WEEKLY_TARGET = 5

function TierChestSvg({ tier, locked, size }: { tier: ChestTier; locked: boolean; size: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-[3.75rem] w-[3.75rem]' : 'h-[5rem] w-[5rem]'

  const bodyFills: Record<ChestTier, string> = {
    bronze:   '#6d3a0a',
    silver:   '#5a5f68',
    gold:     '#7c4a08',
    platinum: '#1a4550',
    diamond:  '#2e1065',
  }
  const trimFills: Record<ChestTier, string> = {
    bronze:   '#b45309',
    silver:   '#94a3b8',
    gold:     '#fbbf24',
    platinum: '#67e8f9',
    diamond:  '#c084fc',
  }
  const lidFills: Record<ChestTier, string> = {
    bronze:   '#92400e',
    silver:   '#64748b',
    gold:     '#d97706',
    platinum: '#0891b2',
    diamond:  '#7c3aed',
  }

  return (
    <svg viewBox="0 0 80 72" className={dim} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden
      style={{ filter: locked ? 'brightness(0.35) saturate(0.3)' : 'none', transition: 'filter 0.3s ease' }}
    >
      {/* Shadow */}
      <ellipse cx="40" cy="68" rx="28" ry="4" fill="black" opacity="0.4" />

      {/* Body */}
      <rect x="10" y="34" width="60" height="32" rx="4" fill={bodyFills[tier]} stroke={trimFills[tier]} strokeWidth="1.2" strokeOpacity="0.5" />
      <rect x="10" y="34" width="30" height="32" rx="4" fill="black" opacity="0.12" />
      <line x1="16" y1="42" x2="64" y2="42" stroke={trimFills[tier]} strokeWidth="0.8" strokeOpacity="0.3" />

      {/* Horizontal trim band */}
      <rect x="10" y="32" width="60" height="4" rx="1" fill={trimFills[tier]} opacity="0.7" />

      {/* Corner studs */}
      {[[16, 40], [64, 40], [16, 60], [64, 60]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.5" fill={trimFills[tier]} opacity="0.6" />
      ))}

      {/* Lock plate */}
      <rect x="32" y="44" width="16" height="18" rx="2" fill="#0c0a09" stroke={trimFills[tier]} strokeWidth="0.8" />
      <circle cx="40" cy="53" r="3.5" fill="none" stroke={trimFills[tier]} strokeWidth="1" opacity="0.8" />
      <circle cx="40" cy="53" r="1.2" fill={trimFills[tier]} opacity="0.6" />

      {/* Lid — barrel-top arch */}
      <path d="M10 34 C10 14, 70 14, 70 34 Z" fill={lidFills[tier]} stroke={trimFills[tier]} strokeWidth="1" strokeOpacity="0.4" />
      <path d="M40 14 C55 14, 70 24, 70 34 L40 30Z" fill="white" fillOpacity="0.06" />
      <line x1="18" y1="30" x2="62" y2="30" stroke={trimFills[tier]} strokeWidth="0.6" strokeOpacity="0.35" />

      {/* Lid trim bars (horizontal straps) */}
      <path d="M14 28 C14 16, 66 16, 66 28" fill="none" stroke={trimFills[tier]} strokeWidth="1.5" strokeOpacity="0.55" />
      <path d="M20 24 C20 14, 60 14, 60 24" fill="none" stroke={trimFills[tier]} strokeWidth="1" strokeOpacity="0.35" />

      {/* Keyhole ornament on lid */}
      <path d="M40 22 L38 26 L42 26 Z" fill={trimFills[tier]} opacity="0.5" />

      {/* Glow effect when unlocked */}
      {!locked ? (
        <ellipse cx="40" cy="34" rx="22" ry="6" fill={trimFills[tier]} opacity="0.15" />
      ) : null}
    </svg>
  )
}

export type FetchWeeklyGoalCardProps = {
  className?: string
  compact?: boolean
}

export function FetchWeeklyGoalCard({ className = '', compact = false }: FetchWeeklyGoalCardProps) {
  const progress = useMemo(() => getRewardProgress(), [])
  const [claimed, setClaimed] = useState(progress.weeklyChestClaimed)
  const [chestOpen, setChestOpen] = useState(false)

  const tier = useMemo(() => getCurrentTier(), [])
  const meta = CHEST_TIER_META[tier]
  const current = progress.weeksCompleted
  const target = WEEKLY_TARGET
  const pct = Math.round((Math.min(current, target) / target) * 100)
  const unlocked = current >= target && !claimed

  const pad = compact ? 'px-2.5 pb-2.5 pt-2.5' : 'px-3.5 pb-4 pt-4'
  const headline = compact ? 'text-lg' : 'text-[1.375rem]'
  const micro = compact ? 'text-[9px] leading-tight' : 'text-[11px]'
  const barMt = compact ? 'mt-2' : 'mt-3.5'
  const barH = compact ? 'h-[6px]' : 'h-2'
  const titleSz = compact ? 'text-[9px]' : 'text-[10px]'
  const flexGap = compact ? 'gap-2' : 'gap-2 sm:gap-3'

  const openChest = useCallback(() => {
    if (!unlocked) return
    setChestOpen(true)
  }, [unlocked])

  const closeChest = useCallback(() => {
    setChestOpen(false)
    claimWeeklyChest()
    setClaimed(true)
  }, [])

  const subText = claimed
    ? 'Claimed — next tier awaits'
    : unlocked
      ? `${meta.label} chest ready!`
      : `${current}/${target} weeks — ${meta.label} chest`

  const nextTierIdx = Math.min(progress.currentTierIndex + 1, CHEST_TIERS.length - 1)
  const nextTierLabel = CHEST_TIER_META[CHEST_TIERS[nextTierIdx]].label

  return (
    <>
      <article
        className={[
          'fetch-reward-card-dark relative isolate overflow-hidden rounded-2xl',
          'bg-gradient-to-br from-[#1a1612] via-[#1e1a15] to-[#151210]',
          'shadow-[inset_0_1px_0_rgba(251,191,36,0.08),0_0_0_1px_rgba(251,191,36,0.15),0_4px_24px_-4px_rgba(0,0,0,0.7)]',
          pad,
          className,
        ].join(' ')}
        aria-label="Weekly goal reward progress"
      >
        <div className={`relative flex ${flexGap}`}>
          <div className={`min-w-0 flex-1 ${compact ? 'pt-0' : 'pt-0.5'}`}>
            <p className={`${titleSz} font-bold uppercase tracking-[0.14em] text-amber-400/70`}>
              Weekly Goal
            </p>
            <p className={`mt-0.5 ${headline} font-black tabular-nums leading-none tracking-[-0.03em] text-amber-50`}>
              {Math.min(current, target)} / {target}
            </p>
            <p className={`mt-0.5 ${micro} font-semibold text-amber-300/50`}>
              {subText}
            </p>

            {/* Progress bar with tier color */}
            <div className={`${barMt}`}>
              <div
                className={`${barH} overflow-hidden rounded-full bg-black/50 ring-1`}
                style={{ '--tw-ring-color': meta.border } as React.CSSProperties}
                role="progressbar"
                aria-valuenow={Math.min(current, target)}
                aria-valuemin={0}
                aria-valuemax={target}
              >
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${meta.bar} shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Reward label */}
            <p className={`mt-1.5 ${compact ? 'text-[8px]' : 'text-[10px]'} font-bold`} style={{ color: meta.text }}>
              🏆 Rank 2 Boomerang
            </p>
          </div>

          {/* Tier chest */}
          <div className="flex shrink-0 flex-col items-center justify-center gap-1.5">
            <div
              className="relative"
              style={{
                filter: unlocked ? `drop-shadow(0 0 12px ${meta.glow})` : 'none',
                transition: 'filter 0.3s ease',
              }}
            >
              <TierChestSvg tier={tier} locked={!unlocked} size={compact ? 'sm' : 'md'} />
            </div>
            {unlocked ? (
              <button
                type="button"
                onClick={openChest}
                className="min-h-[24px] rounded-full px-3 text-[8px] font-black uppercase tracking-wider shadow-lg transition-transform active:scale-[0.96]"
                style={{
                  background: `linear-gradient(135deg, ${meta.text}, ${meta.border})`,
                  color: '#0c0a09',
                  boxShadow: `0 4px 16px -4px ${meta.glow}`,
                }}
              >
                Open
              </button>
            ) : (
              <span className={`${compact ? 'text-[7px]' : 'text-[8px]'} font-bold uppercase tracking-wider text-amber-700/40`}>
                {claimed ? `Next: ${nextTierLabel}` : 'Locked'}
              </span>
            )}
          </div>
        </div>
      </article>

      <FetchWeeklyChestClaimOverlay open={chestOpen} onClose={closeChest} tier={tier} />
    </>
  )
}
