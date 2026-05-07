import { Navigate, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FETCH_APP_PATH, FETCH_MARKETPLACE_LIST_PATH, FETCH_SHOP_SETUP_PATH, FETCH_WALLET_ADD_CREDITS_PATH } from '../lib/fetchRoutes'
import { loadSession } from '../lib/fetchUserSession'
import { readShopProfileDraft, readShopSetupComplete, writeShopProfileDraft } from '../lib/shopPageState'
import { readImageFileAsDataUrl, SHOP_AVATAR_MAX_BYTES, SHOP_COVER_MAX_BYTES } from '../lib/shopImagePicker'

/** Dark retail / sneaker display vibe — matches shop profile mock. */
const BANNER_URL =
  'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=1400&q=88&auto=format&fit=crop'

const BRAND_VIOLET = '#7c3aed'

type ListingCard = {
  id: string
  badge: 'Hot' | 'New' | 'Rare'
  badgeClass: string
  title: string
  meta: string
  price: string
  was?: string
  image: string
  views: string
  watch: string
}

const DEMO_LISTINGS: ListingCard[] = [
  {
    id: '1',
    badge: 'Hot',
    badgeClass: 'bg-violet-600 text-white',
    title: 'Jordan 1 Retro High OG',
    meta: 'Size 10.5 • New',
    price: '$310',
    was: '$350',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
    views: '1.2K',
    watch: '23',
  },
  {
    id: '2',
    badge: 'New',
    badgeClass: 'bg-emerald-600 text-white',
    title: 'Yeezy Boost 350 V2',
    meta: 'Size 9 • Used',
    price: '$220',
    was: '$280',
    image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80',
    views: '842',
    watch: '12',
  },
  {
    id: '3',
    badge: 'Rare',
    badgeClass: 'bg-sky-600 text-white',
    title: 'Travis Scott × Fragment',
    meta: 'Size 11 • New',
    price: '$540',
    was: '$620',
    image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80',
    views: '2.1K',
    watch: '41',
  },
  {
    id: '4',
    badge: 'Hot',
    badgeClass: 'bg-violet-600 text-white',
    title: 'Nike Dunk Low Panda',
    meta: 'Size 8 • New',
    price: '$165',
    image: 'https://images.unsplash.com/photo-1595950653106-6c6d7cf01b8b?w=600&q=80',
    views: '956',
    watch: '18',
  },
]

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l7 3.2v5.2c0 4.2-2.9 8.1-7 9.5-4.1-1.4-7-5.3-7-9.5V6.2L12 3z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 7h12v8H3V7zm12 3h2l3 3v2h-1M7 19a2 2 0 104 0M17 19a2 2 0 104 0"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckBadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.4 7.35H22l-6 4.63 2.29 7.02L12 16.89l-6.29 4.11L8 13.98 2 9.35h7.6L12 2z" />
    </svg>
  )
}

function TagFooterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-violet-600" aria-hidden>
      <path
        d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LiveWavesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-violet-600" aria-hidden>
      <path
        d="M12 3v18M8 7v10M4 10v4M16 7v10M20 10v4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-violet-600" aria-hidden>
      <path
        d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  )
}

