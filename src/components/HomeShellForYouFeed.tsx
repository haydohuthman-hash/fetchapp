import { Fragment, memo, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CURATED_DROP_REELS } from '../lib/drops/constants'
import type { DropReel } from '../lib/drops/types'
import { EXPLORE_CATEGORY_ROW_PROMOS, type ExploreCategoryRowPromoDef } from '../lib/exploreCategoryRowPromos'
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
import { ListingQuickAddPlusCircleIcon } from './icons/HomeShellNavIcons'
import { ExploreCategoryBrowse } from './ExploreCategoryBrowse'
import { ExploreCategoryPromoIcon } from './ExploreCategoryRowPromoBanner'
import { FetchRankProgressCard } from './FetchRankProgressCard'
import { FetchDailyStreakCard } from './FetchDailyStreakCard'
import { FetchWeeklyGoalCard } from './FetchWeeklyGoalCard'

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

/** Explore embed rails: titles share carousel gutter (`px-3` row === leading `w-3` spacer). */
const EMBED_FEED_SECTION_TITLE_CLASS =
  'shrink-0 text-[14px] font-extrabold leading-none uppercase tracking-[0.08em] text-white'

/** Separator between Explore carousels (matches `px-3` inset). */
const EMBED_CAROUSEL_SEPARATOR_CLASS = 'mx-3 my-2 h-px shrink-0 bg-white/[0.12]'

/** Portrait photos for “top local sellers” cards (stable pick per seller key). */
const LOCAL_SELLER_PORTRAIT_URLS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=720&q=82',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=720&q=82',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=720&q=82',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=720&q=82',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=720&q=82',
  'https://images.unsplash.com/photo-1544005313-94ddf0286ad2?w=720&q=82',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=720&q=82',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=720&q=82',
]

function hashLocalSellerKey(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h
}

function portraitUrlForLocalSellerKey(key: string): string {
  return LOCAL_SELLER_PORTRAIT_URLS[hashLocalSellerKey(key) % LOCAL_SELLER_PORTRAIT_URLS.length]
}

/** Demo-only seller reviews — stable per seller key until the API exposes real aggregates. */
function localSellerReviewSummary(key: string): { rating: number; reviewCount: number } {
  const h = hashLocalSellerKey(key)
  const rating = 4.2 + ((h % 9) * 0.1)
  const reviewCount = 8 + (h % 492)
  return { rating: Math.round(rating * 10) / 10, reviewCount }
}

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

function ExploreEmbedLiveFeedTile({ reel, onOpenDrops }: { reel: DropReel; onOpenDrops: () => void }) {
  const poster = reelPosterUrl(reel)
  const viewersLabel = liveViewersLabel(reel.id)
  const viewersCount = liveViewersCountShort(reel.id)
  const sellerLine = reelProfileDisplayLine(reel)
  return (
    <button
      type="button"
      onClick={onOpenDrops}
      className="flex w-[calc((100%-1rem)/2.5)] shrink-0 snap-start flex-col bg-transparent p-0 text-left transition-transform active:scale-[0.98]"
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
        <div className="pointer-events-none absolute left-1 top-1 z-[3] flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 shadow-[0_8px_22px_-12px_rgba(0,0,0,0.45)] ring-1 ring-white/20">
          <span
            className="shrink-0 text-[10px] font-extrabold leading-none tracking-wide text-white"
            aria-hidden
          >
            Live
          </span>
          <span className="text-xs font-bold tabular-nums leading-none text-white">{viewersCount}</span>
        </div>
        <p className="pointer-events-none absolute bottom-0 left-0 z-[4] max-w-full truncate px-2 pb-2 pt-8 text-left text-[13px] font-semibold leading-tight text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.9)]">
          {sellerLine}
        </p>
      </div>
    </button>
  )
}

