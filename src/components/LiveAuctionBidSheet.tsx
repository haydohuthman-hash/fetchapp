import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatAuctionAud, type LiveAuctionDemoLot } from '../lib/liveAuctionsDemo'

type InnerProps = {
  lot: LiveAuctionDemoLot
  effectiveBidCents: number
  onClose: () => void
  onPlaceBid: (amountCents: number) => void
}

function LiveAuctionBidSheetInner({ lot, effectiveBidCents, onClose, onPlaceBid }: InnerProps) {
  const [extra, setExtra] = useState(0)

  const increment = lot.incrementCents
  const nextBid = useMemo(
    () => effectiveBidCents + increment + extra,
    [effectiveBidCents, increment, extra],
  )

  const bump = useCallback((cents: number) => {
    setExtra((x) => x + cents)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[85] flex flex-col justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/38 backdrop-blur-[2px]"
        aria-label="Close bid sheet"
        onClick={onClose}
      />
      <div
        className="relative z-[1] rounded-t-[1.35rem] border border-zinc-200 bg-[var(--color-fetch-soft-gray,#faf9f5)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_60px_rgba(0,0,0,0.2)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-auction-bid-sheet-title"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300" aria-hidden />
        <h2 id="live-auction-bid-sheet-title" className="text-lg font-extrabold text-zinc-900">
          Place a bid
        </h2>
        <p className="mt-1 line-clamp-2 text-[13px] font-medium text-zinc-600">{lot.title}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-zinc-200 shadow-[0_4px_18px_-12px_rgba(0,0,0,0.18)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Current bid</p>
            <p className="mt-1 text-xl font-black tabular-nums text-zinc-900">
              {formatAuctionAud(effectiveBidCents)}
            </p>
          </div>
          <div className="rounded-xl bg-zinc-800 px-3 py-3 ring-1 ring-zinc-700">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Your bid</p>
            <p className="mt-1 text-xl font-black tabular-nums text-white">{formatAuctionAud(nextBid)}</p>
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] font-semibold text-zinc-500">
          + {formatAuctionAud(increment)} increments
        </p>

        <div className="mt-3 flex justify-center gap-2">
          {([5, 10, 20] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => bump(n * 100)}
              className="min-w-[4.25rem] rounded-xl bg-white py-2.5 text-[14px] font-extrabold text-zinc-800 ring-1 ring-zinc-200 shadow-[0_3px_10px_-8px_rgba(0,0,0,0.2)] active:scale-[0.98]"
            >
              +${n}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onPlaceBid(nextBid)}
          className="mt-5 w-full rounded-2xl bg-white py-4 text-[16px] font-extrabold text-zinc-900 shadow-[0_8px_28px_rgba(255,255,255,0.08)] active:scale-[0.99]"
        >
          Place bid
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full py-2 text-[13px] font-semibold text-zinc-600"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

type Props = {
  lot: LiveAuctionDemoLot | null
  effectiveBidCents: number
  onClose: () => void
  onPlaceBid: (amountCents: number) => void
}

export function LiveAuctionBidSheet({ lot, effectiveBidCents, onClose, onPlaceBid }: Props) {
  if (!lot) return null

  return createPortal(
    <LiveAuctionBidSheetInner
      key={lot.listingId}
      lot={lot}
      effectiveBidCents={effectiveBidCents}
      onClose={onClose}
      onPlaceBid={onPlaceBid}
    />,
    document.body,
  )
}
