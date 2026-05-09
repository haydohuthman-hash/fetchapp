import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchMyListings,
  listingImageAbsoluteUrl,
  type PeerListing,
} from '../lib/listingsApi'
import type { StartDropLiveShowcaseResult } from '../lib/drops/liveStartApi'
import {
  fetchPublishedDrop,
  patchDropLiveShowcase,
  type LiveShowcasePatchItem,
} from '../lib/drops/patchLiveShowcaseApi'
import { clearLiveStudioHandoff } from '../lib/drops/liveStudioHandoff'

type Props = {
  sessionEmail: string
  /** Active live session metadata (Mux + drop id). Prefer explicit prop; falls back handled by parent. */
  handoff: StartDropLiveShowcaseResult | null
  onBack: () => void
  /** When embedded in fullscreen overlay — same as SellerGoLivePanel. */
  onOverlayClose?: () => void
}

function copy(text: string) {
  void navigator.clipboard?.writeText(text).catch(() => undefined)
}

function audFromCents(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format((Number.isFinite(cents) ? cents : 0) / 100)
}

type ShowcaseProductItem = Extract<LiveShowcasePatchItem, { type: 'product' }>

export function SellerLivestreamStudioPanel({ sessionEmail, handoff, onBack, onOverlayClose }: Props) {
  const dropId = handoff?.dropId?.trim() ?? ''

  const [listings, setListings] = useState<PeerListing[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [covers, setCovers] = useState<{ coverSquareUrl?: string; coverVerticalUrl?: string }>({})
  const [extraProductLines, setExtraProductLines] = useState<ShowcaseProductItem[]>([])
  const [liveOrderIds, setLiveOrderIds] = useState<string[]>([])
  const [liveNowId, setLiveNowId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionEmail.trim() || !dropId) return
    let cancelled = false
    void (async () => {
      setLoadErr(null)
      try {
        const [mine, dropRes] = await Promise.all([fetchMyListings(), fetchPublishedDrop(dropId)])
        if (cancelled) return
        const pub = mine.filter((l) => (l.status || '').toLowerCase() === 'published')
        setListings(pub)
        const commerce = dropRes.drop?.commerce
        if (commerce?.kind !== 'live_showcase') {
          setLoadErr('This drop does not look like an active live showcase.')
          setLiveOrderIds([])
          setExtraProductLines([])
          return
        }
        setCovers({
          ...(commerce.coverSquareUrl ? { coverSquareUrl: commerce.coverSquareUrl } : {}),
          ...(commerce.coverVerticalUrl ? { coverVerticalUrl: commerce.coverVerticalUrl } : {}),
        })
        const order: string[] = []
        const products: ShowcaseProductItem[] = []
        for (const it of commerce.items) {
          if (it.kind === 'buy_sell_listing') order.push(it.listingId)
          else if (it.kind === 'marketplace_product')
            products.push({
              type: 'product',
              id: it.productId,
              label: typeof it.label === 'string' ? it.label.slice(0, 120) : undefined,
            })
        }
        setLiveOrderIds(order)
        setExtraProductLines(products)
        const firstListing = order[0]
        setLiveNowId(firstListing ?? null)
      } catch (e) {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'Could not load live drop.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionEmail, dropId])

  const idSet = useMemo(() => new Set(liveOrderIds), [liveOrderIds])
  const onShow = useMemo(
    () => listings.filter((l) => liveOrderIds.includes(l.id)),
    [listings, liveOrderIds],
  )
  const available = useMemo(() => listings.filter((l) => !idSet.has(l.id)), [listings, idSet])

  const toggleOntoShow = useCallback((listingId: string) => {
    setLiveOrderIds((prev) => (prev.includes(listingId) ? prev.filter((x) => x !== listingId) : [...prev, listingId]))
    setSaveMsg(null)
  }, [])

  const moveUp = useCallback((listingId: string) => {
    setLiveOrderIds((prev) => {
      const i = prev.indexOf(listingId)
      if (i <= 0) return prev
      const next = [...prev]
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      return next
    })
    setSaveMsg(null)
  }, [])

  const moveDown = useCallback((listingId: string) => {
    setLiveOrderIds((prev) => {
      const i = prev.indexOf(listingId)
      if (i < 0 || i >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
      return next
    })
    setSaveMsg(null)
  }, [])

  const removeFromShow = useCallback((listingId: string) => {
    setLiveOrderIds((prev) => prev.filter((x) => x !== listingId))
    setLiveNowId((curr) => (curr === listingId ? null : curr))
    setSaveMsg(null)
  }, [])

  const buildShowcasePayload = useCallback((): LiveShowcasePatchItem[] => {
    const listingLines: LiveShowcasePatchItem[] = liveOrderIds.map((id) => {
      const l = listings.find((x) => x.id === id)
      return {
        type: 'listing' as const,
        id,
        label: l?.title?.trim().slice(0, 120),
      }
    })
    return [...listingLines, ...extraProductLines]
  }, [liveOrderIds, listings, extraProductLines])

  const pushUpdateShowcase = useCallback(async () => {
    if (!dropId.trim()) return
    if (!liveOrderIds.length) {
      setSaveMsg('Keep at least one listing on the show.')
      return
    }
    setSaving(true)
    setSaveMsg(null)
    try {
      await patchDropLiveShowcase(dropId, buildShowcasePayload(), covers)
      setSaveMsg('Updated — watchers will see the new lineup on refresh.')
      setTimeout(() => setSaveMsg(null), 3400)
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Could not save lineup.')
    } finally {
      setSaving(false)
    }
  }, [dropId, liveOrderIds.length, buildShowcasePayload, covers])

  if (!dropId) {
    return (
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col bg-zinc-50 px-4 pt-[max(0.5rem,env(safe-area-inset-top,0px))]">
        <header className="mx-auto flex w-full max-w-lg items-center gap-2 border-b border-zinc-200 py-2">
          <button type="button" className="rounded-full px-2 py-2 text-[15px] font-semibold text-violet-700" onClick={onBack}>
            Back
          </button>
          <h1 className="min-w-0 flex-1 text-center text-[16px] font-bold text-zinc-900">Live studio</h1>
          <div className="w-14 shrink-0" aria-hidden />
        </header>
        <p className="mx-auto mt-8 max-w-md text-center text-[14px] text-zinc-600">
          Start a live show first, then open <span className="font-semibold text-zinc-800">Live studio</span> from the success
          screen to pick which listings you&apos;re selling on camera.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col bg-gradient-to-b from-violet-100/50 via-white to-zinc-100">
      <header className="shrink-0 border-b border-violet-200/60 bg-white/90 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] backdrop-blur-sm sm:px-4">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button type="button" className="rounded-full px-2 py-2 text-[15px] font-semibold text-violet-700" onClick={onBack}>
            Back
          </button>
          <h1 className="min-w-0 flex-1 text-center text-[16px] font-bold text-zinc-900">Live studio</h1>
          <button
            type="button"
            className="text-[12px] font-semibold text-zinc-500"
            onClick={() => {
              clearLiveStudioHandoff()
              onOverlayClose?.()
              onBack()
            }}
          >
            End session
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 overflow-y-auto px-4 pb-12 pt-3">
        {!sessionEmail.trim() ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-900">
            Sign in to manage your stream lineup.
          </p>
        ) : null}

        {handoff ? (
          <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-900">Streamer quick copy</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase text-emerald-800">Playback</span>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-emerald-800 underline"
                  onClick={() => copy(handoff.playbackUrl)}
                >
                  Copy
                </button>
              </div>
              <p className="break-all font-mono text-[11px] text-emerald-950">{handoff.playbackUrl}</p>
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10px] font-bold uppercase text-emerald-800">RTMP ingest</span>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-emerald-800 underline"
                  onClick={() => copy(handoff.rtmpUrl || '')}
                >
                  Copy
                </button>
              </div>
              <p className="break-all font-mono text-[11px] text-emerald-950">{handoff.rtmpUrl || '—'}</p>
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[13px] font-bold text-zinc-900">What you&apos;re showing (like Whatnot)</p>
              <p className="mt-1 text-[12px] leading-snug text-zinc-500">
                Tap a listing below to highlight it as <span className="font-semibold text-zinc-700">Live now</span>. Add or
                remove pieces from your live — buyers see this lineup on the drop.
              </p>
            </div>
          </div>

          {loadErr ? <p className="mt-3 text-[12px] font-medium text-red-600">{loadErr}</p> : null}

          {liveOrderIds.length > 0 ? (
            <div className="-mx-2 mt-4 flex gap-2 overflow-x-auto px-2 pb-1 pt-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {liveOrderIds.map((id) => {
                const l = listings.find((x) => x.id === id)
                const title = l?.title?.trim() || id.slice(0, 10)
                const price = l != null ? audFromCents(l.priceCents ?? 0) : ''
                const active = liveNowId === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLiveNowId(id)}
                    className={[
                      'relative flex w-[6.85rem] shrink-0 flex-col overflow-hidden rounded-2xl border text-left shadow-sm ring-offset-white transition-colors',
                      active
                        ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-400/55'
                        : 'border-zinc-200 bg-zinc-50 active:bg-zinc-100',
                    ].join(' ')}
                  >
                    <div className="relative aspect-square w-full bg-zinc-200">
                      {l?.images?.[0]?.url ? (
                        <img
                          src={listingImageAbsoluteUrl(l.images[0].url)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[11px] text-zinc-500">No photo</div>
                      )}
                      {active ? (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
                          Live now
                        </span>
                      ) : (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white/95">
                          On deck
                        </span>
                      )}
                    </div>
                    <div className="flex min-h-0 flex-col gap-0.5 p-2 pt-2">
                      <p className="line-clamp-2 text-[10px] font-bold leading-tight text-zinc-900">{title}</p>
                      {price ? <p className="text-[10px] font-semibold tabular-nums text-violet-900">{price}</p> : null}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            !loadErr && (
              <p className="mt-4 text-[13px] text-zinc-600">No listings on stream yet — add items from inventory below.</p>
            )
          )}

          {onShow.length ? (
            <div className="mt-5 space-y-2 border-t border-zinc-100 pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">Reorder queue</p>
              <ul className="flex flex-col gap-2">
                {liveOrderIds.map((id, idx) => {
                  const l = listings.find((x) => x.id === id)
                  return (
                    <li key={id} className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
                      <span className="w-5 text-center text-[12px] font-bold text-zinc-400">{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-zinc-900">{l?.title ?? id}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          aria-label={`Move "${l?.title}" up`}
                          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-bold text-zinc-700 disabled:opacity-35"
                          disabled={idx <= 0}
                          onClick={() => moveUp(id)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Move "${l?.title}" down`}
                          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-bold text-zinc-700 disabled:opacity-35"
                          disabled={idx >= liveOrderIds.length - 1}
                          onClick={() => moveDown(id)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-red-100 bg-white px-2 py-1 text-[11px] font-semibold text-red-700"
                          onClick={() => removeFromShow(id)}
                        >
                          −
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-[13px] font-bold text-zinc-900">Your listings</p>
          <p className="mt-1 text-[12px] text-zinc-500">Published items only. Tap plus to queue them onto the stream.</p>
          {available.length === 0 ? (
            <p className="mt-4 text-[13px] text-zinc-600">Everything you have published is already on the stream.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {available.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => toggleOntoShow(l.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/90 px-3 py-2 text-left transition-colors active:bg-violet-50"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-200">
                      {l.images?.[0]?.url ? (
                        <img src={listingImageAbsoluteUrl(l.images[0].url)} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[12px] font-semibold text-zinc-900">{l.title}</p>
                      <p className="text-[11px] font-semibold tabular-nums text-violet-900">
                        {audFromCents(l.priceCents ?? 0)}
                      </p>
                    </div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-lg font-bold text-white">
                      +
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {extraProductLines.length > 0 ? (
          <p className="text-center text-[11px] text-zinc-500">
            {extraProductLines.length} store item{extraProductLines.length === 1 ? '' : 's'} from your showcase are preserved
            on save.
          </p>
        ) : null}

        {saveMsg ? <p className="text-center text-[13px] font-medium text-zinc-700">{saveMsg}</p> : null}

        <button
          type="button"
          disabled={saving || !liveOrderIds.length || !!loadErr}
          onClick={() => void pushUpdateShowcase()}
          className="rounded-2xl bg-[#291050] py-3.5 text-[16px] font-bold text-white shadow-lg shadow-violet-900/20 transition disabled:opacity-45"
        >
          {saving ? 'Saving lineup…' : 'Save lineup to stream'}
        </button>
      </div>
    </div>
  )
}
