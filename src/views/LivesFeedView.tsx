import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FETCH_APP_PATH,
  FETCH_GO_LIVE_PATH,
  FETCH_MARKETPLACE_LIST_PATH,
} from '../lib/fetchRoutes'
import { listingImageAbsoluteUrl } from '../lib/listingsApi'
import { fetchLiveSessionsList } from '../lib/live/liveSessionApi'

const CATEGORIES = ['All', 'Collectibles', 'Sneakers', 'Jewelry']

export default function LivesFeedView() {
  const navigate = useNavigate()
  const [cat, setCat] = useState('All')
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof fetchLiveSessionsList>>>([])
  const [busy, setBusy] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setBusy(true)
    try {
      const rows = await fetchLiveSessionsList({ status: 'live' })
      setSessions(rows)
      setErr(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'feed_failed')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const filtered =
    cat === 'All' ? sessions : sessions.filter((s) => (s.category || '').toLowerCase().includes(cat.toLowerCase()))

  return (
    <div className="min-h-dvh bg-gradient-to-b from-violet-50/70 via-white to-white pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))]">
      <header className="sticky top-0 z-10 border-b border-zinc-100 bg-white/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button
            type="button"
            className="text-[14px] font-semibold text-violet-700"
            onClick={() => navigate(FETCH_APP_PATH)}
          >
            Back
          </button>
          <h1 className="min-w-0 flex-1 text-center text-[17px] font-bold text-zinc-900">Watch live</h1>
          <button
            type="button"
            className="text-[14px] font-bold text-violet-700"
            onClick={() => navigate(FETCH_GO_LIVE_PATH)}
          >
            Go live
          </button>
        </div>
      </header>

      <div className="mx-auto mt-4 w-full max-w-lg px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={[
                'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold',
                cat === c ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25' : 'border border-zinc-200 bg-white text-zinc-800',
              ].join(' ')}
            >
              {c}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void reload()}
          className="mt-2 rounded-xl border border-zinc-100 bg-white px-3 py-1.5 text-[12px] font-semibold text-zinc-700"
          disabled={busy}
        >
          Refresh
        </button>

        {err ? (
          <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-[13px] text-red-900">{err}</p>
        ) : null}

        {busy ? (
          <div className="mt-16 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-700" aria-hidden />
          </div>
        ) : null}

        {!busy && filtered.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-violet-100 bg-gradient-to-b from-white to-violet-50/40 px-5 py-10 text-center shadow-sm">
            <p className="text-[17px] font-bold text-zinc-900">No one is live right now</p>
            <p className="mt-2 text-[14px] leading-snug text-zinc-600">Start the first live show — your collectors are waiting.</p>
            <button
              type="button"
              onClick={() => navigate(FETCH_GO_LIVE_PATH)}
              className="fetch-live-pressable mt-8 w-full rounded-2xl bg-violet-600 py-4 text-[16px] font-bold text-white shadow-lg shadow-violet-600/30"
            >
              Go live
            </button>
            <button
              type="button"
              className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white py-3.5 text-[14px] font-semibold text-zinc-900"
              onClick={() => navigate(FETCH_MARKETPLACE_LIST_PATH)}
            >
              List an item first
            </button>
          </div>
        ) : null}

        <ul className="mt-6 space-y-3">
          {!busy
            ? filtered.map((s) => {
                const pin = s.pinnedListingId ? s.listings.find((x) => x.listingId === s.pinnedListingId) : s.listings[0]
                const thumb =
                  s.coverSquareUrl ||
                  pin?.imageUrl ||
                  s.coverImageUrl ||
                  s.coverVerticalUrl
                const title = pin?.title ?? s.title
                const price = pin?.priceCents ?? 0
                const formatted = new Intl.NumberFormat('en-AU', {
                  style: 'currency',
                  currency: 'AUD',
                  minimumFractionDigits: 0,
                }).format((Number.isFinite(price) ? price : 0) / 100)

                return (
                  <li key={s.roomName}>
                    <button
                      type="button"
                      className="fetch-live-pressable flex w-full gap-4 rounded-3xl border border-zinc-100 bg-white p-3 text-left shadow-md shadow-black/[0.04]"
                      onClick={() => navigate(`/live/${encodeURIComponent(s.roomName)}`)}
                    >
                      <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
                        {thumb ? (
                          <img src={listingImageAbsoluteUrl(thumb)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">Live</div>
                        )}
                        <span className="absolute left-1 top-1 rounded-md bg-red-600 px-1 text-[9px] font-bold uppercase text-white">
                          Live
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                        <div>
                          <p className="truncate text-[15px] font-bold text-zinc-900">{s.title}</p>
                          <p className="truncate text-[12px] text-zinc-500">{s.sellerDisplay || 'Seller'}</p>
                          <p className="truncate text-[12px] text-violet-700">{title}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-900">
                            {s.viewerCount ?? 0} watching
                          </span>
                          <span className="text-[13px] font-semibold text-zinc-800">{formatted}</span>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })
            : null}
        </ul>
      </div>
    </div>
  )
}
