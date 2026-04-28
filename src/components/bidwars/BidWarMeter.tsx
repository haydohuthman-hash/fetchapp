/**
 * Horizontal battle meter for Bid War 1v1. Shifts toward the leading side and
 * pulses when the lead changes hands.
 */

type Props = {
  leftCents: number
  rightCents: number
  leftLabel?: string
  rightLabel?: string
  className?: string
}

export function BidWarMeter({ leftCents, rightCents, leftLabel, rightLabel, className = '' }: Props) {
  const total = Math.max(1, leftCents + rightCents)
  const leftPct = Math.round((leftCents / total) * 100)
  const rightPct = 100 - leftPct
  const leftLeading = leftCents >= rightCents
  return (
    <div className={['flex flex-col gap-1', className].join(' ')}>
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.12em]">
        <span className={leftLeading ? 'text-[#4c1d95]' : 'text-zinc-400'}>
          {leftLabel ?? 'You'} · {leftPct}%
        </span>
        <span className={!leftLeading ? 'text-rose-600' : 'text-zinc-400'}>
          {rightLabel ?? 'Opponent'} · {rightPct}%
        </span>
      </div>
      <div
        className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={leftPct}
        aria-label="Bid war battle meter"
      >
        <span
          className="absolute inset-y-0 left-0 transition-[width] duration-300 ease-out"
          style={{
            width: `${leftPct}%`,
            background: 'linear-gradient(90deg,#7c3aed,#4c1d95)',
          }}
          aria-hidden
        />
        <span
          className="absolute inset-y-0 right-0 transition-[width] duration-300 ease-out"
          style={{
            width: `${rightPct}%`,
            background: 'linear-gradient(270deg,#fb7185,#e11d48)',
          }}
          aria-hidden
        />
      </div>
    </div>
  )
}
