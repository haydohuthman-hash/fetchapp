import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { loadSession } from '../lib/fetchUserSession'
import {
  addBackpackItem,
  awardFirstAdventureXp,
  FIRST_ADVENTURE_MAP_ITEM,
  FIRST_ADVENTURE_XP_REWARD,
  hasClaimedFirstAdventureGift,
  loadAdventureProgress,
  loadBackpackItems,
  markFirstAdventureGiftClaimed,
  type AdventureProgress,
  type BackpackItem,
} from '../lib/fetchAdventureRewards'
import { FetchFirstAdventureGiftCard } from './FetchFirstAdventureGiftCard'
import {
  isPublicDemoListingId,
  listingImageAbsoluteUrl,
  peerListingCompareAtIfDiscounted,
  type PeerListing,
} from '../lib/listingsApi'
import { MARKETPLACE_MOCK_PEER_LISTINGS } from '../lib/marketplaceMockPeerListings'
import { SUPPLY_PRODUCTS, type SupplyProduct } from '../lib/suppliesCatalog'
import { type MarketplacePeerBrowseFilter } from './ExploreBrowseBanner'
import { MyFetchRewardsBanner } from './MyFetchRewardsBanner'
import { ListingQuickAddPlusCircleIcon } from './icons/HomeShellNavIcons'
import { ExploreCategoryBrowse } from './ExploreCategoryBrowse'
import { LiveNowGrid } from './FeedTabViews'
import fetchitAdventuringBannerUrl from '../assets/fetchit-adventuring-banner.png'
import fetchitFundedHighBannerUrl from '../assets/fetchit-funded-high-banner.png'
import fetchitFundedLowBannerUrl from '../assets/fetchit-funded-low-banner.png'
import fetchitFundedMidBannerUrl from '../assets/fetchit-funded-mid-banner.png'
import fetchitFundedWhaleBannerUrl from '../assets/fetchit-funded-whale-banner.png'
import fetchitNoFundsBannerUrl from '../assets/fetchit-no-funds-banner.png'
import fetchitBackpack3dUrl from '../assets/fetchit-backpack-3d.png'
import fetchitBackpackLevel1To4Url from '../assets/fetchit-backpack-level-1-4.png'
import fetchitBidWarsBannerUrl from '../assets/fetchit-bid-wars-banner.png'
import searchRealSneakersShoesUrl from '../assets/search-categories-real/sneakers-shoes.png'
import searchRealTradingCardGamesUrl from '../assets/search-categories-real/trading-card-games.png'
import searchRealJewelleryWatchesUrl from '../assets/search-categories-real/jewellery-watches.png'
import searchRealToysHobbiesUrl from '../assets/search-categories-real/toys-hobbies.png'
import searchRealElectronicsUrl from '../assets/search-categories-real/electronics.png'
import { ambientRegisterAdventure } from '../lib/audio/fetchAmbientMusic'
import { playConfettiPops, playWinFanfare } from '../lib/fetchBattleSounds'

function hashSessionSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 33 + seed.charCodeAt(i)) >>> 0
  return h
}

function formatBackInClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const EARLY_ADVENTURE_END_COST_CENTS = 99

function backpackImageForLevel(level: number): string {
  return level >= 1 && level <= 4 ? fetchitBackpackLevel1To4Url : fetchitBackpack3dUrl
}

function firstNameFromDisplay(name: string): string {
  const t = name.trim().split(/\s+/)[0] ?? ''
  return t.length > 0 ? t : 'there'
}

