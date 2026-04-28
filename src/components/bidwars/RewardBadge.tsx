/**
 * RewardBadge — used on the Rewards screen + profile. Two layouts:
 * "tile" (square unlocked-style) and "row" (list).
 */

import type { Reward } from '../../lib/data'

type Props = {
  reward: Reward
  layout?: 'tile' | 'row'
  className?: string
}

export function RewardBadge({ reward, layout = 'tile', className = '' }: Props) {
  const locked = !reward.unlockedAt
  if (layout === 'row') {
    return (
      <div
        className={[
          'flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200',
          locked ? 'opacity-65' : '',
          className,
        ].join(' ')}
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-2xl">
          {reward.iconEmoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-black tracking-tight text-zinc-900">{reward.title}</p>
          <p className="line-clamp-1 text-[11px] font-semibold text-zinc-500">{reward.subtitle}</p>
        </div>
        {locked ? (
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
            Locked
          </span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
            Active
          </span>
        )}
      </div>
    )
  }
  return (
    <div
      className={[
        'flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-zinc-200',
        locked ? 'opacity-65' : '',
        className,
      ].join(' ')}
    >
      <span className="grid h-14 w-14 place-items-center rounded-full bg-violet-100 text-3xl">
        {reward.iconEmoji}
      </span>
      <p className="mt-1 text-[12px] font-black tracking-tight text-zinc-900">{reward.title}</p>
      <p className="line-clamp-2 text-[10.5px] font-semibold leading-snug text-zinc-500">
        {reward.subtitle}
      </p>
    </div>
  )
}
