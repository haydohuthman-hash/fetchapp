import { Fragment, memo, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CURATED_DROP_REELS } from '../lib/drops/constants'
import type { DropReel } from '../lib/drops/types'
import { loadSession } from '../lib/fetchUserSession'
import {
  isPublicDemoListingId,
  listingImageAbsoluteUrl,
  peerListingCompareAtIfDiscounted,
  type PeerListing,
} from '../lib/listingsApi'
import { MARKETPLACE_MOCK_PEER_LISTINGS } from '../lib/marketplaceMockPeerListings'
import { SUPPLY_PRODUCTS, type SupplyProduct } from '../lib/suppliesCatalog'
import { type MarketplacePeerBrowseFilter } from './ExploreBrowseBanner'
import { MyFetchRewardsBanner } from './MyFetchRewardsBanner'
import { ListingQuickAddPlusCircleIcon } from './icons/HomeShellNavIcons'
import { ExploreCategoryBrowse } from './ExploreCategoryBrowse'
import { HomeBiddingWarTopBanner } from './HomeBiddingWarTopBanner'
import { LiveNowGrid, UpcomingLivesList, FollowingLivesList } from './FeedTabViews'
import becomeSellerBannerUrl from '../assets/become-a-seller-banner.png'
import { LiveAuctionScreen } from './bidwars/LiveAuctionScreen'

const FEED_TABS = ['For you', 'Live now', 'Bid War', 'Following'] as const
type FeedTab = (typeof FEED_TABS)[number]