function FetchitWelcomeHero({
  displayName,
  isAdventuring,
  adventureLevel,
  fundsCents,
  fundsLabel,
  gemsCount,
  notificationsCount,
  onAddDemoFunds,
  onViewBackpack,
}: {
  displayName: string
  isAdventuring: boolean
  adventureLevel: number
  fundsCents: number
  fundsLabel: string
  gemsCount: number
  notificationsCount: number
  onAddDemoFunds: () => void
  onViewBackpack: () => void
}) {
  const firstName = firstNameFromDisplay(displayName).toUpperCase()
  const bannerUrl = isAdventuring
    ? fetchitAdventuringBannerUrl
    : fundsCents <= 0
      ? fetchitNoFundsBannerUrl
      : fundsCents <= 10000
        ? fetchitFundedLowBannerUrl
        : fundsCents <= 30000
          ? fetchitFundedMidBannerUrl
          : fundsCents <= 50000
            ? fetchitFundedHighBannerUrl
            : fetchitFundedWhaleBannerUrl
  const welcomeNameSize =
    firstName.length > 12
      ? 'text-[18px] sm:text-[20px]'
      : firstName.length > 8
        ? 'text-[21px] sm:text-[23px]'
        : 'text-[24px] sm:text-[26px]'
  const backpackImageUrl = backpackImageForLevel(adventureLevel)
  return (
    <section className="relative w-full" aria-label="Welcome and backpack">
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-gradient-to-b from-[#cdb7ff] via-[#a78bfa] to-[#7c3aed] shadow-[0_22px_48px_-22px_rgba(76,29,149,0.6)]">
        <img
          src={bannerUrl}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center"
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_115%_85%_at_0%_100%,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.4)_42%,transparent_72%)]"
          aria-hidden
        />
        <div className="absolute left-3 top-3 z-[4] flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-[#1c1340] shadow-[0_10px_24px_-16px_rgba(30,15,80,0.55)] ring-1 ring-white sm:left-4 sm:top-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#7c3aed] text-[11px] font-black text-white">
            {adventureLevel}
          </span>
          <span className="text-[11px] font-black uppercase tracking-[0.08em]">
            Level {adventureLevel}
          </span>
        </div>
        <div className="absolute right-3 top-3 z-[4] flex items-center gap-2 sm:right-4 sm:top-4">
          <button
            type="button"
            onClick={onAddDemoFunds}
            className="fetch-apple-warp-btn flex h-9 items-center gap-1.5 rounded-lg border-b-[3px] border-violet-200 bg-gradient-to-b from-white to-violet-50 px-2 text-[#7c3aed] shadow-[0_10px_18px_-12px_rgba(30,15,80,0.6)] ring-1 ring-white transition-transform active:translate-y-0.5 active:border-b"
            aria-label={`Add demo funds, current balance ${fundsLabel}`}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
              <path
                d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5v-9Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path d="M16 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M7 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-[11px] font-black tabular-nums text-[#1c1340]">{fundsLabel}</span>
            <span className="flex h-4 w-4 items-center justify-center rounded-md bg-[#7c3aed] text-white">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
          </button>
          <button
            type="button"
            className="fetch-apple-warp-btn flex h-9 items-center gap-1.5 rounded-lg border-b-[3px] border-violet-200 bg-gradient-to-b from-white to-violet-50 px-2 text-[#7c3aed] shadow-[0_10px_18px_-12px_rgba(30,15,80,0.6)] ring-1 ring-white transition-transform active:translate-y-0.5 active:border-b"
            aria-label={`${gemsCount} gems`}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
              <path
                d="M7 4h10l4 5-9 11L3 9l4-5Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path d="M3 9h18M8 4l4 16 4-16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <span className="text-[11px] font-black tabular-nums text-[#1c1340]">{gemsCount}</span>
          </button>
          <button
            type="button"
            className="fetch-apple-warp-btn flex h-9 items-center gap-1.5 rounded-lg border-b-[3px] border-violet-200 bg-gradient-to-b from-white to-violet-50 px-2 text-[#7c3aed] shadow-[0_10px_18px_-12px_rgba(30,15,80,0.6)] ring-1 ring-white transition-transform active:translate-y-0.5 active:border-b"
            aria-label={`${notificationsCount} notifications`}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
              <path
                d="M18 10a6 6 0 1 0-12 0c0 7-2.5 7-2.5 8h17S18 17 18 10Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path d="M9.5 20a2.8 2.8 0 0 0 5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-[11px] font-black tabular-nums text-[#1c1340]">{notificationsCount}</span>
          </button>
        </div>
        <div className="pointer-events-none absolute bottom-[11%] left-3 z-[3] max-w-[min(100%,16rem)] text-left sm:bottom-[10%] sm:left-4">
          <p className="text-[11px] font-bold leading-none text-white">
            Welcome back,
          </p>
          <h2
            className={[
              'mt-1 truncate font-black leading-[0.95] tracking-[-0.02em] text-white',
              welcomeNameSize,
            ].join(' ')}
          >
            {firstName}!
          </h2>
          <p className="mt-1 text-[11px] font-semibold leading-snug text-white">
            Ready to bid. Win. Fetch it.
          </p>
        </div>
        <button
          type="button"
          onClick={onViewBackpack}
          data-fetch-backpack-target
          className="fetch-apple-warp-btn absolute right-2.5 top-[24%] z-[2] flex w-[34%] max-w-[9.5rem] flex-col items-center gap-1.5 rounded-2xl bg-white p-2 text-[#1c1340] shadow-[0_12px_28px_-14px_rgba(30,15,80,0.55)] ring-1 ring-violet-200/60 transition-transform active:scale-[0.98] sm:right-3 sm:top-[28%]"
          aria-label="View backpack"
        >
          <img
            src={backpackImageUrl}
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none block h-[6.75rem] w-[6.75rem] shrink-0 select-none object-contain"
          />
          <span className="flex w-full items-center justify-center gap-1 rounded-full bg-[#7c3aed] px-1.5 py-1 text-[10px] font-black uppercase tracking-[0.05em] text-white shadow-[0_6px_16px_-8px_rgba(76,29,149,0.7)]">
            View Backpack
          </span>
        </button>
      </div>
    </section>
  )
}

