import { memo, useEffect, useMemo, useState } from 'react'
import {
  formatAuctionAud,
  formatEndsIn,
  type LiveAuctionDemoLot,
} from '../lib/liveAuctionsDemo'
import { formatLiveViewerShort } from '../lib/marketplaceAuctionUi'

const MICRO = ['NEW BID!', 'GOING FAST', 'HOT LOT', "DON'T SLEEP"]

type Props = {
  lot: LiveAuctionDemoLot
  effectiveBidCents: number
  isActive: boolean
  urgent: boolean
  /** Two-column grid: compact portrait media + tighter type (default false). */
  gridTwoColumn?: boolean
  onBidNow: () => void
  onWatch: () => void
  onOpenListing: () => void
}

export const LiveAuctionCard = memo(function LiveAuctionCard({
  lot,
  effectiveBidCents,
  isActive,
  urgent,
  gridTwoColumn = false,
  onBidNow,
  onWatch,
  onOpenListing,
}: Props) {
  const [remainSec, setRemainSec] = useState(lot.endsInSec)
  const initialTotal = lot.endsInSec
  const [micro, setMicro] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setInterval(() => {
      setRemainSec((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    if (!isActive || urgent) return
    const id = window.setInterval(() => {
      if (Math.random() > 0.72) {
        setMicro(MICRO[Math.floor(Math.random() * MICRO.length)] ?? 'NEW BID!')
        window.setTimeout(() => setMicro(null), 2600)
      }
    }, 5200)
    return () => window.clearInterval(id)
  }, [isActive, urgent])

  const progress = useMemo(() => {
    if (initialTotal <= 0) return 0
    return Math.min(1, remainSec / initialTotal)
  }, [remainSec, initialTotal])

  const watchersLabel = formatLiveViewerShort(lot.watchers)

  return (
    <article
      className={[
        'relative w-full bg-white ring-1 ring-zinc-200/90 shadow-[0_8px_22px_-16px_rgba(0,0,0,0.22)]',
        gridTwoColumn
          ? 'min-w-0 overflow-hidden rounded-xl'
          : 'mx-auto max-w-[min(100%,430px)] scroll-mb-4 scroll-mt-2 snap-start rounded-[1.35rem]',
        urgent ? 'fetch-live-auctions-card--urgent' : '',
      ].join(' ')}
      style={
        gridTwoColumn
          ? undefined
          : { minHeight: '72vh', maxHeight: '85vh' }
      }
      data-live-auction-card={lot.listingId}
    >
      <div
        className={[
          'relative w-full shrink-0 overflow-hidden bg-zinc-100',
          gridTwoColumn
            ? 'aspect-[10/16] max-h-[min(52vh,320px)] min-h-[140px] rounded-t-xl'
            : 'flex min-h-[240px] h-[min(52vh,420px)] rounded-t-[1.35rem]',
        ].join(' ')}
      >
        {lot.imageUrl ? (
          <button
            type="button"
            onClick={onOpenListing}
            className="absolute inset-0 block h-full w-full overflow-hidden border-0 bg-transparent p-0"
            aria-label={`Open ${lot.title}`}
          >
            <div className="fetch-live-auctions-card-media-inner absolute inset-[-4%] h-[108%] w-[108%]">
              <img
                src={lot.imageUrl}
                alt=""
                className="h-full w-full object-cover object-center"
                draggable={false}
              />
            </div>
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/25"
              aria-hidden
            />
          </button>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-500">
            No image
          </div>
        )}

        {micro ? (
          <div
            className={[
              'fetch-live-auctions-micro-toast pointer-events-none absolute left-1/2 z-[2] -translate-x-1/2 whitespace-nowrap rounded-full bg-white font-black uppercase tracking-wide text-zinc-900 shadow-lg shadow-white/10',
              gridTwoColumn ? 'top-[18%] px-2 py-1 text-[8px]' : 'top-[22%] px-3 py-1.5 text-[11px]',
            ].join(' ')}
          >
            {micro}
          </div>
        ) : null}

        <div
          className={[
            'pointer-events-none absolute left-2 top-2 z-[2] flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-md',
            gridTwoColumn ? 'px-1.5 py-0.5' : 'left-3 top-3 gap-1.5 px-2.5 py-1',
          ].join(' ')}
        >
          <span
            className={[
              'shrink-0 rounded-full',
              gridTwoColumn ? 'h-1.5 w-1.5' : 'h-2 w-2',
              lot.badge === 'live' ? 'animate-pulse bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'bg-amber-400',
            ].join(' ')}
            aria-hidden
          />
          <span
            className={[
              'font-extrabold uppercase tracking-wider text-white',
              gridTwoColumn ? 'text-[7px]' : 'text-[10px]',
            ].join(' ')}
          >
            {lot.badge === 'live' ? 'Live' : 'Soon'}
          </span>
        </div>

        <div
          className={[
            'pointer-events-none absolute right-2 top-2 z-[2] flex items-center gap-0.5 rounded-full bg-black/55 text-white backdrop-blur-md',
            gridTwoColumn ? 'px-1.5 py-0.5' : 'right-3 top-3 gap-1 px-2.5 py-1',
          ].join(' ')}
        >
          <span aria-hidden className={gridTwoColumn ? 'text-[9px]' : ''}>
            👁
          </span>
          <span
            className={['font-bold tabular-nums', gridTwoColumn ? 'text-[9px]' : 'text-[11px]'].join(' ')}
          >
            {watchersLabel}
          </span>
          {!gridTwoColumn ? (
            <span className="text-[10px] font-semibold text-zinc-300">watching</span>
          ) : null}
        </div>

        <div
          className={[
            'pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/95 via-black/55 to-transparent',
            gridTwoColumn ? 'px-2 pb-2 pt-8' : 'px-3 pb-3 pt-16',
          ].join(' ')}
        >
          <h3
            className={[
              'font-extrabold leading-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]',
              gridTwoColumn ? 'line-clamp-2 text-[10px]' : 'text-[1.05rem]',
            ].join(' ')}
          >
            {lot.title}
            {!gridTwoColumn ? (
              <span className="mt-1 block text-[12px] font-semibold text-zinc-300">Local pickup</span>
            ) : (
              <span className="mt-0.5 block text-[8px] font-semibold text-zinc-400">Pickup</span>
            )}
          </h3>
          <p
            className={[
              'font-bold text-zinc-200',
              gridTwoColumn ? 'mt-1 truncate text-[9px]' : 'mt-2 text-[13px]',
            ].join(' ')}
          >
            {lot.seller}{' '}
            <span className="text-amber-300">⭐ {lot.sellerRating.toFixed(1)}</span>
          </p>
        </div>
      </div>

      <div
        className={[
          'flex min-h-0 flex-1 flex-col',
          gridTwoColumn ? 'gap-1.5 px-2 pb-2 pt-2' : 'gap-3 px-3 pb-3 pt-3',
        ].join(' ')}
      >
        <div
          className={[
            'rounded-2xl bg-[var(--color-fetch-soft-gray,#faf9f5)] ring-1 ring-zinc-200',
            gridTwoColumn ? 'px-2 py-2' : 'px-3 py-3',
          ].join(' ')}
        >
          <p
            className={[
              'font-bold uppercase tracking-wider text-zinc-500',
              gridTwoColumn ? 'text-[7px]' : 'text-[10px]',
            ].join(' ')}
          >
            Bid
          </p>
          <p
            key={effectiveBidCents}
            className={[
              'fetch-live-auctions-price-pop font-black leading-none tabular-nums tracking-tight text-zinc-900',
              gridTwoColumn ? 'mt-0.5 text-[1.1rem]' : 'mt-0.5 text-[2.15rem]',
            ].join(' ')}
          >
            {formatAuctionAud(effectiveBidCents)}
          </p>
          <p
            className={[
              'font-semibold text-zinc-500',
              gridTwoColumn ? 'mt-1 text-[8px]' : 'mt-2 text-[11px]',
            ].join(' ')}
          >
            +{formatAuctionAud(lot.incrementCents)}
          </p>
        </div>

        <div>
          <div className={['flex items-center justify-between gap-1', gridTwoColumn ? 'flex-col items-stretch' : 'gap-2'].join(' ')}>
            <p
              className={['font-extrabold text-zinc-900', gridTwoColumn ? 'text-[9px]' : 'text-[13px]'].join(' ')}
            >
              {formatEndsIn(remainSec)}
            </p>
            {remainSec < 120 ? (
              <span className={['font-bold text-amber-400', gridTwoColumn ? 'text-[8px]' : 'text-[11px]'].join(' ')}>
                ⚡ Soon
              </span>
            ) : null}
          </div>
          <div className={['w-full overflow-hidden rounded-full bg-zinc-200', gridTwoColumn ? 'mt-1 h-1' : 'mt-2 h-1.5'].join(' ')}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-white to-amber-500 transition-[width] duration-1000 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p
            className={['font-semibold text-zinc-500', gridTwoColumn ? 'mt-1 text-[7px]' : 'mt-2 text-[11px]'].join(' ')}
          >
            🔥 {lot.bidsLast20s}/20s
          </p>
        </div>

        <div className={['mt-auto flex flex-col', gridTwoColumn ? 'gap-1' : 'gap-2'].join(' ')}>
          <button
            type="button"
            onClick={onBidNow}
            className={[
              'fetch-live-auctions-bid-now w-full rounded-xl bg-white font-extrabold uppercase tracking-wide text-zinc-900 shadow-[0_10px_36px_rgba(255,255,255,0.08)] active:scale-[0.99]',
              gridTwoColumn ? 'py-2.5 text-[10px]' : 'rounded-2xl py-4 text-[16px]',
            ].join(' ')}
          >
            {gridTwoColumn ? 'Bid' : '🔴 Bid now'}
          </button>
          <button
            type="button"
            onClick={onWatch}
            className={[
              'w-full rounded-xl border border-zinc-200 bg-white font-bold text-zinc-700 active:bg-zinc-100',
              gridTwoColumn ? 'py-2 text-[10px]' : 'rounded-2xl py-3 text-[14px]',
            ].join(' ')}
          >
            Watch
          </button>
        </div>
      </div>
    </article>
  )
})
