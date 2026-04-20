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
  const dim = size === 'sm' ? 'h-[3rem] w-[3rem]' : 'h-[5rem] w-[5rem]'
  const bodyFills: Record<ChestTier, string> = { bronze: '#6d3a0a', silver: '#5a5f68', gold: '#7c4a08', platinum: '#1a4550', diamond: '#2e1065' }
  const trimFills: Record<ChestTier, string> = { bronze: '#b45309', silver: '#94a3b8', gold: '#fbbf24', platinum: '#67e8f9', diamond: '#c084fc' }
  const lidFills: Record<ChestTier, string> = { bronze: '#92400e', silver: '#64748b', gold: '#d97706', platinum: '#0891b2', diamond: '#7c3aed' }

  return (
    <svg viewBox="0 0 80 72" className={dim} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden
      style={{ filter: locked ? 'brightness(0.3) saturate(0.2)' : 'none', transition: 'filter 0.3s ease' }}
    >
      <ellipse cx="40" cy="68" rx="28" ry="4" fill="black" opacity="0.4" />
      <rect x="10" y="34" width="60" height="32" rx="4" fill={bodyFills[tier]} stroke={trimFills[tier]} strokeWidth="1.2" strokeOpacity="0.5" />
      <rect x="10" y="34" width="30" height="32" rx="4" fill="black" opacity="0.12" />
      <rect x="10" y="32" width="60" height="4" rx="1" fill={trimFills[tier]} opacity="0.7" />
      {[[16, 40], [64, 40], [16, 60], [64, 60]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.5" fill={trimFills[tier]} opacity="0.6" />
      ))}
      <rect x="32" y="44" width="16" height="18" rx="2" fill="#0c0a09" stroke={trimFills[tier]} strokeWidth="0.8" />
      <circle cx="40" cy="53" r="3.5" fill="none" stroke={trimFills[tier]} strokeWidth="1" opacity="0.8" />
      <circle cx="40" cy="53" r="1.2" fill={trimFills[tier]} opacity="0.6" />
      <path d="M10 34 C10 14, 70 14, 70 34 Z" fill={lidFills[tier]} stroke={trimFills[tier]} strokeWidth="1" strokeOpacity="0.4" />
      <path d="M40 14 C55 14, 70 24, 70 34 L40 30Z" fill="white" fillOpacity="0.06" />
      <path d="M14 28 C14 16, 66 16, 66 28" fill="none" stroke={trimFills[tier]} strokeWidth="1.5" strokeOpacity="0.55" />
      {!locked ? <ellipse cx="40" cy="34" rx="22" ry="6" fill={trimFills[tier]} opacity="0.15" /> : null}
    </svg>
  )
}

export type FetchWeeklyGoalCardProps = {
  className?: string
  compact?: boolean
}

export function FetchWeeklyGoalCard({ className = '', compact: _compact = false }: FetchWeeklyGoalCardProps) {
  const progress = useMemo(() => getRewardProgress(), [])
  const [claimed, setClaimed] = useState(progress.weeklyChestClaimed)
  const [chestOpen, setChestOpen] = useState(false)

  const tier = useMemo(() => getCurrentTier(), [])
  const meta = CHEST_TIER_META[tier]
  const current = progress.weeksCompleted
  const pct = Math.round((Math.min(current, WEEKLY_TARGET) / WEEKLY_TARGET) * 100)
  const unlocked = current >= WEEKLY_TARGET && !claimed

  const nextTierIdx = Math.min(progress.currentTierIndex + 1, CHEST_TIERS.length - 1)
  const nextTierLabel = CHEST_TIER_META[CHEST_TIERS[nextTierIdx]].label

  const openChest = useCallback(() => { if (unlocked) setChestOpen(true) }, [unlocked])
  const closeChest = useCallback(() => { setChestOpen(false); claimWeeklyChest(); setClaimed(true) }, [])

  const subText = claimed
    ? `Next: ${nextTierLabel} chest`
    : unlocked
      ? `${meta.label} chest ready!`
      : `${current}/${WEEKLY_TARGET} weeks`

  return (
    <>
      <article
        className={[
          'relative isolate overflow-hidden rounded-xl',
          'bg-[#1a1612]',
          'shadow-[inset_0_1px_0_rgba(251,191,36,0.06),0_0_0_1px_rgba(251,191,36,0.12)]',
          'px-2.5 py-2',
          className,
        ].join(' ')}
        aria-label="Weekly goal reward progress"
      >
        <div className="relative flex gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-amber-500/60">Weekly Goal</p>
            <p className="mt-0.5 text-[15px] font-black tabular-nums leading-none tracking-[-0.02em] text-amber-50">
              {Math.min(current, WEEKLY_TARGET)} / {WEEKLY_TARGET}
            </p>
            <p className="mt-0.5 text-[8px] font-semibold text-amber-400/40">{subText}</p>

            <div className="mt-1.5">
              <div
                className="h-[5px] overflow-hidden rounded-full bg-black/50 ring-1"
                style={{ '--tw-ring-color': `${meta.border}40` } as React.CSSProperties}
                role="progressbar"
                aria-valuenow={Math.min(current, WEEKLY_TARGET)}
                aria-valuemin={0}
                aria-valuemax={WEEKLY_TARGET}
              >
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${meta.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <p className="mt-1 text-[7px] font-bold" style={{ color: `${meta.text}99` }}>
              🏆 Rank 2 Boomerang
            </p>
          </div>

          {/* Chest */}
          <div className="flex shrink-0 flex-col items-center justify-center gap-1">
            <div style={{ filter: unlocked ? `drop-shadow(0 0 8px ${meta.glow})` : 'none' }}>
              <TierChestSvg tier={tier} locked={!unlocked} size="sm" />
            </div>
            {unlocked ? (
              <button
                type="button"
                onClick={openChest}
                className="min-h-[20px] rounded-full px-2.5 text-[7px] font-black uppercase tracking-wider shadow-md transition-transform active:scale-[0.96]"
                style={{ background: `linear-gradient(135deg, ${meta.text}, ${meta.border})`, color: '#0c0a09' }}
              >
                Open
              </button>
            ) : (
              <span className="text-[6px] font-bold uppercase tracking-wider text-amber-700/35">
                {claimed ? 'Done' : 'Locked'}
              </span>
            )}
          </div>
        </div>
      </article>

      <FetchWeeklyChestClaimOverlay open={chestOpen} onClose={closeChest} tier={tier} />
    </>
  )
}