function ExploreEmbedCategoryTallCarousel({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (def: ExploreCategoryRowPromoDef) => void
}) {
  return (
    <section className="min-w-0" aria-label="Shop by category">
      <div className="w-full min-w-0 [container-type:inline-size]">
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scroll-pl-3 py-0.5 pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
          <div className="w-3 shrink-0 snap-none select-none" aria-hidden />
          {EXPLORE_CATEGORY_ROW_PROMOS.map((def) => {
            const selected = def.id === selectedId
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => onSelect(def)}
                className={[
                  'fetch-explore-embed-category-card group flex w-[max(3.75rem,calc((100cqi-1.5rem)/5.4))] shrink-0 snap-start flex-col items-center gap-1 overflow-visible rounded-none bg-transparent p-0 text-center shadow-none ring-0 transition-transform duration-200 ease-out active:scale-[0.96]',
                  selected ? 'fetch-explore-embed-category-card--active' : '',
                ].join(' ')}
                aria-label={def.ariaLabel}
                aria-pressed={selected}
              >
                <div
                  className={[
                    'fetch-explore-embed-category-card__circle relative flex size-[3rem] shrink-0 items-center justify-center rounded-full',
                    selected
                      ? 'fetch-explore-embed-category-card__circle--active bg-[#ffffff] ring-1 ring-black/10'
                      : 'bg-[#25282f] ring-1 ring-white/[0.10]',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'fetch-explore-embed-category-card__icon-wrap flex size-[2rem] items-center justify-center',
                      selected
                        ? 'fetch-explore-embed-category-card__icon-wrap--on-light'
                        : 'fetch-explore-embed-category-card__icon-wrap--on-dark',
                    ].join(' ')}
                  >
                    <ExploreCategoryPromoIcon id={def.id} className="h-full w-full" />
                  </span>
                </div>
                <p
                  className={[
                    'fetch-explore-embed-category-card__label line-clamp-2 min-h-[1.55rem] w-full px-0 text-center text-[8px] font-extrabold uppercase leading-[1.1] tracking-[0.03em] text-white/88 sm:min-h-[1.65rem] sm:text-[9px]',
                    selected ? 'text-white' : '',
                  ].join(' ')}
                >
                  {def.title}
                </p>
              </button>
            )
          })}
          <div className="w-3 shrink-0 snap-none select-none" aria-hidden />
        </div>
      </div>
    </section>
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
    <div className="flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-lg bg-[#25282f] text-left text-white shadow-none ring-1 ring-white/[0.06]">
      <div className="relative aspect-square w-full min-w-0 bg-[#1e2229]">
        {img ? (
          <img
            src={listingImageAbsoluteUrl(img)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">No photo</div>
        )}
        <div className={FOR_YOU_LISTING_IMAGE_SCRIM} aria-hidden />
        <button
          type="button"
          aria-label={label}
          className="absolute inset-0 z-[2] m-0 cursor-pointer border-0 bg-transparent p-0 outline-none active:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#00ff6a] dark:focus-visible:outline-[#00ff6a]"
          onClick={() => onOpenPeerListing(l.id)}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] flex min-w-0 items-baseline gap-1 px-2 pb-2 pt-8">
          <p className="min-w-0 truncate text-[13px] font-bold tabular-nums text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.75)]">
            {priceStr}
          </p>
          <span className="shrink-0 whitespace-nowrap text-[11px] font-bold text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.65)]">
            {fulfillment}
          </span>
        </div>
        {showQuickAdd ? (
          <button
            type="button"
            aria-label={canQuickAdd ? `Quick buy: ${l.title}` : quickTitle}
            title={quickTitle}
            aria-disabled={!canQuickAdd}
            className={[
              'absolute right-1 top-1 z-[4] flex h-8 w-8 items-center justify-center overflow-hidden rounded-full shadow-sm shadow-black/25 transition-transform',
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
      </div>
      <button
        type="button"
        aria-label={label}
        className="flex w-full min-w-0 max-w-full flex-col gap-0.5 px-2 pb-2 pt-2 text-left text-white outline-none active:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#00ff6a]"
        onClick={() => onOpenPeerListing(l.id)}
      >
        <p className="flex min-w-0 items-center gap-1 text-left text-[10px] font-bold text-white">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-white">
            <path d="M13 2L4.5 14H12l-1 8 8.5-12H12l1-8z" fill="currentColor" />
          </svg>
          <span className="min-w-0 truncate">or fetch it from {fetchFromPrice}</span>
        </p>
        <p className="line-clamp-1 min-w-0 w-full max-w-full text-left text-[11px] font-semibold leading-snug text-white">
          {l.title}
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

function ForYouListingCarouselCard({
  listing,
  onOpen,
}: {
  listing: PeerListing
  onOpen: (id: string) => void
}) {
  const img = listing.images?.[0]?.url
  const priceStr = formatAudFromCents(listing.priceCents ?? 0)
  const fulfillment = peerListingFulfillmentLabel(listing)
  const fetchFromPrice = formatAudFromCents((listing.priceCents ?? 0) + peerListingDeliveryFeeCents(listing))
  return (
    <button
      type="button"
      onClick={() => onOpen(listing.id)}
      aria-label={`${listing.title}, ${priceStr}, ${fulfillment}, or fetch it from ${fetchFromPrice}`}
      className="flex w-[calc((100%-1rem)/3.1)] shrink-0 flex-col bg-transparent p-0 text-left transition-transform active:scale-[0.98]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
        {img ? (
          <img
            src={listingImageAbsoluteUrl(img)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">No photo</div>
        )}
        <div className={FOR_YOU_LISTING_IMAGE_SCRIM} aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex min-w-0 flex-col gap-y-1 px-1.5 pb-1.5 pt-6">
          <div className="flex min-w-0 items-baseline gap-0.5 leading-none">
            <p className="min-w-0 truncate text-[12px] font-bold tabular-nums text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.65)]">
              {priceStr}
            </p>
            <span className="whitespace-nowrap text-[10px] font-bold text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
              {fulfillment}
            </span>
          </div>
          <p className="flex min-w-0 items-center gap-0.5 text-left text-[9px] font-bold leading-none text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-white">
              <path d="M13 2L4.5 14H12l-1 8 8.5-12H12l1-8z" fill="currentColor" />
            </svg>
            <span className="min-w-0 truncate">or fetch it from {fetchFromPrice}</span>
          </p>
        </div>
      </div>
      <div className="flex min-w-0 flex-col pt-2">
        <p className="truncate text-left text-[13px] font-semibold leading-tight text-zinc-800">
          {listing.title}
        </p>
      </div>
    </button>
  )
}

type LocalSellerChip = {
  key: string
  displayName: string
  listingCount: number
  sampleListingId: string
}

function localSellerGroupKey(l: PeerListing): string {
  const author = l.profileAuthorId?.trim()
  if (author) return author
  const name = l.profileDisplayName?.trim()
  if (name) return name
  const email = l.sellerEmail?.trim().toLowerCase()
  if (email) return `email:${email}`
  return `listing:${l.id}`
}

function localSellerDisplayName(l: PeerListing): string {
  return (
    l.profileDisplayName?.trim() ||
    l.profileAuthorId?.trim() ||
    l.sellerEmail?.trim() ||
    'Local seller'
  )
}

function localSellersFromPeerListings(listings: PeerListing[]): LocalSellerChip[] {
  const map = new Map<string, { displayName: string; listingCount: number; sampleListingId: string }>()
  for (const l of listings) {
    const key = localSellerGroupKey(l)
    const prev = map.get(key)
    if (prev) {
      prev.listingCount += 1
    } else {
      map.set(key, {
        displayName: localSellerDisplayName(l),
        listingCount: 1,
        sampleListingId: l.id,
      })
    }
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.listingCount - a.listingCount)
}

function ForYouLocalSellerCarouselCard({
  seller,
  onOpenListing,
}: {
  seller: LocalSellerChip
  onOpenListing: (listingId: string) => void
}) {
  const handle = seller.displayName.startsWith('@') ? seller.displayName : `@${seller.displayName}`
  const portraitSrc = portraitUrlForLocalSellerKey(seller.key)
  const { rating, reviewCount } = localSellerReviewSummary(seller.key)
  const ratingLabel = rating.toFixed(1)
  const reviewsLabel =
    reviewCount === 1 ? '1 review' : `${reviewCount.toLocaleString('en-US')} reviews`
  return (
    <button
      type="button"
      onClick={() => onOpenListing(seller.sampleListingId)}
      className="flex w-[calc((100%-1rem)/2.5)] shrink-0 flex-col bg-transparent p-0 text-left transition-transform active:scale-[0.98]"
      aria-label={`${handle}, verified seller, ${ratingLabel} out of 5 stars from ${reviewCount} reviews — open in marketplace`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
        <img
          src={portraitSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top"
          loading="lazy"
          draggable={false}
        />
        <div className={FOR_YOU_LISTING_IMAGE_SCRIM} aria-hidden />
        <div
          className="pointer-events-none absolute left-1 top-1 z-[3] flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full bg-[#ffffff] text-[#1d9bf0] shadow-[0_2px_10px_rgba(0,0,0,0.28)] ring-1 ring-zinc-900/10"
          aria-hidden
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
            <path
              d="M6.5 12.5 10 16 17.5 7.5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 z-[2] max-w-full min-w-0 pr-1">
          <div
            className={[
              'inline-flex max-w-full min-w-0 items-center gap-1 border border-l-0 border-white/14',
              'rounded-r-lg bg-black/75 py-1 pl-2 pr-2 shadow-[0_6px_18px_rgba(0,0,0,0.42)]',
              'backdrop-blur-[5px] [-webkit-backdrop-filter:blur(5px)]',
            ].join(' ')}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
              className="shrink-0 text-amber-300"
            >
              <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <span className="shrink-0 text-[11px] font-extrabold tabular-nums leading-none text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
              {ratingLabel}
            </span>
            <span className="min-w-0 truncate text-[9px] font-semibold leading-none text-white/88 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
              {reviewsLabel}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
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

function parseAudFromPriceLabel(label: string): number | null {
  const m = label.replace(/,/g, '').match(/\$?\s*([\d.]+)/)
  if (!m) return null
  const n = Number.parseFloat(m[1])
  return Number.isFinite(n) ? n : null
}

function reelMatchesCategoryLoose(reel: DropReel, category: string): boolean {
  const hay = `${reel.title} ${reel.blurb}`.toLowerCase()
  const c = category.trim().toLowerCase()
  const hints: Record<string, string[]> = {
    furniture: [
      'sofa',
      'couch',
      'lounge',
      'table',
      'chair',
      'bed',
      'mattress',
      'fridge',
      'washer',
      'furniture',
      'dining',
      'outdoor',
      'patio',
      'lamp',
    ],
    electronics: ['tech', 'laptop', 'computer', 'phone', 'electronic', 'gadget', 'screen'],
    sports: ['bike', 'sport', 'gym', 'fitness'],
    fashion: ['fashion', 'street', 'wear', 'denim', 'sneaker', 'style'],
    supplies: ['supply', 'tool'],
    free: ['free', 'giveaway'],
  }
  const words = hints[c]
  if (!words) return true
  return words.some((w) => hay.includes(w))
}

function filterReelsForBrowseFilter(
  reels: DropReel[],
  filter: MarketplacePeerBrowseFilter,
  listingById: Map<string, PeerListing>,
): DropReel[] {
  const hasCategory = Boolean(filter.category?.trim())
  const hasQ = Boolean(filter.q?.trim())
  const hasPrice = filter.maxPriceCents != null && Number.isFinite(filter.maxPriceCents)
  if (!hasCategory && !hasQ && !hasPrice) return reels

  return reels.filter((r) => {
    const lid = r.commerce?.kind === 'buy_sell_listing' ? r.commerce.listingId : null
    const listing = lid ? listingById.get(lid) : undefined
    if (listing) {
      return filterListingsForCategory([listing], filter).length > 0
    }
    const hay = `${r.title} ${r.blurb} ${r.seller}`.toLowerCase()
    if (hasQ && !hay.includes(filter.q!.trim().toLowerCase())) return false
    if (hasPrice) {
      const aud = parseAudFromPriceLabel(r.priceLabel)
      if (aud != null && aud * 100 > filter.maxPriceCents!) return false
    }
    if (filter.category === 'free') {
      const pl = r.priceLabel.toLowerCase()
      if (!pl.includes('free') && !pl.includes('0')) return false
    } else if (hasCategory && filter.category !== 'free') {
      if (!reelMatchesCategoryLoose(r, filter.category!)) return false
    }
    return true
  })
}

type EmbedSectionKey = 'live' | 'sellers' | 'featured' | 'grid'

const EMBED_FEED_SECTION_ORDER: EmbedSectionKey[] = ['live', 'sellers', 'featured', 'grid']

function HomeShellForYouFeedInner({
  onOpenDrops,
  onOpenMarketplace,
  onOpenSearch: _onOpenSearch,
  onOpenMarketplaceBrowse,
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

  const [embedCategoryId, setEmbedCategoryId] = useState<string>('explore-all')

  const embedCategoryHandoff = useMemo((): MarketplacePeerBrowseFilter => {
    const def = EXPLORE_CATEGORY_ROW_PROMOS.find((p) => p.id === embedCategoryId)
    return def?.handoff ?? {}
  }, [embedCategoryId])

  const listingById = useMemo(() => new Map(allListings.map((l) => [l.id, l] as const)), [allListings])

  const embedReelPool = useMemo(() => [...CURATED_DROP_REELS], [])

  const embedFilteredListings = useMemo(() => {
    const filtered = filterListingsForCategory(allListings, embedCategoryHandoff)
    return filtered.length > 0 ? filtered : allListings
  }, [allListings, embedCategoryHandoff])

  const embedFilteredReels = useMemo(() => {
    const filtered = filterReelsForBrowseFilter(embedReelPool, embedCategoryHandoff, listingById)
    const picked = filtered.length > 0 ? filtered : embedReelPool
    return picked.slice(0, 8)
  }, [embedReelPool, embedCategoryHandoff, listingById])

  const embedTopSellers = useMemo(
    () => localSellersFromPeerListings(embedFilteredListings),
    [embedFilteredListings],
  )

  const embedFeaturedListings = useMemo(() => embedFilteredListings.slice(0, 8), [embedFilteredListings])

  const embedGridListings = useMemo(() => embedFilteredListings.slice(0, 12), [embedFilteredListings])

  const openEmbedMarketplaceFiltered = useCallback(() => {
    if (onOpenMarketplaceBrowse) {
      onOpenMarketplaceBrowse(embedCategoryHandoff)
    } else {
      onOpenMarketplace()
    }
  }, [embedCategoryHandoff, onOpenMarketplace, onOpenMarketplaceBrowse])

  const embedFeedSections = useMemo((): Record<EmbedSectionKey, ReactNode> | null => {
    if (!embedded) return null
    return {
      live: (
        <section className="mb-1 min-w-0" aria-labelledby="fetch-embed-live-feed-heading">
          <div className="mb-0 flex items-center gap-1 px-3">
            <h3 id="fetch-embed-live-feed-heading" className={EMBED_FEED_SECTION_TITLE_CLASS}>
              Lives near you
            </h3>
            <button
              type="button"
              onClick={onOpenDrops}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-transparent text-white transition-colors hover:bg-white/[0.08] hover:text-white active:scale-[0.96]"
              aria-label="Open live feed and drops"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scroll-pl-3 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
            <div className="w-3 shrink-0 snap-none select-none" aria-hidden />
            {embedFilteredReels.map((r) => (
              <ExploreEmbedLiveFeedTile key={r.id} reel={r} onOpenDrops={onOpenDrops} />
            ))}
            <div className="w-3 shrink-0 snap-none select-none" aria-hidden />
          </div>
        </section>
      ),
      sellers: (
        <section className="mb-1 min-w-0" aria-labelledby="fetch-top-local-sellers-heading">
          <div className="mb-0 flex items-center gap-1 px-3">
            <h3 id="fetch-top-local-sellers-heading" className={EMBED_FEED_SECTION_TITLE_CLASS}>
              Top sellers
            </h3>
            <button
              type="button"
              onClick={openEmbedMarketplaceFiltered}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-transparent text-white transition-colors hover:bg-white/[0.08] hover:text-white active:scale-[0.96]"
              aria-label="Open marketplace — top sellers"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto overflow-y-hidden scroll-pl-3 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
            <div className="w-3 shrink-0 select-none" aria-hidden />
            {embedTopSellers.map((s) => (
              <ForYouLocalSellerCarouselCard key={s.key} seller={s} onOpenListing={onOpenPeerListing} />
            ))}
            <div className="w-3 shrink-0 select-none" aria-hidden />
          </div>
        </section>
      ),
      featured: (
        <section className="mb-1 min-w-0" aria-labelledby="fetch-featured-near-you-heading">
          <div className="mb-0 flex items-center gap-1 px-3">
            <h3 id="fetch-featured-near-you-heading" className={EMBED_FEED_SECTION_TITLE_CLASS}>
              Listings near you
            </h3>
            <button
              type="button"
              onClick={openEmbedMarketplaceFiltered}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-transparent text-white transition-colors hover:bg-white/[0.08] hover:text-white active:scale-[0.96]"
              aria-label="Open listings in marketplace"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto overflow-y-hidden scroll-pl-3 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
            <div className="w-3 shrink-0 select-none" aria-hidden />
            {embedFeaturedListings.map((l) => (
              <ForYouListingCarouselCard key={l.id} listing={l} onOpen={onOpenPeerListing} />
            ))}
            <div className="w-3 shrink-0 select-none" aria-hidden />
          </div>
        </section>
      ),
      grid: (
        <section className="mb-1 min-w-0" aria-labelledby="fetch-explore-grid-heading">
          <h3 id="fetch-explore-grid-heading" className={`mb-2 px-3 ${EMBED_FEED_SECTION_TITLE_CLASS}`}>
            Browse all
          </h3>
          <div className="grid grid-cols-2 gap-2 px-3">
            {embedGridListings.map((l) => (
              <ExplorePeerListingCard
                key={l.id}
                l={l}
                onOpenPeerListing={onOpenPeerListing}
                onQuickBuyPeerListing={onQuickBuyPeerListing}
              />
            ))}
          </div>
        </section>
      ),
    }
  }, [
    embedded,
    embedFilteredReels,
    embedTopSellers,
    embedFeaturedListings,
    embedGridListings,
    onOpenDrops,
    openEmbedMarketplaceFiltered,
    onOpenPeerListing,
    onQuickBuyPeerListing,
  ])

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
        <div className="sticky top-0 z-10 shrink-0 bg-[#1a1d22] pt-[max(0.5rem,env(safe-area-inset-top))]">
          <header className="border-b border-white/[0.08] px-3 pb-3 pt-2">
            <h2 className="sr-only">Explore</h2>
          </header>
        </div>
        <div className="flex flex-col gap-2.5 bg-[#1a1d22] px-3 pb-2 pt-5">
          <FetchRankProgressCard />
          <div className="grid grid-cols-2 gap-2">
            <FetchDailyStreakCard compact />
            <FetchWeeklyGoalCard compact />
          </div>
        </div>
        <ExploreEmbedCategoryTallCarousel
          selectedId={embedCategoryId}
          onSelect={(def) => setEmbedCategoryId(def.id)}
        />
        {embedFeedSections
          ? EMBED_FEED_SECTION_ORDER.map((key, idx) => (
              <Fragment key={key}>
                {idx > 0 ? (
                  <div className={EMBED_CAROUSEL_SEPARATOR_CLASS} role="separator" aria-hidden />
                ) : null}
                {embedFeedSections[key]}
              </Fragment>
            ))
          : null}
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

  return (
    <div
      className={[
        'fetch-home-for-you flex min-h-0 w-full flex-col gap-4 overflow-x-hidden pb-1',
        className,
      ].join(' ')}
      role="region"
      aria-label="For you — items and videos"
    >
      <div className="shrink-0 bg-[#1a1d22] pt-[max(0.25rem,env(safe-area-inset-top))]">
        <header className="border-b border-white/[0.08] px-0.5 pb-3 pt-2">
          <h2 className="sr-only">For you</h2>
        </header>
      </div>
      <div className="flex flex-col gap-2.5 border-b border-white/[0.08] bg-[#1a1d22] px-0.5 pb-4 pt-5">
        <FetchRankProgressCard />
        <div className="grid grid-cols-2 gap-2">
          <FetchDailyStreakCard compact />
          <FetchWeeklyGoalCard compact />
        </div>
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
                  className="truncate text-left text-[11px] font-bold leading-tight text-zinc-200"
                  title={profileLine}
                >
                  {profileLine}
                </p>
                <button
                  type="button"
                  onClick={onOpenDrops}
                  aria-label={`${profileLine}: ${r.title}. ${r.priceLabel}`}
                  className="group relative h-[10rem] w-[7.25rem] shrink-0 overflow-hidden rounded-2xl bg-zinc-900 text-left shadow-none ring-1 ring-black/10 active:scale-[0.98] dark:ring-white/10"
                >
                  {poster ? (
                    <img
                      src={poster}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-zinc-800" aria-hidden />
                  )}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"
                    aria-hidden
                  />
                  <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#00ff6a] shadow-none dark:bg-zinc-950/95 dark:text-[#00ff6a]">
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
              className="flex w-[7.5rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white text-left shadow-none active:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:active:bg-zinc-800/80"
            >
              <div className="relative aspect-square w-full bg-zinc-50 dark:bg-zinc-800">
                <img
                  src={p.coverImageUrl}
                  alt=""
                  className="absolute inset-0 m-auto max-h-[90%] max-w-[90%] object-contain"
                />
              </div>
              <div className="min-w-0 p-2">
                <p className="line-clamp-2 text-[10px] font-semibold leading-snug text-zinc-800 dark:text-zinc-100">
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
