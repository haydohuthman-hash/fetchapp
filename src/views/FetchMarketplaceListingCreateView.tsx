import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  MoreVertical,
  Sparkles,
  Tag,
  X,
} from 'lucide-react'
import { loadSession } from '../lib/fetchUserSession'
import { ensureDropProfileForSession, getMyDropProfile } from '../lib/drops/profileStore'
import {
  buildValidatedCreateListingBody,
  createListing,
  fetchListing,
  listingImageAbsoluteUrl,
  patchListing,
  publishListing,
  uploadListingImage,
  type PeerListing,
} from '../lib/listingsApi'
import { flagAuctionBoosted, useIsSellerBoosted } from '../lib/data'
import { markListItemPublishedNow } from '../lib/tasks/earnTaskSignals'

const LIST_CATEGORIES: { id: string; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'sports', label: 'Sports' },
  { id: 'other', label: 'Other' },
]

const CONDITIONS: { id: string; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'like new', label: 'Like new' },
  { id: 'good', label: 'Good' },
  { id: 'fair', label: 'Fair' },
  { id: 'used', label: 'Used' },
  { id: 'for parts', label: 'For parts / repair' },
]

const TITLE_MAX = 200
const DESC_MAX = 8000

type PhotoItem =
  | { kind: 'server'; url: string; sort?: number }
  | { kind: 'local'; file: File; previewUrl: string }

function makeLocalPhoto(file: File): Extract<PhotoItem, { kind: 'local' }> {
  return { kind: 'local', file, previewUrl: URL.createObjectURL(file) }
}

export type FetchMarketplaceListingCreateViewProps = {
  onDone: () => void
}

