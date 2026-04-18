import type { PeerListing } from '../lib/listingsApi'
import { BoltNavIcon } from './icons/HomeShellNavIcons'

export function peerListingDeliveryAriaSuffix(l: PeerListing): string {
  const parts: string[] = []
  if (l.sameDayDelivery) parts.push('Same day delivery')
  if (l.fetchDelivery) parts.push('Next day available')
  return parts.length ? ` ${parts.join('. ')}` : ''
}

type PeerListingDeliveryLinesProps = {
  l: PeerListing
  className?: string
  /** Muted palette for dark tiles (e.g. auction grid). */
  variant?: 'default' | 'onDark'
}

export function PeerListingDeliveryLines({ l, className, variant = 'default' }: PeerListingDeliveryLinesProps) {
  const same = Boolean(l.sameDayDelivery)
  const next = Boolean(l.fetchDelivery)
  if (!same && !next) return null
  const onDark = variant === 'onDark'
  const lineClass = onDark
    ? 'flex items-center gap-1 text-[10px] font-semibold leading-tight text-amber-300/95'
    : 'flex items-center gap-1 text-[10px] font-semibold leading-tight text-amber-600 dark:text-amber-400'
  const boltClass = onDark
    ? 'h-3 w-3 shrink-0 text-amber-400'
    : 'h-3 w-3 shrink-0 text-amber-500 dark:text-amber-400'

  return (
    <div className={['flex flex-col gap-0.5', className].filter(Boolean).join(' ')}>
      {same ? (
        <div className={lineClass}>
          <BoltNavIcon className={boltClass} />
          <span>Same day delivery</span>
        </div>
      ) : null}
      {next ? (
        <p
          className={
            onDark
              ? 'text-[10px] font-medium leading-tight text-zinc-400'
              : 'text-[10px] font-medium leading-tight text-zinc-900 dark:text-zinc-100'
          }
        >
          Next day available
        </p>
      ) : null}
    </div>
  )
}
