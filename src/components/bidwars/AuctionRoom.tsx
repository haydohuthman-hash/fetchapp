/**
 * AuctionRoom — full-screen Bid Wars auction overlay using the new kit + store.
 *
 * Modes:
 *  - "auction": classic single-host live auction with quick bid chips and bid history.
 *  - "bidwar": 1v1 layout with avatars, VS badge, horizontal BidWarMeter.
 *
 * Phases: lobby (upcoming) → live → going-once → won / outbid.
 *
 * The bid flow goes through [./BidSlipDrawer.tsx](./BidSlipDrawer.tsx) so users
 * always confirm a bid before it lands. Wins/Outbids commit to the unified
 * store from [../../lib/data/store.ts](../../lib/data/store.ts).
 */

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  formatAud,
  recordOutbid,
  recordWin,
  setAuctionStatus,
  toggleWatch,
  useAuction,
  useIsWatching,
  useSeller,
} from '../../lib/data'
import { BidButton } from './BidButton'
import { BidSlipDrawer } from './BidSlipDrawer'
import { BidWarMeter } from './BidWarMeter'
import { CountdownTimer } from './CountdownTimer'
import { LiveBadge } from './LiveBadge'

type AuctionMode = 'auction' | 'bidwar'

type Props = {
  open: boolean
  auctionId: string | null
  mode?: AuctionMode
  onClose: () => void
  onViewOrder?: (orderId?: string) => void
  onFindSimilar?: () => void
}

const QUICK_INCREMENTS_CENTS = [200, 500, 1_000, 2_500] as const

type Phase = 'lobby' | 'live' | 'going' | 'won' | 'outbid'

export function AuctionRoom({
  open,
  auctionId,
  mode = 'auction',
  onClose,
  onViewOrder,
  onFindSimilar,
}: Props) {
  const auction = useAuction(auctionId ?? undefined)
  const seller = useSeller(auction?.sellerId ?? null)
  const watching = useIsWatching(auctionId ?? '')
  const [phase, setPhase] = useState<Phase>('lobby')
  const [bidSlipAmount, setBidSlipAmount] = useState<number | null>(null)
  const [orderInfo, setOrderInfo] = useState<{ paidCents: number; savedCents: number } | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!open) return
    setPhase((prev) => (prev === 'won' || prev === 'outbid' ? prev : 'lobby'))
    setOrderInfo(null)
  }, [open, auctionId])

  useEffect(() => {
    if (!open) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [open])

  useEffect(() => {
    if (!open || !auction) return
    if (phase === 'won' || phase === 'outbid') return
    if (auction.status === 'upcoming' && now < auction.startsAt) {
      if (phase !== 'lobby') setPhase('lobby')
      return
    }
    const remainingSec = Math.ceil((auction.endsAt - now) / 1000)
    if (remainingSec <= 0) {
      if (auction.topBidderId === 'me_viewer') {
        const result = recordWin(auction.id)
        setOrderInfo(result)
        setPhase('won')
      } else {
        recordOutbid(auction.id, '@opponent')
        setAuctionStatus(auction.id, 'ended')
        setPhase('outbid')
      }
      return
    }
    if (remainingSec <= 5 && phase !== 'going') setPhase('going')
    else if (remainingSec > 5 && phase !== 'live' && phase !== 'going') setPhase('live')
  }, [open, auction, now, phase])

  if (!open || !auction) return null
  if (typeof document === 'undefined') return null

  const minNextBidCents = Math.max(
    auction.currentBidCents + 100,
    auction.startingBidCents,
  )
  const isLive = phase === 'live' || phase === 'going'

  const onBidPress = (amountCents: number) => {
    if (amountCents <= auction.currentBidCents) return
    setBidSlipAmount(amountCents)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9985] flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-label={`${auction.title} auction`}
    >
      {/* Top bar */}
      <header className="relative z-[3] flex shrink-0 items-center gap-2 px-3 pt-[max(0.7rem,env(safe-area-inset-top,0px))] pb-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close auction"
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-zinc-800 ring-1 ring-zinc-200 shadow-sm active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[12px] font-bold text-zinc-500">
            {seller?.handle ?? 'Live host'} · {auction.category.replace(/-/g, ' ')}
          </p>
          <p className="line-clamp-1 text-[15px] font-black tracking-tight text-zinc-950">
            {auction.title}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isLive ? <LiveBadge viewers={auction.viewerCount} /> : null}
          <button
            type="button"
            onClick={() => toggleWatch(auction.id)}
            aria-label={watching ? 'Unwatch' : 'Watch'}
            className={[
              'grid h-9 w-9 place-items-center rounded-full ring-1 ring-zinc-200',
              watching ? 'bg-violet-100 text-[#4c1d95]' : 'bg-white text-zinc-700',
            ].join(' ')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={watching ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 21s-7-4.35-7-10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 19 11c0 5.65-7 10-7 10z" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Share"
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-zinc-700 ring-1 ring-zinc-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 12v8h16v-8M16 6l-4-4-4 4M12 2v14" />
            </svg>
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="relative z-[2] flex min-h-0 flex-1 flex-col overflow-hidden">
        {phase === 'won' && orderInfo ? (
          <WonStage
            title={auction.title}
            imageUrl={auction.imageUrls[0]}
            paidCents={orderInfo.paidCents}
            savedCents={orderInfo.savedCents}
            onViewOrder={() => onViewOrder?.()}
            onShare={() => undefined}
            onContinue={onClose}
          />
        ) : phase === 'outbid' ? (
          <OutbidStage
            title={auction.title}
            imageUrl={auction.imageUrls[0]}
            onBidAgain={() => {
              setAuctionStatus(auction.id, 'live')
              setPhase('live')
            }}
            onFindSimilar={() => {
              onClose()
              onFindSimilar?.()
            }}
          />
        ) : (
          <ActiveStage
            mode={mode}
            phase={phase}
            auctionId={auction.id}
            onBidPress={onBidPress}
            minNextBidCents={minNextBidCents}
          />
        )}
      </main>

      <BidSlipDrawer
        open={bidSlipAmount != null}
        auctionId={auction.id}
        bidAmountCents={bidSlipAmount ?? 0}
        onClose={() => setBidSlipAmount(null)}
      />
    </div>,
    document.body,
  )
}

