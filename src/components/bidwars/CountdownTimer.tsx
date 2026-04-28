/**
 * Drop-in countdown timer. Pass an absolute target epoch (ms) and the timer
 * formats `M:SS` and switches to red/urgent state under the threshold.
 */

import { useEffect, useState } from 'react'
import { formatMmSs } from '../../lib/data'

type Props = {
  endsAt: number
  className?: string
  urgentBelowSec?: number
  onElapsed?: () => void
  prefix?: string
}

export function CountdownTimer({
  endsAt,
  className = '',
  urgentBelowSec = 10,
  onElapsed,
  prefix,
}: Props) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [])
  const remainingSec = Math.max(0, Math.ceil((endsAt - now) / 1000))
  useEffect(() => {
    if (remainingSec === 0 && onElapsed) onElapsed()
  }, [remainingSec, onElapsed])
  const urgent = remainingSec <= urgentBelowSec
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-black tabular-nums leading-none ring-1',
        urgent
          ? 'bg-red-50 text-red-600 ring-red-200'
          : 'bg-zinc-100 text-zinc-900 ring-zinc-200',
        className,
      ].join(' ')}
      aria-live="polite"
    >
      <span className="relative flex h-1.5 w-1.5" aria-hidden>
        <span
          className={[
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
            urgent ? 'bg-red-500' : 'bg-[#4c1d95]',
          ].join(' ')}
        />
        <span
          className={[
            'relative inline-flex h-1.5 w-1.5 rounded-full',
            urgent ? 'bg-red-500' : 'bg-[#4c1d95]',
          ].join(' ')}
        />
      </span>
      {prefix ? <span className="font-bold uppercase tracking-[0.12em]">{prefix}</span> : null}
      {formatMmSs(remainingSec)}
    </span>
  )
}
