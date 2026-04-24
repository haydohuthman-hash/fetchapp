import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { loadSession } from '../lib/fetchUserSession'
import { getMySupabaseProfile } from '../lib/supabase/profiles'
import {
  ensureDropProfileForSession,
  getMyDropProfile,
  type DropCreatorProfile,
} from '../lib/drops/profileStore'
import {
  fetchMyListings,
  fetchSellerEarnings,
  listingImageAbsoluteUrl,
  type PeerListing,
} from '../lib/listingsApi'

function audFromCents(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0
  return (safe / 100).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

const BRAND_RED = '#00ff6a'

export type FetchProfilePageProps = {
  onOpenApp: () => void
  onOpenDrops: () => void
  onEditProfile: () => void
  onListItem: () => void
  onEditListing: (listingId: string) => void
  onCashOut: () => void
  onAddCredits: () => void
}

export default function FetchProfilePage({
  onOpenApp,
  onOpenDrops,
  onEditProfile,
  onListItem,
  onEditListing,
  onCashOut,
  onAddCredits,
}: FetchProfilePageProps) {
  const location = useLocation()
  const [mainTab, setMainTab] = useState<'drops' | 'listings'>('listings')
  const [dropProfile, setDropProfile] = useState<DropCreatorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [listings, setListings] = useState<PeerListing[]>([])
  const [earnedNetCents, setEarnedNetCents] = useState(0)
  const [todayNetCents, setTodayNetCents] = useState(0)
  const [creditsCents, setCreditsCents] = useState(0)
  const [listingSheet, setListingSheet] = useState<PeerListing | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [locationLabel, setLocationLabel] = useState('')
  const [rating, setRating] = useState(5)
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      ensureDropProfileForSession()
      const drop = getMyDropProfile()
      const dayStart = new Date()
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date()
      dayEnd.setHours(23, 59, 59, 999)
      const fromMs = dayStart.getTime()
      const toMs = dayEnd.getTime()

      const [p, mine, earnAll, earnToday] = await Promise.all([
        getMySupabaseProfile().catch((e) => {
          console.error('[FetchProfilePage] getMySupabaseProfile failed', e)
          return null
        }),
        fetchMyListings().catch((e) => {
          console.error('[FetchProfilePage] fetchMyListings failed', e)
          setLoadError('Could not load your listings. Pull to refresh or try again.')
          return [] as PeerListing[]
        }),
        fetchSellerEarnings().catch((e) => {
          console.warn('[FetchProfilePage] fetchSellerEarnings (all) failed', e)
          return null
        }),
        fetchSellerEarnings({ from: fromMs, to: toMs }).catch((e) => {
          console.warn('[FetchProfilePage] fetchSellerEarnings (today) failed', e)
          return null
        }),
      ])
      if (p) {
        setDisplayName(
          (p.full_name || '').trim() ||
            loadSession()?.displayName ||
            drop?.displayName ||
            'Seller',
        )
        setUsername((p.username || '').trim())
        setAvatarUrl(p.avatar_url?.trim() || null)
        setBio((p.bio || '').trim())
        setLocationLabel((p.location_label || '').trim())
        setRating(typeof p.seller_rating === 'number' && p.seller_rating > 0 ? p.seller_rating : 5)
        setFollowers(typeof p.followers_count === 'number' ? p.followers_count : 0)
        setFollowing(typeof p.following_count === 'number' ? p.following_count : 0)
        setCreditsCents(typeof p.credits_balance_cents === 'number' ? p.credits_balance_cents : 0)
      }
      mine.sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt))
      setListings(mine)
      setDropProfile(getMyDropProfile())
      setEarnedNetCents(earnAll?.summary?.netCents ?? 0)
      setTodayNetCents(earnToday?.summary?.netCents ?? 0)
    } catch (e) {
      console.error('[FetchProfilePage] reload failed', e)
      setLoadError('Something went wrong loading your profile.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload, location.key])

  const initials = useMemo(() => {
    const s = displayName || username || '?'
    return s
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }, [displayName, username])

  const ratingLabel = useMemo(() => {
    const r = Math.round(rating * 10) / 10
    return r.toFixed(1)
  }, [rating])

  return (
    <div className="min-h-dvh bg-white pb-28">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-zinc-100 bg-white/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
          <button
            type="button"
            onClick={onOpenApp}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 transition-colors active:bg-zinc-100"
            aria-label="Home"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-[14px] font-bold tracking-tight text-zinc-900">Profile</span>
          <button
            type="button"
            onClick={onEditProfile}
            className="text-[13px] font-bold"
            style={{ color: BRAND_RED }}
          >
            Edit
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[430px]">
        {/* ── Identity / Hero ────────────────────────── */}
        <div className="flex flex-col items-center px-6 pt-8">
          <div
            className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-zinc-100 ring-[3px] ring-white shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
            style={
              avatarUrl
                ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : undefined
            }
          >
            {!avatarUrl ? (
              <span className="text-[1.75rem] font-bold text-zinc-400">{initials}</span>
            ) : null}
          </div>

          <h1 className="mt-4 text-[1.5rem] font-extrabold tracking-tight text-zinc-900">{displayName}</h1>
          {username ? (
            <p className="mt-0.5 text-[13px] font-medium text-zinc-500">@{username}</p>
          ) : null}
          {locationLabel ? (
            <p className="mt-0.5 flex items-center gap-1 text-[12px] text-zinc-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor" fillOpacity="0.5" />
                <circle cx="12" cy="9" r="2.5" fill="white" />
              </svg>
              {locationLabel}
            </p>
          ) : null}

          {/* Stats row */}
          <div className="mt-4 flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#FACC15" />
              </svg>
              <span className="text-[13px] font-bold text-zinc-900">{ratingLabel}</span>
            </div>
            <div className="h-4 w-px bg-zinc-200" />
            <div className="text-center">
              <span className="text-[14px] font-bold text-zinc-900">{followers}</span>
              <span className="ml-1 text-[11px] text-zinc-500">followers</span>
            </div>
            <div className="h-4 w-px bg-zinc-200" />
            <div className="text-center">
              <span className="text-[14px] font-bold text-zinc-900">{following}</span>
              <span className="ml-1 text-[11px] text-zinc-500">following</span>
            </div>
          </div>

          {bio ? (
            <p className="mt-4 max-w-sm text-center text-[13px] leading-relaxed text-zinc-600">{bio}</p>
          ) : (
            <button
              type="button"
              onClick={onEditProfile}
              className="mt-4 text-[12px] font-medium text-zinc-400 underline decoration-zinc-300 underline-offset-2"
            >
              Add a bio
            </button>
          )}
        </div>

        {/* ── Earnings Card ──────────────────────────── */}
        <div className="px-4 pt-6">
          <section className="overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-violet-200/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Earnings</p>
                <p className="mt-1 text-[2.5rem] font-extrabold leading-none tracking-tight text-white">
                  {audFromCents(earnedNetCents)}
                </p>
                <p className="mt-2 text-[12px] text-zinc-500">
                  After fees
                  <span className="mx-1.5 text-zinc-700">·</span>
                  Today <span className="font-semibold text-white">{audFromCents(todayNetCents)}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 pt-1">
                <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold text-violet-600">
                  Credits: <span className="text-white">{audFromCents(creditsCents)}</span>
                </span>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onCashOut}
                className="rounded-xl bg-white py-3 text-[13px] font-bold text-zinc-900 shadow-sm transition-transform active:scale-[0.98]"
              >
                Cash out
              </button>
              <button
                type="button"
                onClick={onAddCredits}
                className="rounded-xl border border-violet-200/60 bg-[#4c1d95] py-3 text-[13px] font-bold text-white transition-transform active:scale-[0.98]"
              >
                Add credits
              </button>
            </div>
          </section>
        </div>

        {/* ── Tab Switcher ───────────────────────────── */}
        <div className="px-4 pt-6">
          <div
            className="flex rounded-xl bg-zinc-100 p-1"
            role="tablist"
            aria-label="Profile sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === 'drops'}
              onClick={() => setMainTab('drops')}
              className={[
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-semibold transition-all',
                mainTab === 'drops'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500',
              ].join(' ')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="5" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
                <path d="M10 9.5v5l4-2.5-4-2.5z" fill="currentColor" />
              </svg>
              Drops
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === 'listings'}
              onClick={() => setMainTab('listings')}
              className={[
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-semibold transition-all',
                mainTab === 'listings'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500',
              ].join(' ')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              Listings
            </button>
          </div>
        </div>

        {/* ── Tab Content ────────────────────────────── */}
        <div className="px-4 pt-4 pb-8">
          {mainTab === 'drops' ? (
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Creator handle</p>
              <p className="mt-2 text-[1.35rem] font-extrabold tracking-tight text-zinc-900">
                @{dropProfile?.displayName ?? '—'}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">
                How viewers see you on Reels and Drops.
              </p>
              <button
                type="button"
                onClick={onOpenDrops}
                className="mt-5 w-full rounded-xl py-3.5 text-[14px] font-bold text-white shadow-sm transition-transform active:scale-[0.98]"
                style={{ background: BRAND_RED }}
              >
                Open Drops
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onListItem}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 py-4 text-[14px] font-bold text-zinc-700 transition-colors active:bg-zinc-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                List an item
              </button>

              <div className="mt-5 flex items-end justify-between">
                <h2 className="text-[15px] font-bold text-zinc-900">Your listings</h2>
                <span className="text-[12px] font-medium text-zinc-400">{listings.length} total</span>
              </div>

              {loadError ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[12px] text-amber-800">
                  {loadError}
                </p>
              ) : null}

              {loading ? (
                <div className="mt-8 flex justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600" />
                </div>
              ) : listings.length === 0 ? (
                <div className="mt-5 flex flex-col items-center rounded-2xl border border-zinc-100 bg-zinc-50/70 px-5 py-10 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke="#a1a1aa" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-bold text-zinc-700">No listings yet</p>
                  <p className="mt-1 max-w-[16rem] text-[12px] text-zinc-500">
                    Showcase products to buyers across Fetch marketplace.
                  </p>
                  <button
                    type="button"
                    onClick={onListItem}
                    className="mt-5 rounded-xl px-6 py-3 text-[13px] font-bold text-white shadow-sm"
                    style={{ background: BRAND_RED }}
                  >
                    Create your first listing
                  </button>
                </div>
              ) : (
                <ul className="mt-4 grid grid-cols-2 gap-3">
                  {listings.map((l) => {
                    const img = l.images?.[0]?.url
                    const thumb = img ? listingImageAbsoluteUrl(img) : ''
                    const price = audFromCents(l.priceCents)
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => setListingSheet(l)}
                          className="group flex w-full flex-col overflow-hidden rounded-[1.15rem] bg-white text-left shadow-[0_1px_4px_rgba(0,0,0,0.06)] ring-1 ring-zinc-100 transition-transform active:scale-[0.98]"
                        >
                          <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-active:scale-[1.03]"
                                draggable={false}
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[11px] text-zinc-400">
                                No photo
                              </div>
                            )}
                            <div className="pointer-events-none absolute right-2 top-2 z-[1] rounded-full bg-white/90 px-2 py-[3px] text-[9px] font-bold uppercase tracking-wide text-zinc-600 shadow-sm backdrop-blur-sm">
                              {l.status || 'draft'}
                            </div>
                          </div>
                          <div className="px-2.5 pb-2.5 pt-2">
                            <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-zinc-800">{l.title}</p>
                            <p className="mt-1 text-[14px] font-bold text-zinc-900">{price}</p>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Listing Detail Sheet ─────────────────────── */}
      {listingSheet ? (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-[#1c1528]/35 backdrop-blur-[2px]"
            aria-label="Close listing"
            onClick={() => setListingSheet(null)}
          />
          <div className="relative z-[1] max-h-[min(85dvh,32rem)] overflow-y-auto rounded-t-[1.5rem] border border-b-0 border-zinc-200 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_-8px_40px_rgba(0,0,0,0.12)]">
            <div className="mx-auto mb-4 h-[4px] w-10 rounded-full bg-zinc-200" aria-hidden />
            {(() => {
              const img = listingSheet.images?.[0]?.url
              const thumb = img ? listingImageAbsoluteUrl(img) : ''
              return thumb ? (
                <div className="mb-4 aspect-[16/10] w-full overflow-hidden rounded-2xl bg-zinc-100">
                  <img src={thumb} alt="" className="h-full w-full object-cover" draggable={false} />
                </div>
              ) : (
                <div className="mb-4 flex aspect-[16/10] w-full items-center justify-center rounded-2xl bg-zinc-100 text-[12px] text-zinc-400">
                  No photo
                </div>
              )
            })()}
            <h3 className="text-[1.15rem] font-bold leading-snug text-zinc-900">{listingSheet.title}</h3>
            <p className="mt-1 text-[1.25rem] font-extrabold text-zinc-900">
              {audFromCents(listingSheet.priceCents)}
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              {listingSheet.status || 'draft'}
              {listingSheet.locationLabel ? ` · ${listingSheet.locationLabel}` : ''}
            </p>
            {listingSheet.description ? (
              <p className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-zinc-600">
                {listingSheet.description}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const id = listingSheet.id
                  setListingSheet(null)
                  onEditListing(id)
                }}
                className="w-full rounded-xl py-3.5 text-[14px] font-bold text-white shadow-sm transition-transform active:scale-[0.98]"
                style={{ background: BRAND_RED }}
              >
                Edit listing
              </button>
              <button
                type="button"
                onClick={() => setListingSheet(null)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-[14px] font-semibold text-zinc-700 transition-transform active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
