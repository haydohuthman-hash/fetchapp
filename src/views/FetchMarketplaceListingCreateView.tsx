import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { useSearchParams } from 'react-router-dom'
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

const STEP_ORDER = ['basics', 'photos', 'details', 'extras', 'review'] as const
type Step = (typeof STEP_ORDER)[number]

const STEP_LABEL: Record<Step, string> = {
  basics: 'Basics',
  photos: 'Photos',
  details: 'Price & details',
  extras: 'Delivery & tags',
  review: 'Review & publish',
}

const FIELD_LABEL_CLASS =
  'block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500'
const TEXT_INPUT_CLASS =
  'mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[15px] text-zinc-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none ring-0 placeholder:text-zinc-400 focus:border-[#4c1d95] focus:ring-2 focus:ring-[#c4b5fd]'
const TEXTAREA_CLASS =
  'mt-1.5 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[14px] text-zinc-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none ring-0 placeholder:text-zinc-400 focus:border-[#4c1d95] focus:ring-2 focus:ring-[#c4b5fd]'
const SELECT_CLASS =
  'mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-2 py-2.5 text-[14px] text-zinc-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none ring-0 focus:border-[#4c1d95] focus:ring-2 focus:ring-[#c4b5fd]'

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
  const [step, setStep] = useState<Step>('basics')
  const [listingId, setListingId] = useState<string | null>(initialEditIdRef.current || null)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('general')
  const [condition, setCondition] = useState('good')

  const [uploadedImages, setUploadedImages] = useState<{ url: string; sort?: number }[]>([])
  const [files, setFiles] = useState<File[]>([])

  const [description, setDescription] = useState('')
  const [priceAud, setPriceAud] = useState('')
  const [locationLabel, setLocationLabel] = useState('')

  const [fetchDelivery, setFetchDelivery] = useState(false)
  const [sameDayDelivery, setSameDayDelivery] = useState(false)
  const [tags, setTags] = useState('')
  const [quantity, setQuantity] = useState('')

  // Local thumbnails for picked-but-not-yet-uploaded files. Revoked between
  // file-list changes and on unmount to avoid leaking object URLs.
  const fileThumbs = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => {
    return () => {
      fileThumbs.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [fileThumbs])

  // Initial load of an existing listing when the URL arrives with ?edit= or
  // when we just minted a draft and updated the URL ourselves. The ref guard
  // keeps post-create state in memory rather than refetching what we wrote.
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
        setTags((l.keywords || '').replace(/\s+/g, ' ').trim())
        setFetchDelivery(Boolean(l.fetchDelivery))
        setSameDayDelivery(Boolean(l.sameDayDelivery))
        setUploadedImages(Array.isArray(l.images) ? l.images : [])
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not load listing.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const onFiles = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'))
    setFiles((prev) => [...prev, ...picked].slice(0, 12 - uploadedImages.length))
    e.target.value = ''
  }, [uploadedImages.length])

  const removeFile = useCallback((idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const buildKeywords = useCallback(() => {
    const base = tags.split(/[,#\s]+/).map((t) => t.trim()).filter(Boolean)
    const q = quantity.trim()
    if (q && /^\d+$/.test(q)) base.push(`qty:${q}`)
    return base.join(', ').slice(0, 2000)
  }, [quantity, tags])

  const goBack = useCallback(() => {
    setErr(null)
    setStep((cur) => STEP_ORDER[Math.max(0, STEP_ORDER.indexOf(cur) - 1)])
  }, [])

  const goNext = useCallback(() => {
    setStep((cur) => STEP_ORDER[Math.min(STEP_ORDER.length - 1, STEP_ORDER.indexOf(cur) + 1)])
  }, [])

  // First server write boundary: mints a draft on the server using the
  // already-validated basics. Subsequent steps either patch this id or append
  // images to it. URL is updated to ?edit=id so a refresh can resume the draft.
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
    setUploadedImages(Array.isArray(created.images) ? created.images : [])
    if (typeof window !== 'undefined') {
      const next = new URLSearchParams(window.location.search)
      next.set('edit', created.id)
      setSp(next, { replace: true })
    }
    return created.id
  }, [category, condition, listingId, setSp, title])

  const handleContinueBasics = useCallback(async () => {
    setErr(null)
    if (!title.trim()) {
      setErr('Add a product title.')
      return
    }
    setSaving(true)
    try {
      const hadIdBefore = Boolean(listingId)
      const id = await persistInitialDraftIfNeeded()
      if (!id) return
      if (hadIdBefore) {
        // Edit flow (or returning to step 1 after the draft existed): persist
        // any title/category/condition tweaks before moving on.
        await patchListing(id, { title: title.trim(), category, condition })
      }
      goNext()
    } catch (e) {
      console.error('[FetchMarketplaceListingCreateView] basics save failed', e)
      setErr(e instanceof Error ? e.message : 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }, [category, condition, goNext, listingId, persistInitialDraftIfNeeded, title])

  const handleContinuePhotos = useCallback(async () => {
    setErr(null)
    setSaving(true)
    try {
      const id = listingId ?? (await persistInitialDraftIfNeeded())
      if (!id) return
      let updated: PeerListing | null = null
      for (const f of files) {
        updated = await uploadListingImage(id, f)
      }
      if (updated) setUploadedImages(updated.images ?? [])
      setFiles([])
      goNext()
    } catch (e) {
      console.error('[FetchMarketplaceListingCreateView] photo upload failed', e)
      setErr(e instanceof Error ? e.message : 'Could not upload photos.')
    } finally {
      setSaving(false)
    }
  }, [files, goNext, listingId, persistInitialDraftIfNeeded])

  const handleContinueDetails = useCallback(async () => {
    setErr(null)
    const trimmed = priceAud.trim()
    const price = trimmed ? Number.parseFloat(trimmed.replace(/,/g, '')) : 0
    if (trimmed && (!Number.isFinite(price) || price < 0)) {
      setErr('Enter a valid price (0 or more AUD).')
      return
    }
    setSaving(true)
    try {
      const id = listingId ?? (await persistInitialDraftIfNeeded())
      if (!id) return
      await patchListing(id, {
        description: description.trim(),
        priceAud: Number.isFinite(price) ? price : 0,
        locationLabel: locationLabel.trim(),
      })
      goNext()
    } catch (e) {
      console.error('[FetchMarketplaceListingCreateView] details save failed', e)
      setErr(e instanceof Error ? e.message : 'Could not save details.')
    } finally {
      setSaving(false)
    }
  }, [description, goNext, listingId, locationLabel, persistInitialDraftIfNeeded, priceAud])

  const handleContinueExtras = useCallback(async () => {
    setErr(null)
    setSaving(true)
    try {
      const id = listingId ?? (await persistInitialDraftIfNeeded())
      if (!id) return
      await patchListing(id, {
        fetchDelivery,
        sameDayDelivery,
        keywords: buildKeywords(),
      })
      goNext()
    } catch (e) {
      console.error('[FetchMarketplaceListingCreateView] extras save failed', e)
      setErr(e instanceof Error ? e.message : 'Could not save extras.')
    } finally {
      setSaving(false)
    }
  }, [buildKeywords, fetchDelivery, goNext, listingId, persistInitialDraftIfNeeded, sameDayDelivery])

  const handlePublish = useCallback(async () => {
    setErr(null)
    if (!listingId) {
      setErr('Draft not ready yet. Tap Continue on a previous step first.')
      return
    }
    if (uploadedImages.length === 0 && files.length === 0) {
      setErr('Add at least one photo before publishing.')
      return
    }
    setSaving(true)
    try {
      // Sweep up any straggler files added on the review screen so the
      // published listing always reflects what the seller saw last.
      let updated: PeerListing | null = null
      for (const f of files) {
        updated = await uploadListingImage(listingId, f)
      }
      if (updated) setUploadedImages(updated.images ?? [])
      setFiles([])
      await publishListing(listingId)
      if (sellerBoostActive) flagAuctionBoosted(listingId)
      onDone()
    } catch (e) {
      console.error('[FetchMarketplaceListingCreateView] publish failed', e)
      setErr(e instanceof Error ? e.message : 'Could not publish listing.')
    } finally {
      setSaving(false)
    }
  }, [files, listingId, onDone, sellerBoostActive, uploadedImages.length])

  const continueHandler = useMemo(() => {
    switch (step) {
      case 'basics': return handleContinueBasics
      case 'photos': return handleContinuePhotos
      case 'details': return handleContinueDetails
      case 'extras': return handleContinueExtras
      case 'review': return handlePublish
    }
  }, [
    handleContinueBasics,
    handleContinueDetails,
    handleContinueExtras,
    handleContinuePhotos,
    handlePublish,
    step,
  ])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f8f6fd] text-zinc-500">
        <p className="text-sm font-medium">Loading listing…</p>
      </div>
    )
  }

  const stepIdx = STEP_ORDER.indexOf(step)
  const totalPhotoCount = uploadedImages.length + files.length
  const canPublish = totalPhotoCount > 0 && Boolean(title.trim())

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#f8f6fd] via-white to-zinc-50 px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))] text-zinc-900">
      <header className="mb-4 flex items-start gap-3">
        <button
          type="button"
          onClick={onDone}
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-100 active:scale-[0.97]"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight">
            {initialEditIdRef.current ? 'Edit listing' : 'List an item'}
          </h1>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Step {stepIdx + 1} of {STEP_ORDER.length} · {STEP_LABEL[step]}
          </p>
        </div>
        {!initialEditIdRef.current && listingId ? (
          <span
            className="mt-1 shrink-0 rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#4c1d95] ring-1 ring-violet-200"
            aria-label="Draft saved on the server"
          >
            Draft saved
          </span>
        ) : null}
      </header>

      <StepIndicator step={step} />

      {err ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800"
        >
          {err}
        </p>
      ) : null}

      {sellerBoostActive ? (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-amber-700 ring-1 ring-amber-300">
          <span aria-hidden>📈</span>
          Seller Boost active · this listing will be boosted
        </p>
      ) : null}

      <section className="mt-6 space-y-4">
        {step === 'basics' ? (
          <>
            <label className={FIELD_LABEL_CLASS}>
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={TEXT_INPUT_CLASS}
                placeholder="What are you selling?"
                maxLength={200}
                autoFocus
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className={FIELD_LABEL_CLASS}>
                Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={SELECT_CLASS}
                >
                  {LIST_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white text-zinc-900">
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={FIELD_LABEL_CLASS}>
                Condition
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className={SELECT_CLASS}
                >
                  {CONDITIONS.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white text-zinc-900">
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-[11px] text-zinc-500">
              Tap Continue to save a draft on the server. You can come back any time.
            </p>
          </>
        ) : null}

        {step === 'photos' ? (
          <>
            <p className={FIELD_LABEL_CLASS}>Photos · {totalPhotoCount}/12</p>
            <div className="flex flex-wrap gap-2">
              {uploadedImages.map((img, i) => (
                <span
                  key={`up-${img.url}-${i}`}
                  className="relative h-16 w-16 overflow-hidden rounded-lg ring-1 ring-violet-300"
                  title="Already uploaded"
                >
                  <img
                    src={listingImageAbsoluteUrl(img.url)}
                    alt=""
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                </span>
              ))}
              {fileThumbs.map((src, i) => (
                <span
                  key={`pending-${src}`}
                  className="relative h-16 w-16 overflow-hidden rounded-lg ring-1 ring-zinc-200"
                >
                  <img
                    src={src}
                    alt=""
                    draggable={false}
                    className="h-full w-full object-cover opacity-90"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    aria-label="Remove photo"
                    className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl-lg bg-zinc-900/80 text-[10px] font-bold text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
              {totalPhotoCount < 12 ? (
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-violet-300 bg-violet-50 text-[11px] font-semibold text-[#4c1d95]">
                  +
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={onFiles}
                  />
                </label>
              ) : null}
            </div>
            <p className="text-[11px] text-zinc-500">
              Pending photos upload when you tap Continue. At least one photo is required to
              publish.
            </p>
          </>
        ) : null}

        {step === 'details' ? (
          <>
            <label className={FIELD_LABEL_CLASS}>
              Price (AUD)
              <input
                value={priceAud}
                onChange={(e) => setPriceAud(e.target.value)}
                inputMode="decimal"
                className={TEXT_INPUT_CLASS}
                placeholder="0.00"
                autoFocus
              />
            </label>
            <label className={FIELD_LABEL_CLASS}>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={8000}
                className={TEXTAREA_CLASS}
                placeholder="Condition details, dimensions, what’s included…"
              />
            </label>
            <label className={FIELD_LABEL_CLASS}>
              Pickup suburb / location
              <input
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                className={TEXT_INPUT_CLASS}
                placeholder="e.g. West End, Brisbane"
                maxLength={200}
              />
            </label>
          </>
        ) : null}

        {step === 'extras' ? (
          <>
            <label className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm">
              <input
                type="checkbox"
                checked={fetchDelivery}
                onChange={(e) => setFetchDelivery(e.target.checked)}
                className="h-4 w-4 accent-[#4c1d95]"
              />
              <span className="text-[13px] font-medium text-zinc-800">Fetch delivery available</span>
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm">
              <input
                type="checkbox"
                checked={sameDayDelivery}
                onChange={(e) => setSameDayDelivery(e.target.checked)}
                className="h-4 w-4 accent-[#4c1d95]"
              />
              <span className="text-[13px] font-medium text-zinc-800">Same-day delivery promo badge</span>
            </label>

            <label className={FIELD_LABEL_CLASS}>
              Quantity <span className="font-normal text-zinc-400">(optional)</span>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputMode="numeric"
                className={TEXT_INPUT_CLASS}
                placeholder="1"
              />
            </label>

            <label className={FIELD_LABEL_CLASS}>
              Tags <span className="font-normal text-zinc-400">(optional)</span>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className={TEXT_INPUT_CLASS}
                placeholder="vintage, desk, pickup only"
              />
            </label>
          </>
        ) : null}

        {step === 'review' ? (
          <ReviewSummary
            title={title}
            category={category}
            condition={condition}
            priceAud={priceAud}
            description={description}
            locationLabel={locationLabel}
            fetchDelivery={fetchDelivery}
            sameDayDelivery={sameDayDelivery}
            keywords={buildKeywords()}
            uploadedImages={uploadedImages}
            pendingThumbs={fileThumbs}
            canPublish={canPublish}
          />
        ) : null}
      </section>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-zinc-200/90 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-sm items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            disabled={saving || stepIdx === 0}
            className="rounded-2xl border border-zinc-200 bg-white px-5 py-3.5 text-[13px] font-semibold text-zinc-800 shadow-sm disabled:opacity-30"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => void continueHandler()}
            disabled={saving || (step === 'review' && !canPublish)}
            className="ml-auto flex-1 rounded-2xl bg-zinc-900 py-3.5 text-[14px] font-bold text-white shadow-[0_4px_14px_-4px_rgba(24,24,27,0.45)] disabled:opacity-50"
          >
            {saving
              ? step === 'review'
                ? 'Publishing…'
                : 'Saving…'
              : step === 'review'
                ? 'Publish listing'
                : 'Continue'}
          </button>
        </div>
      </footer>
    </div>
  )
}

function StepIndicator({ step }: { step: Step }) {
  const idx = STEP_ORDER.indexOf(step)
  return (
    <div
      className="flex items-center gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={STEP_ORDER.length}
      aria-valuenow={idx + 1}
      aria-label={`Step ${idx + 1} of ${STEP_ORDER.length}: ${STEP_LABEL[step]}`}
    >
      {STEP_ORDER.map((s, i) => {
        const active = i === idx
        const done = i < idx
        return (
          <span
            key={s}
            className={[
              'h-1.5 flex-1 rounded-full transition-colors',
              active ? 'bg-[#4c1d95]' : done ? 'bg-violet-300' : 'bg-zinc-200',
            ].join(' ')}
          />
        )
      })}
    </div>
  )
}

function ReviewSummary({
  title,
  category,
  condition,
  priceAud,
  description,
  locationLabel,
  fetchDelivery,
  sameDayDelivery,
  keywords,
  uploadedImages,
  pendingThumbs,
  canPublish,
}: {
  title: string
  category: string
  condition: string
  priceAud: string
  description: string
  locationLabel: string
  fetchDelivery: boolean
  sameDayDelivery: boolean
  keywords: string
  uploadedImages: { url: string; sort?: number }[]
  pendingThumbs: string[]
  canPublish: boolean
}) {
  const categoryLabel = LIST_CATEGORIES.find((c) => c.id === category)?.label ?? category
  const conditionLabel = CONDITIONS.find((c) => c.id === condition)?.label ?? condition
  const priceDisplay = priceAud.trim() ? `A$ ${priceAud.trim()}` : 'A$ 0 (free)'
  const totalPhotos = uploadedImages.length + pendingThumbs.length

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap gap-2">
        {uploadedImages.map((img, i) => (
          <span
            key={`r-up-${img.url}-${i}`}
            className="h-14 w-14 overflow-hidden rounded-lg ring-1 ring-violet-300"
          >
            <img
              src={listingImageAbsoluteUrl(img.url)}
              alt=""
              draggable={false}
              className="h-full w-full object-cover"
            />
          </span>
        ))}
        {pendingThumbs.map((src) => (
          <span
            key={`r-pending-${src}`}
            className="relative h-14 w-14 overflow-hidden rounded-lg ring-1 ring-zinc-200"
            title="Will upload before publish"
          >
            <img src={src} alt="" draggable={false} className="h-full w-full object-cover opacity-90" />
            <span className="absolute inset-x-0 bottom-0 bg-zinc-900/80 text-center text-[8px] font-bold uppercase tracking-[0.1em] text-white">
              pending
            </span>
          </span>
        ))}
        {totalPhotos === 0 ? (
          <span className="text-[12px] font-medium text-red-600">Add at least one photo to publish.</span>
        ) : null}
      </div>

      <ReviewRow label="Title" value={title || '—'} />
      <ReviewRow label="Category" value={categoryLabel} />
      <ReviewRow label="Condition" value={conditionLabel} />
      <ReviewRow label="Price" value={priceDisplay} />
      {description.trim() ? <ReviewRow label="Description" value={description.trim()} multiline /> : null}
      {locationLabel.trim() ? <ReviewRow label="Pickup" value={locationLabel.trim()} /> : null}
      <ReviewRow
        label="Delivery"
        value={[fetchDelivery ? 'Fetch delivery' : null, sameDayDelivery ? 'Same-day badge' : null]
          .filter(Boolean)
          .join(' · ') || 'Pickup only'}
      />
      {keywords ? <ReviewRow label="Tags" value={keywords} /> : null}

      {!canPublish ? (
        <p className="text-[11px] text-amber-800">
          Add a title and at least one photo before tapping Publish.
        </p>
      ) : (
        <p className="text-[11px] text-zinc-500">
          Tapping Publish makes this listing live for buyers.
        </p>
      )}
    </div>
  )
}

function ReviewRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-baseline gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">{label}</span>
      <span
        className={[
          'text-[13px] text-zinc-900',
          multiline ? 'whitespace-pre-line break-words' : 'truncate',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  )
}