function AdventureReturnBar({
  canEndEarly,
  onEndEarly,
  onComplete,
}: {
  canEndEarly: boolean
  onEndEarly: () => void
  onComplete: () => void
}) {
  const session = loadSession()
  const seed = useMemo(
    () => hashSessionSeed(`${session?.email || 'guest'}|${session?.displayName || ''}`),
    [session?.email, session?.displayName],
  )
  const totalSeconds = 12 * 60 * 60
  const [remainingSeconds, setRemainingSeconds] = useState(
    () => 30 * 60 + (seed % (10 * 60 * 60)),
  )

  useEffect(() => {
    setRemainingSeconds(30 * 60 + (seed % (10 * 60 * 60)))
  }, [seed])

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemainingSeconds((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (remainingSeconds === 0) onComplete()
  }, [remainingSeconds, onComplete])

  const progress = Math.max(0, Math.min(1, 1 - remainingSeconds / totalSeconds))
  const backIn = formatBackInClock(remainingSeconds)

  return (
    <section className="-mx-0.5 px-0.5" aria-label={`Adventure in progress. Back in ${backIn}.`}>
      <div className="overflow-visible rounded-3xl bg-white p-2.5 shadow-[0_12px_28px_-18px_rgba(76,29,149,0.45)] ring-1 ring-violet-200/70">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center text-[#7c3aed]">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3.75a8.25 8.25 0 1 0 0 16.5 8.25 8.25 0 0 0 0-16.5Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="-12 12 12; 12 12 12; -12 12 12"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
                <path
                  d="m15.25 8.75-1.7 4.8-4.8 1.7 1.7-4.8 4.8-1.7Z"
                  fill="currentColor"
                />
              </g>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-[14px] font-black leading-none tracking-[-0.01em] text-[#1c1340]">
                Adventuring
              </p>
              <p className="shrink-0 text-[11px] font-bold leading-none text-zinc-500">
                Back in <span className="font-black tabular-nums text-[#7c3aed]">{backIn}</span>
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-violet-100" aria-hidden>
              <div
                className="h-full rounded-full bg-[#7c3aed] transition-[width] duration-500 ease-out"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onEndEarly}
            disabled={!canEndEarly}
            className={[
              'fetch-apple-warp-btn shrink-0 rounded-2xl border-b-[4px] px-3 py-1.5 text-center text-[10px] font-black uppercase leading-none tracking-[0.06em] text-white shadow-[0_12px_18px_-10px_rgba(28,19,64,0.75)] transition-transform active:translate-y-0.5 active:border-b-2',
              canEndEarly
                ? 'border-[#090514] bg-gradient-to-b from-[#33225f] to-[#1c1340]'
                : 'cursor-not-allowed border-zinc-300 bg-gradient-to-b from-zinc-300 to-zinc-400 text-white/80 shadow-none',
            ].join(' ')}
            aria-label={canEndEarly ? 'End adventure early for 99 cents' : 'Add funds to end adventure early'}
          >
            <span className="block">End</span>
            <span className="mt-0.5 block text-[9px] opacity-85">$0.99</span>
          </button>
        </div>
      </div>
    </section>
  )
}

function StartAdventureBar({ onStart }: { onStart: () => void }) {
  return (
    <section className="-mx-0.5 px-0.5" aria-label="Start adventure">
      <div className="overflow-visible rounded-3xl bg-white p-2.5 shadow-[0_12px_28px_-18px_rgba(76,29,149,0.45)] ring-1 ring-violet-200/70">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center text-[#7c3aed]">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3.75a8.25 8.25 0 1 0 0 16.5 8.25 8.25 0 0 0 0-16.5Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="m15.25 8.75-1.7 4.8-4.8 1.7 1.7-4.8 4.8-1.7Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-black leading-none tracking-[-0.01em] text-[#1c1340]">
              Ready to adventure?
            </p>
            <p className="mt-1 text-[11px] font-bold leading-none text-zinc-500">
              Send Fetch out and start the timer.
            </p>
          </div>
          <button
            type="button"
            onClick={onStart}
            className="fetch-apple-warp-btn shrink-0 rounded-2xl border-b-[4px] border-[#4c1d95] bg-gradient-to-b from-[#9f67ff] to-[#7c3aed] px-3 py-2 text-[11px] font-black uppercase tracking-[0.06em] text-white shadow-[0_14px_20px_-10px_rgba(76,29,149,0.85)] transition-transform active:translate-y-0.5 active:border-b-2"
            aria-label="Start adventure"
          >
            Start
          </button>
        </div>
      </div>
    </section>
  )
}

function AdventureLevelUpCelebration({
  open,
  level,
  xpAwarded,
  onDone,
}: {
  open: boolean
  level: number
  xpAwarded: number
  onDone: () => void
}) {
  useEffect(() => {
    if (!open) return undefined
    playConfettiPops()
    const cheerId = window.setTimeout(() => playWinFanfare(), 180)
    const closeId = window.setTimeout(onDone, 2600)
    return () => {
      window.clearTimeout(cheerId)
      window.clearTimeout(closeId)
    }
  }, [open, onDone])

  if (!open) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9998] flex items-center justify-center px-6"
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-[#1c1340]/18 backdrop-blur-[2px]" aria-hidden />
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="fetch-level-confetti absolute block h-3 w-1.5 rounded-full"
            style={{
              left: `${(i * 37) % 100}%`,
              top: '-8%',
              backgroundColor: ['#7c3aed', '#f59e0b', '#10b981', '#f43f5e'][i % 4],
              animationDelay: `${(i % 8) * 0.08}s`,
            }}
          />
        ))}
      </div>
      <div className="relative z-[1] w-full max-w-[21rem] rounded-[2rem] bg-white p-5 text-center shadow-[0_30px_70px_-24px_rgba(28,19,64,0.7)] ring-1 ring-violet-200">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-[#a78bfa] to-[#7c3aed] text-white shadow-[0_18px_36px_-18px_rgba(124,58,237,0.8)]">
          <span className="text-[34px] font-black leading-none">{level}</span>
        </div>
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.24em] text-violet-500">
          Level up!
        </p>
        <h3 className="mt-1 text-[24px] font-black tracking-[-0.06em] text-[#1c1340]">
          You reached Level {level}
        </h3>
        <p className="mt-2 text-[13px] font-bold text-zinc-500">
          First adventure bonus unlocked.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-[13px] font-black text-amber-800 ring-1 ring-amber-200">
          +{xpAwarded} XP
          <span aria-hidden>·</span>
          Cheer!
        </div>
      </div>
      <style>{`
        @keyframes fetch-level-confetti-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translateY(115vh) rotate(420deg); opacity: 0; }
        }
        .fetch-level-confetti {
          animation: fetch-level-confetti-fall 1.9s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
      `}</style>
    </div>
  )
}

