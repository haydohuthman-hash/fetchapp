/**
 * Bid Slip drawer — sports-bet style confirmation before a bid lands. Bottom
 * sheet that slides up over the auction room, shows the bet preview (item,
 * current bid, your bid, savings, payment method), and confirms with optimistic
 * update.
 */

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  consumeBidBoost,
  formatAud,
  placeBid,
  useAuction,
  useBidBoostCount,
  useIsTopBidderActive,
  useWalletBalanceCents,
} from '../../lib/data'

/** A Bid Boost adds +$1 to the next eligible bid. */
const BID_BOOST_VALUE_CENTS = 100

type Props = {
  open: boolean
  auctionId: string | null
  bidAmountCents: number
  onClose: () => void
  onConfirmed?: (auctionId: string, amountCents: number) => void
}

export function BidSlipDrawer({ open, auctionId, bidAmountCents, onClose, onConfirmed }: Props) {
  const auction = useAuction(auctionId ?? undefined)
  const wallet = useWalletBalanceCents()
  const bidBoostCount = useBidBoostCount()
  const topBidderActive = useIsTopBidderActive()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useBoost, setUseBoost] = useState(false)

  const finalBidCents = useBoost ? bidAmountCents + BID_BOOST_VALUE_CENTS : bidAmountCents

  const savings = useMemo(() => {
    if (!auction) return 0
    return Math.max(0, auction.estValueCents - finalBidCents)
  }, [auction, finalBidCents])

  useEffect(() => {
    if (!open) {
      setBusy(false)
      setError(null)
      setUseBoost(false)
    }
  }, [open])

  // Default the toggle to ON whenever the drawer reopens with at least one
  // boost available, so the perk doesn't sit unused.
  useEffect(() => {
    if (open) setUseBoost(bidBoostCount > 0)
  }, [open, bidBoostCount])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !auction) return null
  if (typeof document === 'undefined') return null

  const insufficient = wallet < finalBidCents
  const validBid = finalBidCents > auction.currentBidCents

  const onConfirm = async () => {
    if (busy) return
    setError(null)
    if (!validBid) {
      setError('Bid must be higher than the current bid.')
      return
    }
    if (insufficient) {
      setError('Add funds to your wallet to place this bid.')
      return
    }
    setBusy(true)
    try {
      // Consume the Bid Boost first so we don't double-spend on retries.
      if (useBoost && bidBoostCount > 0) consumeBidBoost()
      const ok = placeBid(auction.id, finalBidCents)
      if (!ok) {
        setError('Could not place bid. Try again.')
        return
      }
      onConfirmed?.(auction.id, finalBidCents)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9990] flex flex-col justify-end bg-[#1c1528]/40 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fetch-bidslip-title"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-default border-0 bg-transparent p-0"
        aria-label="Cancel bid"
        onClick={onClose}
      />
      <div
        className="relative z-[1] mx-auto w-full max-w-[min(100%,430px)] rounded-t-[1.5rem] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-2 shadow-[0_-22px_60px_-30px_rgba(15,7,40,0.5)] ring-1 ring-zinc-200 animate-[fetch-galactic-sheet-up_0.3s_cubic-bezier(0.22,1,0.36,1)_both]"
      >
        <span aria-hidden className="mx-auto mb-2 block h-1 w-10 rounded-full bg-zinc-200" />

        <header className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4c1d95]">
              Bid slip
            </p>
            <h2 id="fetch-bidslip-title" className="text-[20px] font-black tracking-tight text-zinc-900">
              Confirm your bid
            </h2>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-violet-100 text-[#4c1d95]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M13 2L4.5 14H12l-1 8 8.5-12H12l1-8z" />
            </svg>
          </span>
        </header>

        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-zinc-50 p-2 ring-1 ring-zinc-200">
          <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-200">
            <img
              src={auction.imageUrls[0]}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-[14px] font-black tracking-tight text-zinc-900">
              {auction.title}
            </p>
            <p className="line-clamp-1 text-[11px] font-semibold text-zinc-500">
              {auction.subtitle ?? 'Live auction'}
            </p>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px] font-semibold text-zinc-700">
          <div className="rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
            <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400">
              Current bid
            </dt>
            <dd className="mt-1 text-[15px] font-black tabular-nums text-zinc-900">
              {formatAud(auction.currentBidCents)}
            </dd>
          </div>
          <div className="rounded-2xl bg-violet-50 p-3 ring-1 ring-violet-200">
            <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-[#4c1d95]/75">
              Your bid {useBoost ? '· boosted' : ''}
            </dt>
            <dd className="mt-1 text-[18px] font-black tabular-nums text-[#4c1d95]">
              {formatAud(finalBidCents)}
            </dd>
            {useBoost ? (
              <p className="mt-0.5 text-[10px] font-bold text-violet-600">
                +{formatAud(BID_BOOST_VALUE_CENTS)} from Bid Boost
              </p>
            ) : null}
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
            <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700/85">
              Potential save
            </dt>
            <dd className="mt-1 text-[15px] font-black tabular-nums text-emerald-700">
              {formatAud(savings)}
            </dd>
          </div>
          <div className="rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
            <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400">
              Wallet balance
            </dt>
            <dd className="mt-1 text-[15px] font-black tabular-nums text-zinc-900">
              {formatAud(wallet)}
            </dd>
          </div>
        </dl>

        {bidBoostCount > 0 ? (
          <button
            type="button"
            onClick={() => setUseBoost((v) => !v)}
            aria-pressed={useBoost}
            className={[
              'mt-3 flex w-full items-center justify-between gap-2 rounded-2xl p-3 ring-1 transition-colors',
              useBoost
                ? 'bg-violet-50 ring-violet-300 text-[#4c1d95]'
                : 'bg-white ring-zinc-200 text-zinc-700',
            ].join(' ')}
          >
            <span className="flex items-center gap-2">
              <span className={[
                'grid h-9 w-9 place-items-center rounded-xl text-white',
                useBoost ? 'bg-[#4c1d95]' : 'bg-zinc-300',
              ].join(' ')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M13 2L4.5 14H12l-1 8 8.5-12H12l1-8z" />
                </svg>
              </span>
              <span className="text-left">
                <span className="block text-[12.5px] font-black">
                  Use Bid Boost {useBoost ? `(+${formatAud(BID_BOOST_VALUE_CENTS)})` : ''}
                </span>
                <span className="block text-[10.5px] font-semibold">
                  {bidBoostCount} available · adds {formatAud(BID_BOOST_VALUE_CENTS)} to this bid
                </span>
              </span>
            </span>
            <span
              className={[
                'inline-flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors',
                useBoost ? 'bg-[#4c1d95]' : 'bg-zinc-300',
              ].join(' ')}
              aria-hidden
            >
              <span
                className={[
                  'h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                  useBoost ? 'translate-x-4' : 'translate-x-0',
                ].join(' ')}
              />
            </span>
          </button>
        ) : null}

        {topBidderActive ? (
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10.5px] font-black uppercase tracking-[0.08em] text-amber-700 ring-1 ring-amber-300">
            <span aria-hidden>👑</span> Top Bidder badge active
          </p>
        ) : null}

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-900 text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
                <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
              </svg>
            </span>
            <div>
              <p className="text-[12px] font-black text-zinc-900">Visa ··4242</p>
              <p className="text-[10.5px] font-semibold text-zinc-500">Default · charged on win</p>
            </div>
          </div>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#4c1d95]">
            Change
          </span>
        </div>

        {error ? (
          <p className="mt-3 text-center text-[12px] font-semibold text-red-600">{error}</p>
        ) : null}

        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || !validBid}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] py-3.5 text-[15px] font-black uppercase tracking-[0.06em] text-white shadow-[0_18px_38px_-14px_rgba(76,29,149,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/10 transition-transform active:scale-[0.985] disabled:opacity-60"
          >
            {busy ? 'Placing bid…' : `Confirm ${formatAud(finalBidCents)} bid`}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-white py-2 text-[12.5px] font-bold text-zinc-500 hover:text-zinc-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
