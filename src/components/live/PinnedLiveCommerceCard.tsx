import type { LiveCommerceSession, LiveShowListingLine } from '../../lib/live/liveSessionApi'
import type { PeerListing } from '../../lib/listingsApi'
import { listingImageAbsoluteUrl } from '../../lib/listingsApi'

function audFmt(cents?: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
  }).format((Number.isFinite(cents!) ? cents! : 0) / 100)
}

type Props = {
  session: LiveCommerceSession | null
  pinned: LiveShowListingLine | PeerListing | null
  viewerMode?: boolean
  onBuy?: () => void
  onBid?: () => void
}

export function PinnedLiveCommerceCard({
  session,
  pinned,
  viewerMode,
  onBuy,
  onBid,
}: Props) {
  if (!pinned || !session) return null

  const isLine = 'listingId' in pinned && 'slot' in pinned

  const title = isLine
    ? pinned.title || 'Featured item'
    : (pinned as PeerListing).title || 'Featured item'

  const priceCents = isLine ? pinned.priceCents : (pinned as PeerListing).priceCents

  const imageUrl =
    isLine && pinned.imageUrl?.trim()
      ? pinned.imageUrl
      : !isLine
        ? listingImageAbsoluteUrl((pinned as PeerListing).images?.[0]?.url)
        : ''

  const saleMode = isLine ? pinned.saleMode : (pinned as PeerListing).saleMode
  const bidCents = isLine
    ? pinned.currentBidCents
    : (pinned as PeerListing).auctionHighBidCents

  const auction = saleMode === 'auction'
  const soldIds = session.soldListingIds ?? []
  const listingId =
    'listingId' in pinned ? pinned.listingId : (pinned as PeerListing).id
  const isSold = soldIds.includes(listingId)

  return (
    <div className="pointer-events-auto w-full rounded-2xl border border-white/90 bg-white/95 p-3 shadow-xl shadow-zinc-900/15 backdrop-blur-md">
      <div className="flex gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">Img</div>
          )}
          <span className="absolute left-1 top-1 rounded-full bg-red-600 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide text-white shadow">
            Pinned
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-[13px] font-bold text-zinc-900">{title}</p>
          <p className="text-[12px] font-semibold text-violet-700">{audFmt(priceCents ?? 0)}</p>
          {auction ? (
            <p className="text-[11px] text-zinc-600">
              High bid {!bidCents || bidCents < 100 ? audFmt(priceCents ?? 0) : audFmt(bidCents)}
            </p>
          ) : (
            <p className="text-[11px] text-emerald-700">Buy now</p>
          )}
          {session.auctionActive && session.auctionEndsAt ? (
            <p className="text-[10px] font-medium text-orange-700">Auction running</p>
          ) : null}
          {isSold ? <p className="text-[11px] font-bold text-emerald-800">Marked sold</p> : null}
        </div>
      </div>
      {!viewerMode ? null : (
        <div className="mt-2 flex gap-2">
          {!auction ? (
            <button
              type="button"
              disabled={isSold || !onBuy}
              className="fetch-live-pressable flex flex-1 items-center justify-center rounded-xl bg-violet-600 py-2 text-[13px] font-bold text-white shadow-md shadow-violet-600/25 active:brightness-95 disabled:pointer-events-none disabled:opacity-40"
              onClick={onBuy}
            >
              Buy now
            </button>
          ) : (
            <button
              type="button"
              disabled={isSold || !onBid}
              className="fetch-live-pressable flex flex-1 items-center justify-center rounded-xl bg-violet-600 py-2 text-[13px] font-bold text-white shadow-md shadow-violet-600/25 active:brightness-95 disabled:pointer-events-none disabled:opacity-40"
              onClick={onBid}
            >
              Place bid
            </button>
          )}
        </div>
      )}
    </div>
  )
}
