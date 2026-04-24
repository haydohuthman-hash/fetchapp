import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  listingImageAbsoluteUrl,
  peerListingCompareAtIfDiscounted,
  type PeerListing,
} from '../lib/listingsApi'
import {
  formatPeerListingDistanceEta,
  viewerCenterForPeerListings,
} from '../lib/peerListingGeo'
import { BoltNavIcon } from './icons/HomeShellNavIcons'

/* ─── helpers ─────────────────────────────────────────────────── */

function formatAud(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

/* ─── How‑It‑Works Sheet ──────────────────────────────────────── */

const STEPS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00ff6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
    title: 'Browse & find',
    desc: 'Explore local listings by category. Every item is from a seller near you.',
  },
  {
    icon: <BoltNavIcon className="h-[22px] w-[22px] text-[#00ff6a]" />,
    title: 'Fetch delivers it',
    desc: 'Same‑day or next‑day delivery to your door — or free pickup from the seller.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00ff6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    title: 'Pay securely',
    desc: 'Checkout is protected. If something goes wrong, Fetch has your back.',
  },
]

function HowItWorksSheet({
  categoryTitle,
  onClose,
  onContinue,
}: {
  categoryTitle: string
  onClose: () => void
  onContinue: () => void
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 320)
  }, [onClose])

  const cont = useCallback(() => {
    setVisible(false)
    setTimeout(onContinue, 320)
  }, [onContinue])

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex flex-col items-center justify-end"
      onClick={dismiss}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        className={`relative z-[1] mx-auto w-full max-w-[min(100%,430px)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${visible ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fetch-sheet-surface rounded-t-[1.75rem] border-t border-violet-200/50 bg-white px-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-5 shadow-[0_-8px_40px_rgba(76,29,149,0.08)]">
          {/* Handle */}
          <div className="mx-auto mb-5 h-[5px] w-10 rounded-full bg-zinc-600" />

          {/* Header */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#4c1d95]">
              <BoltNavIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-[1.05rem] font-bold tracking-[-0.02em] text-[#1c1528]">
                How Fetch works
              </h2>
              <p className="text-[12px] font-medium text-zinc-500">
                {categoryTitle}
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="flex flex-col gap-4">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 ring-1 ring-violet-200/60 text-[#4c1d95]">
                  {s.icon}
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[13px] font-bold text-[#1c1528]">{s.title}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-zinc-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery badges */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-[#4c1d95] ring-1 ring-violet-200/60">
              <BoltNavIcon className="h-3 w-3 text-[#4c1d95]" />
              Same-day delivery
            </span>
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-[#4c1d95]">
              Next-day available
            </span>
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-[#4c1d95]">
              Free pickup
            </span>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={cont}
            className="mt-6 flex w-full items-center justify-center rounded-2xl bg-[#4c1d95] py-3.5 text-[14px] font-bold text-white transition-transform active:scale-[0.98]"
          >
            Browse {categoryTitle}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ─── Listing Info Sheet (FB‑style) ───────────────────────────── */

function ListingInfoSheet({
  listing,
  onClose,
  onAddToCart,
}: {
  listing: PeerListing
  onClose: () => void
  /** Opens marketplace flow to reserve / pay (peer listings are not in store cart yet). */
  onAddToCart?: (listingId: string) => void
}) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState(`Hi, is the ${listing.title.split('—')[0].trim()} still available?`)
  const [messageSent, setMessageSent] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const viewerCenter = useMemo(() => viewerCenterForPeerListings(), [])
  const distanceEta = formatPeerListingDistanceEta(viewerCenter, listing)
  const compareWas = peerListingCompareAtIfDiscounted(listing)
  const priceStr = formatAud(listing.priceCents ?? 0)
  const img = listing.images?.[0]?.url

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 320)
  }, [onClose])

  const handleSendMessage = useCallback(() => {
    if (!message.trim()) return
    setMessageSent(true)
    setTimeout(() => setMessageSent(false), 2500)
    setMessage('')
  }, [message])

  const sellerName = listing.profileDisplayName ?? 'Seller'
  const conditionLabel =
    listing.condition === 'good' ? 'Used — Good'
    : listing.condition === 'fair' ? 'Used — Fair'
    : listing.condition === 'like_new' ? 'Used — Like new'
    : listing.condition === 'new' ? 'New'
    : `Used — ${listing.condition.charAt(0).toUpperCase()}${listing.condition.slice(1)}`
  const listedAgo = '2 days ago'
  const demoViews = 148

  const offerAmounts = useMemo(() => {
    const base = listing.priceCents ?? 0
    return [
      Math.round(base * 0.7),
      Math.round(base * 0.8),
      Math.round(base * 0.9),
      base,
    ]
  }, [listing.priceCents])

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex flex-col items-center justify-end"
      onClick={dismiss}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        className={`relative z-[1] mx-auto flex h-[95dvh] max-h-[95dvh] min-h-0 w-full max-w-[min(100%,430px)] flex-col transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${visible ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fetch-sheet-surface flex h-full min-h-0 flex-col rounded-t-[1.75rem] border-t border-violet-200/50 bg-white text-[#1c1528] shadow-[0_-8px_40px_rgba(76,29,149,0.08)]">
          {/* Handle */}
          <div className="flex shrink-0 justify-center pt-3 pb-1">
            <div className="h-[5px] w-10 rounded-full bg-zinc-200" />
          </div>

          {/* Fixed image with exit & save */}
          <div className="relative mx-4 shrink-0 overflow-hidden rounded-2xl bg-zinc-100" style={{ aspectRatio: '4/3' }}>
            {img ? (
              <img
                src={listingImageAbsoluteUrl(img)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-400 text-sm">No photo</div>
            )}
            {/* Exit */}
            <button
              type="button"
              onClick={dismiss}
              className="absolute left-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-transform active:scale-90"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
            {/* Save */}
            <button
              type="button"
              onClick={() => setSaved((s) => !s)}
              className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-transform active:scale-90"
              aria-label={saved ? 'Unsave' : 'Save'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? '#FACC15' : 'none'} stroke={saved ? '#FACC15' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            </button>
            {/* Image count badge */}
            <div className="absolute bottom-2.5 right-2.5 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
              1 / {listing.images?.length ?? 1}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {/* Scrollable content */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 [-webkit-overflow-scrolling:touch]">
            {/* Price & title */}
            <div className="px-5 pt-4">
              <div className="flex items-baseline gap-2">
                {compareWas != null ? (
                  <>
                    <span className="text-[1.5rem] font-extrabold tracking-[-0.03em] text-zinc-900">
                      {priceStr}
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums text-zinc-500 line-through">
                      {formatAud(compareWas)}
                    </span>
                    <span className="ml-1 rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                      {Math.round(((compareWas - (listing.priceCents ?? 0)) / compareWas) * 100)}% off
                    </span>
                  </>
                ) : (
                  <span className="text-[1.5rem] font-extrabold tracking-[-0.03em] text-zinc-900">
                    {priceStr}
                  </span>
                )}
              </div>
              <h3 className="mt-1 text-[15px] font-bold leading-snug text-zinc-900">
                {listing.title}
              </h3>
            </div>

            {/* Offer options */}
            {offerOpen ? (
              <div className="mt-2 px-5 animate-[fetch-for-you-fadein_0.25s_ease_both]">
                <div className="flex gap-2">
                  {offerAmounts.map((cents, i) => (
                    <button
                      key={i}
                      type="button"
                      className={[
                        'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2.5 text-center transition-transform active:scale-95',
                        i === offerAmounts.length - 1
                          ? 'bg-zinc-800 ring-1 ring-zinc-700/80'
                          : 'bg-[#00ff6a] ring-1 ring-[#00ff6a]',
                      ].join(' ')}
                    >
                      <span className="text-[13px] font-extrabold tabular-nums text-zinc-900">{formatAud(cents)}</span>
                      <span className="text-[9px] font-medium text-zinc-500">
                        {i === offerAmounts.length - 1 ? 'Full price' : `${Math.round((cents / (listing.priceCents ?? 1)) * 100)}%`}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-2 w-full rounded-xl bg-[#00ff6a] py-3 text-[13px] font-bold text-black transition-transform active:scale-[0.98]"
                >
                  Send offer
                </button>
              </div>
            ) : null}

            {/* Message seller */}
            <div className="mt-4 px-5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage() }}
                  placeholder={`Message ${sellerName}…`}
                  className="min-w-0 flex-1 rounded-xl bg-zinc-50 px-3.5 py-3 text-[13px] font-medium text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-500 focus:ring-[#00ff6a]/50"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#00ff6a] text-black transition-all active:scale-95 disabled:opacity-40"
                  aria-label="Send message"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
              {messageSent ? (
                <p className="mt-2 text-[12px] font-semibold text-[#00ff6a]">
                  Message sent to {sellerName}
                </p>
              ) : null}
            </div>

            {/* Details — Seller first */}
            <div className="mt-4 border-t border-zinc-200 px-5 pt-4">
              <h4 className="text-[13px] font-bold text-zinc-900">Details</h4>
              <div className="mt-3 flex flex-col gap-3">
                {/* Seller row */}
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg ring-1 ring-zinc-200">
                    {listing.profileAvatar ?? '👤'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-zinc-900">{sellerName}</p>
                    <div className="flex items-center gap-1">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="#FACC15" aria-hidden>
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span className="text-[11px] font-bold text-zinc-200">4.9</span>
                      <span className="text-[11px] text-zinc-400">· 23 reviews · {listing.locationLabel ?? 'Brisbane'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-[#00ff6a] bg-[#00ff6a] px-3.5 py-1.5 text-[11px] font-bold text-black shadow-sm transition-transform active:scale-95"
                  >
                    Follow
                  </button>
                </div>

                {/* Condition */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-50 ring-1 ring-zinc-100">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-zinc-400">Condition</p>
                    <p className="text-[13px] font-semibold text-zinc-800">{conditionLabel}</p>
                  </div>
                </div>

                {/* Category */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-50 ring-1 ring-zinc-100">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-zinc-400">Category</p>
                    <p className="text-[13px] font-semibold capitalize text-zinc-800">{listing.category}</p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-50 ring-1 ring-zinc-100">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0-6 0" /><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-zinc-400">Pickup / delivery from</p>
                    <p className="text-[13px] font-semibold text-zinc-800">{listing.locationLabel ?? 'Brisbane'} · {distanceEta}</p>
                  </div>
                </div>

                {/* Listed */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-50 ring-1 ring-zinc-100">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-zinc-400">Listed</p>
                    <p className="text-[13px] font-semibold text-zinc-800">{listedAgo} · {demoViews} views</p>
                  </div>
                </div>

                {/* SKU */}
                {listing.sku ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-50 ring-1 ring-zinc-100">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 7h.01M7 12h.01M7 17h.01M12 7h5M12 12h5M12 17h5" /></svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-zinc-400">SKU</p>
                      <p className="text-[13px] font-semibold text-zinc-800">{listing.sku}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Delivery & pickup */}
            <div className="mt-4 border-t border-zinc-200 px-5 pt-4">
              <h4 className="text-[13px] font-bold text-zinc-900">Delivery &amp; pickup</h4>
              <div className="mt-3 flex flex-col gap-2">
                {listing.sameDayDelivery ? (
                  <div className="flex items-center gap-2.5 rounded-xl bg-amber-50/70 px-3 py-2.5 ring-1 ring-amber-200/50">
                    <BoltNavIcon className="h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-[12px] font-bold text-amber-800">Same-day Fetch delivery</p>
                      <p className="text-[11px] text-amber-600/80">Order before 2 pm for delivery today</p>
                    </div>
                  </div>
                ) : null}
                {listing.fetchDelivery ? (
                  <div className="flex items-center gap-2.5 rounded-xl bg-zinc-50 px-3 py-2.5 ring-1 ring-zinc-200">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-zinc-500"><rect x="1" y="3" width="15" height="13" rx="2" /><path d="m16 8 5 3-5 3z" /></svg>
                    <div>
                      <p className="text-[12px] font-bold text-zinc-900">Next-day delivery</p>
                      <p className="text-[11px] text-zinc-500">Fetched and delivered by tomorrow</p>
                    </div>
                  </div>
                ) : null}
                <div className="flex items-center gap-2.5 rounded-xl bg-zinc-50 px-3 py-2.5 ring-1 ring-zinc-200">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-zinc-500"><path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0-6 0" /><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z" /></svg>
                  <div>
                    <p className="text-[12px] font-bold text-zinc-900">Free pickup</p>
                    <p className="text-[11px] text-zinc-500">Collect from seller · {distanceEta}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Buyer protection */}
            <div className="mt-4 border-t border-zinc-200 px-5 pt-4">
              <h4 className="text-[13px] font-bold text-zinc-900">Buyer protection</h4>
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-start gap-2.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  <div>
                    <p className="text-[12px] font-bold text-zinc-900">Secure checkout</p>
                    <p className="text-[11px] text-zinc-500">Payment held until you confirm delivery</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
                  <div>
                    <p className="text-[12px] font-bold text-zinc-900">Money-back guarantee</p>
                    <p className="text-[11px] text-zinc-500">Full refund if item not as described</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  <div>
                    <p className="text-[12px] font-bold text-zinc-900">Verified sellers</p>
                    <p className="text-[11px] text-zinc-500">ID checked · ratings are public</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {listing.description ? (
              <div className="mt-4 border-t border-zinc-200 px-5 pt-4">
                <h4 className="text-[13px] font-bold text-zinc-900">Description</h4>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-700">
                  {listing.description}
                </p>
              </div>
            ) : null}

            {/* Keywords */}
            {listing.keywords ? (
              <div className="mt-3 flex flex-wrap gap-1.5 px-5">
                {listing.keywords.split(',').map((kw, i) => (
                  <span key={i} className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-700 ring-1 ring-zinc-200">
                    {kw.trim()}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="h-4" />
            </div>

            {/* Sticky CTAs */}
            <div className="shrink-0 border-t border-violet-200/50 bg-white px-5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-3 shadow-[0_-4px_16px_-4px_rgba(76,29,149,0.06)]">
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onAddToCart?.(listing.id)
                    dismiss()
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#00ff6a] py-3.5 text-[14px] font-bold text-black transition-transform active:scale-[0.98]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black" aria-hidden>
                    <path d="M6 6h15l-1.5 9H8.5L6 6zM6 6L5 3H2" />
                    <circle cx="10" cy="19.5" r="1.35" fill="currentColor" />
                    <circle cx="17" cy="19.5" r="1.35" fill="currentColor" />
                  </svg>
                  Add to cart
                </button>
                <button
                  type="button"
                  onClick={() => setOfferOpen((o) => !o)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/[0.06] py-3.5 text-[14px] font-bold text-white transition-transform active:scale-[0.98]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                  Make offer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ─── Category Browse Feed ────────────────────────────────────── */

function CategoryFeedCard({
  listing,
  viewerCenter,
  onTap,
}: {
  listing: PeerListing
  viewerCenter: { lat: number; lng: number }
  onTap: () => void
}) {
  const img = listing.images?.[0]?.url
  const priceStr = formatAud(listing.priceCents ?? 0)
  const distanceEta = formatPeerListingDistanceEta(viewerCenter, listing)

  return (
    <button
      type="button"
      onClick={onTap}
      className="group flex min-w-0 flex-col overflow-hidden rounded-lg bg-white/[0.06] text-left transition-transform active:scale-[0.98]"
    >
      <div className="relative aspect-[5/4] w-full overflow-hidden bg-zinc-100">
        {img ? (
          <img
            src={listingImageAbsoluteUrl(img)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-active:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">
            No photo
          </div>
        )}
        {listing.sameDayDelivery ? (
          <span className="absolute left-2 top-2 flex items-center rounded-full bg-white/90 p-1 text-amber-700 shadow-sm backdrop-blur-sm">
            <BoltNavIcon className="h-3 w-3 text-amber-500" />
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1 p-2.5">
        <div className="flex min-w-0 flex-nowrap items-baseline gap-1.5">
          <span className="shrink-0 text-[14px] font-extrabold tabular-nums text-zinc-50">{priceStr}</span>
          <p className="min-w-0 flex-1 truncate text-[14px] font-extrabold leading-snug tracking-[-0.02em] text-zinc-50">
            {listing.title}
          </p>
        </div>
        <p className="text-[10px] font-medium text-zinc-400">{distanceEta}</p>
      </div>
    </button>
  )
}

export type CategoryBrowseProps = {
  categoryTitle: string
  listings: PeerListing[]
  onClose: () => void
  /** Listing sheet primary CTA — e.g. open marketplace checkout / handoff for this listing. */
  onAddToCart?: (listingId: string) => void
}

export function ExploreCategoryBrowse({
  categoryTitle,
  listings,
  onClose,
  onAddToCart,
}: CategoryBrowseProps) {
  const [showHowItWorks, setShowHowItWorks] = useState(true)
  const [browsing, setBrowsing] = useState(false)
  const [selectedListing, setSelectedListing] = useState<PeerListing | null>(null)
  const [visible, setVisible] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const viewerCenter = useMemo(() => viewerCenterForPeerListings(), [])

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const handleHowItWorksClose = useCallback(() => {
    setShowHowItWorks(false)
    setBrowsing(true)
  }, [])

  const handleHowItWorksContinue = useCallback(() => {
    setShowHowItWorks(false)
    setBrowsing(true)
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 320)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={dismiss}
      />

      {/* Feed panel */}
      <div
        className={`relative z-[1] mx-auto flex h-full w-full max-w-[min(100%,430px)] flex-col bg-[#f8f6fd] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Sticky header */}
        <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-violet-200/40 bg-white px-4 pb-3 pt-[max(0.85rem,env(safe-area-inset-top,0px))]">
          <button
            type="button"
            onClick={dismiss}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-[#4c1d95] transition-colors hover:bg-violet-200 active:scale-[0.98]"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[1rem] font-bold tracking-[-0.02em] text-[#1c1528]">
              {categoryTitle}
            </h1>
            <p className="text-[11px] font-medium text-zinc-500">
              {listings.length} listing{listings.length !== 1 ? 's' : ''} near you
            </p>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-[#4c1d95] transition-colors hover:bg-violet-200 active:scale-[0.98]"
            aria-label="Filter"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </button>
        </header>

        {/* Delivery strip */}
        <div className="flex shrink-0 items-center gap-2 border-b border-violet-200/40 bg-violet-50 px-4 py-2">
          <BoltNavIcon className="h-3.5 w-3.5 shrink-0 text-[#4c1d95]" />
          <p className="text-[11px] font-semibold text-[#4c1d95]">
            Same-day &amp; next-day delivery available on most items
          </p>
        </div>

        {/* Grid */}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f8f6fd] [-webkit-overflow-scrolling:touch] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="grid grid-cols-2 gap-2 px-2 pb-[max(6rem,env(safe-area-inset-bottom,0px)+5rem)] pt-2.5">
            {listings.map((l) => (
              <CategoryFeedCard
                key={l.id}
                listing={l}
                viewerCenter={viewerCenter}
                onTap={() => setSelectedListing(l)}
              />
            ))}
          </div>

          {listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 pt-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <p className="mt-4 text-[14px] font-bold text-zinc-200">
                No listings yet
              </p>
              <p className="mt-1 text-[12px] text-zinc-500">
                Check back soon — new items are added daily.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* How It Works sheet on entry */}
      {showHowItWorks && !browsing ? (
        <HowItWorksSheet
          categoryTitle={categoryTitle}
          onClose={handleHowItWorksClose}
          onContinue={handleHowItWorksContinue}
        />
      ) : null}

      {/* Listing info sheet */}
      {selectedListing ? (
        <ListingInfoSheet
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onAddToCart={onAddToCart}
        />
      ) : null}
    </div>,
    document.body,
  )
}

