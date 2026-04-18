import { type ReactNode, useMemo } from 'react'
import { CURATED_DROP_REELS } from '../lib/drops/constants'
import type { DropReel } from '../lib/drops/types'
import { formatLiveViewerShort, liveStreamViewerCountSeed } from '../lib/marketplaceAuctionUi'

function reelPoster(r: DropReel): string | undefined {
  const first = r.imageUrls?.[0]?.trim()
  if (first) return first
  return r.poster?.trim() || undefined
}

type Props = {
  onOpenBuySellListing: (listingId: string) => void
  onWatchAllLive?: () => void
  /** Cart, account, list lot — rendered above the “Live rooms” heading. */
  topBar?: ReactNode
}

export function MarketplaceAuctionsLiveRail({ onOpenBuySellListing, onWatchAllLive, topBar }: Props) {
  const items = useMemo(
    () => CURATED_DROP_REELS.filter((r) => r.commerce?.kind === 'buy_sell_listing').slice(0, 12),
    [],
  )

  return (
    <section
      className="relative shrink-0 overflow-hidden border-b border-zinc-800/80 bg-[radial-gradient(120%_80%_at_50%_-20%,rgba(245,158,11,0.12),transparent_55%),linear-gradient(180deg,rgba(24,24,27,0.9)_0%,rgba(9,9,11,1)_100%)] pb-4 pt-[max(0.5rem,env(safe-area-inset-top,0px))]"
      aria-label="Live auction streams"
    >
      {topBar ? (
        <div className="relative mb-2 flex flex-wrap items-center justify-end gap-2 px-4">{topBar}</div>
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <div className="relative mb-3 flex items-center justify-between gap-3 px-4">
        <h3 className="min-w-0 truncate text-[1.35rem] font-extrabold tracking-[-0.03em] text-white">
          Live rooms
        </h3>
        {onWatchAllLive ? (
          <button
            type="button"
            onClick={onWatchAllLive}
            className="shrink-0 rounded-full bg-amber-400 px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-zinc-950 shadow-[0_0_24px_-4px_rgba(251,191,36,0.55)] transition-transform active:scale-[0.97]"
          >
            All live
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="relative mx-4 rounded-2xl border border-dashed border-zinc-700/90 bg-zinc-900/50 px-4 py-8 text-center">
          <p className="text-[14px] font-semibold text-zinc-300">No streams on the floor yet</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500">
            Check Drops for community video or list a lot to go live.
          </p>
          {onWatchAllLive ? (
            <button
              type="button"
              onClick={onWatchAllLive}
              className="mt-4 rounded-xl bg-zinc-100 px-5 py-2.5 text-[13px] font-bold text-zinc-900 active:opacity-90"
            >
              Open Drops
            </button>
          ) : null}
        </div>
      ) : (
        <div className="relative flex gap-3.5 overflow-x-auto overflow-y-hidden px-4 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((r) => {
            const poster = reelPoster(r)
            const listingId = r.commerce?.kind === 'buy_sell_listing' ? r.commerce.listingId : ''
            if (!listingId) return null
            const viewers = formatLiveViewerShort(liveStreamViewerCountSeed(r.id))
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onOpenBuySellListing(listingId)}
                className="group relative aspect-square w-[8.5rem] shrink-0 overflow-hidden rounded-[1.15rem] bg-black text-left shadow-[0_20px_50px_-12px_rgba(0,0,0,0.9)] ring-1 ring-zinc-700/80 transition-[transform,box-shadow] active:scale-[0.98] sm:w-[9rem]"
              >
                <div className="relative h-full w-full">
                  {poster ? (
                    <img
                      src={poster}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-active:scale-[1.05]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-zinc-800" aria-hidden />
                  )}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/55"
                    aria-hidden
                  />
                  <div className="absolute inset-0 ring-2 ring-inset ring-amber-500/20" aria-hidden />
                  <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full border border-red-300/40 bg-red-500/18 px-2.5 py-1 text-red-50 shadow-[0_10px_24px_-14px_rgba(239,68,68,0.95)] backdrop-blur-md">
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-red-100">Live</span>
                    <span className="text-[9px] font-bold tabular-nums leading-none text-white">{viewers}</span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-85 transition-opacity group-active:opacity-100">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-900 shadow-[0_8px_32px_rgba(0,0,0,0.45)] ring-2 ring-white/30">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="ml-0.5">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-2.5 pb-2.5 pt-10">
                    <p className="line-clamp-2 text-[11px] font-bold leading-tight text-white">{r.title}</p>
                    <p className="mt-1 text-[10px] font-extrabold tabular-nums text-amber-300">{r.priceLabel}</p>
                    <p className="mt-0.5 truncate text-[9px] font-semibold text-zinc-400">{r.seller}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