function BidWarsAdventurePromo({ onJoin }: { onJoin?: () => void }) {
  return (
    <section className="px-2" aria-label="Bid Wars">
      <div className="flex items-center gap-2.5 rounded-3xl bg-white p-2.5">
        <button
          type="button"
          onClick={onJoin}
          className="fetch-apple-warp-btn relative flex h-[2.85rem] min-w-[9.5rem] shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-2xl border border-white/12 bg-gradient-to-b from-[#4a2f8f] via-[#2d1b55] to-[#151028] px-4 text-center text-[13px] font-black uppercase leading-none tracking-[0.04em] text-white shadow-[0_12px_32px_-14px_rgba(21,16,40,0.92),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-black/25 transition-[transform,box-shadow] active:scale-[0.98] sm:h-[3rem] sm:min-w-[10.25rem] sm:text-[14px]"
          aria-label="Join a Bid War"
        >
          <span className="fetch-bid-war-btn-sheen" aria-hidden>
            <span className="fetch-bid-war-btn-sheen__bar" />
          </span>
          <span className="relative z-[1]">Join a Bid War</span>
        </button>
        <div className="min-w-0 flex-1 overflow-hidden rounded-2xl bg-white">
          <img
            src={fetchitBidWarsBannerUrl}
            alt="Bid Wars. Compete. Bid. Win."
            className="block aspect-[2/1] w-full select-none object-cover object-left"
            draggable={false}
          />
        </div>
      </div>
    </section>
  )
}

function BackpackStoragePage({
  open,
  onClose,
  items = [],
  progress,
}: {
  open: boolean
  onClose: () => void
  items?: BackpackItem[]
  progress: AdventureProgress
}) {
  if (!open) return null

  const storedItems = [
    { label: 'Funds pouch', value: '$0 demo', tone: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
    { label: 'Gem pocket', value: '0 gems', tone: 'bg-violet-100 text-violet-800 ring-violet-200' },
    { label: 'Drop passes', value: '3 saved', tone: 'bg-amber-100 text-amber-800 ring-amber-200' },
    { label: 'Bid boosts', value: '2 ready', tone: 'bg-sky-100 text-sky-800 ring-sky-200' },
  ]
  const mapItem = items.find((item) => item.kind === 'map')
  const backpackImageUrl = backpackImageForLevel(progress.level)

  return (
    <div
      className="fixed inset-0 z-[90] flex justify-center bg-[#13091f]/70 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Backpack storage"
    >
      <div className="relative flex h-dvh min-h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[#f7f1ff] text-[#1c1340]">
        <div className="relative overflow-hidden bg-white px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top,0px)+0.75rem)] text-[#1c1340] ring-1 ring-violet-100">
          <div className="relative z-[1] flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c3aed]">Fetch storage</p>
              <h2 className="mt-1 text-[2rem] font-black leading-none tracking-[-0.06em]">Backpack</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="fetch-apple-warp-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-[#4c1d95] ring-1 ring-violet-100 transition-transform active:scale-95"
              aria-label="Close backpack storage"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="relative z-[1] mt-5 flex items-end gap-4">
            <div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-[2rem] bg-violet-50 ring-1 ring-violet-100">
              <img
                src={backpackImageUrl}
                alt=""
                aria-hidden
                draggable={false}
                className="h-32 w-32 select-none object-contain"
              />
              <span className="absolute -right-1 bottom-4 rounded-lg bg-[#1c1340] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white">
                Lv {progress.level}
              </span>
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="rounded-2xl bg-violet-50 p-3 ring-1 ring-violet-100">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] font-black uppercase tracking-[0.12em] text-violet-500">XP</p>
                  <p className="text-[12px] font-black tabular-nums">{progress.xp} / 100</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-violet-100" aria-hidden>
                  <div
                    className="h-full rounded-full bg-[#7c3aed]"
                    style={{ width: `${Math.min(100, progress.xp)}%` }}
                  />
                </div>
              </div>
              <p className="mt-3 text-[12px] font-semibold leading-snug text-zinc-500">
                Your wins, boosts, passes, and funds live here.
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px)+1rem)] pt-4">
          {mapItem ? (
            <section
              className="mb-3 flex items-center gap-3 rounded-3xl bg-white p-3 shadow-[0_14px_30px_-24px_rgba(76,29,149,0.45)] ring-1 ring-violet-100"
              aria-label="Explorer map"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                <BackpackMapIcon className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-500">
                  Map card
                </p>
                <p className="truncate text-[14px] font-black leading-tight text-[#1c1340]">
                  {mapItem.title}
                </p>
                {mapItem.subtitle ? (
                  <p className="truncate text-[11px] font-semibold text-zinc-500">
                    {mapItem.subtitle}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-800 ring-1 ring-amber-200">
                Owned
              </span>
            </section>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            {storedItems.map((item) => (
              <div key={item.label} className="rounded-3xl bg-white p-3 shadow-[0_14px_30px_-24px_rgba(76,29,149,0.45)] ring-1 ring-violet-100">
                <div className={['inline-flex rounded-xl px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ring-1', item.tone].join(' ')}>
                  Stored
                </div>
                <p className="mt-3 text-[13px] font-black leading-tight tracking-[-0.02em] text-[#1c1340]">
                  {item.label}
                </p>
                <p className="mt-1 text-[12px] font-bold text-zinc-500">{item.value}</p>
              </div>
            ))}
          </div>

          <section className="mt-4 rounded-[2rem] bg-white p-4 shadow-[0_18px_38px_-28px_rgba(76,29,149,0.55)] ring-1 ring-violet-100" aria-label="Backpack vault">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-500">Vault pocket</p>
                <h3 className="mt-1 text-[18px] font-black tracking-[-0.04em] text-[#1c1340]">Ready for your next run</h3>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-[#7c3aed]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 9V7a6 6 0 0 1 12 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <rect x="4" y="9" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 14v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {['Cards', 'Boosts', 'Receipts'].map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className="fetch-apple-warp-btn rounded-2xl bg-violet-50 px-2 py-3 text-center text-[11px] font-black text-[#4c1d95] ring-1 ring-violet-100 transition-transform active:scale-[0.97]"
                >
                  {slot}
                </button>
              ))}
            </div>
          </section>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="fetch-apple-warp-btn rounded-3xl border-b-[5px] border-[#4c1d95] bg-gradient-to-b from-[#9f67ff] to-[#7c3aed] px-4 py-3 text-[12px] font-black uppercase tracking-[0.08em] text-white shadow-[0_18px_26px_-14px_rgba(76,29,149,0.8)] transition-transform active:translate-y-0.5 active:border-b-2"
            >
              Add item
            </button>
            <button
              type="button"
              className="fetch-apple-warp-btn rounded-3xl border-b-[5px] border-[#090514] bg-gradient-to-b from-[#33225f] to-[#1c1340] px-4 py-3 text-[12px] font-black uppercase tracking-[0.08em] text-white shadow-[0_18px_26px_-14px_rgba(28,19,64,0.78)] transition-transform active:translate-y-0.5 active:border-b-2"
            >
              Upgrade
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function BackpackMapIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 4v13.5M15 6.5V20" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M11.5 11.5l1.2-2.4 2.4-1.2-2.4-1.2-1.2-2.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0 2)"
      />
    </svg>
  )
}

