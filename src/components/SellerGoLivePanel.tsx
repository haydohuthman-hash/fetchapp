import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchMyListings, listingImageAbsoluteUrl, uploadListingImagesForCreate, type PeerListing } from '../lib/listingsApi'
import { formatDropHandle, getMyDropProfile } from '../lib/drops/profileStore'
import {
  startDropLiveShowcase,
  type StartDropLiveShowcaseResult,
} from '../lib/drops/liveStartApi'
import { persistLiveStudioHandoff } from '../lib/drops/liveStudioHandoff'

type Props = {
  sessionEmail: string
  onBack: () => void
  onOverlayClose?: () => void
  /** Opens Whatnot-style live studio to choose queue + “live now” listing. */
  onOpenLiveStudio?: (session: StartDropLiveShowcaseResult) => void
}

function copy(text: string) {
  void navigator.clipboard?.writeText(text).catch(() => undefined)
}

export function SellerGoLivePanel({
  sessionEmail,
  onBack,
  onOverlayClose,
  onOpenLiveStudio,
}: Props) {
  const profile = useMemo(() => getMyDropProfile(), [])
  const sellerDefault = profile?.displayName?.trim()
    ? formatDropHandle(profile.displayName)
    : sessionEmail.includes('@')
      ? `@${sessionEmail.split('@')[0]}`
      : '@seller'

  const [sellerDisplay, setSellerDisplay] = useState(sellerDefault)
  const [title, setTitle] = useState('Live')
  const [blurb, setBlurb] = useState('')
  const [listings, setListings] = useState<PeerListing[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const [goErr, setGoErr] = useState<string | null>(null)
  const [result, setResult] = useState<StartDropLiveShowcaseResult | null>(null)

  const [squareFile, setSquareFile] = useState<File | null>(null)
  const [verticalFile, setVerticalFile] = useState<File | null>(null)
  const [squarePreview, setSquarePreview] = useState<string | null>(null)
  const [verticalPreview, setVerticalPreview] = useState<string | null>(null)

  const squareInputRef = useRef<HTMLInputElement>(null)
  const verticalInputRef = useRef<HTMLInputElement>(null)

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  useEffect(() => {
    if (!sessionEmail.trim()) return
    let cancelled = false
    void (async () => {
      setLoadErr(null)
      try {
        const mine = await fetchMyListings()
        if (cancelled) return
        const pub = mine.filter((l) => (l.status || '').toLowerCase() === 'published')
        setListings(pub)
      } catch (e) {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'Failed to load listings')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionEmail])

  useEffect(() => {
    if (!squareFile) {
      setSquarePreview(null)
      return
    }
    const u = URL.createObjectURL(squareFile)
    setSquarePreview(u)
    return () => URL.revokeObjectURL(u)
  }, [squareFile])

  useEffect(() => {
    if (!verticalFile) {
      setVerticalPreview(null)
      return
    }
    const u = URL.createObjectURL(verticalFile)
    setVerticalPreview(u)
    return () => URL.revokeObjectURL(u)
  }, [verticalFile])

  const onStart = useCallback(async () => {
    if (selected.size === 0) {
      setGoErr('Select at least one published listing to showcase.')
      return
    }
    if (!squareFile || !verticalFile) {
      setGoErr('Upload both a square cover and a vertical cover for your live show.')
      return
    }
    setBusy(true)
    setGoErr(null)
    try {
      const [sq, vt] = await Promise.all([
        uploadListingImagesForCreate([squareFile]),
        uploadListingImagesForCreate([verticalFile]),
      ])
      const coverSquareUrl = sq[0]?.trim()
      const coverVerticalUrl = vt[0]?.trim()
      if (!coverSquareUrl || !coverVerticalUrl) {
        throw new Error('cover_upload_failed')
      }
      const showcaseItems = [...selected].map((id) => {
        const l = listings.find((x) => x.id === id)
        return {
          type: 'listing' as const,
          id,
          label: l?.title?.trim().slice(0, 120),
        }
      })
      const r = await startDropLiveShowcase({
        title: title.trim() || 'Live',
        sellerDisplay: sellerDisplay.trim() || sellerDefault,
        blurb: blurb.trim() || undefined,
        showcaseItems,
        coverSquareUrl,
        coverVerticalUrl,
        categories: ['community'],
      })
      setResult(r)
    } catch (e) {
      setGoErr(e instanceof Error ? e.message : 'Could not start live')
    } finally {
      setBusy(false)
    }
  }, [blurb, listings, selected, sellerDefault, sellerDisplay, squareFile, title, verticalFile])

  const coverOk = Boolean(squareFile && verticalFile)

  if (result) {
    return (
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col bg-zinc-50">
        <header className="shrink-0 border-b border-zinc-200/80 bg-white px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] sm:px-4">
          <div className="mx-auto flex max-w-lg items-center gap-2">
            <button
              type="button"
              onClick={onOverlayClose ?? onBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-800 transition-colors active:bg-zinc-100"
              aria-label={onOverlayClose ? 'Back to marketplace' : 'Back'}
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
            <h1 className="min-w-0 flex-1 text-center text-[16px] font-bold text-zinc-900">You&apos;re set</h1>
            <div className="w-10 shrink-0" aria-hidden />
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 overflow-y-auto px-4 pb-10 pt-4">
          <p className="text-[13px] leading-snug text-zinc-600">
            Your live drop is on the feed. Use OBS or any RTMP encoder with the ingest URL and stream key below. Viewers watch the
            HLS playback link (and the app live floor picks it up).
          </p>
          <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">Drop ID</p>
            <p className="mt-1 break-all font-mono text-[12px] text-emerald-950">{result.dropId}</p>
          </section>
          <FieldCopy label="RTMP ingest URL" value={result.rtmpUrl || '—'} />
          <FieldCopy label="Stream key" value={result.streamKey ?? '—'} />
          <FieldCopy label="Playback (HLS)" value={result.playbackUrl} />
          {onOpenLiveStudio ? (
            <button
              type="button"
              className="mt-2 w-full rounded-xl bg-violet-600 py-3.5 text-[15px] font-bold text-white shadow-md shadow-violet-600/20 active:brightness-95"
              onClick={() => {
                persistLiveStudioHandoff(result)
                onOpenLiveStudio(result)
              }}
            >
              Open live studio — pick listings
            </button>
          ) : null}
          <button
            type="button"
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white py-3 text-[15px] font-semibold text-zinc-900 active:bg-zinc-50"
            onClick={() => {
              setResult(null)
              onBack()
            }}
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col bg-gradient-to-b from-violet-100/60 via-white to-zinc-100">
      <header className="shrink-0 border-b border-violet-200/60 bg-white/90 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] backdrop-blur-sm sm:px-4">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button type="button" className="rounded-full px-2 py-2 text-[15px] font-semibold text-violet-700" onClick={onBack}>
            Back
          </button>
          <h1 className="min-w-0 flex-1 text-center text-[16px] font-bold text-zinc-900">Go live</h1>
          <div className="w-14 shrink-0" aria-hidden />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 overflow-y-auto px-4 pb-10 pt-4">
        {!sessionEmail.trim() ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-900">
            Sign in from Profile with email to start a live showcase.
          </p>
        ) : null}

        {!profile ? (
          <div className="rounded-2xl border border-amber-200/90 bg-amber-50 px-3 py-2.5 text-[12px] leading-snug text-amber-950">
            <span className="font-semibold">Profile recommended.</span> Create your Drops @handle so buyers recognize you on the
            live floor.
          </div>
        ) : null}

        <label className="block rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm">
          <span className="text-[12px] font-semibold text-zinc-700">Display name</span>
          <input
            value={sellerDisplay}
            onChange={(e) => setSellerDisplay(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-violet-400/40"
          />
        </label>
        <label className="block rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm">
          <span className="text-[12px] font-semibold text-zinc-700">Stream title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-violet-400/40"
            placeholder="e.g. Saturday vintage sale"
          />
        </label>
        <label className="block rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm">
          <span className="text-[12px] font-semibold text-zinc-700">Blurb (optional)</span>
          <textarea
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
            rows={2}
            className="mt-1 w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-violet-400/40"
            placeholder="What you're showcasing…"
          />
        </label>

        <section className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm">
          <p className="text-[13px] font-bold text-zinc-900">Show covers</p>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            Upload a square (1∶1) image for rows and a tall portrait (~9∶16) for the live carousel — both required.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold text-zinc-600">Square</p>
              <input
                ref={squareInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/gif"
                className="sr-only"
                onChange={(e) => setSquareFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                className={[
                  'mt-2 flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-[11px] font-semibold',
                  squarePreview ? 'border-violet-300 bg-black/5 p-0' : 'border-zinc-200 bg-zinc-50 px-2 text-zinc-500',
                ].join(' ')}
                onClick={() => squareInputRef.current?.click()}
              >
                {squarePreview ? (
                  <img src={squarePreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <>Choose image</>
                )}
              </button>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-zinc-600">Vertical</p>
              <input
                ref={verticalInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/gif"
                className="sr-only"
                onChange={(e) => setVerticalFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                className={[
                  'mt-2 flex aspect-[9/13] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-[11px] font-semibold',
                  verticalPreview ? 'border-violet-300 bg-black/5 p-0' : 'border-zinc-200 bg-zinc-50 px-2 text-zinc-500',
                ].join(' ')}
                onClick={() => verticalInputRef.current?.click()}
              >
                {verticalPreview ? (
                  <img src={verticalPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <>Choose image</>
                )}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm">
          <p className="text-[13px] font-bold text-zinc-900">Listings on stream</p>
          <p className="mt-0.5 text-[12px] text-zinc-500">Pick at least one published listing (required by the server).</p>
          {loadErr ? <p className="mt-2 text-[12px] font-medium text-red-600">{loadErr}</p> : null}
          {sessionEmail.trim() && !loadErr && listings.length === 0 ? (
            <p className="mt-3 text-[13px] text-zinc-600">
              No published listings yet. Publish an item first, then come back to go live.
            </p>
          ) : (
            <ul className="mt-3 flex max-h-[14rem] flex-col gap-2 overflow-y-auto">
              {listings.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => toggle(l.id)}
                    className={[
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors',
                      selected.has(l.id)
                        ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-300/50'
                        : 'border-zinc-200 bg-zinc-50/80 active:bg-zinc-100',
                    ].join(' ')}
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-200">
                      {l.images?.[0]?.url ? (
                        <img src={listingImageAbsoluteUrl(l.images[0].url)} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[13px] font-semibold text-zinc-900">{l.title}</p>
                      <p className="text-[10px] font-mono text-zinc-400">{l.id.slice(0, 8)}…</p>
                    </div>
                    <span className="shrink-0 text-[18px]">{selected.has(l.id) ? '✓' : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {goErr ? <p className="text-[13px] font-medium text-red-600">{goErr}</p> : null}

        <p className="text-[11px] leading-snug text-zinc-500">
          Requires a running API with Postgres, Mux (<code className="rounded bg-zinc-200 px-1 text-[10px]">MUX_TOKEN_*</code>
          ), and sign-in cookie. Without Mux you&apos;ll see a clear error from the server.
        </p>

        <button
          type="button"
          disabled={busy || !sessionEmail.trim() || selected.size === 0 || !coverOk}
          className="rounded-2xl bg-[#291050] py-3.5 text-[16px] font-bold text-white shadow-lg shadow-violet-900/20 transition disabled:opacity-45"
          onClick={() => void onStart()}
        >
          {busy ? 'Starting live…' : 'Start live & get stream key'}
        </button>
      </div>
    </div>
  )
}

function FieldCopy({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
        <button
          type="button"
          className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-violet-800 active:bg-violet-50"
          onClick={() => copy(value)}
        >
          Copy
        </button>
      </div>
      <p className="mt-1 break-all font-mono text-[12px] leading-snug text-zinc-900">{value}</p>
    </section>
  )
}
