import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  fetchMyListings,
  listingImageAbsoluteUrl,
  uploadListingImagesForCreate,
  type PeerListing,
} from '../lib/listingsApi'
import { createLiveSession, type LiveShowListingLine } from '../lib/live/liveSessionApi'
import { formatDropHandle, getMyDropProfile } from '../lib/drops/profileStore'
import { loadSession } from '../lib/fetchUserSession'
import { FETCH_APP_PATH } from '../lib/fetchRoutes'

const MEDIA_PREFS_KEY = 'fetch.goLive.prefs'

const CATEGORIES = [
  'Collectibles',
  'Sneakers',
  'Trading cards',
  'Comics',
  'Jewelry',
  'Home',
  'Vintage',
  'Everything else',
]

type Slot = 'live_now' | 'on_deck' | 'later'

type Line = { listing: PeerListing; slot: Slot; order: number }

function nextOrder(lines: Line[]): number {
  const m = lines.reduce((acc, l) => Math.max(acc, l.order), -1)
  return m + 1
}

export default function GoLiveView({ onBack }: { onBack?: () => void }) {
  const navigate = useNavigate()
  const userSess = loadSession()
  const sellerDefault = useMemo(() => {
    const profile = getMyDropProfile()
    if (profile?.displayName?.trim()) return formatDropHandle(profile.displayName)
    const em = userSess?.email?.trim() ?? ''
    if (em.includes('@')) return `@${em.split('@')[0]}`
    return '@seller'
  }, [userSess?.email])

  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [coverSquareFile, setCoverSquareFile] = useState<File | null>(null)
  const [coverVerticalFile, setCoverVerticalFile] = useState<File | null>(null)
  const [coverSquarePreview, setCoverSquarePreview] = useState<string | null>(null)
  const [coverVerticalPreview, setCoverVerticalPreview] = useState<string | null>(null)

  const [listings, setListings] = useState<PeerListing[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [lineup, setLineup] = useState<Line[]>([])

  const [permDeny, setPermDeny] = useState<string | null>(null)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [audioOnly, setAudioOnly] = useState(false)
  const facingMode = 'user' as const

  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)

  const previewRef = useRef<HTMLVideoElement | null>(null)
  const squareCoverInputRef = useRef<HTMLInputElement | null>(null)
  const verticalCoverInputRef = useRef<HTMLInputElement | null>(null)

  const [starting, setStarting] = useState(false)
  const [startErr, setStartErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoadErr(null)
      try {
        const mine = await fetchMyListings()
        if (cancelled) return
        setListings(mine.filter((l) => (l.status || '').toLowerCase() === 'published'))
      } catch (e) {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'load_failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!coverSquareFile) {
      setCoverSquarePreview(null)
      return
    }
    const u = URL.createObjectURL(coverSquareFile)
    setCoverSquarePreview(u)
    return () => URL.revokeObjectURL(u)
  }, [coverSquareFile])

  useEffect(() => {
    if (!coverVerticalFile) {
      setCoverVerticalPreview(null)
      return
    }
    const u = URL.createObjectURL(coverVerticalFile)
    setCoverVerticalPreview(u)
    return () => URL.revokeObjectURL(u)
  }, [coverVerticalFile])

  useEffect(() => {
    const v = previewRef.current
    if (!v || !mediaStream) return
    v.srcObject = mediaStream
    void v.play().catch(() => undefined)
  }, [mediaStream])

  const toggleListing = useCallback((l: PeerListing) => {
    setLineup((prev) => {
      const id = l.id
      const has = prev.some((x) => x.listing.id === id)
      if (has) return prev.filter((x) => x.listing.id !== id)
      const slot: Slot = prev.length === 0 ? 'live_now' : 'on_deck'
      return [...prev, { listing: l, slot, order: nextOrder(prev) }]
    })
  }, [])

  const setSlot = useCallback((listingId: string, slot: Slot) => {
    setLineup((prev) => {
      const next = prev.map((row) => ({ ...row }))
      if (slot === 'live_now') {
        for (const r of next) {
          if (r.slot === 'live_now') r.slot = 'on_deck'
        }
      }
      const row = next.find((x) => x.listing.id === listingId)
      if (row) row.slot = slot
      return next
    })
  }, [])

  const move = useCallback((listingId: string, dir: -1 | 1) => {
    setLineup((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const i = sorted.findIndex((x) => x.listing.id === listingId)
      const j = i + dir
      if (i < 0 || j < 0 || j >= sorted.length) return prev
      const a = sorted[i]!
      const b = sorted[j]!
      const oo = a.order
      a.order = b.order
      b.order = oo
      return sorted
    })
  }, [])

  const lineupSorted = useMemo(() => [...lineup].sort((a, b) => a.order - b.order), [lineup])

  const requestCamMic = useCallback(
    async (mode: 'both' | 'audio') => {
      setPermDeny(null)
      console.log('[LiveKit] requesting permissions', { mode })
      try {
        mediaStream?.getTracks().forEach((t) => t.stop())
        const onlyAudio = mode === 'audio'
        setAudioOnly(onlyAudio)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: onlyAudio ? false : { facingMode },
        })
        setMediaStream(stream)
        setStep(4)
      } catch {
        setPermDeny(
          'Fetchit needs camera and microphone access to start your live show. Adjust browser permissions.',
        )
        console.warn('[LiveKit] permission denied')
      }
    },
    [facingMode, mediaStream],
  )

  useEffect(() => {
    if (!mediaStream) return
    mediaStream.getAudioTracks().forEach((t) => {
      t.enabled = micOn
    })
    mediaStream.getVideoTracks().forEach((t) => {
      t.enabled = camOn
    })
  }, [mediaStream, micOn, camOn])

  const stopMedia = useCallback(() => {
    mediaStream?.getTracks().forEach((t) => t.stop())
    setMediaStream(null)
  }, [mediaStream])

  const onStartLive = useCallback(async () => {
    setStartErr(null)
    if (!title.trim()) {
      setStartErr('Add a show title.')
      return
    }
    if (lineupSorted.length === 0) {
      setStartErr('Pick at least one listing.')
      return
    }
    if (!mediaStream) {
      setStartErr('Grant camera or audio first.')
      return
    }
    if (!coverSquareFile || !coverVerticalFile) {
      setStartErr('Add square and vertical cover images.')
      return
    }

    setStarting(true)
    try {
      console.log('[LiveKit] posting live session', { stage: '[LiveKit]' })
      const up = await uploadListingImagesForCreate([coverSquareFile, coverVerticalFile])
      const coverSquareUrl = up[0]?.trim() ?? ''
      const coverVerticalUrl = up[1]?.trim() ?? ''
      if (!coverSquareUrl || !coverVerticalUrl) {
        throw new Error('Cover uploads failed — try again.')
      }

      try {
        sessionStorage.setItem(MEDIA_PREFS_KEY, JSON.stringify({ audioOnly, facingMode }))
      } catch {
        /* ignore */
      }

      const rows: LiveShowListingLine[] = lineupSorted.map((row, idx) => ({
        listingId: row.listing.id,
        slot: row.slot,
        sortIndex: idx,
        title: row.listing.title,
        imageUrl: listingImageAbsoluteUrl(row.listing.images?.[0]?.url),
        priceCents: row.listing.priceCents,
        saleMode: row.listing.saleMode === 'auction' ? 'auction' : 'fixed',
        currentBidCents:
          row.listing.auctionHighBidCents && row.listing.auctionHighBidCents > 0
            ? row.listing.auctionHighBidCents
            : row.listing.priceCents,
      }))

      const pin = rows.find((r) => r.slot === 'live_now')?.listingId ?? rows[0]?.listingId ?? null

      const created = await createLiveSession({
        title: title.trim(),
        category,
        description: description.trim(),
        coverSquareUrl,
        coverVerticalUrl,
        listings: rows,
        pinnedListingId: pin,
        sellerDisplay: sellerDefault,
        status: 'live',
      })

      stopMedia()
      console.log('[LiveKit] live session saved', { room: created.roomName })
      navigate(`/live/${encodeURIComponent(created.roomName)}`, { replace: true })
    } catch (e) {
      console.warn(e)
      setStartErr(e instanceof Error ? e.message : 'start_failed')
    } finally {
      setStarting(false)
    }
  }, [
    audioOnly,
    category,
    coverSquareFile,
    coverVerticalFile,
    description,
    facingMode,
    lineupSorted,
    navigate,
    sellerDefault,
    mediaStream,
    stopMedia,
    title,
  ])

  const shell = (body: ReactNode, header: string) => (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-violet-50/60 via-white to-zinc-50/40">
      <header className="flex shrink-0 items-center gap-2 border-b border-zinc-100 bg-white/90 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : navigate(FETCH_APP_PATH))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-800 active:bg-zinc-100"
          aria-label="Back"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="min-w-0 flex-1 text-center text-[16px] font-bold text-zinc-900">{header}</h1>
        <div className="w-10 shrink-0" />
      </header>
      <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4">
        {body}
      </div>
    </div>
  )

  if (step === 1) {
    return shell(
      <>
        <label className="block text-[12px] font-bold uppercase tracking-wide text-zinc-500">Show title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you selling today?"
          className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 shadow-sm outline-none focus:border-violet-400"
        />
        <label className="mt-4 block text-[12px] font-bold uppercase tracking-wide text-zinc-500">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] font-medium text-zinc-900 shadow-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="mt-4 text-[12px] font-bold uppercase tracking-wide text-zinc-500">Live covers (required)</p>
        <p className="mt-1 text-[12px] text-zinc-500">Square for feeds and tiles; vertical (9:16) for promos.</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <input
              ref={squareCoverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setCoverSquareFile(e.target.files?.[0] ?? null)
              }
            />
            <button
              type="button"
              onClick={() => squareCoverInputRef.current?.click()}
              className="flex aspect-square w-full items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-white p-2 text-center text-[12px] font-semibold leading-tight text-violet-800"
            >
              {coverSquarePreview ? (
                <img src={coverSquarePreview} alt="" className="h-full w-full rounded-xl object-cover" />
              ) : (
                'Square cover'
              )}
            </button>
          </div>
          <div>
            <input
              ref={verticalCoverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setCoverVerticalFile(e.target.files?.[0] ?? null)
              }
            />
            <button
              type="button"
              onClick={() => verticalCoverInputRef.current?.click()}
              className="flex aspect-[9/16] w-full items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-white p-2 text-center text-[12px] font-semibold leading-tight text-violet-800"
            >
              {coverVerticalPreview ? (
                <img src={coverVerticalPreview} alt="" className="h-full w-full rounded-xl object-cover" />
              ) : (
                'Vertical cover'
              )}
            </button>
          </div>
        </div>
        <label className="mt-4 block text-[12px] font-bold uppercase tracking-wide text-zinc-500">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Tell buyers what to expect"
          className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 shadow-sm outline-none focus:border-violet-400"
        />
        <button
          type="button"
          disabled={!title.trim() || !coverSquareFile || !coverVerticalFile}
          className="fetch-live-pressable mt-8 w-full rounded-2xl bg-violet-600 py-3.5 text-[16px] font-bold text-white shadow-lg shadow-violet-600/25 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setStep(2)}
        >
          Continue
        </button>
      </>,
      'Go live',
    )
  }

  if (step === 2) {
    return shell(
      <>
        {loadErr ? <p className="mb-3 text-[13px] text-red-700">{loadErr}</p> : null}
        <p className="text-[13px] text-zinc-600">Choose your lineup. One item is “live now”, others on deck or later.</p>
        <ul className="mt-4 space-y-2">
          {listings.map((l) => {
            const on = lineup.some((x) => x.listing.id === l.id)
            return (
              <li key={l.id} className="rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleListing(l)}
                    className={[
                      'h-6 w-6 shrink-0 rounded-md border-2',
                      on ? 'border-violet-600 bg-violet-600' : 'border-zinc-300',
                    ].join(' ')}
                    aria-label={on ? 'Remove from show' : 'Add to show'}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-zinc-900">{l.title}</p>
                    <p className="text-[11px] text-zinc-500">{l.saleMode === 'auction' ? 'Auction' : 'Buy now'}</p>
                  </div>
                </div>
                {on ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-zinc-50 pt-2">
                    {(['live_now', 'on_deck', 'later'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={[
                          'rounded-full px-2 py-1 text-[11px] font-bold',
                          lineup.find((x) => x.listing.id === l.id)?.slot === s
                            ? 'bg-violet-600 text-white'
                            : 'bg-zinc-100 text-zinc-700',
                        ].join(' ')}
                        onClick={() => setSlot(l.id, s)}
                      >
                        {s === 'live_now' ? 'Live now' : s === 'on_deck' ? 'On deck' : 'Later'}
                      </button>
                    ))}
                    <span className="ml-auto flex gap-1">
                      <button
                        type="button"
                        className="rounded-lg border border-zinc-200 px-2 py-1 text-[12px] font-bold text-zinc-800"
                        onClick={() => move(l.id, -1)}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-zinc-200 px-2 py-1 text-[12px] font-bold text-zinc-800"
                        onClick={() => move(l.id, 1)}
                      >
                        Down
                      </button>
                    </span>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
        {!listings.length ? <p className="mt-6 text-[13px] text-zinc-600">Publish a listing first.</p> : null}
        <button
          type="button"
          className="fetch-live-pressable mt-8 w-full rounded-2xl bg-violet-600 py-3.5 font-bold text-white"
          disabled={lineupSorted.length === 0}
          onClick={() => setStep(3)}
        >
          Continue to camera
        </button>
      </>,
      'Pick listings',
    )
  }

  if (step === 3) {
    return shell(
      <>
        <div className="rounded-3xl bg-white p-5 shadow-lg shadow-violet-900/[0.05] ring-1 ring-violet-100">
          <p className="text-[16px] font-bold text-zinc-900">Camera & microphone</p>
          <p className="mt-2 text-[14px] leading-snug text-zinc-600">
            Fetchit needs camera and microphone access to start your live show.
          </p>
        </div>
        {permDeny ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-900">{permDeny}</p>
        ) : null}
        <button
          type="button"
          className="fetch-live-pressable mt-6 w-full rounded-2xl bg-violet-600 py-3.5 text-[15px] font-bold text-white"
          onClick={() => void requestCamMic('both')}
        >
          Allow camera &amp; mic
        </button>
        <button
          type="button"
          className="fetch-live-pressable mt-3 w-full rounded-2xl border border-zinc-200 bg-white py-3.5 text-[14px] font-semibold text-zinc-900"
          onClick={() => void requestCamMic('audio')}
        >
          Use audio only
        </button>
        {mediaStream ? (
          <>
            <p className="mt-6 text-center text-[13px] text-zinc-600">Already allowed access?</p>
            <button
              type="button"
              className="fetch-live-pressable mt-2 w-full rounded-2xl border border-violet-200 bg-white py-3.5 text-[14px] font-semibold text-violet-800"
              onClick={() => setStep(4)}
            >
              Continue to preview
            </button>
          </>
        ) : null}
      </>,
      'Permissions',
    )
  }

  if (step === 4) {
    const pinnedRow = lineupSorted.find((x) => x.slot === 'live_now') ?? lineupSorted[0]
    const imgUrl = pinnedRow ? listingImageAbsoluteUrl(pinnedRow.listing.images?.[0]?.url) : ''
    return shell(
      <>
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-3xl bg-black shadow-xl">
          <video ref={previewRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="fetch-live-pressable flex-1 rounded-xl bg-white py-3 text-[13px] font-bold text-zinc-900 shadow-sm ring-1 ring-zinc-100"
            onClick={() => setMicOn((m) => !m)}
          >
            {micOn ? 'Mute' : 'Unmute'}
          </button>
          <button
            type="button"
            className="fetch-live-pressable flex-1 rounded-xl bg-white py-3 text-[13px] font-bold text-zinc-900 shadow-sm ring-1 ring-zinc-100"
            onClick={() => setCamOn((c) => !c)}
          >
            Camera {camOn ? 'off' : 'on'}
          </button>
          <button
            type="button"
            className="fetch-live-pressable w-full rounded-xl bg-zinc-100 py-3 text-[13px] font-semibold text-zinc-800"
            onClick={() => setStep(2)}
          >
            Edit lineup
          </button>
        </div>

        <p className="mt-4 text-[12px] font-bold uppercase tracking-wide text-zinc-500">Featured now</p>
        {pinnedRow ? (
          <div className="mt-2 flex gap-3 rounded-2xl border border-violet-100 bg-white p-3 shadow-sm">
            {imgUrl ? <img src={imgUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" /> : null}
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold text-zinc-900">{pinnedRow.listing.title}</p>
              <p className="text-[12px] text-violet-700">
                {pinnedRow.listing.saleMode === 'auction' ? 'Auction' : 'Buy now'}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {lineupSorted.map((row) => (
            <div key={row.listing.id} className="w-24 shrink-0 rounded-xl border border-zinc-100 bg-white p-1 shadow-sm">
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-zinc-100">
                {listingImageAbsoluteUrl(row.listing.images?.[0]?.url) ? (
                  <img
                    src={listingImageAbsoluteUrl(row.listing.images?.[0]?.url)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <p className="truncate px-1 py-1 text-[9px] font-semibold text-zinc-800">{row.slot}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="fetch-live-pressable mt-6 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-4 text-[16px] font-bold text-white shadow-xl shadow-violet-600/30"
          onClick={() => setStep(5)}
        >
          Continue
        </button>
      </>,
      'Preview studio',
    )
  }

  return shell(
    <>
      <p className="text-[14px] text-zinc-600">You&apos;re ready. When you go live buyers can join instantly.</p>
      {startErr ? <p className="mt-4 text-[13px] text-red-700">{startErr}</p> : null}
      <button
        type="button"
        disabled={starting}
        className="fetch-live-pressable mt-6 w-full rounded-2xl bg-red-600 py-4 text-[16px] font-bold text-white shadow-lg shadow-red-600/30 disabled:opacity-60"
        onClick={() => void onStartLive()}
      >
        {starting ? 'Starting…' : 'Start live'}
      </button>
    </>,
    'Start live',
  )
}
