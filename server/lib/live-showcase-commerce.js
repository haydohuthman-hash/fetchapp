/**
 * Build and validate `live_showcase` commerce JSON for drops (live start + mid-stream PATCH).
 * @param {import('./peer-listings-store.js').PeerListingsStore} peerListingsStore
 * @param {string} sk
 * @param {object} opts
 * @param {unknown} opts.showcaseRaw
 * @param {string} [opts.coverSquareUrl]
 * @param {string} [opts.coverVerticalUrl]
 * @param {object | null | undefined} opts.previousCommerce
 */
export async function buildValidatedLiveShowcaseCommerce(
  peerListingsStore,
  sk,
  { showcaseRaw, coverSquareUrl: coverInSq, coverVerticalUrl: coverInVt, previousCommerce },
) {
  const coerceListingCoverPath = (v) => {
    if (typeof v !== 'string') return ''
    const t = v.trim().slice(0, 2048)
    if (!t.startsWith('/listing-uploads/')) return ''
    if (t.includes('..') || t.includes('\\')) return ''
    return t
  }

  let coverSquareUrl = coerceListingCoverPath(coverInSq)
  let coverVerticalUrl = coerceListingCoverPath(coverInVt)
  const prev =
    previousCommerce &&
    typeof previousCommerce === 'object' &&
    previousCommerce.kind === 'live_showcase'
      ? /** @type {Record<string, unknown>} */ (previousCommerce)
      : null

  if (!coverSquareUrl && prev?.coverSquareUrl) coverSquareUrl = coerceListingCoverPath(String(prev.coverSquareUrl))
  if (!coverVerticalUrl && prev?.coverVerticalUrl)
    coverVerticalUrl = coerceListingCoverPath(String(prev.coverVerticalUrl))

  if (!coverSquareUrl || !coverVerticalUrl) {
    const err = /** @type {Error & { code?: string }} */ (new Error('covers_required'))
    err.code = 'covers_required'
    throw err
  }

  const MAX_SHOWCASE = 24
  const commerceItems = []
  const list = Array.isArray(showcaseRaw) ? showcaseRaw : []
  for (const x of list) {
    if (commerceItems.length >= MAX_SHOWCASE) break
    if (!x || typeof x !== 'object') continue
    const label = typeof x.label === 'string' ? x.label.trim().slice(0, 120) : ''
    if (x.type === 'product' && typeof x.id === 'string') {
      const id = x.id.trim().slice(0, 128)
      if (id) {
        /** @type {Record<string, string>} */
        const row = { kind: 'marketplace_product', productId: id }
        if (label) row.label = label
        commerceItems.push(row)
      }
    }
    if (x.type === 'listing' && typeof x.id === 'string') {
      const id = x.id.trim().slice(0, 128)
      if (!id) continue
      const listing = await peerListingsStore.getListing(id)
      if (!listing) continue
      const listSk = peerListingsStore.sellerKey(listing.sellerUserId, listing.sellerEmail)
      if (listSk !== sk) continue
      const safeLabel =
        label || (typeof listing.title === 'string' ? listing.title.trim().slice(0, 120) : '')
      /** @type {Record<string, string>} */
      const row = { kind: 'buy_sell_listing', listingId: id }
      if (safeLabel) row.label = safeLabel
      commerceItems.push(row)
    }
  }

  if (!commerceItems.length) {
    const err = /** @type {Error & { code?: string }} */ (new Error('showcase_required'))
    err.code = 'showcase_required'
    throw err
  }

  return {
    kind: 'live_showcase',
    items: commerceItems,
    coverSquareUrl,
    coverVerticalUrl,
  }
}