function FeedTabBar({ value, onChange }: { value: FeedTab; onChange: (t: FeedTab) => void }) {
  return (
    <nav
      className="mt-[3.875rem] flex w-full items-stretch border-b border-zinc-200/70 px-0"
      role="tablist"
      aria-label="Feed"
    >
      {FEED_TABS.map((t) => {
        const active = t === value
        const isLive = t === 'Live now'
        return (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t)}
            className={[
              'relative flex flex-1 items-center justify-center gap-1.5 border-0 bg-transparent px-1 pb-2.5 pt-3 text-[13px] font-semibold leading-none tracking-[-0.01em] transition-colors sm:text-sm',
              active
                ? 'text-[#4c1d95]'
                : 'text-zinc-400 hover:text-zinc-600',
            ].join(' ')}
          >
            {isLive ? (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
            ) : null}
            {t}
            {active ? (
              <span className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-[#4c1d95]" />
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}

function BecomeSellerBanner({ onOpenMarketplace }: { onOpenMarketplace: () => void }) {
  return (
    <section className="min-w-0 px-2" aria-label="Become a seller">
      <button
        type="button"
        onClick={onOpenMarketplace}
        className="block w-full overflow-hidden rounded-2xl bg-emerald-950 text-left shadow-[0_14px_32px_-18px_rgba(21,128,61,0.7)] ring-1 ring-emerald-500/20 transition-transform active:scale-[0.99]"
      >
        <img
          src={becomeSellerBannerUrl}
          alt="Become a seller"
          className="block aspect-[1024/407] w-full object-cover"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </button>
    </section>
  )
}

export type HomeShellForYouFeedProps = {
  onOpenDrops: () => void
  onOpenMarketplace: () => void
  /** Explore premium tabs: open main shell Search (categories / search UI). */
  onOpenSearch?: () => void
  /** Explore: open marketplace peer grid with category / price filters. */
  onOpenMarketplaceBrowse?: (filter: MarketplacePeerBrowseFilter) => void
  /** Opens marketplace with listing sheet for this peer listing id. */
  onOpenPeerListing: (listingId: string) => void
  /** When set, listing tiles show quick buy (opens marketplace + checkout). */
  onQuickBuyPeerListing?: (listingId: string) => void
  className?: string
  /** Omit top title block when a parent supplies the headline (e.g. Explore). */
  embedded?: boolean
  /** Horizontal bleed for furniture promo inside scroll (`page` = cancel scroll `pr-0.5`; `tight` = landing `px-0.5`). */
  explorePromoBleed?: 'page' | 'tight'
}

/** Bottom scrim on square listing / seller image cards in home carousels. */
const FOR_YOU_LISTING_IMAGE_SCRIM =
  'pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_top,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.88)_12%,rgba(0,0,0,0.48)_38%,rgba(0,0,0,0.16)_56%,transparent_80%)]'

function formatAudFromCents(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatAud(n: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(n)
}

function reelPosterUrl(r: DropReel): string | undefined {
  const first = r.imageUrls?.[0]?.trim()
  if (first) return first
  return r.poster?.trim() || undefined
}

function reelProfileDisplayLine(r: DropReel): string {
  const s = r.seller.trim()
  return s.length > 0 ? s : 'Creator'
}

function hashReelId(reelId: string): number {
  let h = 0
  for (let i = 0; i < reelId.length; i += 1) h = (h * 31 + reelId.charCodeAt(i)) >>> 0
  return h
}

function liveViewersLabel(reelId: string): string {
  const v = 120 + (hashReelId(reelId) % 3900)
  return `${v.toLocaleString('en-US')} viewers`
}

function liveViewersCountShort(reelId: string): string {
  const v = 120 + (hashReelId(reelId) % 3900)
  return v.toLocaleString('en-US')
}

/** Demo “show length” in seconds — stable per reel until server sends real end time. */
function reelLiveDurationSeconds(reelId: string): number {
  const h = hashReelId(reelId)
  return 220 + (h % 380)
}

function initialLiveCountdown(reelId: string): { total: number; remaining: number } {
  const total = reelLiveDurationSeconds(reelId)
  const h = hashReelId(reelId)
  const p = 0.34 + ((h >>> 4) % 52) / 100
  const remaining = Math.max(24, Math.min(total - 1, Math.floor(total * p)))
  return { total, remaining }
}

function ReelLiveCountdownRing({
  reelId,
  size = 'sm',
}: {
  reelId: string
  /** `sm` for dense Explore grid, `md` for horizontal strip. */
  size?: 'sm' | 'md'
}) {
  const { total, remaining: startRemaining } = useMemo(() => initialLiveCountdown(reelId), [reelId])
  const [remaining, setRemaining] = useState(startRemaining)

  useEffect(() => {
    setRemaining(startRemaining)
  }, [reelId, startRemaining])

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining((s) => (s <= 1 ? total : s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [total])

  const box = size === 'md' ? 36 : 30
  const r = size === 'md' ? 13.25 : 10.75
  const stroke = size === 'md' ? 2.75 : 2.35
  const c = 2 * Math.PI * r
  const frac = total > 0 ? remaining / total : 0
  const dash = c * frac
  const mm = Math.floor(remaining / 60)
  const ss = remaining % 60
  const clock = `${mm}:${String(ss).padStart(2, '0')}`
  const cx = box / 2

  return (
    <div
      className="pointer-events-none relative flex shrink-0 items-center justify-center rounded-full bg-black/40 shadow-sm ring-1 ring-white/25 backdrop-blur-[3px]"
      style={{ width: box, height: box }}
      aria-hidden
    >
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} className="absolute inset-0 -rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-white"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <span
        className={[
          'relative z-[1] font-extrabold tabular-nums text-white',
          size === 'md' ? 'text-[9px]' : 'text-[8px]',
        ].join(' ')}
      >
        {clock}
      </span>
    </div>
  )
}

function ExploreEmbedLiveFeedTile({ reel, onOpenLive }: { reel: DropReel; onOpenLive: (reel: DropReel) => void }) {
  const poster = reelPosterUrl(reel)
  const viewersLabel = liveViewersLabel(reel.id)
  const viewersCount = liveViewersCountShort(reel.id)
  const sellerLine = reelProfileDisplayLine(reel)
  const titleLine = reel.title?.trim() || 'Live'
  return (
    <button
      type="button"
      onClick={() => onOpenLive(reel)}
      className="flex w-[calc((100%-1rem)/2.1)] shrink-0 snap-start flex-col bg-transparent p-0 text-left transition-transform active:scale-[0.98]"
      aria-label={`Live from ${sellerLine}. ${reel.priceLabel}, ${viewersLabel}`}
    >
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
        {poster ? (
          <img
            src={poster}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">No photo</div>
        )}
        <div className={FOR_YOU_LISTING_IMAGE_SCRIM} aria-hidden />
        <div className="pointer-events-none absolute left-1 top-1 z-[3] flex max-w-[calc(100%-0.5rem)] items-stretch overflow-hidden whitespace-nowrap rounded-md shadow-[0_6px_18px_-10px_rgba(76,29,149,0.6)] ring-1 ring-black/15">
          <span className="flex items-center bg-rose-600 px-1.5 py-[3px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-white">
            Live
          </span>
          <span className="flex items-center gap-1 bg-[#4c1d95] px-1.5 py-[3px] text-[11px] font-extrabold tabular-nums leading-none text-white">
            <svg
              className="h-3 w-3 shrink-0 text-white/90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {viewersCount}
          </span>
        </div>
        <p className="pointer-events-none absolute bottom-0 left-0 z-[4] max-w-full truncate px-2 pb-2 pt-8 text-left text-[13px] font-semibold leading-tight text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.9)]">
          {sellerLine}
        </p>
      </div>
      <p className="mt-1.5 line-clamp-2 min-h-[2.15em] text-[12px] font-extrabold leading-tight tracking-[-0.01em] text-zinc-900">
        {titleLine}
      </p>
    </button>
  )
}

function ExplorePeerListingCard({
  l,
  onOpenPeerListing,
  onQuickBuyPeerListing,
}: {
  l: PeerListing
  onOpenPeerListing: (listingId: string) => void
  onQuickBuyPeerListing?: (listingId: string) => void
}) {
  const img = l.images?.[0]?.url
  const compareWas = peerListingCompareAtIfDiscounted(l)
  const priceStr = formatAudFromCents(l.priceCents ?? 0)
  const fulfillment = peerListingFulfillmentLabel(l)
  const fetchFromPrice = formatAudFromCents((l.priceCents ?? 0) + peerListingDeliveryFeeCents(l))
  const label =
    compareWas != null
      ? `${l.title}, was ${formatAudFromCents(compareWas)}, now ${priceStr}, ${fulfillment}, or fetch it from ${fetchFromPrice}`
      : `${l.title}, ${priceStr}, ${fulfillment}, or fetch it from ${fetchFromPrice}`
  const sessionEmail = loadSession()?.email?.trim() ?? ''
  const sellerEm = l.sellerEmail?.trim().toLowerCase() ?? ''
  const viewerEm = sessionEmail.toLowerCase()
  const isViewerSeller = Boolean(sellerEm && viewerEm && sellerEm === viewerEm)
  const showQuickAdd = Boolean(onQuickBuyPeerListing) && !isViewerSeller
  const isDemo = isPublicDemoListingId(l.id)
  const canQuickAdd = Boolean(sessionEmail) && !isDemo
  const quickTitle = !sessionEmail
    ? 'Sign in to buy'
    : isDemo
      ? 'Checkout unavailable for showcase listings'
      : 'Quick buy — open checkout'

  return (
    <div className="fetch-apple-warp-btn flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white text-left text-[#1c1528] shadow-sm ring-1 ring-violet-200/50 transition-[transform,box-shadow] active:scale-[0.98]">
      <div className="relative aspect-[9/14] w-full overflow-hidden bg-violet-100">
        {img ? (
          <img
            src={listingImageAbsoluteUrl(img)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-violet-300">No preview</div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {compareWas != null ? (
          <div className="pointer-events-none absolute left-1.5 top-1.5 z-[2] rounded-full bg-[#dc2626] px-2 py-0.5 shadow-sm">
            <span className="text-[10px] font-bold uppercase leading-none text-white">
              {Math.round(((compareWas - (l.priceCents ?? 0)) / compareWas) * 100)}% off
            </span>
          </div>
        ) : null}
        <button
          type="button"
          aria-label={label}
          className="absolute inset-0 z-[2] m-0 cursor-pointer border-0 bg-transparent p-0 outline-none active:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#4c1d95]"
          onClick={() => onOpenPeerListing(l.id)}
        />
        {showQuickAdd ? (
          <button
            type="button"
            aria-label={canQuickAdd ? `Quick buy: ${l.title}` : quickTitle}
            title={quickTitle}
            aria-disabled={!canQuickAdd}
            className={[
              'absolute right-1.5 top-1.5 z-[3] flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white text-[#4c1d95] shadow-sm transition-transform',
              canQuickAdd ? 'active:scale-95' : 'cursor-default opacity-45',
            ].join(' ')}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              if (!canQuickAdd || !onQuickBuyPeerListing) return
              onQuickBuyPeerListing(l.id)
            }}
          >
            <ListingQuickAddPlusCircleIcon className="h-full w-full" />
          </button>
        ) : null}
        <p className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] truncate px-2 pb-2 text-[13px] font-semibold leading-tight text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
          {fulfillment}
        </p>
      </div>
      <button
        type="button"
        aria-label={label}
        className="flex min-w-0 flex-col gap-0.5 px-2.5 py-2 text-left outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#4c1d95]"
        onClick={() => onOpenPeerListing(l.id)}
      >
        <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-[#1c1528]">{l.title}</p>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-[11px] font-bold tabular-nums text-violet-600">{priceStr}</span>
          {compareWas != null ? (
            <span className="text-[10px] font-medium tabular-nums text-zinc-400 line-through">
              {formatAudFromCents(compareWas)}
            </span>
          ) : null}
        </div>
        <p className="flex items-center gap-1 text-[10px] font-medium leading-none text-zinc-500">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-violet-500">
            <path d="M13 2L4.5 14H12l-1 8 8.5-12H12l1-8z" fill="currentColor" />
          </svg>
          <span>or fetch from {fetchFromPrice}</span>
        </p>
      </button>
    </div>
  )
}

/** Listing subtitle shown beside price in compact cards. */
function peerListingFulfillmentLabel(_l: PeerListing): 'Pickup' {
  return 'Pickup'
}

/** Lightweight delivery fee estimate for compact listing cards. */
function peerListingDeliveryFeeCents(l: PeerListing): number {
  if (l.sameDayDelivery) return 1500
  if (l.fetchDelivery) return 1200
  return 1200
}

function filterListingsForCategory(
  all: PeerListing[],
  filter: MarketplacePeerBrowseFilter,
): PeerListing[] {
  return all.filter((l) => {
    if (filter.category && filter.category !== 'free') {
      if (l.category !== filter.category) return false
    }
    if (filter.category === 'free' && (l.priceCents ?? 0) > 0) return false
    if (filter.maxPriceCents != null && (l.priceCents ?? 0) > filter.maxPriceCents) return false
    if (filter.q) {
      const q = filter.q.toLowerCase()
      const haystack = [l.title, l.keywords ?? '', l.description].join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}

type EmbedSectionKey = 'live'

const EMBED_FEED_SECTION_ORDER: EmbedSectionKey[] = ['live']

function HomeShellForYouFeedInner({
  onOpenDrops,
  onOpenMarketplace,
  onOpenSearch: _onOpenSearch,
  onOpenPeerListing,
  onQuickBuyPeerListing,
  className = '',
  embedded = false,
  explorePromoBleed: _explorePromoBleed = 'page',
}: HomeShellForYouFeedProps) {
  const spotlightReels = useMemo(() => [...CURATED_DROP_REELS].slice(0, 8), [])
  const peerItems = useMemo(() => [...MARKETPLACE_MOCK_PEER_LISTINGS].slice(0, 6), [])
  const storePicks = useMemo(() => [...SUPPLY_PRODUCTS].slice(0, 5), [])
  const allListings = useMemo(() => [...MARKETPLACE_MOCK_PEER_LISTINGS], [])

  const [browseCategory, setBrowseCategory] = useState<{
    title: string
    filter: MarketplacePeerBrowseFilter
  } | null>(null)

  const browseCategoryListings = useMemo(() => {
    if (!browseCategory) return []
    const filtered = filterListingsForCategory(allListings, browseCategory.filter)
    if (filtered.length > 0) return filtered
    return allListings
  }, [browseCategory, allListings])

  const liveVerticalReels = useMemo(() => [...CURATED_DROP_REELS].slice(0, 8), [])
  const scopeLabel = 'near you'
  const [activeLiveReel, setActiveLiveReel] = useState<DropReel | null>(null)

  const embedFeedSections = useMemo((): Record<EmbedSectionKey, ReactNode> | null => {
    if (!embedded) return null
    return {
      live: (
        <section className="mb-1 min-w-0" aria-label={`Lives ${scopeLabel}`}>
          <div className="-mx-0.5 px-0.5">
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-2 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
              {liveVerticalReels.map((r) => (
                <ExploreEmbedLiveFeedTile key={r.id} reel={r} onOpenLive={setActiveLiveReel} />
              ))}
            </div>
          </div>
        </section>
      ),
    }
  }, [
    embedded,
    scopeLabel,
    liveVerticalReels,
  ])

  const [feedTab, setFeedTab] = useState<FeedTab>('For you')

  if (embedded) {
    return (
      <div
        className={[
          'fetch-home-for-you flex min-h-0 w-full flex-col gap-3 overflow-x-hidden pb-1',
          className,
        ].join(' ')}
        role="region"
        aria-label="Explore feed"
      >
        <FeedTabBar value={feedTab} onChange={setFeedTab} />

        {feedTab === 'For you' ? (
          <>
            <HomeBiddingWarTopBanner onJoin={() => setFeedTab('Bid War')} />
            {embedFeedSections
              ? EMBED_FEED_SECTION_ORDER.map((key) => (
                  <Fragment key={key}>{embedFeedSections[key]}</Fragment>
                ))
              : null}
            <BecomeSellerBanner onOpenMarketplace={onOpenMarketplace} />
            {browseCategory ? (
              <ExploreCategoryBrowse
                categoryTitle={browseCategory.title}
                listings={browseCategoryListings}
                onClose={() => setBrowseCategory(null)}
                onAddToCart={onQuickBuyPeerListing}
              />
            ) : null}
          </>
        ) : null}

        {feedTab === 'Live now' ? (
          <LiveNowGrid onOpenDrops={onOpenDrops} onOpenLive={setActiveLiveReel} />
        ) : null}

        {feedTab === 'Bid War' ? (
          <UpcomingLivesList />
        ) : null}

        {feedTab === 'Following' ? (
          <FollowingLivesList onOpenDrops={onOpenDrops} />
        ) : null}
        <LiveAuctionScreen
          open={activeLiveReel != null}
          onClose={() => setActiveLiveReel(null)}
          seller={
            activeLiveReel
              ? {
                  handle: activeLiveReel.seller.replace(/^@/, ''),
                  avatarUrl: reelPosterUrl(activeLiveReel) ?? '',
                  rating: 5.0,
                  badge: '<1d',
                  backgroundUrl: reelPosterUrl(activeLiveReel),
                }
              : undefined
          }
        />
      </div>
    )
  }

  return (
    <div
      className={[
        'fetch-home-for-you flex min-h-0 w-full flex-col gap-4 overflow-x-hidden pb-1',
        className,
      ].join(' ')}
      role="region"
      aria-label="For you — items and videos"
    >
      <header className="shrink-0 px-0.5">
        <h2 className="text-[1.05rem] font-bold tracking-[-0.03em] text-zinc-50">
          For you
        </h2>
        <p className="mt-0.5 text-[12px] font-medium leading-snug text-zinc-400">
          Drops, local listings, and store picks in one scroll.
        </p>
      </header>

      <div className="shrink-0 px-0.5">
        <MyFetchRewardsBanner layout="standalone" />
      </div>

      <section aria-labelledby="fetch-for-you-videos-heading" className="min-w-0">
        <div className="mb-2 flex items-end justify-between gap-2 px-0.5">
          <h3
            id="fetch-for-you-videos-heading"
            className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400"
          >
            Videos & drops
          </h3>
          <button
            type="button"
            onClick={onOpenDrops}
            className="shrink-0 text-[11px] font-bold text-[#00ff6a] underline decoration-[#00ff6a]/35 underline-offset-2 active:opacity-80 dark:text-[#00ff6a]"
          >
            See all
          </button>
        </div>
        <div className="-mx-0.5 flex gap-2 overflow-x-auto overflow-y-hidden pb-1 [-webkit-overflow-scrolling:touch] px-0.5">
          {spotlightReels.map((r) => {
            const poster = reelPosterUrl(r)
            const profileLine = reelProfileDisplayLine(r)
            return (
              <div key={r.id} className="flex w-[7.25rem] shrink-0 flex-col gap-1">
                <p
                  className="truncate text-left text-[11px] font-bold leading-tight text-[#1c1528]"
                  title={profileLine}
                >
                  {profileLine}
                </p>
                <button
                  type="button"
                  onClick={onOpenDrops}
                  aria-label={`${profileLine}: ${r.title}. ${r.priceLabel}`}
                  className="group relative h-[10rem] w-[7.25rem] shrink-0 overflow-hidden rounded-2xl bg-violet-100 text-left shadow-sm ring-1 ring-violet-200/50 active:scale-[0.98]"
                >
                  {poster ? (
                    <img
                      src={poster}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-violet-100" aria-hidden />
                  )}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"
                    aria-hidden
                  />
                  <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#4c1d95] shadow-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  <div className="absolute left-2 bottom-2 z-[1]">
                    <ReelLiveCountdownRing reelId={r.id} size="md" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-2.5 pb-2 pl-11 pt-6">
                    <p className="line-clamp-2 text-[11px] font-bold leading-snug text-white">{r.title}</p>
                  </div>
                </button>
                <p className="text-left text-[11px] font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {r.priceLabel}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="fetch-for-you-items-heading" className="min-w-0">
        <div className="mb-2 flex items-end justify-between gap-2 px-0.5">
          <h3
            id="fetch-for-you-items-heading"
            className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400"
          >
            Items near you
          </h3>
          <button
            type="button"
            onClick={onOpenMarketplace}
            className="shrink-0 text-[11px] font-bold text-[#00ff6a] underline decoration-[#00ff6a]/35 underline-offset-2 active:opacity-80 dark:text-[#00ff6a]"
          >
            Marketplace
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 px-0.5">
          {peerItems.map((l) => (
            <ExplorePeerListingCard
              key={l.id}
              l={l}
              onOpenPeerListing={onOpenPeerListing}
              onQuickBuyPeerListing={onQuickBuyPeerListing}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="fetch-for-you-store-heading" className="min-w-0">
        <h3
          id="fetch-for-you-store-heading"
          className="mb-2 px-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400"
        >
          From Fetch
        </h3>
        <div className="-mx-0.5 flex gap-2 overflow-x-auto overflow-y-hidden pb-1 [-webkit-overflow-scrolling:touch] px-0.5">
          {storePicks.map((p: SupplyProduct) => (
            <button
              key={p.id}
              type="button"
              onClick={onOpenMarketplace}
              className="flex w-[7.5rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-violet-200/60 bg-white text-left shadow-sm active:bg-violet-50"
            >
              <div className="relative aspect-square w-full bg-violet-50">
                <img
                  src={p.coverImageUrl}
                  alt=""
                  className="absolute inset-0 m-auto max-h-[90%] max-w-[90%] object-contain"
                />
              </div>
              <div className="min-w-0 p-2">
                <p className="line-clamp-2 text-[10px] font-semibold leading-snug text-[#1c1528]">
                  {p.title}
                </p>
                <p className="mt-1 text-[10px] font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatAud(p.priceAud)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>
      {browseCategory ? (
        <ExploreCategoryBrowse
          categoryTitle={browseCategory.title}
          listings={browseCategoryListings}
          onClose={() => setBrowseCategory(null)}
          onAddToCart={onQuickBuyPeerListing}
        />
      ) : null}
    </div>
  )
}

export const HomeShellForYouFeed = memo(HomeShellForYouFeedInner)