const HOME_CATEGORY_CHIPS = [
  { id: 'all', label: 'All', icon: 'grid', image: undefined },
  { id: 'sneakers', label: 'Sneakers', icon: 'sneaker', image: searchRealSneakersShoesUrl },
  { id: 'cards', label: 'Trading Cards', icon: 'cards', image: searchRealTradingCardGamesUrl },
  { id: 'luxury', label: 'Luxury', icon: 'bag', image: searchRealJewelleryWatchesUrl },
  { id: 'collectibles', label: 'Collectibles', icon: 'bear', image: searchRealToysHobbiesUrl },
  { id: 'tech', label: 'Tech', icon: 'tech', image: searchRealElectronicsUrl },
  { id: 'watches', label: 'Watches', icon: 'watch', image: searchRealJewelleryWatchesUrl },
] as const
type HomeCategoryChipId = (typeof HOME_CATEGORY_CHIPS)[number]['id']

function CategoryChipIcon({ id, className = '' }: { id: string; className?: string }) {
  const stroke = 'currentColor'
  switch (id) {
    case 'grid':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1.6" stroke={stroke} strokeWidth="2" />
          <rect x="14" y="3" width="7" height="7" rx="1.6" stroke={stroke} strokeWidth="2" />
          <rect x="3" y="14" width="7" height="7" rx="1.6" stroke={stroke} strokeWidth="2" />
          <rect x="14" y="14" width="7" height="7" rx="1.6" stroke={stroke} strokeWidth="2" />
        </svg>
      )
    case 'sneaker':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M3 17l1-4 4-1 3-3 4 1 5 3 1 3-1 2H4z"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M8 12l2 2M11 9l3 3" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'cards':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="5" y="3" width="11" height="15" rx="2" stroke={stroke} strokeWidth="2" />
          <rect x="8" y="6" width="11" height="15" rx="2" stroke={stroke} strokeWidth="2" />
        </svg>
      )
    case 'bag':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 8h14l-1 12H6L5 8z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 8a3 3 0 116 0" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'bear':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="7" cy="6" r="2.2" stroke={stroke} strokeWidth="2" />
          <circle cx="17" cy="6" r="2.2" stroke={stroke} strokeWidth="2" />
          <circle cx="12" cy="13" r="6" stroke={stroke} strokeWidth="2" />
          <circle cx="10" cy="12" r=".9" fill={stroke} />
          <circle cx="14" cy="12" r=".9" fill={stroke} />
          <path d="M10 16c.6.6 1.3.9 2 .9s1.4-.3 2-.9" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'tech':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 5h11l3 3v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M16 5v3h3" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M7 11h6M7 14h8M7 17h5" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'watch':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="6" y="6" width="12" height="12" rx="3" stroke={stroke} strokeWidth="2" />
          <path d="M9 6V3h6v3M9 18v3h6v-3" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 10v3l2 1" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    default:
      return null
  }
}

