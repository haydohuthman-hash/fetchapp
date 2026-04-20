import { useCallback, useState } from 'react'
import { FETCH_REWARD_CARD_SHELL, FETCH_REWARD_CARD_SHELL_LIGHT } from './fetchRewardCardShell'
import { FetchWeeklyChestClaimOverlay } from './FetchWeeklyChestClaimOverlay'

const WEEKLY_BAR_FILL =
  'rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]'

export type FetchWeeklyGoalCardProps = {
  className?: string
  compact?: boolean
}

/**
 * Weekly goal unlock — paired with rank + streak cards (demo: 4/5 progress).
 */
export function FetchWeeklyGoalCard({ className = '', compact = false }: FetchWeeklyGoalCardProps) {
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
  const chestImg = compact ? 'h-[3.5rem] w-[3.5rem]' : 'h-[4.5rem] w-[4.5rem]'

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

          {/* Chest image + claim */}
          <div className={`flex shrink-0 flex-col items-center justify-center ${compact ? 'gap-1 pt-0' : 'gap-2 pt-0'}`}>
            <img
              src="/weekly-chest.png"
              alt="Treasure chest"
              className={`${chestImg} object-contain drop-shadow-[0_4px_8px_rgba(120,53,15,0.35)]`}
              draggable={false}
            />
            <button
              type="button"
              onClick={openChest}
              className={`min-h-[26px] rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 px-2.5 text-[9px] font-black uppercase tracking-wide text-amber-950 shadow-[0_4px_12px_-4px_rgba(217,119,6,0.55)] ring-1 ring-amber-300/80 transition-transform active:scale-[0.96] ${compact ? 'w-full max-w-[5.5rem]' : 'px-4 text-[10px]'}`}
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
