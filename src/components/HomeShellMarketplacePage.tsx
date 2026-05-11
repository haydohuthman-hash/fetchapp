import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ImgHTMLAttributes,
  type SetStateAction,
} from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import type { HardwareProduct } from '../lib/hardwareCatalog'
import { SUPPLY_PRODUCTS, type SupplyProduct } from '../lib/suppliesCatalog'
import { waitForPaymentIntentServerConfirmed } from '../lib/booking/api'
import { confirmDemoPaymentIntent, isStripePublishableConfigured } from '../lib/paymentCheckout'
import { fetchStoreCatalog, storeCheckout, syncCheckoutCustomerSession, type StoreCatalogProduct } from '../lib/storeApi'
import { publicProductToSupplyProduct } from '../lib/publicProduct'
import { useFetchProducts } from '../lib/useFetchProducts'
import { formatDropHandle } from '../lib/drops/profileStore'
import { syncCustomerSessionCookie } from '../lib/fetchServerSession'
import { loadSession } from '../lib/fetchUserSession'
import { consumePendingOpenMarketplaceCart } from '../lib/marketplaceCartSnapshot'
import { MARKETPLACE_MOCK_PEER_LISTINGS } from '../lib/marketplaceMockPeerListings'
import {
  checkoutListing,
  DEMO_LISTING_CHECKOUT_DISABLED_MESSAGE,
  fetchListing,
  fetchPublishedListings,
  formatListingCheckoutError,
  isPublicDemoListingId,
  listingImageAbsoluteUrl,
  type PeerListing,
} from '../lib/listingsApi'
import type { BuySellDropsListingHandoff } from './HomeShellBuySellPage'
import { HOME_SHELL_UNIFIED_TOP_HEADER_CLASS } from './HomeShellUnifiedTopHeader'
import { HomeShellBuySellPage } from './HomeShellBuySellPage'
import type { HomeShellTab } from './FetchHomeBookingSheet'
import { FetchStripePaymentElement } from './FetchStripePaymentElement'
import {
  buildLiveFeedStreams,
  dropReelToLiveFeedStream,
  dropsReelsForLiveAuctionFloor,
  LIVE_FEED_FILTER_CHIPS,
  type LiveFeedCategory,
  type LiveFeedStream,
} from '../lib/liveFeedDemo'
import { useDropsApiFeed } from '../lib/drops/useDropsApiFeed'
import { LiveFeedCard, LiveVideoAuction } from './LiveFeedPage'
import imgLiveCatHome from '../assets/fetchit-home-living-room-hero.png'
import imgLiveCatElectronics from '../assets/search-categories-real/electronics.png'
import imgLiveCatFashion from '../assets/search-categories-real/womens-fashion.png'
import imgLiveCatCollectibles from '../assets/search-categories-real/trading-card-games.png'
import imgLiveCatFree from '../assets/search-categories-real/coins-money.png'
import imgLiveCatEnding from '../assets/search-categories-real/sports-cards.png'

function peerListingCategoryChipToFilterCategory(
  id: LiveFeedCategory,
): string | undefined {
  if (id === 'all') return undefined
  if (id === 'free') return 'free'
  if (id === 'ending_soon') return undefined
  return id
}

const BROWSE_SEGMENT_STORAGE_KEY = 'fetch-mp-browse-segment-v2'

/** Stacked marketplace shop header (glass shell only — inner rows set padding). */
const MARKETPLACE_SHOP_HEADER_SHELL_CLASS =
  'sticky top-0 z-[15] flex w-full min-w-0 shrink-0 flex-col border-0 bg-white/92 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-white/80'

function loadStoredBrowseSegment(): 'auctions' | 'shop' {
  if (typeof window === 'undefined') return 'shop'
  try {
    const v = window.localStorage.getItem(BROWSE_SEGMENT_STORAGE_KEY)
    if (v === 'auctions') return 'auctions'
    return 'shop'
  } catch {
    return 'shop'
  }
}

function storeBrowseSegment(segment: 'auctions' | 'shop'): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(BROWSE_SEGMENT_STORAGE_KEY, segment)
  } catch {
    /* storage may be disabled */
  }
}

export type MarketplaceDropsProductHandoff = {
  productId: string
  /** `sheet` opens product detail; `buyNow` adds one to cart and opens cart. */
  mode: 'sheet' | 'buyNow'
}

export type MarketplaceBrowseHandoff = {
  id: number
  category?: string
  q?: string
  maxPriceCents?: number
  scope?: 'local' | 'global'
}

export type MarketplaceSellerHubHandoff = {
  id: number
  /** First screen inside seller overlay (default feed). */
  panel: 'feed' | 'create' | 'live' | 'liveStudio'
}

export type MarketplaceSegmentHandoff = {
  id: number
  /** Which marketplace “page” to show after switching to this tab. */
  segment: 'auctions' | 'shop'
}

export type HomeShellMarketplacePageProps = {
  bottomNav: React.ReactNode
  /** When true, the fixed dock is not rendered here (HomeView pins it outside the sliding route layer). Seller overlay still uses `bottomNav` inline. */
  renderShellDockOutsideRoute?: boolean
  onSellerToolsOverlayOpenChange?: (open: boolean) => void
  hardwareProducts: readonly HardwareProduct[]
  /** Marketplace store cart (owned by parent so tab chrome can react, e.g. cart FAB on For You). */
  cartQtyById: Record<string, number>
  setCartQtyById: Dispatch<SetStateAction<Record<string, number>>>
  onMenuAccount?: () => void
  onRequestHomeShellTab?: (tab: HomeShellTab) => void
  dropsProductHandoff?: MarketplaceDropsProductHandoff | null
  onDropsProductHandoffConsumed?: () => void
  onOpenListingChat?: (listingId: string) => void | Promise<void>
  onBookDriver?: () => void
  dropsListingHandoff?: BuySellDropsListingHandoff | null
  onDropsListingHandoffConsumed?: () => void
  /** From Explore banners: apply peer browse filters then clear via callback. */
  browseHandoff?: MarketplaceBrowseHandoff | null
  onBrowseHandoffConsumed?: () => void
  /** Open seller tools overlay (e.g. global FAB → post listing). */
  sellerHubHandoff?: MarketplaceSellerHubHandoff | null
  onSellerHubHandoffConsumed?: () => void
  /** Explore / feed: jump into Live viewer for this stream. */
  liveJoinStreamHandoff?: LiveFeedStream | null
  onLiveJoinStreamHandoffConsumed?: () => void
  /** Opens profile notifications (same heart affordance as Search / Explore). */
  onOpenNotifications?: () => void
  /** For You quick tiles: land on live grid vs static shop. */
  segmentHandoff?: MarketplaceSegmentHandoff | null
  onSegmentHandoffConsumed?: () => void
  /** Opens home-shell Discover / Search tab — header search is icon-only. */
  onOpenSearch?: () => void
  /**
   * When set, initial browse boot skeleton follows this flag instead of an internal timer
   * (single gate with Explore in HomeView).
   */
  browseShellRevealReady?: boolean
}

/** Only used for the first “All” circle — others use category cover thumbnails. */
function MarketplaceListingCategoryDotsIcon({ selected }: { selected: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={[
        'h-[1.8rem] w-[1.8rem] shrink-0',
        selected ? 'text-[#291050]' : 'text-zinc-600',
      ].join(' ')}
      aria-hidden
    >
      <circle cx="8" cy="8" r="3" fill="currentColor" />
      <circle cx="16" cy="8" r="3" fill="currentColor" />
      <circle cx="8" cy="16" r="3" fill="currentColor" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  )
}

const LIVE_CATEGORY_CHIP_COVER: Record<Exclude<LiveFeedCategory, 'all'>, string> = {
  furniture: imgLiveCatHome,
  electronics: imgLiveCatElectronics,
  fashion: imgLiveCatFashion,
  collectibles: imgLiveCatCollectibles,
  free: imgLiveCatFree,
  ending_soon: imgLiveCatEnding,
}

