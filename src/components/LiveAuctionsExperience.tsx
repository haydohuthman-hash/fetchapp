import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { buildLiveAuctionDemoLots, type LiveAuctionDemoLot } from '../lib/liveAuctionsDemo'
import { LiveAuctionBidSheet } from './LiveAuctionBidSheet'
import { LiveAuctionCard } from './LiveAuctionCard'
import { LiveAuctionFloatingEyes, type LiveAuctionEyesMood } from './LiveAuctionFloatingEyes'
import { LiveAuctionsSplash } from './LiveAuctionsSplash'

type Props = {
  topBar: ReactNode
  onOpenListing: (listingId: string) => void
  onWatchAll: () => void
}

export const LiveAuctionsExperience = memo(function LiveAuctionsExperience({
  topBar,
  onOpenListing,
  onWatchAll,
}: Props) {
  const lots = useMemo(() => buildLiveAuctionDemoLots(), [])
  const [showSplash, setShowSplash] = useState(true)
  const [feedEnter, setFeedEnter] = useState(false)
  const [bidByListingId, setBidByListingId] = useState<Record<string, number>>({})
  const [bidSheetLot, setBidSheetLot] = useState<LiveAuctionDemoLot | null>(null)
  const [shake, setShake] = useState(false)
  const [toast, setToast] = useState<{ text: string; tone: 'win' | 'lose' } | null>(null)
  const [eyesMood, setEyesMood] = useState<LiveAuctionEyesMood>('idle')
  const [activeListingId, setActiveListingId] = useState<string | null>(null)
  const [outbidFlash, setOutbidFlash] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  const onSplashDone = useCallback(() => {
    setShowSplash(false)
    setFeedEnter(true)
    window.setTimeout(() => setFeedEnter(false), 520)
  }, [])

  useEffect(() => {
    if (showSplash) return
    const id = window.setInterval(() => {
      setBidByListingId((prev) => {
        const pick = lots[Math.floor(Math.random() * Math.max(1, lots.length))]
        if (!pick) return prev
        const cur = prev[pick.listingId] ?? pick.currentBidCents
        return { ...prev, [pick.listingId]: cur + pick.incrementCents }
      })
      setEyesMood('bid')
      window.setTimeout(() => setEyesMood('idle'), 720)
    }, 4200 + Math.random() * 3800)
    return () => window.clearInterval(id)
  }, [showSplash, lots])

  useLayoutEffect(() => {
    if (showSplash) return
    const root = scrollRef.current
    if (!root) return
    const cards = root.querySelectorAll('[data-live-auction-card]')
    if (cards.length === 0) return
    const obs = new IntersectionObserver(
      (entries) => {
        let best: { id: string; ratio: number } | null = null
        for (const e of entries) {
          const id = e.target.getAttribute('data-live-auction-card') ?? ''
          if (!id) continue
          const r = e.intersectionRatio
          if (r >= 0.22 && (!best || r > best.ratio)) best = { id, ratio: r }
        }
        if (best) setActiveListingId(best.id)
      },
      { root, rootMargin: '-8% 0px -12% 0px', threshold: [0.25, 0.45, 0.65, 0.85] },
    )
    cards.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [showSplash, lots])

  const effectiveBid = useCallback(
    (lot: LiveAuctionDemoLot) => bidByListingId[lot.listingId] ?? lot.currentBidCents,
    [bidByListingId],
  )

  const sheetBid = bidSheetLot ? effectiveBid(bidSheetLot) : 0

  const onPlaceBid = useCallback(
    (amountCents: number) => {
      if (!bidSheetLot) return
      const cur = effectiveBid(bidSheetLot)
      const outbid = Math.random() < 0.36
      const lid = bidSheetLot.listingId
      setBidSheetLot(null)
      setShake(true)
      window.setTimeout(() => setShake(false), 420)
      if (outbid) {
        setBidByListingId((p) => ({
          ...p,
          [lid]: Math.max(amountCents + bidSheetLot.incrementCents, cur + bidSheetLot.incrementCents * 2),
        }))
        setOutbidFlash(true)
        window.setTimeout(() => setOutbidFlash(false), 220)
        setToast({ text: 'Outbid — bid again', tone: 'lose' })
      } else {
        setBidByListingId((p) => ({ ...p, [lid]: amountCents }))
        setToast({ text: "You're winning", tone: 'win' })
      }
      setEyesMood('bid')
      window.setTimeout(() => setEyesMood('idle'), 650)
      window.setTimeout(() => setToast(null), 2400)
    },
    [bidSheetLot, effectiveBid],
  )

  return (
    <>
      {showSplash ? <LiveAuctionsSplash onDone={onSplashDone} /> : null}

      <div
        className={[
          'relative flex min-h-0 flex-1 flex-col',
          shake ? 'fetch-live-auctions-shake' : '',
        ].join(' ')}
      >
        {outbidFlash ? (
          <div
            className="pointer-events-none fixed inset-0 z-[72] bg-[#FF2D2D]/18 animate-pulse"
            aria-hidden
          />
        ) : null}

        <div
          className="pointer-events-none absolute left-0 right-0 top-0 z-[73] flex justify-start gap-2 px-2 pt-[max(0.35rem,env(safe-area-inset-top,0px))]"
        >
          <div className="pointer-events-auto flex max-w-[calc(100%-4.5rem)] flex-wrap items-center gap-1.5 pr-1">
            {topBar}
          </div>
        </div>

        <div
          ref={scrollRef}
          className={[
            'fetch-live-auctions-feed-shell min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--color-fetch-soft-gray,#faf9f5)] [-webkit-overflow-scrolling:touch]',
            !showSplash && feedEnter ? 'fetch-live-auctions-feed-shell--enter' : '',
          ].join(' ')}
        >
          <div className="grid min-h-full grid-cols-2 gap-2 bg-[var(--color-fetch-soft-gray,#faf9f5)] px-1.5 pb-32 pt-[max(3.25rem,env(safe-area-inset-top,0px)+2.75rem)] sm:gap-2.5 sm:px-2">
            {lots.map((lot) => (
              <LiveAuctionCard
                key={lot.id}
                lot={lot}
                gridTwoColumn
                effectiveBidCents={effectiveBid(lot)}
                isActive={activeListingId === lot.listingId}
                urgent={lot.badge === 'ending_soon'}
                onBidNow={() => setBidSheetLot(lot)}
                onWatch={onWatchAll}
                onOpenListing={() => onOpenListing(lot.listingId)}
              />
            ))}
          </div>
        </div>

        {!showSplash ? <LiveAuctionFloatingEyes mood={eyesMood} /> : null}

        <LiveAuctionBidSheet
          lot={bidSheetLot}
          effectiveBidCents={sheetBid}
          onClose={() => setBidSheetLot(null)}
          onPlaceBid={onPlaceBid}
        />

        {toast ? (
          <div
            className={[
              'pointer-events-none fixed left-1/2 top-[max(5.5rem,env(safe-area-inset-top,0px)+4.5rem)] z-[78] max-w-[min(calc(100%-1.5rem),24rem)] -translate-x-1/2 rounded-2xl px-4 py-2.5 text-center text-[14px] font-extrabold shadow-xl',
              toast.tone === 'win'
                ? 'bg-white text-zinc-900 ring-2 ring-white/30'
                : 'bg-white text-red-600 ring-2 ring-red-200/80',
            ].join(' ')}
            role="status"
          >
            {toast.text}
          </div>
        ) : null}
      </div>
    </>
  )
})