export default function FetchMarketplaceListingCreateView({ onDone }: FetchMarketplaceListingCreateViewProps) {
  const [, setSp] = useSearchParams()
  const initialEditIdRef = useRef(((): string => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('edit')?.trim() ?? ''
  })())
  const loadedIdRef = useRef<string | null>(null)
  const sellerBoostActive = useIsSellerBoosted()

  const [loading, setLoading] = useState(Boolean(initialEditIdRef.current))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [listingId, setListingId] = useState<string | null>(initialEditIdRef.current || null)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('general')
  const [condition, setCondition] = useState('good')

  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([])

  const [description, setDescription] = useState('')
  const [priceAud, setPriceAud] = useState('')
  const [locationLabel, setLocationLabel] = useState('')

  const [fetchDelivery, setFetchDelivery] = useState(false)
  const [sameDayDelivery, setSameDayDelivery] = useState(false)
  const [tagPills, setTagPills] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [quantity, setQuantity] = useState('')

  const [listingBoostEnabled, setListingBoostEnabled] = useState(false)
  const [boostMenuOpen, setBoostMenuOpen] = useState(false)
  const [boostDays, setBoostDays] = useState(7)
  const [photoMenuIdx, setPhotoMenuIdx] = useState<number | null>(null)

  const photoItemsRef = useRef(photoItems)
  photoItemsRef.current = photoItems
  useEffect(() => {
    return () => {
      photoItemsRef.current.forEach((it) => {
        if (it.kind === 'local') URL.revokeObjectURL(it.previewUrl)
      })
    }
  }, [])

  const categorySelectRef = useRef<HTMLSelectElement>(null)
  const conditionSelectRef = useRef<HTMLSelectElement>(null)
  const fileReplaceRef = useRef<HTMLInputElement>(null)
  const fileReplaceIndexRef = useRef<number | null>(null)

  useEffect(() => {
    const id = initialEditIdRef.current
    if (!id) {
      setLoading(false)
      return
    }
    if (loadedIdRef.current === id) return
    loadedIdRef.current = id
    void (async () => {
      setErr(null)
      setLoading(true)
      try {
        const l = await fetchListing(id)
        const sid = loadSession()?.id?.trim()
        if (sid && l.sellerUserId && l.sellerUserId !== sid) {
          setErr('You can only edit your own listings.')
          return
        }
        setListingId(l.id)
        setTitle(l.title || '')
        setDescription(l.description || '')
        setPriceAud(l.priceCents ? String(l.priceCents / 100) : '')
        setCategory(l.category || 'general')
        setCondition(l.condition || 'good')
        setLocationLabel(l.locationLabel || '')
        const rawTags = (l.keywords || '').replace(/\s+/g, ' ').trim()
        setTagPills(
          rawTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .filter((t) => !t.startsWith('qty:') && !t.startsWith('boost:')),
        )
        const qtyMatch = rawTags.match(/qty:(\d+)/)
        if (qtyMatch) setQuantity(qtyMatch[1]!)
        setFetchDelivery(Boolean(l.fetchDelivery))
        setSameDayDelivery(Boolean(l.sameDayDelivery))
        setPhotoItems(
          Array.isArray(l.images)
            ? l.images.map((img) => ({ kind: 'server' as const, url: img.url, sort: img.sort }))
            : [],
        )
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not load listing.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const visualUrls = useMemo(() => {
    return photoItems.map((it) => ({
      src: it.kind === 'server' ? listingImageAbsoluteUrl(it.url) : it.previewUrl,
    }))
  }, [photoItems])

  const buildKeywords = useCallback(() => {
    const base = [...tagPills]
    const q = quantity.trim()
    if (q && /^\d+$/.test(q)) base.push(`qty:${q}`)
    if (listingBoostEnabled && boostDays > 0) base.push(`boost:${boostDays}d`)
    return base.join(', ').slice(0, 2000)
  }, [boostDays, listingBoostEnabled, quantity, tagPills])

  const onFilesForIndex = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'))
    if (picked.length === 0) return
    const v = fileReplaceIndexRef.current
    if (v === null) return
    const file = picked[0]!
    setPhotoItems((prev) => {
      const next = [...prev]
      const local = makeLocalPhoto(file)
      if (v < next.length) {
        const old = next[v]
        if (old?.kind === 'local') URL.revokeObjectURL(old.previewUrl)
        next[v] = local
        return next.slice(0, 12)
      }
      if (next.length === v && next.length < 12) {
        next.push(local)
        return next
      }
      return prev
    })
    e.target.value = ''
    fileReplaceIndexRef.current = null
  }, [])

  const removeAtVisualIndex = useCallback((visualIdx: number) => {
    setPhotoItems((prev) => {
      const rm = prev[visualIdx]
      if (rm?.kind === 'local') URL.revokeObjectURL(rm.previewUrl)
      return prev.filter((_, i) => i !== visualIdx)
    })
    setPhotoMenuIdx(null)
  }, [])

  const openPicker = useCallback((visualIndex: number) => {
    fileReplaceIndexRef.current = visualIndex
    fileReplaceRef.current?.click()
  }, [])

  const persistInitialDraftIfNeeded = useCallback(async (): Promise<string | null> => {
    if (listingId) return listingId
    ensureDropProfileForSession()
    const me = getMyDropProfile()
    if (!me) {
      setErr('Profile not ready. Open the app once while signed in, then try again.')
      return null
    }
    const draft = buildValidatedCreateListingBody({
      title: title.trim(),
      priceAud: 0,
      category,
      condition,
      profileAuthorId: me.id,
      profileDisplayName: me.displayName,
      profileAvatar: me.avatar?.trim() || undefined,
    })
    if (!draft.ok) {
      setErr(draft.error)
      return null
    }
    const created = await createListing(draft.body)
    loadedIdRef.current = created.id
    setListingId(created.id)
    setPhotoItems(Array.isArray(created.images) ? created.images.map((img) => ({ kind: 'server' as const, url: img.url, sort: img.sort })) : [])
    if (typeof window !== 'undefined') {
      const next = new URLSearchParams(window.location.search)
      next.set('edit', created.id)
      setSp(next, { replace: true })
    }
    return created.id
  }, [category, condition, listingId, setSp, title])

  const handleListItem = useCallback(async () => {
    setErr(null)
    if (!title.trim()) {
      setErr('Add a product title.')
      return
    }
    const totalPhotos = photoItems.length
    if (totalPhotos === 0) {
      setErr('Add at least one photo.')
      return
    }
    const trimmed = priceAud.trim()
    const price = trimmed ? Number.parseFloat(trimmed.replace(/,/g, '')) : 0
    if (trimmed && (!Number.isFinite(price) || price < 0)) {
      setErr('Enter a valid price (0 or more AUD).')
      return
    }
    setSaving(true)
    try {
      const id = await persistInitialDraftIfNeeded()
      if (!id) return

      let latest: PeerListing | null = null
      for (const it of photoItems) {
        if (it.kind === 'local') {
          latest = await uploadListingImage(id, it.file)
        }
      }
      if (latest?.images) {
        const imgs = latest.images
        setPhotoItems((prev) => {
          prev.forEach((it) => {
            if (it.kind === 'local') URL.revokeObjectURL(it.previewUrl)
          })
          return imgs.map((img) => ({ kind: 'server' as const, url: img.url, sort: img.sort }))
        })
      }

      await patchListing(id, {
        title: title.trim(),
        category,
        condition,
        description: description.trim(),
        priceAud: Number.isFinite(price) ? price : 0,
        locationLabel: locationLabel.trim(),
        fetchDelivery,
        sameDayDelivery,
        keywords: buildKeywords(),
      })

      await publishListing(id)
      markListItemPublishedNow()
      if (sellerBoostActive || listingBoostEnabled) flagAuctionBoosted(id)
      onDone()
    } catch (e) {
      console.error('[FetchMarketplaceListingCreateView] publish failed', e)
      setErr(e instanceof Error ? e.message : 'Could not publish listing.')
    } finally {
      setSaving(false)
    }
  }, [
    buildKeywords,
    category,
    condition,
    description,
    fetchDelivery,
    listingBoostEnabled,
    locationLabel,
    onDone,
    persistInitialDraftIfNeeded,
    priceAud,
    photoItems,
    sameDayDelivery,
    sellerBoostActive,
    title,
  ])

  const navigateBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
    } else {
      onDone()
    }
  }, [onDone])

  const addTag = useCallback(() => {
    const t = tagInput.trim().replace(/^#/, '')
    if (!t || tagPills.includes(t) || tagPills.length >= 20) return
    setTagPills((p) => [...p, t].slice(0, 20))
    setTagInput('')
  }, [tagInput, tagPills])

  const categoryLabel = LIST_CATEGORIES.find((c) => c.id === category)?.label ?? 'General'

  const mainSlot = visualUrls[0]
  const rightTop = visualUrls[1]
  const rightBottom = visualUrls[2]

  if (loading) {
    return (
      <div className="fetch-create-listing-screen flex min-h-dvh items-center justify-center">
        <p className="text-sm font-medium text-zinc-500">Loading listing…</p>
      </div>
    )
  }

  return (
    <div className="fetch-create-listing-screen relative min-h-dvh overflow-x-hidden pb-[max(6rem,env(safe-area-inset-bottom)+5rem)] text-zinc-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-12%,rgba(139,92,246,0.14),transparent_52%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_30%,rgba(167,139,250,0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[140%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(196,181,253,0.22),transparent_70%)] blur-2xl" />

      <input
        ref={fileReplaceRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFilesForIndex}
      />

      <header className="relative z-[2] flex items-center justify-between px-4 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={navigateBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200/90 bg-white/90 text-zinc-800 shadow-[0_4px_18px_-6px_rgba(15,23,42,0.12)] backdrop-blur-md transition active:scale-[0.96]"
          aria-label="Back"
        >
          <ArrowLeft className="h-[22px] w-[22px]" strokeWidth={2} />
        </button>
        <h1 className="absolute left-1/2 top-[max(0.85rem,env(safe-area-inset-top))] -translate-x-1/2 text-[17px] font-semibold tracking-tight text-zinc-900">
          {initialEditIdRef.current ? 'Edit listing' : 'Create listing'}
        </h1>
        <button
          type="button"
          onClick={onDone}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200/90 bg-white/90 text-zinc-800 shadow-[0_4px_18px_-6px_rgba(15,23,42,0.12)] backdrop-blur-md transition active:scale-[0.96]"
          aria-label="Close"
        >
          <X className="h-[21px] w-[21px]" strokeWidth={2.2} />
        </button>
      </header>

      <div className="relative z-[1] mx-auto max-w-[min(100%,430px)] px-4 pt-6">
        {err ? (
          <p
            role="alert"
            className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-900"
          >
            {err}
          </p>
        ) : null}

        {sellerBoostActive ? (
          <p className="mb-4 rounded-2xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-amber-950/90">
            Seller Boost active — listing can rank higher when boost is on
          </p>
        ) : null}

        {/* Photo layout */}
        <section className="mb-7 flex gap-3">
          <button
            type="button"
            onClick={() => openPicker(0)}
            className="relative aspect-[4/5] min-h-0 w-[55%] shrink-0 overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-[0_10px_32px_-14px_rgba(15,23,42,0.14)] ring-1 ring-zinc-950/5 transition active:scale-[0.99]"
          >
            {mainSlot ? (
              <img
                src={mainSlot.src}
                alt=""
                draggable={false}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-zinc-100">
                <Camera className="h-9 w-9 text-violet-900/55" strokeWidth={1.6} />
                <span className="text-[11px] font-semibold text-zinc-400">Add cover</span>
              </div>
            )}
            {!mainSlot ? null : (
              <span className="pointer-events-none absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm">
                <Camera className="h-4 w-4 opacity-95" strokeWidth={2} />
              </span>
            )}
          </button>
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {([1, 2] as const).map((slotIdx) => {
              const visIdx = slotIdx
              const slot = slotIdx === 1 ? rightTop : rightBottom
              const needsPrior = slotIdx === 1 ? photoItems.length < 1 : photoItems.length < 2
              return (
                <div key={slotIdx} className="relative flex-1">
                  <button
                    type="button"
                    disabled={needsPrior}
                    onClick={() => openPicker(visIdx)}
                    className={[
                      'relative flex h-full min-h-[88px] w-full overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-zinc-950/5 transition active:scale-[0.99]',
                      needsPrior ? 'cursor-not-allowed opacity-45' : '',
                    ].join(' ')}
                  >
                    {slot ? (
                      <img
                        src={slot.src}
                        alt=""
                        draggable={false}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-zinc-100">
                        <Camera className="h-6 w-6 text-violet-900/45" strokeWidth={1.6} />
                        <span className="text-[10px] font-medium text-zinc-400">Add</span>
                      </div>
                    )}
                  </button>
                  {slot ? (
                    <div className="absolute right-2 top-2 z-[2]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPhotoMenuIdx(photoMenuIdx === visIdx ? null : visIdx)
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition active:scale-95"
                        aria-label="Photo options"
                      >
                        <MoreVertical className="h-4 w-4" strokeWidth={2.2} />
                      </button>
                      {photoMenuIdx === visIdx ? (
                        <>
                          <button
                            type="button"
                            className="fixed inset-0 z-[1] cursor-default"
                            aria-hidden
                            onClick={() => setPhotoMenuIdx(null)}
                          />
                          <div className="absolute right-0 top-10 z-[3] min-w-[120px] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl ring-1 ring-zinc-950/5 backdrop-blur-xl">
                            <button
                              type="button"
                              className="block w-full px-3 py-2.5 text-left text-[13px] font-medium text-zinc-800 hover:bg-zinc-50"
                              onClick={() => {
                                openPicker(visIdx)
                                setPhotoMenuIdx(null)
                              }}
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              className="block w-full px-3 py-2.5 text-left text-[13px] font-medium text-red-600 hover:bg-red-50"
                              onClick={() => removeAtVisualIndex(visIdx)}
                            >
                              Remove
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>

        {/* Title */}
        <label className="mb-5 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Title</span>
          <div className="relative mt-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX}
              placeholder="What are you selling?"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 pr-16 text-[15px] font-medium text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none ring-0 placeholder:text-zinc-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] tabular-nums text-zinc-400">
              {title.length}/{TITLE_MAX}
            </span>
          </div>
        </label>

        {/* Description */}
        <label className="mb-5 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Description</span>
          <div className="relative mt-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESC_MAX}
              rows={4}
              placeholder="Condition, what’s included, dimensions…"
              className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 pb-9 text-[14px] leading-relaxed text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none ring-0 placeholder:text-zinc-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
            />
            <span className="pointer-events-none absolute bottom-3 right-3.5 text-[11px] tabular-nums text-zinc-400">
              {description.length}/{DESC_MAX}
            </span>
          </div>
        </label>

        {/* Category */}
        <button
          type="button"
          onClick={() => categorySelectRef.current?.showPicker?.() ?? categorySelectRef.current?.click()}
          className="mb-5 flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-left shadow-[0_6px_28px_-14px_rgba(15,23,42,0.1)] ring-1 ring-zinc-950/[0.03] backdrop-blur-sm transition active:scale-[0.99]"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 ring-1 ring-violet-200/80">
              <Tag className="h-5 w-5" strokeWidth={2} />
            </span>
            <span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Category</span>
              <span className="mt-0.5 block text-[15px] font-semibold text-zinc-900">{categoryLabel}</span>
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" strokeWidth={2} />
        </button>
        <select
          ref={categorySelectRef}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="sr-only"
          aria-hidden
          tabIndex={-1}
        >
          {LIST_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Price & Condition */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Price</span>
            <div className="relative mt-2 flex items-center">
              <span className="pointer-events-none absolute left-3.5 text-[14px] font-semibold text-zinc-500">$</span>
              <input
                value={priceAud}
                onChange={(e) => setPriceAud(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className="w-full rounded-2xl border border-zinc-200 bg-white py-3.5 pl-8 pr-3 text-[15px] font-semibold text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none placeholder:text-zinc-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
            <span className="mt-1 block text-[10px] text-zinc-500">AUD</span>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Condition</span>
            <button
              type="button"
              onClick={() => conditionSelectRef.current?.showPicker?.() ?? conditionSelectRef.current?.click()}
              className="mt-2 flex w-full items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-left text-[14px] font-semibold text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
            >
              <span className="truncate">
                {CONDITIONS.find((c) => c.id === condition)?.label ?? condition}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" strokeWidth={2} />
            </button>
            <select
              ref={conditionSelectRef}
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="sr-only"
              aria-hidden
              tabIndex={-1}
            >
              {CONDITIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Tags */}
        <div className="mb-5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Tags</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {tagPills.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTagPills((p) => p.filter((x) => x !== t))}
                className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[12px] font-semibold text-violet-900 ring-1 ring-violet-100 transition active:scale-[0.98]"
              >
                {t} <span className="ml-0.5 opacity-60">×</span>
              </button>
            ))}
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-dashed border-zinc-300 bg-zinc-50/80 px-2 py-1 pl-3">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="vintage, pickup…"
                className="min-w-0 flex-1 bg-transparent py-1.5 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400"
              />
              <button
                type="button"
                onClick={addTag}
                disabled={!tagInput.trim()}
                className="shrink-0 rounded-full bg-violet-600 px-3 py-1.5 text-[12px] font-bold text-white shadow-sm ring-1 ring-violet-500/25 transition enabled:active:scale-95 disabled:opacity-35"
              >
                + Add tag
              </button>
            </div>
          </div>
        </div>

        {/* Boost card */}
        <div className="relative mb-6 overflow-hidden rounded-3xl border border-violet-200/90 bg-gradient-to-br from-violet-100/90 via-white to-violet-50/70 p-4 shadow-[0_14px_40px_-22px_rgba(91,33,182,0.22)] ring-1 ring-violet-100 backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-violet-300/35 blur-3xl" />
          <div className="relative flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white ring-1 ring-violet-500/30 shadow-sm">
              <Sparkles className="h-6 w-6" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[15px] font-bold tracking-tight text-zinc-900">Boost your listing to hunters</p>
              <p className="mt-1 text-[12px] leading-snug text-zinc-600">
                Get more views and sell faster — hunters may be looking for your exact item. Boost surfaces your listing
                in hunts and similar hunts. <span className="font-medium text-zinc-800">Fee approx. $4.99</span> ·{' '}
                <button
                  type="button"
                  onClick={() => setBoostMenuOpen((o) => !o)}
                  className="font-semibold text-violet-700 underline decoration-violet-300 underline-offset-2"
                >
                  {boostDays} days
                </button>{' '}
                of boosted visibility.
              </p>
              {boostMenuOpen ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {([3, 7, 14] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setBoostDays(d)
                        setBoostMenuOpen(false)
                      }}
                      className={[
                        'rounded-full px-3 py-1.5 text-[12px] font-bold ring-1 transition',
                        boostDays === d
                          ? 'bg-violet-600 text-white ring-violet-500 shadow-sm'
                          : 'bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50',
                      ].join(' ')}
                    >
                      {d} days
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={listingBoostEnabled}
              onClick={() => setListingBoostEnabled((v) => !v)}
              className={[
                'relative mt-1 h-[30px] w-[50px] shrink-0 rounded-full transition',
                listingBoostEnabled ? 'bg-violet-600 shadow-[0_0_16px_-2px_rgba(124,58,237,0.55)]' : 'bg-zinc-200',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute top-1 h-[22px] w-[22px] rounded-full bg-white shadow-md transition',
                  listingBoostEnabled ? 'left-[24px]' : 'left-1',
                ].join(' ')}
              />
            </button>
          </div>
        </div>

        {/* Optional delivery — compact */}
        <div className="mb-4 grid grid-cols-1 gap-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-3.5 py-3 shadow-sm">
            <input
              type="checkbox"
              checked={fetchDelivery}
              onChange={(e) => setFetchDelivery(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 bg-white accent-violet-600"
            />
            <span className="text-[13px] font-medium text-zinc-800">Fetch delivery available</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-3.5 py-3 shadow-sm">
            <input
              type="checkbox"
              checked={sameDayDelivery}
              onChange={(e) => setSameDayDelivery(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 bg-white accent-violet-600"
            />
            <span className="text-[13px] font-medium text-zinc-800">Same-day delivery badge</span>
          </label>
        </div>

        <label className="mb-2 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Pickup / suburb <span className="font-normal text-zinc-400">(optional)</span>
          </span>
          <input
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            maxLength={200}
            placeholder="e.g. West End, Brisbane"
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
          />
        </label>

        <label className="mb-10 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Quantity (optional)</span>
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputMode="numeric"
            placeholder="1"
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
          />
        </label>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-[10] border-t border-zinc-200/90 bg-white/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl shadow-[0_-8px_32px_-12px_rgba(15,23,42,0.08)]">
        <div className="mx-auto max-w-[min(100%,430px)]">
          <button
            type="button"
            onClick={() => void handleListItem()}
            disabled={saving}
            className="fetch-create-listing-cta w-full rounded-2xl py-4 text-[16px] font-bold tracking-tight text-white shadow-[0_12px_40px_-12px_rgba(109,40,217,0.5)] transition active:scale-[0.99] disabled:opacity-45"
          >
            {saving ? 'Publishing…' : 'List item'}
          </button>
        </div>
      </footer>
    </div>
  )
}