/* -------------------------- active live / lobby stage -------------------------- */

type ActiveStageProps = {
  mode: AuctionMode
  phase: Phase
  auctionId: string
  onBidPress: (amountCents: number) => void
  minNextBidCents: number
}

function ActiveStage({ mode, phase, auctionId, onBidPress, minNextBidCents }: ActiveStageProps) {
  const auction = useAuction(auctionId)
  const seller = useSeller(auction?.sellerId ?? null)
  const [customOpen, setCustomOpen] = useState(false)
  const [customDollars, setCustomDollars] = useState<string>(() =>
    auction ? Math.ceil(minNextBidCents / 100).toString() : '',
  )

  const recentBids = useMemo(() => {
    if (!auction) return [] as Array<{ id: string; handle: string; amountCents: number }>
    const list: Array<{ id: string; handle: string; amountCents: number }> = []
    let amount = auction.currentBidCents
    const handles = ['@you', '@jordan.k', '@zara.p', '@nova.r', '@mia.w']
    for (let i = 0; i < Math.min(5, auction.bidCount); i += 1) {
      list.push({ id: `${auction.id}_bid_${i}`, handle: handles[i % handles.length], amountCents: amount })
      amount = Math.max(auction.startingBidCents, amount - 200 - i * 50)
    }
    return list
  }, [auction])

  if (!auction) return null

  const targetTime = phase === 'lobby' ? auction.startsAt : auction.endsAt
  const timerPrefix = phase === 'lobby' ? 'Starts in' : phase === 'going' ? 'Going' : 'Ends in'

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-2">
      {/* Hero media */}
      <div className="relative mt-1 aspect-[4/5] w-full overflow-hidden rounded-3xl bg-zinc-100 ring-1 ring-zinc-200">
        <img
          src={auction.imageUrls[0]}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
          {seller ? (
            <span className="flex items-center gap-2 rounded-full bg-white/95 px-2 py-1 ring-1 ring-zinc-200 shadow-sm">
              <img
                src={seller.avatarUrl}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
                draggable={false}
              />
              <span className="text-[12px] font-black text-zinc-900">{seller.displayName}</span>
            </span>
          ) : null}
          <CountdownTimer endsAt={targetTime} prefix={timerPrefix} />
        </div>
      </div>

      {/* Bid summary */}
      {mode === 'bidwar' ? (
        <BidWarSummary auctionId={auctionId} />
      ) : (
        <ClassicSummary auctionId={auctionId} minNextBidCents={minNextBidCents} />
      )}

      {/* Quick chips + bid */}
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {QUICK_INCREMENTS_CENTS.map((inc) => {
            const target = auction.currentBidCents + inc
            return (
              <button
                key={inc}
                type="button"
                onClick={() => onBidPress(Math.max(target, minNextBidCents))}
                className="rounded-full bg-violet-50 px-3 py-2 text-[12px] font-black text-[#4c1d95] ring-1 ring-violet-200 transition-transform active:scale-[0.97]"
              >
                +${(inc / 100).toFixed(0)}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setCustomOpen((v) => !v)}
            className={[
              'rounded-full px-3 py-2 text-[12px] font-black ring-1 transition-transform active:scale-[0.97]',
              customOpen
                ? 'bg-[#4c1d95] text-white ring-[#4c1d95]'
                : 'bg-white text-zinc-700 ring-zinc-200',
            ].join(' ')}
          >
            Custom
          </button>
        </div>
        {customOpen ? (
          <div className="flex items-center gap-2 rounded-2xl bg-zinc-50 p-2 ring-1 ring-zinc-200">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#4c1d95] ring-1 ring-zinc-200">$</span>
            <input
              type="number"
              inputMode="decimal"
              min={Math.ceil(minNextBidCents / 100)}
              step={1}
              value={customDollars}
              onChange={(e) => setCustomDollars(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[15px] font-black text-zinc-900 outline-none"
            />
            <button
              type="button"
              onClick={() => {
                const cents = Math.round(Number(customDollars || '0') * 100)
                if (cents > 0) onBidPress(cents)
              }}
              className="rounded-full bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] px-3 py-2 text-[12px] font-black text-white"
            >
              Bid
            </button>
          </div>
        ) : null}
        <BidButton
          amountLabel={formatAud(minNextBidCents)}
          onPress={() => onBidPress(minNextBidCents)}
          size="xl"
          disabled={phase === 'lobby'}
        />
        {phase === 'lobby' ? (
          <p className="text-center text-[11.5px] font-semibold text-zinc-500">
            Bidding opens when the timer hits zero.
          </p>
        ) : null}
      </div>

      {/* Bid history */}
      <section className="mt-4 rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-zinc-500">
            Bid history
          </p>
          <p className="text-[10.5px] font-bold text-zinc-400">{auction.bidCount} bids</p>
        </div>
        <div className="mt-2 flex flex-col gap-1.5">
          {recentBids.length === 0 ? (
            <p className="text-[12px] font-medium text-zinc-500">
              No bids yet — be the first.
            </p>
          ) : (
            recentBids.map((b, i) => (
              <div
                key={b.id}
                className={[
                  'flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1',
                  i === 0 ? 'ring-violet-300 shadow-sm' : 'ring-zinc-200',
                ].join(' ')}
              >
                <span className="text-[12px] font-black text-zinc-900">{b.handle}</span>
                <span className="text-[12px] font-black tabular-nums text-[#4c1d95]">
                  {formatAud(b.amountCents)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function ClassicSummary({ auctionId, minNextBidCents }: { auctionId: string; minNextBidCents: number }) {
  const auction = useAuction(auctionId)
  if (!auction) return null
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <div className="rounded-2xl bg-white p-3 ring-1 ring-zinc-200 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
          Current bid
        </p>
        <p className="mt-1 text-[24px] font-black tabular-nums text-zinc-950">
          {formatAud(auction.currentBidCents)}
        </p>
        <p className="mt-1 text-[10.5px] font-semibold text-zinc-500">{auction.bidCount} bids</p>
      </div>
      <div className="rounded-2xl bg-violet-50 p-3 ring-1 ring-violet-200 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#4c1d95]/70">
          Next minimum
        </p>
        <p className="mt-1 text-[24px] font-black tabular-nums text-[#4c1d95]">
          {formatAud(minNextBidCents)}
        </p>
        <p className="mt-1 text-[10.5px] font-semibold text-[#4c1d95]/75">
          Est. value {formatAud(auction.estValueCents)}
        </p>
      </div>
    </div>
  )
}

function BidWarSummary({ auctionId }: { auctionId: string }) {
  const auction = useAuction(auctionId)
  if (!auction) return null
  const youAreLeading = auction.topBidderId === 'me_viewer'
  const opponentBid = Math.max(0, auction.currentBidCents - 250)
  const yourBid = auction.currentBidCents
  return (
    <div className="mt-3 rounded-3xl bg-white p-3 ring-1 ring-zinc-200 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <SidePill
          align="left"
          handle="@you"
          name="You"
          amount={yourBid}
          leading={youAreLeading}
        />
        <span className="grid h-12 w-12 place-items-center rounded-full bg-zinc-900 text-white text-[12px] font-black uppercase tracking-[0.12em]">
          VS
        </span>
        <SidePill
          align="right"
          handle="@jordan.k"
          name="Jordan"
          amount={opponentBid}
          leading={!youAreLeading}
        />
      </div>
      <BidWarMeter
        leftCents={yourBid}
        rightCents={opponentBid}
        leftLabel="@you"
        rightLabel="@jordan"
        className="mt-3"
      />
      <p className={[
        'mt-2 text-center text-[12px] font-black uppercase tracking-[0.14em]',
        youAreLeading ? 'text-emerald-600' : 'text-rose-600',
      ].join(' ')}>
        {youAreLeading ? "You're in the lead" : "You've been outbid"}
      </p>
    </div>
  )
}

function SidePill({
  align,
  handle,
  name,
  amount,
  leading,
}: {
  align: 'left' | 'right'
  handle: string
  name: string
  amount: number
  leading: boolean
}) {
  return (
    <div className={['min-w-0 flex-1', align === 'right' ? 'text-right' : 'text-left'].join(' ')}>
      <p className="line-clamp-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400">
        {handle}
      </p>
      <p className="line-clamp-1 text-[14px] font-black tracking-tight text-zinc-950">{name}</p>
      <p className={[
        'mt-1 text-[18px] font-black tabular-nums',
        leading ? 'text-[#4c1d95]' : 'text-zinc-700',
      ].join(' ')}>
        {formatAud(amount)}
      </p>
    </div>
  )
}

/* ----------------------------- Won stage ----------------------------- */

function WonStage({
  title,
  imageUrl,
  paidCents,
  savedCents,
  onViewOrder,
  onShare,
  onContinue,
}: {
  title: string
  imageUrl: string
  paidCents: number
  savedCents: number
  onViewOrder: () => void
  onShare: () => void
  onContinue: () => void
}) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-violet-100 via-white to-white px-5 pb-5">
      <ConfettiOverlay />
      <span className="mt-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
        You Won!
      </span>
      <h2 className="mt-2 text-center text-[28px] font-black tracking-[-0.03em] text-zinc-950 sm:text-[32px]">
        {title}
      </h2>
      <span className="mt-3 block aspect-square w-[60%] max-w-[260px] overflow-hidden rounded-3xl bg-white shadow-[0_28px_48px_-22px_rgba(76,29,149,0.55)] ring-1 ring-zinc-200">
        <img src={imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
      </span>
      <div className="mt-4 grid w-full max-w-md grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-zinc-200 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">Winning bid</p>
          <p className="mt-1 text-[18px] font-black tabular-nums text-zinc-900">
            {formatAud(paidCents)}
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700/85">You saved</p>
          <p className="mt-1 text-[18px] font-black tabular-nums text-emerald-700">
            {formatAud(savedCents)}
          </p>
        </div>
      </div>
      <div className="mt-auto flex w-full max-w-md flex-col gap-2 pt-4">
        <button
          type="button"
          onClick={onViewOrder}
          className="rounded-full bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] py-3.5 text-[14px] font-black uppercase tracking-[0.06em] text-white shadow-[0_18px_38px_-14px_rgba(76,29,149,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/10 transition-transform active:scale-[0.985]"
        >
          View order
        </button>
        <button
          type="button"
          onClick={onShare}
          className="rounded-full bg-white py-3 text-[13px] font-black uppercase tracking-[0.06em] text-[#4c1d95] ring-1 ring-violet-200"
        >
          Share your win
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full bg-transparent py-2 text-[12px] font-bold text-zinc-500"
        >
          Continue shopping
        </button>
      </div>
    </div>
  )
}

function ConfettiOverlay() {
  const palette = ['#4c1d95', '#7c3aed', '#a78bfa', '#f59e0b', '#fbbf24', '#22c55e', '#f472b6']
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 22 }, (_, i) => {
        const seed = (i + 1) * 9301 + 49297
        const r = (n: number) => {
          const x = Math.sin(seed + n) * 10000
          return x - Math.floor(x)
        }
        return (
          <span
            key={i}
            className="absolute"
            style={{
              left: `${(r(1) * 100).toFixed(2)}%`,
              top: `${(r(2) * 70).toFixed(2)}%`,
              width: `${6 + Math.floor(r(3) * 8)}px`,
              height: `${10 + Math.floor(r(4) * 6)}px`,
              background: palette[Math.floor(r(5) * palette.length)],
              transform: `rotate(${(r(6) * 360).toFixed(0)}deg)`,
              borderRadius: r(7) > 0.5 ? '999px' : '2px',
              opacity: 0.65,
            }}
          />
        )
      })}
    </span>
  )
}

/* ----------------------------- Outbid stage ----------------------------- */

function OutbidStage({
  title,
  imageUrl,
  onBidAgain,
  onFindSimilar,
}: {
  title: string
  imageUrl: string
  onBidAgain: () => void
  onFindSimilar: () => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center bg-white px-5 pb-5">
      <span className="mt-4 inline-block rounded-full bg-rose-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-rose-700">
        Outbid
      </span>
      <h2 className="mt-2 text-center text-[26px] font-black tracking-[-0.03em] text-zinc-950">
        {title}
      </h2>
      <p className="mt-1 max-w-sm text-center text-[13px] font-medium text-zinc-500">
        Don&apos;t let it go. Bid again to retake the lead, or find a similar deal nearby.
      </p>
      <span className="mt-4 block aspect-square w-[58%] max-w-[240px] overflow-hidden rounded-3xl bg-zinc-100 ring-1 ring-zinc-200 shadow-sm">
        <img src={imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
      </span>
      <div className="mt-auto flex w-full max-w-md flex-col gap-2 pt-5">
        <button
          type="button"
          onClick={onBidAgain}
          className="rounded-full bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] py-3.5 text-[14px] font-black uppercase tracking-[0.06em] text-white shadow-[0_18px_38px_-14px_rgba(76,29,149,0.55)] ring-1 ring-white/10 active:scale-[0.985]"
        >
          Bid again
        </button>
        <button
          type="button"
          onClick={onFindSimilar}
          className="rounded-full bg-white py-3 text-[13px] font-black uppercase tracking-[0.06em] text-[#4c1d95] ring-1 ring-violet-200"
        >
          Find similar deals
        </button>
      </div>
    </div>
  )
}