export function FetchShopPageView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<'listings' | 'lives' | 'sold' | 'reviews'>('listings')
  const [followed, setFollowed] = useState(false)
  const [notifyOn, setNotifyOn] = useState(false)

  const location = useLocation()
  const [shopProfile, setShopProfile] = useState(() => readShopProfileDraft())
  const coverInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setShopProfile(readShopProfileDraft())
  }, [location.pathname, location.key])

  const session = loadSession()?.email?.trim()
  const setupDone = readShopSetupComplete()

  const forceVisitor = searchParams.get('visitor') === '1' || searchParams.get('view') === 'visitor'
  const isVisitor = useMemo(() => !session, [session])

  if (session && !setupDone && !forceVisitor) {
    return <Navigate to={FETCH_SHOP_SETUP_PATH} replace />
  }

  const coverSrc = shopProfile.coverImageUrl ?? BANNER_URL

  const applyShopProfile = (next: ReturnType<typeof readShopProfileDraft>) => {
    writeShopProfileDraft(next)
    setShopProfile(next)
  }

  const onCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const out = await readImageFileAsDataUrl(file, SHOP_COVER_MAX_BYTES)
    if (out === 'too_large') {
      window.alert('Cover photo must be a JPEG, PNG, or WebP under 2.5 MB.')
      return
    }
    applyShopProfile({ ...shopProfile, coverImageUrl: out })
  }

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const out = await readImageFileAsDataUrl(file, SHOP_AVATAR_MAX_BYTES)
    if (out === 'too_large') {
      window.alert('Profile photo must be a JPEG, PNG, or WebP under 1.5 MB.')
      return
    }
    applyShopProfile({ ...shopProfile, avatarImageUrl: out })
  }

  const displayName = shopProfile.name
  const handle = shopProfile.handle
  const tagline = shopProfile.tagline
  const initials =
    displayName
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'SH'

  /** Logged-in owner layout — matches KickVault shop profile mock. */
  if (!isVisitor) {
    return (
      <div className="min-h-dvh bg-white pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] text-zinc-900">
        {/* Banner + nav */}
        <div className="relative">
          <div className="relative h-[13.5rem] w-full overflow-hidden sm:h-60">
            <img src={coverSrc} alt="" className="h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/70" />
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onCoverFile}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="absolute bottom-20 right-3 z-[3] flex items-center gap-1.5 rounded-full border border-white/25 bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md active:bg-black/60 sm:bottom-[5.25rem]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              Edit cover
            </button>
            {shopProfile.coverImageUrl ? (
              <button
                type="button"
                onClick={() => applyShopProfile({ ...shopProfile, coverImageUrl: undefined })}
                className="absolute bottom-20 left-3 z-[3] rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-white/95 backdrop-blur-md active:bg-black/50 sm:bottom-[5.25rem]"
              >
                Reset cover
              </button>
            ) : null}
            {/* Logo / tagline on banner (mock: KICKVAULT + RARE FINDS…) */}
            <div className="absolute inset-x-0 bottom-0 px-5 pb-24 pt-10 sm:pb-28">
              <p
                className="text-center text-[1.65rem] font-black italic leading-none tracking-tight text-white sm:text-[1.85rem]"
                style={{
                  textShadow: '0 0 1px rgba(255,255,255,0.9), 0 2px 12px rgba(0,0,0,0.85), 0 4px 24px rgba(0,0,0,0.5)',
                  WebkitTextStroke: '0.5px rgba(255,255,255,0.35)',
                }}
              >
                {displayName.toUpperCase()}
              </p>
              <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white/95">
                {tagline}
              </p>
            </div>
            <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
              <button
                type="button"
                onClick={() => navigate(FETCH_APP_PATH)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-800 shadow-md ring-1 ring-zinc-200/90 backdrop-blur-md active:bg-zinc-100"
                aria-label="Back"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 6l-6 6 6 6"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-800 shadow-md ring-1 ring-zinc-200/90 backdrop-blur-md active:bg-zinc-100"
                  aria-label="Share"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 3v12M8 7l4-4 4 4M5 21h14"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-800 shadow-md ring-1 ring-zinc-200/90 backdrop-blur-md active:bg-zinc-100"
                  aria-label="More"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="12" r="1.75" />
                    <circle cx="12" cy="12" r="1.75" />
                    <circle cx="19" cy="12" r="1.75" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* White panel overlaps banner — keeps name + handle on white */}
          <div className="relative z-[2] -mt-8 rounded-t-[1.5rem] bg-white px-4 pb-2 pt-10 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.18)] sm:-mt-10 sm:rounded-t-[1.75rem] sm:pt-12">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="relative -mt-[3.25rem] shrink-0 sm:-mt-[3.5rem]">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={onAvatarFile}
                />
                <div
                  className={[
                    'relative flex h-[5.75rem] w-[5.75rem] items-center justify-center overflow-hidden rounded-full border-[5px] border-white shadow-[0_10px_32px_-12px_rgba(0,0,0,0.45)] sm:h-24 sm:w-24',
                    shopProfile.avatarImageUrl
                      ? 'bg-cover bg-center bg-zinc-200'
                      : 'bg-zinc-950 text-[1.4rem] font-black tracking-tight text-white sm:text-[1.5rem]',
                  ].join(' ')}
                  style={
                    shopProfile.avatarImageUrl
                      ? { backgroundImage: `url(${shopProfile.avatarImageUrl})`, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }
                      : { fontFamily: 'ui-sans-serif, system-ui, sans-serif' }
                  }
                >
                  {!shopProfile.avatarImageUrl ? initials : null}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 left-0 z-[2] flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-zinc-900 text-white shadow-md active:bg-zinc-800"
                  aria-label="Edit profile photo"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="13" r="2.8" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </button>
                {shopProfile.avatarImageUrl ? (
                  <button
                    type="button"
                    onClick={() => applyShopProfile({ ...shopProfile, avatarImageUrl: undefined })}
                    className="absolute left-10 top-0 z-[2] rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-600 shadow ring-1 ring-zinc-200"
                  >
                    Reset
                  </button>
                ) : null}
                <span
                  className="absolute bottom-0.5 right-0.5 z-[1] flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-white shadow-md"
                  style={{ background: BRAND_VIOLET }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path
                      d="M9 12l2 2 4-4M12 3l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V7l7-4z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
              <div className="min-w-0 flex-1 pt-1 sm:pt-1.5">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0">
                  <h1 className="min-w-0 max-w-full break-words text-[1.35rem] font-bold leading-tight tracking-tight text-zinc-950 sm:text-[1.45rem]">
                    {displayName}
                  </h1>
                  <span
                    className="flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full shadow-sm"
                    style={{ background: BRAND_VIOLET }}
                    title="Verified"
                    aria-hidden
                  >
                    <svg viewBox="0 0 12 12" className="h-[9px] w-[9px]" fill="none" aria-hidden>
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="#fff"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
                <p className="mt-1 break-words text-[14px] font-medium leading-tight text-zinc-500">@{handle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-4 gap-1.5 px-4 sm:gap-2">
          {[
            { n: '1.2K', l: 'Followers' },
            { n: '178', l: 'Following' },
            { n: '438', l: 'Total Sales' },
            { n: '4.9 (236)', l: 'Shop Rating', star: true as const },
          ].map((cell) => (
            <div
              key={cell.l}
              className="flex min-h-[3.35rem] flex-col items-center justify-center gap-0.5 rounded-2xl bg-zinc-50 px-1 py-2 ring-1 ring-zinc-100"
            >
              <div className="flex items-center justify-center gap-0.5">
                {'star' in cell && cell.star ? (
                  <StarIcon className="h-[13px] w-[13px] shrink-0 text-violet-600" />
                ) : null}
                <p className="text-[13px] font-bold tabular-nums leading-tight text-zinc-900 sm:text-[14px]">{cell.n}</p>
              </div>
              <p className="text-[9px] font-medium leading-tight text-zinc-500 sm:text-[10px]">{cell.l}</p>
            </div>
          ))}
        </div>

        {/* Metadata row */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 px-4 text-center text-[12px] text-zinc-600">
          <span className="inline-flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-zinc-400">
              <path
                d="M12 11.75a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <path
                d="M19.5 10.2c0 5.1-6 10.05-7.16 11.03a.75.75 0 01-.68 0C10.5 20.25 4.5 15.3 4.5 10.2a7.5 7.5 0 1115 0z"
                stroke="currentColor"
                strokeWidth="1.75"
              />
            </svg>
            {shopProfile.locationLabel}
          </span>
          <span className="text-zinc-300">·</span>
          <span className="inline-flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-zinc-400">
              <path
                d="M3 7h18v10H3V7zm9 13l-2-2H5"
                stroke="currentColor"
                strokeWidth="1.65"
                strokeLinecap="round"
              />
            </svg>
            {shopProfile.shipsCopy}
          </span>
          <span className="text-zinc-300">·</span>
          <span className="inline-flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-zinc-400">
              <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.65" />
              <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
            </svg>
            Avg. response time: 1h
          </span>
        </div>

        {/* Primary actions — single row */}
        <div className="mt-5 grid grid-cols-3 gap-2 px-4">
          <button
            type="button"
            className="flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2.5 text-[11px] font-bold leading-tight text-white shadow-md sm:min-h-0 sm:flex-row sm:gap-1.5 sm:px-2 sm:py-3 sm:text-[13px]"
            style={{ background: BRAND_VIOLET, boxShadow: '0 8px 20px -6px rgba(124,58,237,0.45)' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
              <path
                d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span>Go Live</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(FETCH_MARKETPLACE_LIST_PATH)}
            className="flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-2xl bg-zinc-900 px-1 py-2.5 text-[11px] font-bold leading-tight text-white shadow-md sm:min-h-0 sm:flex-row sm:gap-1 sm:px-2 sm:py-3 sm:text-[13px]"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
            </svg>
            <span>Add Listing</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(FETCH_SHOP_SETUP_PATH)}
            className="flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-2xl border border-zinc-200/90 bg-zinc-100 px-1 py-2.5 text-[11px] font-semibold leading-tight text-zinc-900 sm:min-h-0 sm:flex-row sm:gap-1 sm:px-2 sm:py-3 sm:text-[13px]"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0 text-zinc-700">
              <path
                d="M4 20h4l10.5-10.5a2.1 2.1 0 000-3L17 3.5a2.1 2.1 0 00-3 0L3.5 14V20z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
            </svg>
            <span>Edit Shop</span>
          </button>
        </div>

        {/* Store Performance — before trust row in mock */}
        <div className="mt-7 px-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-zinc-900">Store Performance</h2>
            <button
              type="button"
              className="text-[13px] font-semibold"
              style={{ color: BRAND_VIOLET }}
            >
              View analytics &gt;
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3.5">
              <p className="text-[11px] font-medium text-zinc-500">Total Revenue</p>
              <p className="mt-1 text-[1.35rem] font-bold tabular-nums text-zinc-900">$18,420</p>
              <p className="mt-1 text-[12px] font-semibold text-emerald-600">+ 12.4%</p>
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3.5">
              <p className="text-[11px] font-medium text-zinc-500">Available to Payout</p>
              <p className="mt-1 text-[1.35rem] font-bold tabular-nums text-zinc-900">$875</p>
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3.5">
              <p className="text-[11px] font-medium text-zinc-500">Orders Completed</p>
              <p className="mt-1 text-[1.35rem] font-bold tabular-nums text-zinc-900">243</p>
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3.5">
              <p className="text-[11px] font-medium text-zinc-500">Repeat Buyers</p>
              <p className="mt-1 text-[1.35rem] font-bold tabular-nums text-zinc-900">68%</p>
            </div>
          </div>
        </div>

        {/* Trust badges — order + copy from mock */}
        <div className="mt-6 flex gap-2.5 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            {
              icon: <ShieldIcon className="text-violet-600" />,
              t: '98%',
              s: 'Positive Reviews',
            },
            {
              icon: <TruckIcon className="text-violet-600" />,
              t: 'Fast Shipper',
              s: '1–2 day dispatch',
            },
            {
              icon: <CheckBadgeIcon className="text-violet-600" />,
              t: 'Trusted Seller',
              s: 'Verified & trusted',
            },
            {
              icon: <StarIcon className="text-amber-500" />,
              t: '423',
              s: '5 Star Reviews',
            },
          ].map((b, i) => (
            <div
              key={i}
              className="flex min-w-[8.25rem] shrink-0 flex-col rounded-2xl border border-violet-100 bg-violet-50/90 p-3 shadow-sm"
            >
              <span className="mb-1 flex justify-center text-violet-700">{b.icon}</span>
              <span className="text-[11px] font-bold leading-tight text-violet-900">{b.t}</span>
              <span className="mt-1 text-[10px] font-medium leading-snug text-violet-950/75">{b.s}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-7 border-b border-zinc-200 px-4">
          <div className="flex gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(
              [
                ['listings', 'Listings'],
                ['lives', 'Lives'],
                ['sold', 'Sold'],
                ['reviews', 'Reviews'],
              ] as const
            ).map((row) => {
              const id = row[0]
              const label = row[1]
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={[
                    'relative flex shrink-0 items-center gap-1 px-3 py-2.5 text-[14px] font-semibold',
                    tab === id ? 'text-violet-700' : 'text-zinc-500',
                  ].join(' ')}
                >
                  {id === 'lives' ? (
                    <>
                      <span>Lives</span>
                      <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                        (3)
                      </span>
                    </>
                  ) : (
                    label
                  )}
                  {tab === id ? (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-violet-600" />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        {/* Search + filter row (single bar) */}
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/90 px-3 py-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-zinc-400">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.9" />
              <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
            <input
              readOnly
              placeholder="Search your listings…"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-zinc-600 placeholder:text-zinc-400 outline-none"
            />
          </div>
          <button
            type="button"
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-3 text-[12px] font-semibold text-zinc-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-zinc-500">
              <path
                d="M4 6h5M4 12h3M4 18h7M14 6h6M14 12h4M14 18h2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <circle cx="8.5" cy="6" r="2" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="15" cy="12" r="2" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            Filter
          </button>
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
            style={{ background: BRAND_VIOLET }}
            aria-label="Grid view"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="7" height="7" rx="1.5" opacity="0.95" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" opacity="0.95" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" opacity="0.95" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" opacity="0.95" />
            </svg>
          </button>
        </div>

        {tab === 'listings' ? (
          <div className="grid grid-cols-2 gap-2.5 px-4 pb-6">
            {DEMO_LISTINGS.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm ring-1 ring-zinc-100/80"
              >
                <div className="relative aspect-square bg-zinc-100">
                  <img src={item.image} alt="" className="h-full w-full object-cover" />
                  <span
                    className={[
                      'absolute left-2 top-2 rounded-lg px-2 py-0.5 text-[10px] font-bold',
                      item.badgeClass,
                    ].join(' ')}
                  >
                    {item.badge}
                  </span>
                  <button
                    type="button"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-md"
                    aria-label="Favorite"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-rose-500">
                      <path
                        d="M12 21s-6.7-4.35-8.95-10.2C1.63 7.42 4.63 4 8.5 4c2.1 0 3.5 1.2 3.5 1.2S13.4 4 15.5 4 21 7.42 19.45 10.8 12 21 12 21z"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                <div className="p-2.5">
                  <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-zinc-900">{item.title}</h3>
                  <p className="mt-0.5 text-[11px] text-zinc-500">{item.meta}</p>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
                    <span className="text-[15px] font-bold" style={{ color: BRAND_VIOLET }}>
                      {item.price}
                    </span>
                    {item.was ? <span className="text-[12px] text-zinc-400 line-through">{item.was}</span> : null}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] font-medium text-zinc-400">
                    <span className="inline-flex items-center gap-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="opacity-70">
                        <path d="M4 19h16v2H4v-2zm4-4h2v3H8v-3zm3-4h2v7h-2v-7zm3-5h2v12h-2V6zm3 3h2v9h-2V9z" />
                      </svg>
                      {item.views}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="opacity-70">
                        <path
                          d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        />
                        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                      </svg>
                      {item.watch} watching
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-4 py-12 text-center text-[14px] text-zinc-500">Nothing here yet.</div>
        )}

        {/* Footer stats — sticky above bottom nav */}
        <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-[5] mx-auto flex max-w-lg items-stretch justify-around gap-1 border-t border-zinc-200 bg-white/95 px-3 py-2.5 backdrop-blur-md">
          {[
            { n: '189', l1: 'Active', l2: 'Listings', icon: <TagFooterIcon /> },
            { n: '3', l1: 'Live', l2: 'Auctions', icon: <LiveWavesIcon /> },
            { n: '12.4K', l1: 'Shop', l2: 'Views', icon: <EyeIcon /> },
          ].map((row) => (
            <div key={row.l2} className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-center">
              <span className="flex items-center justify-center gap-1">
                {row.icon}
                <span className="text-[13px] font-bold tabular-nums text-zinc-900">{row.n}</span>
              </span>
              <p className="text-[9px] font-semibold uppercase leading-tight tracking-wide text-zinc-500">
                {row.l1} {row.l2}
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  /* --- Visitor / signed-out layout (unchanged pattern) --- */
  return (
    <div className="min-h-dvh bg-white pb-28 text-zinc-900">
      <div className="relative">
        <div className="relative h-44 w-full overflow-hidden sm:h-52">
          <img src={coverSrc} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={() => navigate(FETCH_APP_PATH)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-800 shadow-md ring-1 ring-zinc-200/90 backdrop-blur-md active:bg-zinc-100"
              aria-label="Back"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 6l-6 6 6 6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-800 shadow-md ring-1 ring-zinc-200/90 backdrop-blur-md active:bg-zinc-100"
                aria-label="Share"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3v12M8 7l4-4 4 4M5 21h14"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-800 shadow-md ring-1 ring-zinc-200/90 backdrop-blur-md active:bg-zinc-100"
                aria-label="More"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="1.75" />
                  <circle cx="12" cy="12" r="1.75" />
                  <circle cx="19" cy="12" r="1.75" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="relative z-[2] -mt-8 rounded-t-[1.5rem] bg-white px-4 pb-2 pt-2 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.15)] sm:-mt-10 sm:rounded-t-[1.75rem] sm:pt-3">
          <div className="flex items-start gap-3 sm:gap-3.5">
            <div className="relative -mt-[2.75rem] shrink-0 sm:-mt-[3rem]">
              <div
                className={[
                  'flex h-[5.5rem] w-[5.5rem] items-center justify-center overflow-hidden rounded-full border-4 border-white shadow-lg sm:h-24 sm:w-24',
                  shopProfile.avatarImageUrl ? 'bg-cover bg-center bg-zinc-200' : 'bg-zinc-900 text-[1.35rem] font-black tracking-tight text-white',
                ].join(' ')}
                style={shopProfile.avatarImageUrl ? { backgroundImage: `url(${shopProfile.avatarImageUrl})` } : undefined}
              >
                {!shopProfile.avatarImageUrl ? initials : null}
              </div>
            </div>
            <div className="min-w-0 flex-1 -mt-1.5 pt-0">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0">
                <h1 className="min-w-0 max-w-full break-words text-[1.35rem] font-bold leading-[1.15] tracking-tight text-zinc-900 sm:text-[1.4rem]">
                  {displayName}
                </h1>
              </div>
              <p className="mt-1 break-words text-[14px] font-medium leading-tight text-zinc-500">@{handle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-1.5 px-4 text-center sm:gap-2">
        {[
          ['1.2K', 'Followers'],
          ['178', 'Following'],
          ['438', 'Total Sales'],
          ['4.9 (236)', 'Shop Rating'],
        ].map(([n, l]) => (
          <div
            key={l}
            className="flex min-h-[3.25rem] flex-col items-center justify-center rounded-2xl bg-zinc-50 px-0.5 py-2 ring-1 ring-zinc-100"
          >
            <p className="text-[14px] font-bold tabular-nums leading-tight text-zinc-900 sm:text-[15px]">{n}</p>
            <p className="mt-0.5 text-[9px] font-medium leading-tight text-zinc-500 sm:text-[10px]">{l}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 text-center text-[12px] text-zinc-600">
        <span className="inline-flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-zinc-400">
            <path
              d="M12 11.75a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
              stroke="currentColor"
              strokeWidth="1.75"
            />
            <path
              d="M19.5 10.2c0 5.1-6 10.05-7.16 11.03a.75.75 0 01-.68 0C10.5 20.25 4.5 15.3 4.5 10.2a7.5 7.5 0 1115 0z"
              stroke="currentColor"
              strokeWidth="1.75"
            />
          </svg>
          {shopProfile.locationLabel}
        </span>
        <span className="text-zinc-300">·</span>
        <span className="inline-flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-zinc-400">
            <path
              d="M3 7h18v10H3V7zm9 13l-2-2H5"
              stroke="currentColor"
              strokeWidth="1.65"
              strokeLinecap="round"
            />
          </svg>
          {shopProfile.shipsCopy}
        </span>
      </div>

      <div className="mt-5 px-4">
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setFollowed((f) => !f)}
            className={[
              'flex flex-row items-center justify-center gap-1 rounded-2xl border-2 px-1.5 py-2.5 transition-colors active:scale-[0.98] sm:gap-1.5 sm:px-2',
              followed
                ? 'border-zinc-300 bg-zinc-100 text-zinc-800'
                : 'border-violet-500 bg-violet-600 text-white shadow-md shadow-violet-900/20',
            ].join(' ')}
            aria-label={followed ? 'Unfollow shop' : 'Follow shop'}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="shrink-0"
              aria-hidden
            >
              <path
                d="M12 3v3M5 7h14M6 11c0 6 5 10 6 10s6-4 6-10"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
            <span className="min-w-0 text-[10px] font-black leading-none sm:text-[11px]">
              {followed ? 'Following' : 'Follow'}
            </span>
          </button>

          <button
            type="button"
            className="flex flex-row items-center justify-center gap-1 rounded-2xl border-2 border-zinc-200 bg-white px-1.5 py-2.5 text-zinc-900 shadow-sm active:scale-[0.98] sm:gap-1.5 sm:px-2"
            aria-label="Message seller"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden>
              <path
                d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8.5z"
                stroke="currentColor"
                strokeWidth="1.65"
                strokeLinejoin="round"
              />
            </svg>
            <span className="min-w-0 text-[10px] font-bold leading-none sm:text-[11px]">Message</span>
          </button>

          <button
            type="button"
            onClick={() => setNotifyOn((n) => !n)}
            className={[
              'flex flex-row items-center justify-center gap-1 rounded-2xl border-2 px-1.5 py-2.5 transition-colors active:scale-[0.98] sm:gap-1.5 sm:px-2',
              notifyOn
                ? 'border-violet-400 bg-violet-50 text-violet-900 ring-1 ring-violet-200'
                : 'border-zinc-200 bg-white text-zinc-900 shadow-sm',
            ].join(' ')}
            aria-label={notifyOn ? 'Turn off shop notifications' : 'Get shop notifications'}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className={['shrink-0', notifyOn ? 'text-violet-600' : 'text-zinc-700'].join(' ')}
              aria-hidden
            >
              <path
                d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="min-w-0 text-[10px] font-bold leading-none sm:text-[11px]">
              {notifyOn ? 'Alerts on' : 'Notify'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate(FETCH_WALLET_ADD_CREDITS_PATH)}
            className="flex flex-row items-center justify-center gap-1 rounded-2xl border-2 border-zinc-200 bg-white px-1.5 py-2.5 text-zinc-900 shadow-sm active:scale-[0.98] sm:gap-1.5 sm:px-2"
            aria-label="Send money to seller"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden>
              <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.65" />
              <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M7 9h2M15 15h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="min-w-0 text-[10px] font-bold leading-none sm:text-[11px]">Send</span>
          </button>
        </div>
      </div>

      <div className="mt-6 border-b border-zinc-200 px-4">
        <div className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(
            [
              ['listings', 'Listings'],
              ['lives', 'Lives'],
              ['sold', 'Sold'],
              ['reviews', 'Reviews'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                'relative shrink-0 px-3 py-2.5 text-[14px] font-semibold',
                tab === id ? 'text-violet-700' : 'text-zinc-500',
              ].join(' ')}
            >
              {label}
              {id === 'lives' ? (
                <span className="ml-1 inline-flex min-w-[1.1rem] justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  3
                </span>
              ) : null}
              {tab === id ? (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-violet-600" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3">
        <p className="min-w-0 flex-1 text-[13px] font-semibold text-zinc-700">
          <span className="tabular-nums">189</span> listings
        </p>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white"
          aria-label="Search listings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-zinc-500">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.9" />
            <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-700"
        >
          Filter
        </button>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white"
          aria-label="Grid view"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="3" width="7" height="7" rx="1.5" opacity="0.95" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" opacity="0.95" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" opacity="0.95" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" opacity="0.95" />
          </svg>
        </button>
      </div>

      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-zinc-400">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.9" />
            <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
          <input
            readOnly
            placeholder="Search listings…"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-zinc-500 outline-none"
          />
        </div>
      </div>

      {tab === 'listings' ? (
        <div className="grid grid-cols-2 gap-2.5 px-4 pb-4">
          {DEMO_LISTINGS.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm ring-1 ring-zinc-100/80"
            >
              <div className="relative aspect-square bg-zinc-100">
                <img src={item.image} alt="" className="h-full w-full object-cover" />
                <span
                  className={[
                    'absolute left-2 top-2 rounded-lg px-2 py-0.5 text-[10px] font-bold',
                    item.badgeClass,
                  ].join(' ')}
                >
                  {item.badge}
                </span>
              </div>
              <div className="p-2.5">
                <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-zinc-900">{item.title}</h3>
                <p className="mt-0.5 text-[11px] text-zinc-500">{item.meta}</p>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
                  <span className="text-[15px] font-bold text-violet-600">{item.price}</span>
                  {item.was ? <span className="text-[12px] text-zinc-400 line-through">{item.was}</span> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="px-4 py-12 text-center text-[14px] text-zinc-500">Nothing here yet.</div>
      )}

      <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-[5] mx-auto flex max-w-lg items-center justify-around border-t border-zinc-200 bg-white/95 px-4 py-2.5 backdrop-blur-md">
        {[
          ['189', 'Active'],
          ['3', 'Live'],
          ['12.4K', 'Views'],
        ].map(([n, l]) => (
          <div key={l} className="text-center">
            <p className="text-[13px] font-bold tabular-nums text-zinc-900">{n}</p>
            <p className="text-[10px] font-medium text-zinc-500">{l}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FetchShopPageView
