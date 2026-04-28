/**
 * AuctionCard — used in home rails and category detail grids. Compact tile
 * with image, status pill, current bid, timer, and seller line.
 */

import { useSeller } from '../../lib/data'
import type { Auction } from '../../lib/data'
import { formatAud } from '../../lib/data'
import { CountdownTimer } from './CountdownTimer'
import { LiveBadge } from './LiveBadge'

type Props = {
  auction: Auction
  onPress?: (a: Auction) => void
  className?: string
}

export function AuctionCard({ auction, onPress, className = '' }: Props) {
  const seller = useSeller(auction.sellerId)
  const isLive = auction.status === 'live' || auction.status === 'ending'
  const isUpcoming = auction.status === 'upcoming'
  return (
    <button
      type="button"
      onClick={() => onPress?.(auction)}
      className={[
        'group flex w-full min-w-0 flex-col overflow-hidden rounded-2xl bg-white text-left shadow-[0_10px_22px_-18px_rgba(15,7,40,0.32)] ring-1 ring-zinc-200 transition-transform active:scale-[0.99]',
        className,
      ].join(' ')}
      aria-label={`${auction.title} — current bid ${formatAud(auction.currentBidCents)}`}
    >
      <span className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-100">
        <img
          src={auction.imageUrls[0]}
          alt=""
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-300 group-active:scale-[1.02]"
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
        <span className="absolute left-2 top-2 z-[1]">
          {isLive ? (
            <LiveBadge viewers={auction.viewerCount} size="sm" />
          ) : isUpcoming ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#4c1d95] px-2 py-[3px] text-[10px] font-black uppercase leading-none tracking-wide text-white shadow-sm">
              Upcoming
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-900/85 px-2 py-[3px] text-[10px] font-black uppercase leading-none tracking-wide text-white shadow-sm">
              {auction.status}
            </span>
          )}
        </span>
        <span className="absolute right-2 top-2 z-[1]">
          <CountdownTimer endsAt={isUpcoming ? auction.startsAt : auction.endsAt} />
        </span>
      </span>
      <span className="flex flex-col gap-1 px-3 py-2.5">
        <span className="line-clamp-1 text-[12px] font-bold leading-tight tracking-tight text-zinc-900">
          {auction.title}
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">
            {isUpcoming ? 'Starting bid' : 'Current bid'}
          </span>
          <span className="text-[14px] font-black tabular-nums text-[#4c1d95]">
            {formatAud(isUpcoming ? auction.startingBidCents : auction.currentBidCents)}
          </span>
        </span>
        {seller ? (
          <span className="line-clamp-1 text-[10.5px] font-semibold text-zinc-500">
            {seller.handle}
            {seller.isVerified ? <span className="ml-1 text-[#4c1d95]">✓</span> : null}
          </span>
        ) : null}
      </span>
    </button>
  )
}
