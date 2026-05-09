import type {
  DropCategoryId,
  DropRegionCode,
  DropReel,
  DropsCommerceTarget,
  DropsLiveShowcaseCommerce,
  LiveShowcaseCommerceItem,
} from './types'

const REGIONS: DropRegionCode[] = ['SEQ', 'NSW', 'VIC', 'AU_WIDE']
const CATEGORIES: DropCategoryId[] = [
  'supplies',
  'local_pickup',
  'b2b',
  'promo',
  'community',
  'services',
]

function asCommerce(raw: unknown): DropsCommerceTarget | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  if (o.kind === 'marketplace_product' && typeof o.productId === 'string')
    return { kind: 'marketplace_product', productId: o.productId }
  if (o.kind === 'buy_sell_listing' && typeof o.listingId === 'string')
    return { kind: 'buy_sell_listing', listingId: o.listingId }
  if (o.kind === 'live_showcase' && Array.isArray(o.items)) {
    const items: LiveShowcaseCommerceItem[] = []
    for (const it of o.items) {
      if (!it || typeof it !== 'object') continue
      const rec = it as Record<string, unknown>
      const label =
        typeof rec.label === 'string' && rec.label.trim() ? rec.label.trim().slice(0, 120) : undefined
      if (rec.kind === 'marketplace_product' && typeof rec.productId === 'string' && rec.productId.trim()) {
        items.push({ kind: 'marketplace_product', productId: rec.productId.trim(), ...(label ? { label } : {}) })
        continue
      }
      if (rec.kind === 'buy_sell_listing' && typeof rec.listingId === 'string' && rec.listingId.trim()) {
        items.push({ kind: 'buy_sell_listing', listingId: rec.listingId.trim(), ...(label ? { label } : {}) })
      }
    }
    const coverSquareUrl =
      typeof o.coverSquareUrl === 'string' ? o.coverSquareUrl.trim().slice(0, 2048) : ''
    const coverVerticalUrl =
      typeof o.coverVerticalUrl === 'string' ? o.coverVerticalUrl.trim().slice(0, 2048) : ''
    if (items.length) {
      const out: DropsLiveShowcaseCommerce = {
        kind: 'live_showcase',
        items,
      }
      if (coverSquareUrl) out.coverSquareUrl = coverSquareUrl
      if (coverVerticalUrl) out.coverVerticalUrl = coverVerticalUrl
      return out
    }
  }
  return undefined
}

/** Map GET /api/drops/feed row to `DropReel` for the home reels UI. */
export function mapApiDropToReel(raw: Record<string, unknown>): DropReel | null {
  const id = typeof raw.id === 'string' ? raw.id : ''
  if (!id) {
    console.warn('[drops/mapApiDrop] feed row hidden: missing id', { keys: Object.keys(raw) })
    return null
  }
  const title = typeof raw.title === 'string' ? raw.title : ''
  const seller = typeof raw.seller === 'string' ? raw.seller : '@seller'
  const authorId = typeof raw.authorId === 'string' ? raw.authorId : id
  const priceLabel = typeof raw.priceLabel === 'string' ? raw.priceLabel : ''
  const blurb = typeof raw.blurb === 'string' ? raw.blurb : ''
  const likes = Number(raw.likes)
  const growthVelocityScore = Number(raw.growthVelocityScore)
  const watchTimeMsSeed = Number(raw.watchTimeMsSeed)
  const viewMsTotal = Number(raw.viewMsTotal)
  const catsRaw = raw.categories
  const categories: DropCategoryId[] = Array.isArray(catsRaw)
    ? catsRaw.filter((c): c is DropCategoryId => CATEGORIES.includes(c as DropCategoryId))
    : ['community']
  const regionRaw = typeof raw.region === 'string' ? raw.region : 'SEQ'
  const region = REGIONS.includes(regionRaw as DropRegionCode) ? (regionRaw as DropRegionCode) : 'SEQ'
  const imageUrls = Array.isArray(raw.imageUrls)
    ? raw.imageUrls.filter((u): u is string => typeof u === 'string' && u.length > 0)
    : undefined
  const videoUrl = typeof raw.videoUrl === 'string' && raw.videoUrl ? raw.videoUrl : undefined
  const poster = typeof raw.poster === 'string' ? raw.poster : undefined
  const commerce = asCommerce(raw.commerce)
  const commerceSaleMode = raw.commerceSaleMode === 'auction' ? 'auction' : 'buy_now'

  const vidKind =
    raw.mediaKind === 'live_replay' ? ('live_replay' as const) : ('video' as const)

  const viewMsRounded =
    Number.isFinite(viewMsTotal) && viewMsTotal >= 0 ? Math.round(viewMsTotal) : 0

  const reel: DropReel = {
    id,
    title,
    seller,
    authorId,
    priceLabel,
    blurb,
    likes: Number.isFinite(likes) ? Math.round(likes) : 0,
    growthVelocityScore: Number.isFinite(growthVelocityScore) && growthVelocityScore > 0 ? growthVelocityScore : 1,
    watchTimeMsSeed:
      (Number.isFinite(watchTimeMsSeed) && watchTimeMsSeed >= 0 ? Math.round(watchTimeMsSeed) : 0) +
      (viewMsRounded > 0 ? viewMsRounded : 0),
    ...(viewMsRounded > 0 ? { viewMsTotal: viewMsRounded } : {}),
    categories: categories.length ? categories : ['community'],
    region,
    ...(imageUrls?.length ? { imageUrls, mediaKind: 'images' as const } : {}),
    ...(videoUrl && !imageUrls?.length ? { videoUrl, mediaKind: vidKind } : {}),
    ...(poster ? { poster } : {}),
    ...(commerce ? { commerce } : {}),
    ...(commerce?.kind === 'live_showcase' && commerce.coverSquareUrl
      ? { liveCoverSquareUrl: commerce.coverSquareUrl }
      : {}),
    ...(commerce?.kind === 'live_showcase' && commerce.coverVerticalUrl
      ? { liveCoverVerticalUrl: commerce.coverVerticalUrl }
      : {}),
    commerceSaleMode,
    isOfficial: Boolean(raw.isOfficial),
    isSponsored: Boolean(raw.isSponsored),
  }
  if (!dropIsPlayable(reel)) {
    console.warn('[drops/mapApiDrop] feed row hidden: not playable', {
      id,
      hasVideoUrl: Boolean(videoUrl && videoUrl.length > 0),
      imageUrlCount: imageUrls?.length ?? 0,
      mediaKind: raw.mediaKind,
    })
    return null
  }
  return reel
}

function dropIsPlayable(r: DropReel): boolean {
  return Boolean((r.imageUrls && r.imageUrls.length > 0) || (r.videoUrl && r.videoUrl.length > 0))
}