function HomeCategoryChips({
  value,
  onChange,
}: {
  value: HomeCategoryChipId
  onChange: (next: HomeCategoryChipId) => void
}) {
  return (
    <nav
      className="-mx-0.5 px-0.5"
      role="tablist"
      aria-label="Browse by category"
    >
      <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        {HOME_CATEGORY_CHIPS.map((c) => {
          const active = c.id === value
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(c.id)}
              className={[
                'fetch-apple-warp-btn flex min-w-[5rem] shrink-0 flex-col items-center gap-1 rounded-2xl border px-2.5 py-1.5 transition-[background-color,border-color,color]',
                active
                  ? 'border-violet-300/80 bg-violet-100 text-[#4c1d95]'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:text-[#4c1d95]',
              ].join(' ')}
            >
              {c.image ? (
                <img
                  src={c.image}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="h-9 w-9 rounded-xl object-cover ring-1 ring-zinc-200/80"
                />
              ) : (
                <CategoryChipIcon id={c.icon} className="h-9 w-9" />
              )}
              <span className="text-[10px] font-bold leading-none">{c.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export type HomeShellForYouFeedProps = {
  onOpenDrops: () => void
  onOpenMarketplace: () => void
  /** Explore premium tabs: open main shell Search (categories / search UI). */
  onOpenSearch?: () => void
  /** Explore: open marketplace peer grid with category / price filters. */
  onOpenMarketplaceBrowse?: (filter: MarketplacePeerBrowseFilter) => void
  /** Opens marketplace with listing sheet for this peer listing id. */
  onOpenPeerListing: (listingId: string) => void
  /** When set, listing tiles show quick buy (opens marketplace + checkout). */
  onQuickBuyPeerListing?: (listingId: string) => void
  /** Hero CTA opens backpack / cart (embedded explore home). */
  onViewBackpack?: () => void
  /** Opens the Bid Wars hub from the adventure promo. */
  onJoinBidWar?: () => void
  className?: string
  /** Omit top title block when a parent supplies the headline (e.g. Explore). */
  embedded?: boolean
  /** Horizontal bleed for furniture promo inside scroll (`page` = cancel scroll `pr-0.5`; `tight` = landing `px-0.5`). */
  explorePromoBleed?: 'page' | 'tight'
}

function formatAudFromCents(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatAud(n: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(n)
}

function ExplorePeerListingCard({
  l,
  onOpenPeerListing,
  onQuickBuyPeerListing,
}: {
  l: PeerListing
  onOpenPeerListing: (listingId: string) => void
  onQuickBuyPeerListing?: (listingId: string) => void
}) {
  const img = l.images?.[0]?.url
  const compareWas = peerListingCompareAtIfDiscounted(l)
  const priceStr = formatAudFromCents(l.priceCents ?? 0)
  const fulfillment = peerListingFulfillmentLabel(l)
  const fetchFromPrice = formatAudFromCents((l.priceCents ?? 0) + peerListingDeliveryFeeCents(l))
  const label =
    compareWas != null
      ? `${l.title}, was ${formatAudFromCents(compareWas)}, now ${priceStr}, ${fulfillment}, or fetch it from ${fetchFromPrice}`
      : `${l.title}, ${priceStr}, ${fulfillment}, or fetch it from ${fetchFromPrice}`
  const sessionEmail = loadSession()?.email?.trim() ?? ''
  const sellerEm = l.sellerEmail?.trim().toLowerCase() ?? ''
  const viewerEm = sessionEmail.toLowerCase()
  const isViewerSeller = Boolean(sellerEm && viewerEm && sellerEm === viewerEm)
  const showQuickAdd = Boolean(onQuickBuyPeerListing) && !isViewerSeller
  const isDemo = isPublicDemoListingId(l.id)
  const canQuickAdd = Boolean(sessionEmail) && !isDemo
  const quickTitle = !sessionEmail
    ? 'Sign in to buy'
    : isDemo
      ? 'Checkout unavailable for showcase listings'
      : 'Quick buy — open checkout'

  return (
    <div className="fetch-apple-warp-btn flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white text-left text-[#1c1528] shadow-sm ring-1 ring-violet-200/50 transition-[transform,box-shadow] active:scale-[0.98]">
      <div className="relative aspect-[9/14] w-full overflow-hidden bg-violet-100">
        {img ? (
          <img
            src={listingImageAbsoluteUrl(img)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-violet-300">No preview</div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {compareWas != null ? (
          <div className="pointer-events-none absolute left-1.5 top-1.5 z-[2] rounded-full bg-[#dc2626] px-2 py-0.5 shadow-sm">
            <span className="text-[10px] font-bold uppercase leading-none text-white">
              {Math.round(((compareWas - (l.priceCents ?? 0)) / compareWas) * 100)}% off
            </span>
          </div>
        ) : null}
        <button
          type="button"
          aria-label={label}
          className="absolute inset-0 z-[2] m-0 cursor-pointer border-0 bg-transparent p-0 outline-none active:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#4c1d95]"
          onClick={() => onOpenPeerListing(l.id)}
        />
        {showQuickAdd ? (
          <button
            type="button"
            aria-label={canQuickAdd ? `Quick buy: ${l.title}` : quickTitle}
            title={quickTitle}
            aria-disabled={!canQuickAdd}
            className={[
              'absolute right-1.5 top-1.5 z-[3] flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white text-[#4c1d95] shadow-sm transition-transform',
              canQuickAdd ? 'active:scale-95' : 'cursor-default opacity-45',
            ].join(' ')}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              if (!canQuickAdd || !onQuickBuyPeerListing) return
              onQuickBuyPeerListing(l.id)
            }}
          >
            <ListingQuickAddPlusCircleIcon className="h-full w-full" />
          </button>
        ) : null}
        <p className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] truncate px-2 pb-2 text-[13px] font-semibold leading-tight text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
          {fulfillment}
        </p>
      </div>
      <button
        type="button"
        aria-label={label}
        className="flex min-w-0 flex-col gap-0.5 px-2.5 py-2 text-left outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#4c1d95]"
        onClick={() => onOpenPeerListing(l.id)}
      >
        <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-[#1c1528]">{l.title}</p>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-[11px] font-bold tabular-nums text-violet-600">{priceStr}</span>
          {compareWas != null ? (
            <span className="text-[10px] font-medium tabular-nums text-zinc-400 line-through">
              {formatAudFromCents(compareWas)}
            </span>
          ) : null}
        </div>
        <p className="flex items-center gap-1 text-[10px] font-medium leading-none text-zinc-500">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-violet-500">
            <path d="M13 2L4.5 14H12l-1 8 8.5-12H12l1-8z" fill="currentColor" />
          </svg>
          <span>or fetch from {fetchFromPrice}</span>
        </p>
      </button>
    </div>
  )
}

/** Listing subtitle shown beside price in compact cards. */
function peerListingFulfillmentLabel(_l: PeerListing): 'Pickup' {
  return 'Pickup'
}

/** Lightweight delivery fee estimate for compact listing cards. */
function peerListingDeliveryFeeCents(l: PeerListing): number {
  if (l.sameDayDelivery) return 1500
  if (l.fetchDelivery) return 1200
  return 1200
}

function filterListingsForCategory(
  all: PeerListing[],
  filter: MarketplacePeerBrowseFilter,
): PeerListing[] {
  return all.filter((l) => {
    if (filter.category && filter.category !== 'free') {
      if (l.category !== filter.category) return false
    }
    if (filter.category === 'free' && (l.priceCents ?? 0) > 0) return false
    if (filter.maxPriceCents != null && (l.priceCents ?? 0) > filter.maxPriceCents) return false
    if (filter.q) {
      const q = filter.q.toLowerCase()
      const haystack = [l.title, l.keywords ?? '', l.description].join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}

function HomeShellForYouFeedInner({
  onOpenDrops,
  onOpenMarketplace,
  onOpenSearch: _onOpenSearch,
  onOpenPeerListing,
  onQuickBuyPeerListing,
  onJoinBidWar,
  className = '',
  embedded = false,
  explorePromoBleed: _explorePromoBleed = 'page',
}: HomeShellForYouFeedProps) {
  const homeLiveNowReels = useMemo(() => [] as const, [])
  const peerItems = useMemo(() => [...MARKETPLACE_MOCK_PEER_LISTINGS].slice(0, 6), [])
  const storePicks = useMemo(() => [...SUPPLY_PRODUCTS].slice(0, 5), [])
  const allListings = useMemo(() => [...MARKETPLACE_MOCK_PEER_LISTINGS], [])

  const [browseCategory, setBrowseCategory] = useState<{
    title: string
    filter: MarketplacePeerBrowseFilter
  } | null>(null)

  const browseCategoryListings = useMemo(() => {
    if (!browseCategory) return []
    const filtered = filterListingsForCategory(allListings, browseCategory.filter)
    if (filtered.length > 0) return filtered
    return allListings
  }, [browseCategory, allListings])

  const [homeCategoryFilter, setHomeCategoryFilter] = useState<HomeCategoryChipId>('all')
  /** Default off so ambient stays chill until the user starts an adventure (see `ambientRegisterAdventure`). */
  const [isAdventuring, setIsAdventuring] = useState(false)
  const [demoFundsCents, setDemoFundsCents] = useState(0)
  const [backpackStorageOpen, setBackpackStorageOpen] = useState(false)
  const [backpackItems, setBackpackItems] = useState<BackpackItem[]>(() => loadBackpackItems())
  const [adventureProgress, setAdventureProgress] = useState<AdventureProgress>(() =>
    loadAdventureProgress(),
  )
  const [firstGiftOpen, setFirstGiftOpen] = useState(false)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const heroRef = useRef<HTMLDivElement | null>(null)
  const demoFundsLabel = `$${Math.floor(demoFundsCents / 100).toLocaleString('en-AU')}`
  const heroDisplayName = useMemo(() => loadSession()?.displayName?.trim() || 'Hayden', [])

  useEffect(() => {
    if (!embedded || !isAdventuring) return undefined
    ambientRegisterAdventure(1)
    return () => ambientRegisterAdventure(-1)
  }, [embedded, isAdventuring])

  function handleStartAdventure() {
    setIsAdventuring(true)
    if (!hasClaimedFirstAdventureGift()) {
      setFirstGiftOpen(true)
    }
  }

  function handleClaimFirstGift() {
    markFirstAdventureGiftClaimed()
    const next = addBackpackItem({
      ...FIRST_ADVENTURE_MAP_ITEM,
      acquiredAt: Date.now(),
    })
    const progress = awardFirstAdventureXp()
    setBackpackItems(next)
    setAdventureProgress(progress)
    setFirstGiftOpen(false)
    setLevelUpOpen(true)
  }

  function getBackpackRect(): DOMRect | null {
    const root = heroRef.current
    if (!root) return null
    const el = root.querySelector<HTMLElement>('[data-fetch-backpack-target]')
    return el ? el.getBoundingClientRect() : null
  }

  if (embedded) {
    return (
      <div
        className={[
          'fetch-home-for-you flex min-h-0 w-full flex-col overflow-x-hidden pb-3',
          className,
        ].join(' ')}
        role="region"
        aria-label="Explore feed"
      >
        <div ref={heroRef} className="relative w-full overflow-visible">
          <FetchitWelcomeHero
            displayName={heroDisplayName}
            isAdventuring={isAdventuring}
            adventureLevel={adventureProgress.level}
            fundsCents={demoFundsCents}
            fundsLabel={demoFundsLabel}
            gemsCount={0}
            notificationsCount={1}
            onAddDemoFunds={() => setDemoFundsCents((cents) => cents + 1000)}
            onViewBackpack={() => setBackpackStorageOpen(true)}
          />
          <div className="pointer-events-none absolute inset-x-2 bottom-0 z-[2] translate-y-[72%] sm:inset-x-3 sm:translate-y-[68%]">
            <div className="pointer-events-auto">
              {isAdventuring ? (
                <AdventureReturnBar
                  canEndEarly={demoFundsCents >= EARLY_ADVENTURE_END_COST_CENTS}
                  onEndEarly={() => {
                    if (demoFundsCents < EARLY_ADVENTURE_END_COST_CENTS) return
                    setDemoFundsCents((cents) => Math.max(0, cents - EARLY_ADVENTURE_END_COST_CENTS))
                    setIsAdventuring(false)
                  }}
                  onComplete={() => setIsAdventuring(false)}
                />
              ) : (
                <StartAdventureBar onStart={handleStartAdventure} />
              )}
            </div>
          </div>
        </div>
        <div className="mt-[4.5rem] sm:mt-20">
          <BidWarsAdventurePromo onJoin={onJoinBidWar ?? onOpenMarketplace} />
        </div>
        <div className="mt-3 flex flex-col gap-3 px-2 pt-1">
          <div className="h-px w-full bg-violet-200/70" aria-hidden />
          <HomeCategoryChips value={homeCategoryFilter} onChange={setHomeCategoryFilter} />
          <section className="flex flex-col gap-2" aria-label="Live now">
            <LiveNowGrid reels={homeLiveNowReels} onOpenDrops={onOpenDrops} />
          </section>
          {browseCategory ? (
            <ExploreCategoryBrowse
              categoryTitle={browseCategory.title}
              listings={browseCategoryListings}
              onClose={() => setBrowseCategory(null)}
              onAddToCart={onQuickBuyPeerListing}
            />
          ) : null}
        </div>
        <BackpackStoragePage
          open={backpackStorageOpen}
          onClose={() => setBackpackStorageOpen(false)}
          items={backpackItems}
          progress={adventureProgress}
        />
        <FetchFirstAdventureGiftCard
          open={firstGiftOpen}
          getBackpackRect={getBackpackRect}
          onClaimed={handleClaimFirstGift}
        />
        <AdventureLevelUpCelebration
          open={levelUpOpen}
          level={adventureProgress.level}
          xpAwarded={FIRST_ADVENTURE_XP_REWARD}
          onDone={() => setLevelUpOpen(false)}
        />
      </div>
    )
  }

  return (
    <div
      className={[
        'fetch-home-for-you flex min-h-0 w-full flex-col gap-4 overflow-x-hidden pb-3',
        className,
      ].join(' ')}
      role="region"
      aria-label="For you — items and videos"
    >
      <header className="shrink-0 px-0.5">
        <h2 className="text-[1.05rem] font-bold tracking-[-0.03em] text-zinc-50">
          For you
        </h2>
        <p className="mt-0.5 text-[12px] font-medium leading-snug text-zinc-400">
          Drops, local listings, and store picks in one scroll.
        </p>
      </header>

      <div className="shrink-0 px-0.5">
        <MyFetchRewardsBanner layout="standalone" />
      </div>

      <section aria-labelledby="fetch-for-you-items-heading" className="min-w-0">
        <div className="mb-2 flex items-end justify-between gap-2 px-0.5">
          <h3
            id="fetch-for-you-items-heading"
            className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400"
          >
            Items near you
          </h3>
          <button
            type="button"
            onClick={onOpenMarketplace}
            className="shrink-0 text-[11px] font-bold text-[#00ff6a] underline decoration-[#00ff6a]/35 underline-offset-2 active:opacity-80 dark:text-[#00ff6a]"
          >
            Marketplace
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 px-0.5">
          {peerItems.map((l) => (
            <ExplorePeerListingCard
              key={l.id}
              l={l}
              onOpenPeerListing={onOpenPeerListing}
              onQuickBuyPeerListing={onQuickBuyPeerListing}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="fetch-for-you-store-heading" className="min-w-0">
        <h3
          id="fetch-for-you-store-heading"
          className="mb-2 px-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400"
        >
          From Fetch
        </h3>
        <div className="-mx-0.5 flex gap-2 overflow-x-auto overflow-y-hidden pb-1 [-webkit-overflow-scrolling:touch] px-0.5">
          {storePicks.map((p: SupplyProduct) => (
            <button
              key={p.id}
              type="button"
              onClick={onOpenMarketplace}
              className="flex w-[7.5rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-violet-200/60 bg-white text-left shadow-sm active:bg-violet-50"
            >
              <div className="relative aspect-square w-full bg-violet-50">
                <img
                  src={p.coverImageUrl}
                  alt=""
                  className="absolute inset-0 m-auto max-h-[90%] max-w-[90%] object-contain"
                />
              </div>
              <div className="min-w-0 p-2">
                <p className="line-clamp-2 text-[10px] font-semibold leading-snug text-[#1c1528]">
                  {p.title}
                </p>
                <p className="mt-1 text-[10px] font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatAud(p.priceAud)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>
      {browseCategory ? (
        <ExploreCategoryBrowse
          categoryTitle={browseCategory.title}
          listings={browseCategoryListings}
          onClose={() => setBrowseCategory(null)}
          onAddToCart={onQuickBuyPeerListing}
        />
      ) : null}
    </div>
  )
}

export const HomeShellForYouFeed = memo(HomeShellForYouFeedInner)
