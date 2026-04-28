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
import { useAuctions, useActivity, useBidwarsUser, useIsTopBidderActive, useOrders } from '../lib/data/store'
import {
  PROFILE_ACHIEVEMENT_CATALOG,
  ensureNewUserWelcomeAchievement,
  isAchievementUnlocked,
  type UnlockedAchievement,
} from '../lib/profileAchievements'

function audFromCents(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0
  return (safe / 100).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

const BRAND = '#4c1d95'
const BRAND_BG = '#faf8ff'

function fmtCompact(n: number): string {
  if (!Number.isFinite(n)) return '0'
  const x = Math.abs(n)
  if (x >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 100_000 === 0 ? 0 : 1)}M`.replace(/\.0$/, '')
  if (x >= 10_000) return `${(n / 1000).toFixed(1)}K`.replace(/\.0$/, '')
  if (x >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`.replace(/\.0$/, '')
  return String(Math.round(n))
}

export type FetchProfilePageProps = {
  onOpenApp: () => void
  onOpenDrops: () => void
  onEditProfile: () => void
  onListItem: () => void
  onEditListing: (listingId: string) => void
  onCashOut: () => void
  onAddCredits: () => void
}

/** Gold hex frame + inner violet face — matches flagship profile mockups. */
function ProfileHexAchievement({
  label,
  unlocked,
}: {
  label: string
  unlocked: boolean
}) {
  return (
    <div className="flex w-[4.85rem] flex-col items-center gap-1.5">
      <div
        className={[
          'relative flex h-[4.85rem] w-[4.2rem] shrink-0 items-center justify-center p-[5px]',
          unlocked
            ? 'drop-shadow-[0_10px_18px_-8px_rgba(76,29,149,0.55)]'
            : 'opacity-75 saturate-[0.45]',
        ].join(' ')}
        style={{
          clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
          background:
            unlocked 
              ? 'linear-gradient(145deg,#facc15,#ca8a04 36%,#a16207 68%,#fbbf24)'
            : 'linear-gradient(145deg,#9ca3af,#6b7280)',
        }}
        aria-hidden
      >
        <div
          className={[
            'flex h-[calc(100%-2px)] w-[calc(100%-2px)] items-center justify-center',
            unlocked
              ? 'bg-[linear-gradient(165deg,#2e1064_8%,#4c1d95_45%,#1e0638_92%)]'
              : 'bg-[linear-gradient(165deg,#3f3f46_12%,#27272a_55%,#18181b_92%)]',
          ].join(' ')}
          style={{
            clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
          }}
        >
          {unlocked ? (
            <svg className="h-[46%] w-[46%] text-[#fcd34d]" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3l8 4v5c0 5-4 10-8 13-4-3-8-8-8-13V7l8-4z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <path d="M9 11.5 L11 14 L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg className="h-[42%] w-[42%] text-zinc-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17 11h-6V5h-2v6H7v2h2v6h2v-6h6v-2z" />
            </svg>
          )}
        </div>
      </div>
      <span
        className={[
          'max-w-[100%] text-center text-[9px] font-bold leading-[1.05] tracking-tight',
          unlocked ? 'text-zinc-900' : 'text-zinc-500',
        ].join(' ')}
      >
        {label}
      </span>
    </div>
  )
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
  const [contentTab, setContentTab] = useState<'won' | 'bids' | 'listings' | 'favorites'>('won')
  const bwUser = useBidwarsUser()
  const orders = useOrders()
  const allAuctions = useAuctions()
  const activity = useActivity()
  const topBidderActive = useIsTopBidderActive()

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
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [achievementUnlocked] = useState<UnlockedAchievement[]>(() =>
    typeof window !== 'undefined' ? ensureNewUserWelcomeAchievement() : [],
  )

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
            'Fetchit',
        )
        setUsername((p.username || '').trim())
        setAvatarUrl(p.avatar_url?.trim() || null)
        setBio((p.bio || '').trim())
        setLocationLabel((p.location_label || '').trim())
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

  const handleShare = useCallback(async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Fetchit profile', url })
      } else {
        await navigator.clipboard.writeText(url)
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url)
      } catch {
        /* ignore */
      }
    }
  }, [])

  /** Auction lookups for orders / favourites / bids */
  const auctionById = useMemo(() => {
    const m = new Map<string, (typeof allAuctions)[0]>()
    for (const a of allAuctions) m.set(a.id, a)
    return m
  }, [allAuctions])

  const watchesById = useMemo(() => {
    const m = new Map<string, (typeof allAuctions)[0]>()
    for (const id of bwUser.watchlist) {
      const a = auctionById.get(id)
      if (a) m.set(id, a)
    }
    return m
  }, [auctionById, bwUser.watchlist])

  const wonTiles = useMemo(() => orders.map((o) => ({ order: o, auction: auctionById.get(o.auctionId) })), [
    auctionById,
    orders,
  ])

  const bidsTiles = useMemo(
    () =>
      activity
        .filter((a) => a.kind === 'bid' || a.kind === 'outbid')
        .map((a) => ({
          act: a,
          auction: a.ref?.kind === 'auction' ? auctionById.get(a.ref.auctionId) : undefined,
        }))
        .filter((row) => row.auction || row.act.body),
    [activity, auctionById],
  )

  const auctionsWonStat = bwUser.battlesWon
  const itemsWonStat = Math.max(
    orders.length,
    activity.filter((a) => a.kind === 'win').length,
  )

  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]" style={{ background: BRAND_BG }}>
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-[#faf8ff]/94 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 pb-3 pt-[max(0.65rem,env(safe-area-inset-top,0px))]">
          <button
            type="button"
            onClick={onOpenApp}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-800 transition-colors active:bg-zinc-200/60"
            aria-label="Back"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleShare}
              className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-800 transition-colors active:bg-zinc-200/60"
              aria-label="Share profile"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M8.59 13.34l6.88-3.97M8.59 10.66l6.88 3.97M19 16a3 3 0 11-6 0 3 3 0 016 0zM5 8a3 3 0 116 0 3 3 0 01-6 0zm0 8a3 3 0 116 0 3 3 0 01-6 0z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={onEditProfile}
              className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-800 transition-colors active:bg-zinc-200/60"
              aria-label="Settings and profile"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
                <path
                  d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852 1 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                  stroke="currentColor"
                  strokeWidth="1.15"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[430px] px-4">
        {/* Identity row — avatar + copy */}
        <section className="flex gap-4 pt-1">
          <div className="relative shrink-0">
            <div
              className="flex h-[5.75rem] w-[5.75rem] items-center justify-center overflow-hidden rounded-full bg-white ring-[3px] ring-white shadow-[0_12px_40px_-12px_rgba(76,29,149,0.45)]"
              style={
                avatarUrl
                  ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: `linear-gradient(145deg,${BRAND},#1e0638)` }
              }
            >
              {!avatarUrl ? <span className="text-[1.35rem] font-black text-white">{initials}</span> : null}
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-[0_4px_12px_rgba(180,83,9,0.45)] ring-2 ring-white"
              aria-hidden
            >
              <svg className="h-3.5 w-3.5 text-amber-950" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2l2.4 7.35H22l-6 4.63 2.29 7.02L12 16.89l-6.29 4.11L8 13.98 2 9.35h7.6L12 2z" />
              </svg>
            </div>
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-1.5">
                  <h1 className="text-[1.2rem] font-black leading-none tracking-tight text-zinc-950">{displayName}</h1>
                  {username ? (
                    <span
                      className="flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full text-white shadow-sm"
                      style={{ background: BRAND }}
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
                  ) : null}
                </div>
                {username ? (
                  <p className="mt-1 truncate text-[13px] font-semibold" style={{ color: BRAND }}>
                    @{username}
                  </p>
                ) : (
                  <p className="mt-1 text-[13px] font-medium text-zinc-500">Set a username in Edit profile</p>
                )}
              </div>
              <button
                type="button"
                onClick={onEditProfile}
                className="shrink-0 rounded-full px-4 py-2 text-[12px] font-black uppercase tracking-wide text-white shadow-[0_6px_20px_-6px_rgba(76,29,149,0.55)] transition active:translate-y-[0.5px] active:scale-[0.98]"
                style={{ background: BRAND }}
              >
                Edit
              </button>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-[5px] text-[11px] font-black text-violet-900 ring-1 ring-violet-200/90">
                <span aria-hidden>💀</span> Level {bwUser.level}
              </span>
              {topBidderActive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-[5px] text-[11px] font-black text-violet-900 ring-1 ring-violet-200/90">
                  <span aria-hidden>⭐</span> Top bidder
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-[5px] text-[11px] font-semibold text-zinc-600 ring-1 ring-zinc-200/90">
                  <span aria-hidden>⭐</span> Explore Bid Wars for badges
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Bio */}
        <p className="mt-4 text-[13px] leading-relaxed text-zinc-700">
          {bio ||
            'Live auctions. Real deals. Good vibes only. Tap Edit to personalize your vibe.'}
        </p>

        {/* Stats */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-white/95 bg-white shadow-[0_16px_40px_-28px_rgba(76,29,149,0.35)] ring-1 ring-violet-100/80">
          <div className="grid grid-cols-4 divide-x divide-zinc-100 py-4">
            {[
              {
                label: 'Auctions won',
                value: fmtCompact(auctionsWonStat),
                icon: (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 8h14l-1 12H6L5 8z" stroke={BRAND} strokeWidth="1.7" strokeLinejoin="round" />
                    <path d="M9 8V5a3 3 0 013-3h0a3 3 0 013 3v3" stroke={BRAND} strokeWidth="1.7" />
                  </svg>
                ),
              },
              {
                label: 'Items won',
                value: fmtCompact(itemsWonStat),
                icon: (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M4 6h16v4H4V6zm0 6h7v10H4V12zm9 0h7v4h-7v-4zm0 6h7v4h-7v-4z"
                      stroke={BRAND}
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
              {
                label: 'Followers',
                value: fmtCompact(followers),
                icon: (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M12 21s-6-4.35-6-10a6 6 0 1112 0c0 5.65-6 10-6 10z"
                      stroke={BRAND}
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="11" r="2" fill={BRAND} />
                  </svg>
                ),
              },
              {
                label: 'Following',
                value: fmtCompact(following),
                icon: (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="9" cy="8" r="3" stroke={BRAND} strokeWidth="1.6" />
                    <path
                      d="M3 21v-1c0-2.76 4-4 9-4s9 2.24 9 4v1"
                      stroke={BRAND}
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                ),
              },
            ].map((col) => (
              <div key={col.label} className="flex flex-col items-center px-1 text-center">
                <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f3ff]/90">
                  {col.icon}
                </span>
                <span className="text-[17px] font-black tabular-nums leading-none text-zinc-950">{col.value}</span>
                <span className="mt-1 px-1 text-[9px] font-bold uppercase leading-tight tracking-wide text-zinc-400">
                  {col.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Seller payouts — compact */}
        <section className="mt-4 rounded-2xl border border-white/95 bg-white p-4 shadow-[0_10px_32px_-24px_rgba(0,0,0,0.18)] ring-1 ring-zinc-100/85">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Earnings · after fees</p>
              <p className="mt-1.5 font-mono text-[2rem] font-black leading-none tabular-nums tracking-tighter text-zinc-900">
                {audFromCents(earnedNetCents)}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Today <span className="font-semibold text-zinc-800">{audFromCents(todayNetCents)}</span>
                <span className="mx-1 text-zinc-300">·</span>
                Credits{' '}
                <span className="font-semibold text-zinc-800">{audFromCents(creditsCents)}</span>
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCashOut}
              className="rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-[12px] font-black text-zinc-900 transition active:scale-[0.98]"
            >
              Cash out
            </button>
            <button
              type="button"
              onClick={onAddCredits}
              className="rounded-xl py-3 text-[12px] font-black text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.12)] transition active:scale-[0.98]"
              style={{ background: BRAND }}
            >
              Add credits
            </button>
          </div>
          <button
            type="button"
            onClick={onOpenDrops}
            className="mt-3 w-full rounded-xl py-3 text-[12px] font-bold text-[#059669] ring-1 ring-emerald-200/85 transition hover:bg-emerald-50 active:scale-[0.99]"
          >
            Drops creator @{dropProfile?.displayName ?? '…'} — open dashboard
          </button>
          {locationLabel ? (
            <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                  fill="currentColor"
                  fillOpacity="0.45"
                />
                <circle cx="12" cy="9" r="2.5" fill="white" />
              </svg>
              {locationLabel}
            </p>
          ) : null}
        </section>

        {/* Achievements */}
        <section id="profile-achievements" className="mt-8">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-[13px] font-black uppercase tracking-[0.06em] text-zinc-700">Achievements</h2>
            <button type="button" className="text-[12px] font-black uppercase tracking-wide" style={{ color: BRAND }}>
              View all
            </button>
          </div>
          <div className="-mx-1 flex gap-4 overflow-x-auto pb-1 pt-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PROFILE_ACHIEVEMENT_CATALOG.map((def) => {
              const filled =
                def.locked === true
                  ? false
                  : isAchievementUnlocked(achievementUnlocked, def.id)

              return (
                <ProfileHexAchievement key={def.id} label={def.label} unlocked={filled} />
              )
            })}
          </div>
        </section>

        {/* Content tabs */}
        <div className="mt-8 border-b border-zinc-200/90">
          <div className="-mb-px flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
            {(
              [
                { id: 'won' as const, label: 'Won' },
                { id: 'bids' as const, label: 'Bids' },
                { id: 'listings' as const, label: 'Listings' },
                { id: 'favorites' as const, label: 'Favorites' },
              ] as const
            ).map((t) => {
              const sel = contentTab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={sel}
                  onClick={() => setContentTab(t.id)}
                  className={[
                    'relative shrink-0 border-0 bg-transparent pb-3 pt-1 text-[13px] font-black tracking-tight',
                    sel ? 'text-[#4c1d95]' : 'text-[#1c1340] hover:text-[#4c1d95]',
                  ].join(' ')}
                  style={
                    sel
                      ? {
                          borderBottomWidth: 3,
                          borderBottomStyle: 'solid',
                          borderBottomColor: BRAND,
                          marginBottom: -2,
                          paddingBottom: 10,
                        }
                      : undefined
                  }
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="pb-10 pt-4">
          {contentTab === 'won' ? (
            <ul className="grid grid-cols-2 gap-3">
              {wonTiles.map(({ order, auction }) => {
                const img = auction?.imageUrls?.[0]
                return (
                  <li key={order.id}>
                    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100">
                      <div className="relative aspect-square bg-zinc-100">
                        {img ? (
                          <img src={img} alt="" className="h-full w-full object-cover" draggable={false} loading="lazy" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">No photo</div>
                        )}
                        <span
                          className="absolute bottom-2 left-2 flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md ring-2 ring-white/90"
                          style={{ background: BRAND }}
                          aria-hidden
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M5 8h14l-1 12H6L5 8z"
                              stroke="#fff"
                              strokeWidth="1.6"
                              strokeLinejoin="round"
                            />
                            <path d="M9 8V5a3 3 0 016 0v3" stroke="#fff" strokeWidth="1.6" />
                          </svg>
                        </span>
                      </div>
                      <p className="line-clamp-2 px-2.5 py-2 text-[11px] font-bold leading-tight text-zinc-900">
                        {auction?.title ?? order.id}
                      </p>
                    </div>
                  </li>
                )
              })}
              {wonTiles.length === 0 ? (
                <li className="col-span-2 rounded-2xl border border-dashed border-zinc-200 bg-white/80 px-4 py-8 text-center text-[13px] font-medium text-zinc-500">
                  No auction wins yet — jump into Bid Wars from the Explore tab.
                </li>
              ) : null}
            </ul>
          ) : null}

          {contentTab === 'bids' ? (
            <ul className="flex flex-col gap-2">
              {bidsTiles.map(({ act, auction }) => (
                <li
                  key={act.id}
                  className="flex gap-3 rounded-2xl border border-white/95 bg-white p-3 shadow-sm ring-1 ring-zinc-100/95"
                >
                  {auction?.imageUrls?.[0] ? (
                    <img
                      src={auction.imageUrls[0]}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-xl bg-zinc-100" aria-hidden />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold leading-tight text-zinc-900">{act.title}</p>
                    <p className="mt-1 line-clamp-2 text-[12px] text-zinc-500">{act.body}</p>
                  </div>
                </li>
              ))}
              {bidsTiles.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-[13px] text-zinc-500">
                  No recent bids logged.
                </p>
              ) : null}
            </ul>
          ) : null}

          {contentTab === 'listings' ? (
            <>
              <button
                type="button"
                onClick={onListItem}
                className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-white py-4 text-[14px] font-black text-zinc-800 transition-colors active:bg-zinc-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                List an item
              </button>

              {loadError ? (
                <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[12px] text-amber-800">
                  {loadError}
                </p>
              ) : null}

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-[#4c1d95]" />
                </div>
              ) : listings.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-zinc-100 bg-white px-5 py-10 text-center">
                  <p className="font-bold text-zinc-800">No listings yet</p>
                  <p className="mt-1 max-w-[16rem] text-[12px] text-zinc-500">
                    Showcase products to buyers across Fetch marketplace.
                  </p>
                  <button
                    type="button"
                    onClick={onListItem}
                    className="mt-5 rounded-xl px-6 py-3 text-[13px] font-black text-white"
                    style={{ background: BRAND }}
                  >
                    Create your first listing
                  </button>
                </div>
              ) : (
                <ul className="grid grid-cols-2 gap-3">
                  {listings.map((l) => {
                    const img = l.images?.[0]?.url
                    const thumb = img ? listingImageAbsoluteUrl(img) : ''
                    const price = audFromCents(l.priceCents)
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => setListingSheet(l)}
                          className="group flex w-full flex-col overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-zinc-100 transition-transform active:scale-[0.98]"
                        >
                          <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-active:scale-[1.03]"
                                draggable={false}
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[11px] text-zinc-400">
                                No photo
                              </div>
                            )}
                            <div className="pointer-events-none absolute right-2 top-2 z-[1] rounded-full bg-white/90 px-2 py-[3px] text-[9px] font-black uppercase tracking-wide text-zinc-700 shadow-sm backdrop-blur-sm">
                              {l.status || 'draft'}
                            </div>
                          </div>
                          <div className="px-2.5 pb-2.5 pt-2">
                            <p className="line-clamp-2 text-[12px] font-bold leading-snug text-zinc-800">{l.title}</p>
                            <p className="mt-1 text-[14px] font-black text-zinc-900">{price}</p>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          ) : null}

          {contentTab === 'favorites' ? (
            <ul className="grid grid-cols-2 gap-3">
              {[...watchesById.values()].map((auction) => {
                const img = auction.imageUrls[0]
                return (
                  <li key={auction.id}>
                    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100">
                      <div className="relative aspect-square bg-zinc-100">
                        {img ? (
                          <img src={img} alt="" className="h-full w-full object-cover" draggable={false} loading="lazy" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">No photo</div>
                        )}
                      </div>
                      <p className="line-clamp-2 px-2 py-2 text-[11px] font-bold text-zinc-900">{auction.title}</p>
                    </div>
                  </li>
                )
              })}
              {bwUser.watchlist.length === 0 ? (
                <li className="col-span-2 rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-[13px] text-zinc-500">
                  Save auctions from Bid Wars — they&apos;ll show up here.
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>

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
            <p className="mt-1 text-[1.25rem] font-extrabold text-zinc-900">{audFromCents(listingSheet.priceCents)}</p>
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
                className="w-full rounded-xl py-3.5 text-[14px] font-black text-white shadow-sm transition-transform active:scale-[0.98]"
                style={{ background: BRAND }}
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