function formatAud(n: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatAudFromCents(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function peerListingPublicSellerLine(l: PeerListing): string | null {
  const raw = l.profileDisplayName?.trim()
  if (!raw) return null
  return formatDropHandle(raw)
}

function PeerListingSheetMapPin({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 21.25s-5.75-5.1-5.75-10.5A5.75 5.75 0 1117.75 10.75c0 5.4-5.75 10.5-5.75 10.5z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="10.25" r="2.2" fill="currentColor" />
    </svg>
  )
}

function apiCatalogRowToSupplyProduct(row: StoreCatalogProduct, staticP: SupplyProduct | undefined): SupplyProduct {
  const compare =
    row.compareAtAud != null && Number.isFinite(row.compareAtAud) && row.compareAtAud > 0
      ? row.compareAtAud
      : undefined
  const ext = {
    ...(row.productSource === 'amazon' ? { productSource: 'amazon' as const } : {}),
    ...(row.externalListing ? { externalListing: true as const } : {}),
    ...(row.affiliateUrl?.trim() ? { affiliateUrl: row.affiliateUrl.trim() } : {}),
    ...(row.asin ? { asin: row.asin } : {}),
  }
  if (staticP) {
    return {
      ...staticP,
      priceAud: row.priceAud,
      title: row.title,
      subtitle: row.subtitle,
      coverImageUrl: row.coverImageUrl,
      description: row.description?.trim() || staticP.description,
      ...(row.subcategoryId ? { subcategoryId: row.subcategoryId } : {}),
      ...(row.subcategoryLabel ? { subcategoryLabel: row.subcategoryLabel } : {}),
      ...(compare != null ? { compareAtAud: compare } : {}),
      ...ext,
    }
  }
  return {
    id: row.id,
    sku: row.sku,
    title: row.title,
    subtitle: row.subtitle,
    priceAud: row.priceAud,
    categoryId: row.categoryId,
    previewStyle: 'slate',
    specs: [row.subtitle],
    description: row.description?.trim() || row.subtitle,
    coverImageUrl: row.coverImageUrl,
    ...(row.subcategoryId ? { subcategoryId: row.subcategoryId } : {}),
    ...(row.subcategoryLabel ? { subcategoryLabel: row.subcategoryLabel } : {}),
    ...(compare != null ? { compareAtAud: compare } : {}),
    ...ext,
  }
}

function supplyProductShowsCompare(p: SupplyProduct): boolean {
  const was = p.compareAtAud ?? 0
  const now = p.priceAud
  return was > 0 && (now <= 0 || was > now)
}

function isExternalAffiliateProduct(p: SupplyProduct): boolean {
  return Boolean(p.externalListing && (p.affiliateUrl ?? '').trim())
}

function formatListingPriceAud(p: SupplyProduct): string {
  if (isExternalAffiliateProduct(p) && p.priceAud <= 0) return 'See on Amazon'
  return formatAud(p.priceAud)
}

/** Minimum time cart skeleton is shown so it reads as a deliberate load state (not a flash). */
const CART_OPEN_SKELETON_MS = 650
/** Initial marketplace browse shell while the tab is opening (no network â€” UX polish). */
const MARKETPLACE_BOOT_SKELETON_MS = 600

function MarketplaceBrowseBootSkeleton() {
  return (
    <div
      className="fetch-home-marketplace-body pointer-events-none flex min-h-0 flex-1 flex-col bg-white select-none"
      aria-hidden
    >
      <div className="flex shrink-0 flex-col">
        <div className="flex items-center gap-2 px-3 pb-3 pt-[max(0.5rem,env(safe-area-inset-top,0px))]">
          <div className="h-11 min-w-0 flex-1 rounded-xl bg-zinc-100 animate-pulse" />
          <div className="h-11 w-11 shrink-0 rounded-xl bg-zinc-100 animate-pulse" aria-hidden />
          <div className="h-11 w-11 shrink-0 rounded-xl bg-zinc-100 animate-pulse" aria-hidden />
        </div>
        <div className="flex gap-2 overflow-hidden px-3 pb-2">
          <div className="h-8 w-14 shrink-0 rounded-full bg-zinc-100 animate-pulse" />
          <div className="h-8 w-20 shrink-0 rounded-full bg-zinc-100 animate-pulse" />
          <div className="h-8 w-24 shrink-0 rounded-full bg-zinc-100 animate-pulse" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-3 pt-3">
        <div className="grid grid-cols-2 gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="aspect-[9/16] w-full rounded-[1.15rem] bg-zinc-100 animate-pulse" />
              <div className="h-4 w-[75%] rounded-md bg-zinc-100 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MarketplaceSearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={['inline-block shrink-0 text-current', className].filter(Boolean).join(' ') || undefined}
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function MarketplaceBrowseHeartIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-8.74 1.06-1.06a5.5 5.5 0 1 0-7.78-7.78z"
      />
    </svg>
  )
}

/** Wishlist toggle on peer grid — soft light outline when off, red fill when saved. */
function PeerListingWishlistHeartGlyph({ filled, className }: { filled: boolean; className?: string }) {
  if (filled) {
    return <MarketplaceBrowseHeartIcon className={className} />
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
        stroke="currentColor"
        strokeWidth="1.28"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const SupplyProductThumb = memo(function SupplyProductThumb({
  alt,
  ...img
}: ImgHTMLAttributes<HTMLImageElement> & { alt: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div
        className="mx-auto h-12 w-12 rounded-lg bg-zinc-100"
        aria-hidden
      />
    )
  }
  return (
    <img
      alt={alt}
      draggable={false}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      {...img}
    />
  )
})

const MarketplacePeerListingGridCard = memo(function MarketplacePeerListingGridCard({
  listing,
  onOpen,
}: {
  listing: PeerListing
  onOpen: () => void
}) {
  const [wishlisted, setWishlisted] = useState(false)
  const raw = listing.images?.[0]?.url?.trim()
  const src = raw ? listingImageAbsoluteUrl(raw) : ''
  const price = formatAudFromCents(listing.priceCents ?? 0)
  const openLabel = `View listing ${listing.title}`
  const onCardKeyDown = useCallback((e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen()
    }
  }, [onOpen])
  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={openLabel}
      onClick={onOpen}
      onKeyDown={onCardKeyDown}
      className="group/card flex min-w-0 cursor-pointer flex-col gap-1 rounded-xl bg-transparent p-1 text-left transition-transform [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/55 focus-visible:ring-offset-2 active:scale-[0.98]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-zinc-100">
        {src ? (
          <SupplyProductThumb
            src={src}
            alt=""
            className="pointer-events-none h-full w-full object-cover transition-transform duration-300 group-active/card:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-zinc-400">No photo</div>
        )}
        <button
          type="button"
          onClick={(ev) => {
            ev.preventDefault()
            ev.stopPropagation()
            setWishlisted((w) => !w)
          }}
          aria-pressed={wishlisted}
          aria-label={
            wishlisted ? `Remove ${listing.title} from wishlist` : `Save ${listing.title} to wishlist`
          }
          className="absolute right-0.5 top-0.5 z-[2] flex h-12 w-12 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-transparent shadow-none outline-none backdrop-blur-none transition-transform [-webkit-tap-highlight-color:transparent] active:scale-[0.92] focus-visible:ring-2 focus-visible:ring-violet-400/65 focus-visible:ring-offset-2"
        >
          <PeerListingWishlistHeartGlyph
            filled={wishlisted}
            className={[
              wishlisted
                ? 'h-9 w-9 text-red-500'
                : 'h-8 w-8 text-white/55',
              'drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]',
            ].join(' ')}
          />
        </button>
      </div>
      <div className="flex min-w-0 items-baseline gap-1.5 px-0.5">
        <span className="shrink-0 text-[13px] font-bold tabular-nums leading-snug tracking-tight text-zinc-950">
          {price}
        </span>
        <p className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-snug text-zinc-900">
          {listing.title}
        </p>
      </div>
    </article>
  )
})

type MarketplaceSubView = 'browse' | 'cart' | 'checkout' | 'orderComplete'

function HomeShellMarketplacePageInner({
  bottomNav,
  renderShellDockOutsideRoute = false,
  onSellerToolsOverlayOpenChange,
  cartQtyById,
  setCartQtyById,
  onMenuAccount,
  onRequestHomeShellTab,
  dropsProductHandoff = null,
  onDropsProductHandoffConsumed,
  onOpenListingChat,
  onBookDriver,
  dropsListingHandoff = null,
  onDropsListingHandoffConsumed,
  browseHandoff = null,
  onBrowseHandoffConsumed,
  sellerHubHandoff = null,
  onSellerHubHandoffConsumed,
  liveJoinStreamHandoff: _liveJoinStreamHandoff = null,
  onLiveJoinStreamHandoffConsumed: _onLiveJoinStreamHandoffConsumed,
  onOpenNotifications,
  onOpenSearch,
  segmentHandoff = null,
  onSegmentHandoffConsumed,
  browseShellRevealReady,
}: HomeShellMarketplacePageProps) {
  const { loading: productsApiLoading, products: apiProductList } = useFetchProducts()
  const [subView, setSubView] = useState<MarketplaceSubView>('browse')
  const [productSheet, setProductSheet] = useState<SupplyProduct | null>(null)
  const [checkoutName, setCheckoutName] = useState('')
  const [checkoutEmail, setCheckoutEmail] = useState('')
  const [checkoutAddress, setCheckoutAddress] = useState('')
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [stripeStoreCheckout, setStripeStoreCheckout] = useState<{
    clientSecret: string
    paymentIntentId: string
    storeOrderId: string
  } | null>(null)
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null)
  const [cartEnterLoading, setCartEnterLoading] = useState(false)
  const [cartOpenSeq, setCartOpenSeq] = useState(0)
  const parentGatesBrowseBoot = browseShellRevealReady !== undefined
  const [marketplaceBootLoading, setMarketplaceBootLoading] = useState(
    () => !browseShellRevealReady,
  )
  const [catalogProducts, setCatalogProducts] = useState<SupplyProduct[] | null>(null)
  const [peerListings, setPeerListings] = useState<PeerListing[]>([])
  const [peerListingSheet, setPeerListingSheet] = useState<PeerListing | null>(null)
  const [peerStripeBuy, setPeerStripeBuy] = useState<{
    clientSecret: string
    paymentIntentId: string
  } | null>(null)
  const [peerBuyErr, setPeerBuyErr] = useState<string | null>(null)
  const [peerCheckoutBusy, setPeerCheckoutBusy] = useState(false)
  const [sellerToolsOpen, setSellerToolsOpen] = useState(false)
  useEffect(() => {
    onSellerToolsOverlayOpenChange?.(sellerToolsOpen)
  }, [sellerToolsOpen, onSellerToolsOverlayOpenChange])
  const [sellerOverlayMountKey, setSellerOverlayMountKey] = useState(0)
  const [sellerOverlayLanding, setSellerOverlayLanding] = useState<'feed' | 'create' | 'live' | 'liveStudio'>('feed')
  const lastSellerHubIdRef = useRef<number | null>(null)
  const [peerListFilter, setPeerListFilter] = useState<{
    q?: string
    category?: string
    maxPriceCents?: number
    scope?: 'local' | 'global'
  }>({})
  const lastBrowseHandoffIdRef = useRef<number | null>(null)
  const dropsListingHandoffDoneRef = useRef<string | null>(null)
  const lastSegmentHandoffIdRef = useRef<number | null>(null)

  const [browseSegment, setBrowseSegment] = useState<'auctions' | 'shop'>(loadStoredBrowseSegment)
  useEffect(() => {
    storeBrowseSegment(browseSegment)
  }, [browseSegment])
  const [liveCategory, setLiveCategory] = useState<LiveFeedCategory>('all')
  const [listingCategory, setListingCategory] = useState<LiveFeedCategory>('all')
  const [activeLiveStream, setActiveLiveStream] = useState<LiveFeedStream | null>(null)

  const dropsApiFeed = useDropsApiFeed()

  const liveStreams = useMemo(() => {
    const demos = buildLiveFeedStreams()
    const apiRows = dropsReelsForLiveAuctionFloor(dropsApiFeed.reels)
    const apiMapped = apiRows.map((r, idx) => dropReelToLiveFeedStream(r, idx))
    if (!dropsApiFeed.database) return demos
    if (apiMapped.length === 0) return demos
    return apiMapped
  }, [dropsApiFeed.reels, dropsApiFeed.database])

  const filteredLiveStreams = useMemo(() => {
    let s = liveStreams
    if (liveCategory === 'ending_soon') {
      s = s.filter((x) => x.tag === 'ending_soon')
    } else if (liveCategory !== 'all') {
      s = s.filter((x) => x.category === liveCategory)
    }
    const q = peerListFilter.q?.trim().toLowerCase()
    if (q) {
      s = s.filter((x) =>
        `${x.title} ${x.seller} ${x.streamTitle} ${x.location}`.toLowerCase().includes(q),
      )
    }
    const sorted = [...s]
    sorted.sort((a, b) => b.watchers - a.watchers)
    return sorted
  }, [liveStreams, liveCategory, peerListFilter.q])

  const onListingBrowseCategory = useCallback((id: LiveFeedCategory) => {
    setListingCategory(id)
    const cat = peerListingCategoryChipToFilterCategory(id)
    setPeerListFilter((prev) => ({ ...prev, category: cat }))
  }, [])

  const liveCategoryChipsDisplay = useMemo(
    () =>
      LIVE_FEED_FILTER_CHIPS.map(({ id, label }) => ({
        id,
        label,
        imageSrc: id === 'all' ? undefined : LIVE_CATEGORY_CHIP_COVER[id],
      })),
    [],
  )

  const openListingFromLive = useCallback(async (listingId: string) => {
    setActiveLiveStream(null)
    const id = listingId.trim()
    if (!id) return
    try {
      const listing = await fetchListing(id)
      setPeerListingSheet(listing)
      setPeerListings((prev) => (prev.some((x) => x.id === listing.id) ? prev : [listing, ...prev]))
    } catch {
      /* demo */
    }
  }, [])

  const sessionEmail = loadSession()?.email?.trim() ?? ''

  const applyPeerListClientFilters = useCallback(
    (list: PeerListing[]): PeerListing[] => {
      let out = list
      const cat = peerListFilter.category?.trim()
      if (cat === 'free') {
        out = out.filter((l) => l.priceCents === 0 || /\bfree\b/i.test(l.title))
      } else if (cat && cat !== 'all') {
        out = out.filter((l) => (l.category ?? 'general').toLowerCase() === cat.toLowerCase())
      }
      const q = peerListFilter.q?.trim().toLowerCase()
      if (q) {
        out = out.filter((l) => {
          const t = `${l.title} ${l.keywords ?? ''}`.toLowerCase()
          return t.includes(q)
        })
      }
      if (peerListFilter.maxPriceCents != null && Number.isFinite(peerListFilter.maxPriceCents)) {
        const cap = peerListFilter.maxPriceCents
        out = out.filter((l) => (l.priceCents ?? 0) <= cap)
      }
      return out
    },
    [peerListFilter.category, peerListFilter.maxPriceCents, peerListFilter.q],
  )

  const filteredPeerListingsForGrid = useMemo(() => {
    let list = applyPeerListClientFilters(peerListings)
    if (listingCategory === 'ending_soon') {
      const now = Date.now()
      list = list.filter(
        (l) =>
          l.saleMode === 'auction' &&
          typeof l.auctionEndsAt === 'number' &&
          l.auctionEndsAt > now,
      )
    }
    const sorted = [...list]
    sorted.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    return sorted
  }, [peerListings, applyPeerListClientFilters, listingCategory])

  const loadPeerListings = useCallback(async () => {
    const catRaw = peerListFilter.category?.trim()
    const serverCategory =
      !catRaw || catRaw === 'all' || catRaw === 'free' || catRaw === 'other' ? undefined : catRaw
    try {
      const r = await fetchPublishedListings({
        limit: 64,
        q: peerListFilter.q?.trim() || undefined,
        category: serverCategory,
      })
      let api = r.listings
      if (catRaw === 'free') {
        api = api.filter((l) => l.priceCents === 0 || /\bfree\b/i.test(l.title))
      }
      if (peerListFilter.maxPriceCents != null && Number.isFinite(peerListFilter.maxPriceCents)) {
        const cap = peerListFilter.maxPriceCents
        api = api.filter((l) => (l.priceCents ?? 0) <= cap)
      }
      if (api.length > 0) {
        setPeerListings(api)
        return
      }
      setPeerListings(applyPeerListClientFilters([...MARKETPLACE_MOCK_PEER_LISTINGS]))
    } catch {
      setPeerListings(applyPeerListClientFilters([...MARKETPLACE_MOCK_PEER_LISTINGS]))
    }
  }, [applyPeerListClientFilters, peerListFilter.category, peerListFilter.maxPriceCents, peerListFilter.q])

  useEffect(() => {
    void loadPeerListings()
  }, [loadPeerListings])

  useEffect(() => {
    if (subView !== 'browse') return
    const pollMs = 22_000
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadPeerListings()
    }, pollMs)
    const onVis = () => {
      if (document.visibilityState === 'visible') void loadPeerListings()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [subView, loadPeerListings])

  useEffect(() => {
    if (!browseHandoff) return
    if (browseHandoff.id === lastBrowseHandoffIdRef.current) return
    lastBrowseHandoffIdRef.current = browseHandoff.id
    setSubView('browse')
    setPeerListFilter({
      category: browseHandoff.category,
      q: browseHandoff.q,
      maxPriceCents: browseHandoff.maxPriceCents,
      scope: browseHandoff.scope,
    })
    onBrowseHandoffConsumed?.()
  }, [browseHandoff, onBrowseHandoffConsumed])

  useEffect(() => {
    if (!segmentHandoff) return
    if (segmentHandoff.id === lastSegmentHandoffIdRef.current) return
    lastSegmentHandoffIdRef.current = segmentHandoff.id
    setBrowseSegment(segmentHandoff.segment)
    onSegmentHandoffConsumed?.()
  }, [segmentHandoff, onSegmentHandoffConsumed])

  useEffect(() => {
    if (!sellerHubHandoff) return
    if (sellerHubHandoff.id === lastSellerHubIdRef.current) return
    lastSellerHubIdRef.current = sellerHubHandoff.id
    setSellerOverlayLanding(sellerHubHandoff.panel)
    setSellerOverlayMountKey((k) => k + 1)
    setSellerToolsOpen(true)
    onSellerHubHandoffConsumed?.()
  }, [sellerHubHandoff, onSellerHubHandoffConsumed])

  const applyFallbackCatalog = useCallback(async () => {
    try {
      const rows = await fetchStoreCatalog()
      const staticById = new Map(SUPPLY_PRODUCTS.map((p) => [p.id, p]))
      setCatalogProducts(rows.map((row) => apiCatalogRowToSupplyProduct(row, staticById.get(row.id))))
    } catch {
      setCatalogProducts([...SUPPLY_PRODUCTS])
    }
  }, [])

  useEffect(() => {
    if (productsApiLoading) return
    void (async () => {
      if (apiProductList.length > 0) {
        setCatalogProducts(apiProductList.map(publicProductToSupplyProduct))
      } else {
        await applyFallbackCatalog()
      }
    })()
  }, [productsApiLoading, apiProductList, applyFallbackCatalog])

  const productById = useMemo(() => {
    const list = catalogProducts ?? [...SUPPLY_PRODUCTS]
    return new Map(list.map((p) => [p.id, p] as const))
  }, [catalogProducts])

  const openSellerTools = useCallback(() => {
    setSellerOverlayLanding('feed')
    setSellerOverlayMountKey((k) => k + 1)
    setSellerToolsOpen(true)
  }, [])

  const closePeerListingSheet = useCallback(() => {
    setPeerListingSheet(null)
    setPeerStripeBuy(null)
    setPeerBuyErr(null)
  }, [])

  const startPeerBuy = useCallback(
    async (listing: PeerListing) => {
      setPeerBuyErr(null)
      setPeerStripeBuy(null)
      if (isPublicDemoListingId(listing.id)) {
        setPeerBuyErr(DEMO_LISTING_CHECKOUT_DISABLED_MESSAGE)
        return
      }
      setPeerCheckoutBusy(true)
      try {
        await syncCustomerSessionCookie()
        const { paymentIntent } = await checkoutListing(listing.id)
        if (paymentIntent.provider === 'stripe') {
          if (!isStripePublishableConfigured()) {
            setPeerBuyErr('Set VITE_STRIPE_PUBLISHABLE_KEY to pay with Stripe.')
            return
          }
          if (!paymentIntent.clientSecret) {
            setPeerBuyErr('Missing Stripe client secret.')
            return
          }
          setPeerStripeBuy({ clientSecret: paymentIntent.clientSecret, paymentIntentId: paymentIntent.id })
          return
        }
        await confirmDemoPaymentIntent(paymentIntent)
        closePeerListingSheet()
        void loadPeerListings()
      } catch (e) {
        setPeerBuyErr(formatListingCheckoutError(e))
      } finally {
        setPeerCheckoutBusy(false)
      }
    },
    [closePeerListingSheet, loadPeerListings],
  )

  const cartLines = useMemo(() => {
    const out: { product: SupplyProduct; qty: number }[] = []
    for (const [id, qty] of Object.entries(cartQtyById)) {
      if (qty <= 0) continue
      const product = productById.get(id)
      if (product && !isExternalAffiliateProduct(product)) out.push({ product, qty })
    }
    return out
  }, [cartQtyById, productById])

  const cartItemCount = useMemo(
    () => cartLines.reduce((sum, { qty }) => sum + qty, 0),
    [cartLines],
  )

  const cartTotalAud = useMemo(
    () => cartLines.reduce((sum, { product, qty }) => sum + product.priceAud * qty, 0),
    [cartLines],
  )

  const addOne = useCallback((p: SupplyProduct) => {
    if (isExternalAffiliateProduct(p)) return
    setCartQtyById((prev) => ({ ...prev, [p.id]: (prev[p.id] ?? 0) + 1 }))
  }, [])

  const setQty = useCallback((id: string, qty: number) => {
    setCartQtyById((prev) => {
      const next = { ...prev }
      if (qty <= 0) delete next[id]
      else next[id] = qty
      return next
    })
  }, [])

  const goBrowse = useCallback(() => {
    setCompletedOrderId(null)
    setStripeStoreCheckout(null)
    setCheckoutError(null)
    setSubView('browse')
  }, [])

  const goCart = useCallback(() => {
    setCartEnterLoading(true)
    setCartOpenSeq((n) => n + 1)
    setSubView('cart')
  }, [])

  useEffect(() => {
    if (!consumePendingOpenMarketplaceCart()) return
    queueMicrotask(() => goCart())
  }, [goCart])

  const dropsProductHandoffDoneRef = useRef<string | null>(null)
  useEffect(() => {
    if (!dropsProductHandoff) {
      dropsProductHandoffDoneRef.current = null
      return
    }
    const sig = `${dropsProductHandoff.productId}:${dropsProductHandoff.mode}`
    if (dropsProductHandoffDoneRef.current === sig) return
    const p = productById.get(dropsProductHandoff.productId)
    if (!p) {
      onDropsProductHandoffConsumed?.()
      return
    }
    dropsProductHandoffDoneRef.current = sig
    setPeerListingSheet(null)
    setCompletedOrderId(null)
    setStripeStoreCheckout(null)
    setCheckoutError(null)
    setSubView('browse')
    if (dropsProductHandoff.mode === 'sheet' || isExternalAffiliateProduct(p)) {
      setProductSheet(p)
    } else {
      addOne(p)
      goCart()
    }
    onDropsProductHandoffConsumed?.()
  }, [dropsProductHandoff, productById, addOne, goCart, onDropsProductHandoffConsumed])

  useEffect(() => {
    if (!dropsListingHandoff) {
      dropsListingHandoffDoneRef.current = null
      return
    }
    const { listingId, mode } = dropsListingHandoff
    const sig = `${listingId}:${mode}`
    if (dropsListingHandoffDoneRef.current === sig) return
    dropsListingHandoffDoneRef.current = sig

    const run = async () => {
      let listing = peerListings.find((l) => l.id === listingId)
      if (!listing) {
        try {
          const fetched = await fetchListing(listingId)
          listing = fetched
          setPeerListings((prev) => (prev.some((x) => x.id === fetched.id) ? prev : [fetched, ...prev]))
        } catch {
          dropsListingHandoffDoneRef.current = null
          onDropsListingHandoffConsumed?.()
          return
        }
      }
      setProductSheet(null)
      setSubView('browse')
      setPeerListingSheet(listing)
      if (mode === 'buyNow') {
        queueMicrotask(() => void startPeerBuy(listing))
      }
      onDropsListingHandoffConsumed?.()
    }
    void run()
  }, [dropsListingHandoff, peerListings, onDropsListingHandoffConsumed, startPeerBuy])

  const goCheckout = useCallback(() => setSubView('checkout'), [])

  const placeStoreOrder = useCallback(async () => {
    if (cartLines.length === 0) return
    setCheckoutBusy(true)
    setCheckoutError(null)
    setStripeStoreCheckout(null)
    try {
      await syncCheckoutCustomerSession(checkoutEmail)
      const lines = cartLines.map(({ product, qty }) => ({ productId: product.id, qty }))
      const idem =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `idem_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const { storeOrder, paymentIntent } = await storeCheckout(
        {
          lines,
          shipping: {
            name: checkoutName,
            email: checkoutEmail,
            address: checkoutAddress,
          },
        },
        idem,
      )
      if (paymentIntent.provider === 'stripe') {
        if (!isStripePublishableConfigured()) {
          setCheckoutError(
            'Stripe is enabled on the server. Set VITE_STRIPE_PUBLISHABLE_KEY in the app env for checkout.',
          )
          return
        }
        if (!paymentIntent.clientSecret) {
          setCheckoutError('Missing Stripe client secret.')
          return
        }
        setStripeStoreCheckout({
          clientSecret: paymentIntent.clientSecret,
          paymentIntentId: paymentIntent.id,
          storeOrderId: storeOrder.id,
        })
        return
      }
      await confirmDemoPaymentIntent(paymentIntent)
      setCompletedOrderId(storeOrder.id)
      setCartQtyById({})
      setCheckoutName('')
      setCheckoutEmail('')
      setCheckoutAddress('')
      setSubView('orderComplete')
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Checkout failed')
    } finally {
      setCheckoutBusy(false)
    }
  }, [cartLines, checkoutAddress, checkoutEmail, checkoutName])

  useEffect(() => {
    if (!productSheet && !peerListingSheet) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (peerListingSheet) {
        closePeerListingSheet()
      } else {
        setProductSheet(null)
      }
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [productSheet, peerListingSheet, closePeerListingSheet])

  useEffect(() => {
    if (subView === 'checkout' && cartLines.length === 0) {
      setCartEnterLoading(true)
      setCartOpenSeq((n) => n + 1)
      setSubView('cart')
    }
  }, [subView, cartLines.length])

  useEffect(() => {
    if (subView !== 'cart') {
      setCartEnterLoading(false)
      return
    }
    const tid = window.setTimeout(() => setCartEnterLoading(false), CART_OPEN_SKELETON_MS)
    return () => window.clearTimeout(tid)
  }, [subView, cartOpenSeq])

  useEffect(() => {
    if (parentGatesBrowseBoot) return
    const tid = window.setTimeout(() => setMarketplaceBootLoading(false), MARKETPLACE_BOOT_SKELETON_MS)
    return () => window.clearTimeout(tid)
  }, [parentGatesBrowseBoot])

  useEffect(() => {
    if (!parentGatesBrowseBoot) return
    setMarketplaceBootLoading(!browseShellRevealReady)
  }, [browseShellRevealReady, parentGatesBrowseBoot])

  const checkoutValid =
    checkoutName.trim().length > 0 &&
    checkoutEmail.trim().length > 0 &&
    checkoutAddress.trim().length > 0

  const browseShellClass = 'bg-white'
  /** Matches `.fetch-home-intent-bottom-nav` min-height + pad so content clears the docked bar. */
  const shellDockInsetReserved =
    (Boolean(bottomNav) || renderShellDockOutsideRoute) && !sellerToolsOpen
  const shellDockContentPad = shellDockInsetReserved
    ? 'pb-[calc(2.95rem+env(safe-area-inset-bottom,0px)+0.5rem)]'
    : ''
  const renderFixedShellDockSlot =
    Boolean(bottomNav) && !sellerToolsOpen && !renderShellDockOutsideRoute

  return (
    <div
      className={[
        'fetch-home-marketplace-page absolute inset-0 z-[54] flex min-h-0 flex-col',
        browseShellClass,
      ].join(' ')}
      role="main"
      aria-label="Marketplace"
      aria-busy={marketplaceBootLoading}
    >
        {marketplaceBootLoading ? (
          <div className={['flex min-h-0 min-w-0 flex-1 flex-col', shellDockContentPad].filter(Boolean).join(' ')}>
            <MarketplaceBrowseBootSkeleton />
          </div>
        ) : (
        <div
          className={['fetch-home-marketplace-body flex min-h-0 flex-1 flex-col bg-white', shellDockContentPad]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {subView === 'browse' ? null : subView === 'cart' ? (
              <header className="shrink-0 bg-white px-3 py-2.5 pt-[max(0.5rem,env(safe-area-inset-top,0px))]">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-800 active:bg-zinc-100"
                    aria-label="Back to shop"
                    onClick={goBrowse}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M15 6l-6 6 6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </header>
            ) : subView === 'checkout' ? (
              <header className="shrink-0 bg-white px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-800 active:bg-zinc-100"
                    aria-label="Back to cart"
                    onClick={goCart}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M15 6l-6 6 6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <h1 className="text-[1.2rem] font-bold tracking-[-0.03em] text-zinc-900">Checkout</h1>
                </div>
              </header>
            ) : (
              <header className="shrink-0 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
                <h1 className="text-center text-[1.2rem] font-bold tracking-[-0.03em] text-zinc-900">
                  Order confirmed
                </h1>
              </header>
            )}

            {subView === 'browse' ? (
              <div className="flex min-h-0 flex-1 flex-col bg-white">
                {browseSegment === 'shop' ? (
                  <header className={MARKETPLACE_SHOP_HEADER_SHELL_CLASS}>
                    <div className="mx-auto flex w-full max-w-[min(100%,430px)] min-w-0 items-center justify-between gap-2 px-3 pt-[max(0.35rem,calc(env(safe-area-inset-top,0px)+0.15rem))] pb-2 sm:px-5">
                      <h1 className="min-w-0 shrink truncate text-left text-[clamp(1.55rem,6vw,2.05rem)] font-black leading-none tracking-tight text-zinc-900 sm:text-[2.125rem]">
                        Shop
                      </h1>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenSearch?.()}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent text-zinc-900 outline-none transition-[opacity,filter] active:opacity-70 focus-visible:ring-2 focus-visible:ring-violet-400/55 focus-visible:ring-offset-2"
                          aria-label="Search"
                        >
                          <MarketplaceSearchIcon className="h-7 w-7 text-zinc-800" />
                        </button>
                        {onOpenNotifications ? (
                          <button
                            type="button"
                            onClick={onOpenNotifications}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent text-zinc-900 outline-none transition-[opacity,filter] active:opacity-70 focus-visible:ring-2 focus-visible:ring-violet-400/55 focus-visible:ring-offset-2"
                            aria-label="Notifications"
                          >
                            <MarketplaceBrowseHeartIcon className="h-7 w-7 text-zinc-900" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </header>
                ) : (
                  <header className={HOME_SHELL_UNIFIED_TOP_HEADER_CLASS}>
                    <h1 className="shrink-0 text-[clamp(1.25rem,5vw,1.65rem)] font-black leading-none tracking-tight text-zinc-900 sm:text-[1.75rem]">
                      Live
                    </h1>
                    <div className="min-w-0 flex-1" aria-hidden />
                    <button
                      type="button"
                      onClick={() => onOpenSearch?.()}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent text-zinc-900 outline-none transition-[opacity,filter] active:opacity-70 focus-visible:ring-2 focus-visible:ring-violet-400/55 focus-visible:ring-offset-2"
                      aria-label="Search"
                    >
                      <MarketplaceSearchIcon className="h-7 w-7 text-zinc-800" />
                    </button>
                    {onOpenNotifications ? (
                      <button
                        type="button"
                        onClick={onOpenNotifications}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent text-zinc-900 outline-none transition-[opacity,filter] active:opacity-70 focus-visible:ring-2 focus-visible:ring-violet-400/55 focus-visible:ring-offset-2"
                        aria-label="Notifications"
                      >
                        <MarketplaceBrowseHeartIcon className="h-7 w-7 text-zinc-900" />
                      </button>
                    ) : null}
                  </header>
                )}
                <div
                  className="flex min-h-0 flex-1 flex-col bg-white"
                  role="region"
                  aria-label={browseSegment === 'auctions' ? 'Live auctions' : 'Local listings'}
                >
                  <div className="shrink-0 bg-white">
                    <div
                      className="mx-auto flex w-full max-w-[min(100%,430px)] gap-1 overflow-x-auto px-2.5 pb-3 pt-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                      role="group"
                      aria-label={
                        browseSegment === 'auctions' ? 'Live categories' : 'Listing categories'
                      }
                    >
                      {liveCategoryChipsDisplay.map(({ id, label, imageSrc }) => {
                        const selected =
                          browseSegment === 'auctions'
                            ? liveCategory === id
                            : listingCategory === id
                        const isDotsChip = id === 'all'
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() =>
                              browseSegment === 'auctions'
                                ? setLiveCategory(id)
                                : onListingBrowseCategory(id)
                            }
                            className="flex w-[4rem] shrink-0 flex-col items-center gap-1"
                          >
                            <span
                              className={[
                                isDotsChip
                                  ? 'relative flex h-[3.6rem] w-[3.6rem] shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 transition-shadow'
                                  : 'relative h-[3.6rem] w-[3.6rem] shrink-0 overflow-hidden rounded-full bg-zinc-100 transition-shadow',
                                selected
                                  ? 'ring-[3px] ring-[#291050] shadow-md'
                                  : 'ring-1 ring-zinc-200/90',
                              ].join(' ')}
                            >
                              {isDotsChip ? (
                                <MarketplaceListingCategoryDotsIcon selected={selected} />
                              ) : (
                                <img
                                  src={imageSrc}
                                  alt=""
                                  draggable={false}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </span>
                            <span
                              className={[
                                'max-w-full truncate text-center text-[10px] font-semibold leading-tight',
                                selected ? 'text-zinc-900' : 'text-zinc-600',
                              ].join(' ')}
                            >
                              {label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                    {browseSegment === 'auctions' ? (
                      filteredLiveStreams.length === 0 ? (
                        <div className="mx-auto max-w-[18rem] px-6 py-14 text-center">
                          <p className="text-[15px] font-semibold text-zinc-700">No live streams match</p>
                          <p className="mt-1 text-[13px] text-zinc-500">
                            Try a different category, clear your search, or check back when more sellers go live.
                          </p>
                        </div>
                      ) : (
                        <div className="mx-auto grid w-full max-w-[min(100%,430px)] grid-cols-2 gap-2.5 px-3 pb-[max(5rem,env(safe-area-inset-bottom,0px)+4rem)] pt-3">
                          {filteredLiveStreams.map((stream) => (
                            <LiveFeedCard
                              key={stream.id}
                              stream={stream}
                              onJoin={() => setActiveLiveStream(stream)}
                            />
                          ))}
                        </div>
                      )
                    ) : filteredPeerListingsForGrid.length === 0 ? (
                      <div className="mx-auto max-w-[18rem] px-6 py-14 text-center">
                        <p className="text-[15px] font-semibold text-zinc-700">No listings match</p>
                        <p className="mt-1 text-[13px] text-zinc-500">
                          Try a different category, raise the price ceiling, or clear your search.
                        </p>
                      </div>
                    ) : (
                      <div className="mx-auto grid w-full max-w-[min(100%,430px)] grid-cols-2 gap-1 px-3 pb-[max(5rem,env(safe-area-inset-bottom,0px)+4rem)] pt-3">
                        {filteredPeerListingsForGrid.map((listing) => (
                          <MarketplacePeerListingGridCard
                            key={listing.id}
                            listing={listing}
                            onOpen={() => setPeerListingSheet(listing)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : subView === 'cart' ? (
              <div
                className="flex min-h-0 flex-1 flex-col bg-white"
                role="region"
                aria-label="Shopping cart"
                aria-busy={cartEnterLoading}
              >
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch]">
                  {cartEnterLoading ? (
                    <ul className="fetch-marketplace-cart-skel space-y-4" aria-hidden>
                      {[0, 1, 2].map((i) => (
                        <li
                          key={i}
                          className="flex gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-3"
                        >
                          <div className="h-16 w-16 shrink-0 rounded-xl bg-zinc-200/70" />
                          <div className="min-w-0 flex-1 space-y-2 py-0.5">
                            <div className="h-4 max-w-[78%] rounded-md bg-zinc-200/80" />
                            <div className="h-3 max-w-[40%] rounded-md bg-zinc-200/60" />
                            <div className="h-8 w-[7.5rem] rounded-lg bg-zinc-200/70" />
                          </div>
                          <div className="h-5 w-14 shrink-0 rounded-md bg-zinc-200/75" />
                        </li>
                      ))}
                    </ul>
                  ) : cartLines.length === 0 ? (
                    <p className="py-16 text-center text-[15px] font-medium text-zinc-500">
                      Your cart is empty.
                    </p>
                  ) : (
                    <ul className="space-y-4">
                      {cartLines.map(({ product: p, qty }) => (
                        <li
                          key={p.id}
                          className="flex gap-3 rounded-2xl border border-zinc-200/90 bg-zinc-50/50 p-3"
                        >
                          <button
                            type="button"
                            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white"
                            aria-label={`View ${p.title} details`}
                            onClick={() => setProductSheet(p)}
                          >
                            <SupplyProductThumb
                              src={p.coverImageUrl}
                              alt=""
                              className="max-h-full max-w-full object-contain p-1"
                            />
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-bold leading-snug text-zinc-900">{p.title}</p>
                            <p className="mt-0.5 text-[12px] text-zinc-500">{formatAud(p.priceAud)} each</p>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex items-center gap-1 rounded-lg bg-white p-0.5 ring-1 ring-zinc-200/80">
                                <button
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-md text-[16px] font-semibold text-zinc-700 active:bg-zinc-100"
                                  aria-label={`Decrease ${p.title}`}
                                  onClick={() => setQty(p.id, qty - 1)}
                                >
                                  âˆ’
                                </button>
                                <span className="min-w-[1.5rem] text-center text-[14px] font-bold tabular-nums text-zinc-900">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-md text-[16px] font-semibold text-zinc-700 active:bg-zinc-100"
                                  aria-label={`Increase ${p.title}`}
                                  onClick={() => setQty(p.id, qty + 1)}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[14px] font-extrabold tabular-nums text-zinc-900">
                              {formatAud(p.priceAud * qty)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="shrink-0 space-y-3 border-t border-zinc-200/80 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
                  {cartEnterLoading ? (
                    <div className="fetch-marketplace-cart-skel space-y-3" aria-hidden>
                      <div className="flex items-center justify-between gap-2">
                        <div className="h-4 w-20 rounded-md bg-zinc-200/75" />
                        <div className="h-8 w-28 rounded-lg bg-zinc-200/80" />
                      </div>
                      <div className="h-3 w-full max-w-sm rounded-md bg-zinc-100" />
                      <div className="h-12 w-full rounded-xl bg-zinc-200/55" />
                      <div className="h-12 w-full rounded-xl bg-zinc-200/45" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[15px] font-semibold text-zinc-600">Subtotal</span>
                        <span className="text-[1.25rem] font-extrabold tabular-nums text-zinc-900">
                          {formatAud(cartTotalAud)}
                        </span>
                      </div>
                      <p className="text-[12px] leading-snug text-zinc-500">
                        Shipping and taxes are estimated at checkout (demo).
                      </p>
                      <button
                        type="button"
                        className="w-full rounded-xl border border-zinc-200/90 bg-white py-3 text-[15px] font-semibold text-zinc-900 active:bg-zinc-50"
                        onClick={goBrowse}
                      >
                        Back to live floor
                      </button>
                      <button
                        type="button"
                        disabled={cartLines.length === 0}
                        className="w-full rounded-xl bg-[#291050] py-3.5 text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 active:opacity-90"
                        onClick={goCheckout}
                      >
                        Checkout
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : subView === 'checkout' ? (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
                <div className="mx-auto max-w-md space-y-4">
                  <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/60 px-4 py-3">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">Order summary</p>
                    <p className="mt-1 text-[1.125rem] font-extrabold tabular-nums text-zinc-900">
                      {formatAud(cartTotalAud)}
                      <span className="text-[13px] font-semibold text-zinc-500">
                        {' '}
                        {' · '}
                        {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
                      </span>
                    </p>
                  </div>
                  <label className="block">
                    <span className="text-[12px] font-semibold text-zinc-700">Full name</span>
                    <input
                      type="text"
                      value={checkoutName}
                      onChange={(e) => setCheckoutName(e.target.value)}
                      autoComplete="name"
                      className="mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 focus:ring-2"
                      placeholder="Alex Fetch"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] font-semibold text-zinc-700">Email</span>
                    <input
                      type="email"
                      value={checkoutEmail}
                      onChange={(e) => setCheckoutEmail(e.target.value)}
                      autoComplete="email"
                      className="mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 focus:ring-2"
                      placeholder="you@example.com"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] font-semibold text-zinc-700">Delivery address</span>
                    <textarea
                      value={checkoutAddress}
                      onChange={(e) => setCheckoutAddress(e.target.value)}
                      autoComplete="street-address"
                      rows={3}
                      className="mt-1.5 w-full resize-none rounded-xl border border-zinc-200/90 bg-white px-3 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 focus:ring-2"
                      placeholder="Street, suburb, state, postcode"
                    />
                  </label>
                  {checkoutError ? (
                    <p className="rounded-xl border border-[#f0b8c2] bg-[#fef5f6] px-3 py-2 text-[12px] font-medium text-[#8B0019]">
                      {checkoutError}
                    </p>
                  ) : null}
                  <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-3">
                    <p className="text-[12px] font-semibold text-zinc-700">Payment</p>
                    <p className="mt-1 text-[13px] leading-snug text-zinc-500">
                      {stripeStoreCheckout && import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim()
                        ? 'Pay securely with your card. Totals are set by the server from the catalog.'
                        : 'Uses your saved card from Account when the server is in demo mode; otherwise Stripe card form below when publishable key is set.'}
                    </p>
                  </div>
                  {stripeStoreCheckout && import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ? (
                    <div className="rounded-2xl border border-violet-200/60 bg-white px-4 py-4">
                      <FetchStripePaymentElement
                        publishableKey={import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY.trim()}
                        clientSecret={stripeStoreCheckout.clientSecret}
                        submitLabel={checkoutBusy ? 'Confirmingâ€¦' : 'Pay now'}
                        disabled={checkoutBusy}
                        errorText={checkoutError}
                        onError={(msg) => setCheckoutError(msg)}
                        onSuccess={() => {
                          void (async () => {
                            setCheckoutBusy(true)
                            setCheckoutError(null)
                            try {
                              await waitForPaymentIntentServerConfirmed(stripeStoreCheckout.paymentIntentId)
                              setCompletedOrderId(stripeStoreCheckout.storeOrderId)
                              setStripeStoreCheckout(null)
                              setCartQtyById({})
                              setCheckoutName('')
                              setCheckoutEmail('')
                              setCheckoutAddress('')
                              setSubView('orderComplete')
                            } catch (e) {
                              setCheckoutError(
                                e instanceof Error ? e.message : 'Payment confirmation failed.',
                              )
                            } finally {
                              setCheckoutBusy(false)
                            }
                          })()
                        }}
                      />
                      <button
                        type="button"
                        disabled={checkoutBusy}
                        className="mt-3 w-full text-[12px] font-medium text-zinc-400 underline decoration-zinc-600"
                        onClick={() => {
                          setStripeStoreCheckout(null)
                          setCheckoutError(null)
                        }}
                      >
                        Cancel card payment
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!checkoutValid || cartLines.length === 0 || checkoutBusy}
                      className="w-full rounded-xl bg-[#291050] py-3.5 text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 active:opacity-90"
                      onClick={() => void placeStoreOrder()}
                    >
                      {checkoutBusy ? 'Processingâ€¦' : 'Place order'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#fde8ec] text-[#00ff6a]">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-[17px] font-bold text-zinc-900">Thanks â€” your order is placed</p>
                {completedOrderId ? (
                  <p className="mt-2 font-mono text-[13px] text-zinc-600">Order {completedOrderId}</p>
                ) : null}
                <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-zinc-500">
                  You&apos;ll receive confirmation by email once fulfilment is wired to your address.
                </p>
                <button
                  type="button"
                  className="mt-8 w-full max-w-xs rounded-xl bg-[#291050] py-3.5 text-[15px] font-semibold text-white active:opacity-90"
                  onClick={goBrowse}
                >
                  Back to auctions
                </button>
              </div>
            )}
          </div>
        </div>
        )}

        {renderFixedShellDockSlot ? (
          <div className="fetch-home-marketplace-shell-dock pointer-events-auto fixed inset-x-0 bottom-0 z-[55] mx-auto flex w-full max-w-[min(100%,430px)] flex-col items-stretch">
            <div className="fetch-home-marketplace-shell-footer w-full shrink-0">
              {bottomNav}
            </div>
          </div>
        ) : null}

      {productSheet
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex flex-col justify-end" role="presentation">
              <button
                type="button"
                className="absolute inset-0 bg-[#1c1528]/35 backdrop-blur-[2px]"
                aria-label="Close product details"
                onClick={() => setProductSheet(null)}
              />
              <div
                className="relative z-[1] flex max-h-[min(92dvh,40rem)] flex-col rounded-t-[1.25rem] border border-zinc-200/90 bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.12)]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="fetch-marketplace-product-sheet-title"
              >
                <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-200" aria-hidden />
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                  <div className="flex max-h-[12rem] w-full items-center justify-center overflow-hidden rounded-2xl bg-zinc-50">
                    <SupplyProductThumb
                      src={productSheet.coverImageUrl}
                      alt={productSheet.title}
                      className="max-h-[12rem] w-full object-contain object-center p-4"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    {supplyProductShowsCompare(productSheet) ? (
                      <span className="text-[1.05rem] font-bold tabular-nums text-zinc-400 line-through decoration-zinc-300">
                        {formatAud(productSheet.compareAtAud ?? 0)}
                      </span>
                    ) : null}
                    <span className="text-[1.35rem] font-extrabold tabular-nums tracking-tight text-zinc-900">
                      {formatListingPriceAud(productSheet)}
                    </span>
                    {supplyProductShowsCompare(productSheet) &&
                    productSheet.compareAtAud &&
                    productSheet.priceAud > 0 ? (
                      <span className="rounded-full bg-[#fde8ec] px-2 py-0.5 text-[12px] font-extrabold text-[#8B0019]">
                        Save{' '}
                        {Math.min(
                          99,
                          Math.round(
                            ((productSheet.compareAtAud - productSheet.priceAud) / productSheet.compareAtAud) *
                              100,
                          ),
                        )}
                        %
                      </span>
                    ) : null}
                  </div>
                  <h2
                    id="fetch-marketplace-product-sheet-title"
                    className="mt-1 text-[1.2rem] font-bold leading-tight tracking-[-0.03em] text-zinc-900"
                  >
                    {productSheet.title}
                  </h2>
                  <p className="mt-1 text-[14px] font-medium text-zinc-500">{productSheet.subtitle}</p>
                  <p className="mt-3 text-[14px] leading-relaxed text-zinc-600">{productSheet.description}</p>
                  <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-zinc-500">Includes</p>
                  <ul className="mt-2 list-disc space-y-1.5 border-t border-zinc-100 pt-3 pl-5 text-[13px] leading-snug text-zinc-700">
                    {productSheet.specs.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <div className="mt-5 flex flex-col gap-2">
                    {isExternalAffiliateProduct(productSheet) && productSheet.affiliateUrl ? (
                      <>
                        <a
                          href={productSheet.affiliateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center justify-center rounded-xl bg-amber-500 py-3.5 text-[15px] font-semibold text-amber-950 active:opacity-90"
                        >
                          View on Amazon
                        </a>
                        <p className="text-center text-[11px] font-medium leading-snug text-zinc-500">
                          Opens in a new tab. Purchases may support Fetch via our affiliate link.
                        </p>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="w-full rounded-xl bg-[#291050] py-3.5 text-[15px] font-semibold text-white active:opacity-90"
                          onClick={() => {
                            addOne(productSheet)
                          }}
                        >
                          Add to cart
                        </button>
                        {(cartQtyById[productSheet.id] ?? 0) > 0 ? (
                          <div className="flex items-center justify-center gap-3 rounded-xl border border-zinc-200/90 bg-zinc-50/80 py-2">
                            <span className="text-[13px] font-semibold text-zinc-600">In cart</span>
                            <div className="flex items-center gap-1 rounded-lg bg-white p-0.5 ring-1 ring-zinc-200/80">
                              <button
                                type="button"
                                className="flex h-9 w-9 items-center justify-center rounded-md text-[17px] font-semibold text-zinc-700 active:bg-zinc-100"
                                aria-label="Decrease quantity"
                                onClick={() =>
                                  setQty(productSheet.id, (cartQtyById[productSheet.id] ?? 0) - 1)
                                }
                              >
                                âˆ’
                              </button>
                              <span className="min-w-[1.5rem] text-center text-[15px] font-bold tabular-nums text-zinc-900">
                                {cartQtyById[productSheet.id] ?? 0}
                              </span>
                              <button
                                type="button"
                                className="flex h-9 w-9 items-center justify-center rounded-md text-[17px] font-semibold text-zinc-700 active:bg-zinc-100"
                                aria-label="Increase quantity"
                                onClick={() =>
                                  setQty(productSheet.id, (cartQtyById[productSheet.id] ?? 0) + 1)
                                }
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ) : null}
                        <button
                          type="button"
                          className="w-full py-2 text-[14px] font-semibold text-zinc-600 active:text-zinc-900"
                          onClick={() => {
                            setProductSheet(null)
                            goCart()
                          }}
                        >
                          View cart
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="w-full py-2 text-[13px] font-semibold text-zinc-500 active:text-zinc-800"
                      onClick={() => setProductSheet(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {peerListingSheet
        ? createPortal(
            (() => {
              const selected = peerListingSheet
              const sellerEm = selected.sellerEmail?.trim().toLowerCase() ?? ''
              const viewerEm = sessionEmail.trim().toLowerCase()
              const isViewerSeller = Boolean(sellerEm && viewerEm && sellerEm === viewerEm)
              const isDemoListing = isPublicDemoListingId(selected.id)
              return (
                <div className="fixed inset-0 z-[200] flex flex-col justify-end" role="presentation">
                  <button
                    type="button"
                    className="absolute inset-0 bg-[#1c1528]/35 backdrop-blur-[2px]"
                    aria-label="Close listing details"
                    onClick={closePeerListingSheet}
                  />
                  <div
                    className="relative z-[1] flex max-h-[min(92dvh,40rem)] min-h-0 flex-col rounded-t-[1.25rem] border border-zinc-200/90 bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.12)]"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="fetch-marketplace-peer-sheet-title"
                  >
                    <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-200" aria-hidden />
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-3">
                      {selected.images && selected.images.length > 0 ? (
                        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {[...selected.images]
                            .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
                            .map((im) => (
                              <img
                                key={im.url}
                                src={listingImageAbsoluteUrl(im.url)}
                                alt=""
                                className="h-44 w-44 shrink-0 rounded-2xl border border-zinc-200/80 object-cover shadow-sm"
                              />
                            ))}
                        </div>
                      ) : (
                        <div className="mb-3 flex h-36 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 text-[12px] font-medium text-zinc-400">
                          No photos
                        </div>
                      )}
                      <h2
                        id="fetch-marketplace-peer-sheet-title"
                        className="text-[1.15rem] font-bold text-zinc-900"
                      >
                        {selected.title}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <p className="text-[20px] font-extrabold tabular-nums text-zinc-900">
                          {formatAudFromCents(selected.priceCents ?? 0)}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-zinc-800">
                          {selected.condition || 'used'}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-zinc-800">
                          {selected.category || 'general'}
                        </span>
                        {selected.locationLabel?.trim() ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#fef5f6] px-2.5 py-1 text-[11px] font-semibold text-[#00ff6a]">
                            <PeerListingSheetMapPin className="h-3.5 w-3.5 shrink-0" />
                            {selected.locationLabel.trim()}
                          </span>
                        ) : null}
                        {selected.sku?.trim() ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-amber-950">
                            SKU {selected.sku.trim()}
                          </span>
                        ) : null}
                        {selected.acceptsOffers ? (
                          <span className="rounded-full bg-[#fef5f6] px-2.5 py-1 text-[11px] font-bold text-[#00ff6a]">
                            Offers welcome
                          </span>
                        ) : null}
                        {selected.fetchDelivery ? (
                          <span className="rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-bold text-white">
                            Fetch delivery
                          </span>
                        ) : null}
                      </div>
                      {selected.profileAuthorId?.trim() ? (
                        <div className="mt-3 flex items-center gap-3 rounded-xl border border-zinc-200/90 bg-zinc-50/90 px-3 py-2.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-white text-lg leading-none">
                            {(() => {
                              const av = selected.profileAvatar?.trim()
                              if (av && /^https?:\/\//i.test(av)) {
                                return <img src={av} alt="" className="h-full w-full object-cover" />
                              }
                              return <span aria-hidden>{av && av.length <= 8 ? av : 'ðŸª'}</span>
                            })()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Seller</p>
                            <p className="truncate text-[14px] font-semibold text-zinc-900">
                              {peerListingPublicSellerLine(selected) ?? '@seller'}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="shrink-0 rounded-lg bg-[#291050] px-3 py-2 text-[12px] font-bold text-white active:bg-[#5b21b6]"
                            onClick={openSellerTools}
                          >
                            View in Drops
                          </button>
                        </div>
                      ) : null}
                      {selected.keywords?.trim() ? (
                        <p className="mt-2 text-[11px] leading-snug text-zinc-500">
                          <span className="font-semibold text-zinc-600">Search terms: </span>
                          {selected.keywords.trim()}
                        </p>
                      ) : null}
                      <p className="mt-3 whitespace-pre-wrap text-[13px] leading-snug text-zinc-600">
                        {selected.description}
                      </p>
                      {sessionEmail && onOpenListingChat && !isViewerSeller ? (
                        <button
                          type="button"
                          disabled={peerCheckoutBusy}
                          className="mt-3 w-full rounded-xl border border-zinc-300 bg-white py-3 text-[15px] font-semibold text-zinc-900 shadow-sm active:bg-zinc-50 disabled:opacity-50"
                          onClick={() => void onOpenListingChat(selected.id)}
                        >
                          Message seller
                        </button>
                      ) : null}
                    </div>
                    <div className="shrink-0 border-t border-zinc-100 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                      {isDemoListing && !peerBuyErr ? (
                        <p className="mb-2 text-[12px] font-medium text-amber-900/90">
                          Showcase listing â€” checkout is disabled. Use your own listing to test payments.
                        </p>
                      ) : null}
                      {peerBuyErr ? (
                        <p className="mb-2 text-[12px] font-medium text-[#00ff6a]">{peerBuyErr}</p>
                      ) : null}
                      {peerStripeBuy && import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ? (
                        <div className="rounded-xl border border-violet-200/60 bg-white p-3">
                          <FetchStripePaymentElement
                            publishableKey={import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY.trim()}
                            clientSecret={peerStripeBuy.clientSecret}
                            submitLabel={peerCheckoutBusy ? 'â€¦' : 'Pay'}
                            disabled={peerCheckoutBusy || isDemoListing}
                            errorText={peerBuyErr}
                            onError={(m) => setPeerBuyErr(m)}
                            onSuccess={() => {
                              void (async () => {
                                const stripe = peerStripeBuy
                                if (!stripe) return
                                setPeerCheckoutBusy(true)
                                setPeerBuyErr(null)
                                try {
                                  await waitForPaymentIntentServerConfirmed(stripe.paymentIntentId)
                                  closePeerListingSheet()
                                  void loadPeerListings()
                                } catch (e) {
                                  setPeerBuyErr(e instanceof Error ? e.message : 'Confirm failed')
                                } finally {
                                  setPeerCheckoutBusy(false)
                                }
                              })()
                            }}
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={peerCheckoutBusy || isViewerSeller || isDemoListing}
                          className="w-full rounded-xl bg-[#291050] py-3.5 text-[15px] font-semibold text-white disabled:opacity-50"
                          onClick={() => void startPeerBuy(selected)}
                        >
                          {peerCheckoutBusy ? 'â€¦' : isDemoListing ? 'Checkout unavailable' : 'Buy now'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="mt-3 w-full py-2 text-[13px] font-semibold text-zinc-500 active:text-zinc-800"
                        onClick={closePeerListingSheet}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )
            })(),
            document.body,
          )
        : null}

      {sellerToolsOpen ? (
        <div className="absolute inset-0 z-[70] flex min-h-0 flex-col bg-zinc-100">
          <HomeShellBuySellPage
            key={sellerOverlayMountKey}
            bottomNav={bottomNav}
            onMenuAccount={onMenuAccount}
            onOpenListingChat={onOpenListingChat}
            onRequestHomeShellTab={onRequestHomeShellTab}
            dropsListingHandoff={dropsListingHandoff}
            onDropsListingHandoffConsumed={onDropsListingHandoffConsumed}
            onBookDriver={onBookDriver}
            syncBrowseFilter={peerListFilter}
            overlayMode
            overlayLandingPanel={sellerOverlayLanding}
            onOverlayClose={() => {
              setSellerToolsOpen(false)
              void loadPeerListings()
            }}
          />
        </div>
      ) : null}

      {activeLiveStream ? (
        <LiveVideoAuction
          stream={activeLiveStream}
          onClose={() => setActiveLiveStream(null)}
          onOpenListing={(id) => void openListingFromLive(id)}
        />
      ) : null}
    </div>
  )
}

export const HomeShellMarketplacePage = memo(HomeShellMarketplacePageInner)
