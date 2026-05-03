import { createPortal } from 'react-dom'
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { loadSession, updateUserProfile } from '../lib/fetchUserSession'
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
import type { DropReel } from '../lib/drops/types'
import fetchitAdventuringBannerUrl from '../assets/fetchit-adventuring-banner.png'
import fetchitAdventuringHour1BannerUrl from '../assets/fetchit-adventuring-banner-hour-1.png'
import fetchitAdventuringMaleTigerBannerUrl from '../assets/fetchit-adventuring-banner-male-tiger.png'
import fetchitAdventuringMaleTigerHungryBannerUrl from '../assets/fetchit-adventuring-banner-male-tiger-hungry.png'
import fetchitPetAvatarUrl from '../assets/fetchit-pet-avatar.png'
import fetchitPetFedBannerUrl from '../assets/fetchit-pet-fed-banner.png'
import fetchitPetHungryBannerUrl from '../assets/fetchit-pet-hungry-banner.png'
import fetchitPetTigerAvatarUrl from '../assets/fetchit-pet-tiger-avatar.png'
import fetchitPetTigerFedBannerUrl from '../assets/fetchit-pet-tiger-fed-banner.png'
import fetchitPetTigerHungryBannerUrl from '../assets/fetchit-pet-tiger-hungry-banner.png'
import fetchitBackpack3dUrl from '../assets/fetchit-backpack-3d.png'
import fetchitBackpackLevel1To4Url from '../assets/fetchit-backpack-level-1-4.png'
import fetchitBidWarsBannerUrl from '../assets/fetchit-bid-wars-banner.png'
import fetchitBidWarsBannerFemaleUrl from '../assets/fetchit-bid-wars-banner-female.png'
import fetchitHomeWomenBannerUrl from '../assets/fetchit-home-women-banner.png'
import fetchitHomeWomenHungryBannerUrl from '../assets/fetchit-home-women-hungry-banner.png'
import heroWalletCashUrl from '../assets/hero-wallet-cash.png'
import purpleGemIconUrl from '../assets/pokies-icons/gem.png'
import searchRealSneakersShoesUrl from '../assets/search-categories-real/sneakers-shoes.png'
import searchRealTradingCardGamesUrl from '../assets/search-categories-real/trading-card-games.png'
import searchRealJewelleryWatchesUrl from '../assets/search-categories-real/jewellery-watches.png'
import searchRealToysHobbiesUrl from '../assets/search-categories-real/toys-hobbies.png'
import searchRealElectronicsUrl from '../assets/search-categories-real/electronics.png'
import { ambientRegisterAdventure } from '../lib/audio/fetchAmbientMusic'
import { playAdventureTrumpets, playConfettiPops, playWinFanfare } from '../lib/fetchBattleSounds'
import { depositWallet, useWalletBalanceCents } from '../lib/data'
import { playUiFeedback } from '../voice/fetchFeedback'

function formatBackInClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const EARLY_ADVENTURE_END_COST_CENTS = 99
/** Demo mission length — countdown pauses while the pet is hungry. */
const ADVENTURE_MISSION_DURATION_SEC = 7 * 60 * 60
const DAILY_REWARD_GEMS = 100
const DAILY_REWARD_STORAGE_KEY = 'fetch.home.dailyRewardTasks.v2'
const DEMO_GEMS_STORAGE_KEY = 'fetch.home.demoGems.v1'
const PET_PROFILE_STORAGE_KEY = 'fetch.home.petProfile.v1'
const HOME_HERO_DISPLAY_NAME_KEY = 'fetch.home.heroDisplayName.v1'
const HOME_HERO_GENDER_KEY = 'fetch.home.heroGender.v1'
const ADVENTURE_THEME_TITLE = 'Jungle'

type HeroGender = 'male' | 'female'
const PET_FEED_COOLDOWN_MS = 3 * 60 * 60 * 1000
const PET_STARVATION_RISK_AFTER_MS = 15 * 60 * 1000

type DailyRewardTaskId = 'bid_today' | 'watch_live_10'

type DailyRewardState = {
  date: string
  completed: DailyRewardTaskId[]
}

type DailyGemFxState = {
  key: number
  amount: number
  source: { x: number; y: number }
  target: { x: number; y: number }
  particleCount?: number
}

const PET_CELEBRATION_PARTICLES: ReadonlyArray<{
  emoji: string
  tx: number
  ty: number
  rot: number
  scale: number
  delay: number
}> = [
  { emoji: '🎉', tx: -58, ty: -94, rot: -24, scale: 1.05, delay: 0 },
  { emoji: '🥳', tx: -26, ty: -118, rot: 18, scale: 1.15, delay: 0.04 },
  { emoji: '💜', tx: 18, ty: -106, rot: -12, scale: 1.05, delay: 0.02 },
  { emoji: '✨', tx: 54, ty: -84, rot: 28, scale: 1.18, delay: 0.07 },
  { emoji: '😄', tx: -76, ty: -38, rot: 12, scale: 1, delay: 0.08 },
  { emoji: '🎊', tx: 78, ty: -34, rot: -22, scale: 1.1, delay: 0.05 },
  { emoji: '⭐', tx: -38, ty: -68, rot: 34, scale: 0.92, delay: 0.1 },
  { emoji: '💎', tx: 42, ty: -58, rot: -36, scale: 0.95, delay: 0.11 },
  { emoji: '💥', tx: 0, ty: -132, rot: 0, scale: 1.08, delay: 0.13 },
]

type FetchPetId = 'fetch' | 'tiger'

type FetchHomePet = {
  id: FetchPetId
  label: string
  defaultName: string
  avatarUrl: string
  fedBannerUrl: string
  hungryBannerUrl: string
}

type PetProfileState = {
  selectedPetId: FetchPetId
  names: Record<FetchPetId, string>
  ranks: Record<FetchPetId, number>
  fedUntil: number
  lastFedAt: number
}

const FETCH_HOME_PETS: ReadonlyArray<FetchHomePet> = [
  {
    id: 'fetch',
    label: 'Fetch pup',
    defaultName: 'Fetch',
    avatarUrl: fetchitPetAvatarUrl,
    fedBannerUrl: fetchitPetFedBannerUrl,
    hungryBannerUrl: fetchitPetHungryBannerUrl,
  },
  {
    id: 'tiger',
    label: 'Tiger guardian',
    defaultName: 'Tiger',
    avatarUrl: fetchitPetTigerAvatarUrl,
    fedBannerUrl: fetchitPetTigerFedBannerUrl,
    hungryBannerUrl: fetchitPetTigerHungryBannerUrl,
  },
]

const DEFAULT_PET_NAMES: Record<FetchPetId, string> = {
  fetch: 'Fetch',
  tiger: 'Tiger',
}

const PET_RANK_MAX = 50

const DEFAULT_PET_RANKS: Record<FetchPetId, number> = {
  fetch: 1,
  tiger: 1,
}

function normalizePetRank(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n)) return 1
  return Math.min(PET_RANK_MAX, Math.max(1, Math.floor(n)))
}

/** Gems to rank up from `currentRank` → currentRank + 1 */
function petRankUpGemCost(currentRank: number): number {
  return 40 + currentRank * 12
}

const DAILY_REWARD_TASKS: ReadonlyArray<{
  id: DailyRewardTaskId
  title: string
  detail: string
}> = [
  {
    id: 'bid_today',
    title: 'Make 1 bid today',
    detail: 'Place any live bid and claim your daily gems.',
  },
  {
    id: 'watch_live_10',
    title: 'Watch a live for 10 mins',
    detail: 'Spend 10 minutes in a live stream today.',
  },
]

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadDemoGems(): number {
  try {
    const raw = window.localStorage.getItem(DEMO_GEMS_STORAGE_KEY)
    const n = raw ? Number.parseInt(raw, 10) : 0
    return Number.isFinite(n) ? Math.max(0, n) : 0
  } catch {
    return 0
  }
}

function saveDemoGems(next: number) {
  try {
    window.localStorage.setItem(DEMO_GEMS_STORAGE_KEY, String(Math.max(0, next)))
  } catch {
    /* ignore */
  }
}

function loadDailyRewardState(): DailyRewardState {
  const date = todayKey()
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DAILY_REWARD_STORAGE_KEY) || 'null') as Partial<DailyRewardState> | null
    if (parsed?.date === date && Array.isArray(parsed.completed)) {
      return {
        date,
        completed: parsed.completed.filter((id): id is DailyRewardTaskId =>
          id === 'bid_today' || id === 'watch_live_10',
        ),
      }
    }
  } catch {
    /* ignore */
  }
  return { date, completed: [] }
}

function saveDailyRewardState(next: DailyRewardState) {
  try {
    window.localStorage.setItem(DAILY_REWARD_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

function loadPetProfile(): PetProfileState {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PET_PROFILE_STORAGE_KEY) || 'null') as Partial<PetProfileState> | null
    const legacyName = typeof (parsed as { name?: unknown } | null)?.name === 'string'
      ? String((parsed as { name?: string }).name).trim().slice(0, 16)
      : ''
    const selectedPetId: FetchPetId = parsed?.selectedPetId === 'tiger' ? 'tiger' : 'fetch'
    const parsedNames = parsed?.names
    const names: Record<FetchPetId, string> = {
      fetch: typeof parsedNames?.fetch === 'string' && parsedNames.fetch.trim()
        ? parsedNames.fetch.trim().slice(0, 16)
        : legacyName || DEFAULT_PET_NAMES.fetch,
      tiger: typeof parsedNames?.tiger === 'string' && parsedNames.tiger.trim()
        ? parsedNames.tiger.trim().slice(0, 16)
        : DEFAULT_PET_NAMES.tiger,
    }
    const pr = parsed?.ranks as Partial<Record<FetchPetId, unknown>> | undefined
    const ranks: Record<FetchPetId, number> = {
      fetch: normalizePetRank(pr?.fetch ?? DEFAULT_PET_RANKS.fetch),
      tiger: normalizePetRank(pr?.tiger ?? DEFAULT_PET_RANKS.tiger),
    }
    return {
      selectedPetId,
      names,
      ranks,
      fedUntil: typeof parsed?.fedUntil === 'number' && Number.isFinite(parsed.fedUntil) ? parsed.fedUntil : 0,
      lastFedAt: typeof parsed?.lastFedAt === 'number' && Number.isFinite(parsed.lastFedAt) ? parsed.lastFedAt : 0,
    }
  } catch {
    return { selectedPetId: 'fetch', names: DEFAULT_PET_NAMES, ranks: DEFAULT_PET_RANKS, fedUntil: 0, lastFedAt: 0 }
  }
}

function savePetProfile(next: PetProfileState) {
  try {
    window.localStorage.setItem(PET_PROFILE_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

function loadStoredHeroDisplayName(): string | null {
  try {
    const raw = window.localStorage.getItem(HOME_HERO_DISPLAY_NAME_KEY)?.trim()
    return raw && raw.length >= 2 ? raw.slice(0, 48) : null
  } catch {
    return null
  }
}

function persistHeroDisplayName(name: string) {
  const n = name.trim().slice(0, 48)
  if (n.length < 2) return
  try {
    window.localStorage.setItem(HOME_HERO_DISPLAY_NAME_KEY, n)
  } catch {
    /* ignore */
  }
  const cur = loadSession()
  if (cur) updateUserProfile({ displayName: n })
}

function loadStoredHeroGender(): HeroGender {
  try {
    const raw = window.localStorage.getItem(HOME_HERO_GENDER_KEY)
    if (raw === 'female' || raw === 'male') return raw
  } catch {
    /* ignore */
  }
  return 'male'
}

function persistHeroGender(next: HeroGender) {
  try {
    window.localStorage.setItem(HOME_HERO_GENDER_KEY, next)
  } catch {
    /* ignore */
  }
}

function formatTimerLabel(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function backpackImageForLevel(level: number): string {
  return level >= 1 && level <= 4 ? fetchitBackpackLevel1To4Url : fetchitBackpack3dUrl
}

function firstNameFromDisplay(name: string): string {
  const t = name.trim().split(/\s+/)[0] ?? ''
  return t.length > 0 ? t : 'there'
}

/** Cumulative-style XP for the header bar (matches hero mock: e.g. 650 / 900 at level 7). */
function heroXpBarNumbers(level: number, xpIntoLevel: number) {
  const safeLevel = Math.max(1, Math.floor(level))
  const xp = Math.min(100, Math.max(0, Math.floor(xpIntoLevel)))
  const current = (safeLevel - 1) * 100 + xp
  const next = (safeLevel + 2) * 100
  const pct = next > 0 ? Math.min(100, Math.round((current / next) * 1000) / 10) : 0
  return { current, next, pct }
}

const feed3dPurpleCta =
  'border-b-[4px] border-[#4c1d95] bg-gradient-to-b from-[#9f67ff] to-[#7c3aed] text-white shadow-none transition-[transform,border-bottom-width] duration-150 active:translate-y-0.5 active:border-b-2'

const feed3dDarkCta =
  'border-b-[4px] border-[#090514] bg-gradient-to-b from-[#33225f] to-[#1c1340] text-white shadow-none transition-[transform,border-bottom-width] duration-150 active:translate-y-0.5 active:border-b-2'

/** Purple square + control — matches reference top header currency chips. */
function HeaderSquarePlusIcon({ className = '' }: { className?: string }) {
  return (
    <span
      className={[
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#7c3aed] text-white shadow-[0_4px_12px_-6px_rgba(76,29,149,0.65)]',
        className,
      ].join(' ')}
      aria-hidden
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  )
}

/** Pet portrait: gradient rounded frame; head overlaps top border, lower body clips inside. */
function FetchPetHeroPortrait({
  petAvatarUrl,
  petName,
  onEdit,
}: {
  petAvatarUrl: string
  petName: string
  onEdit: () => void
}) {
  return (
    <div className="relative mx-auto mt-1 w-[min(100%,5.95rem)] shrink-0 px-0.5">
      <div className="rounded-2xl bg-gradient-to-br from-[#c4b5fd] via-[#a78bfa] to-[#7c3aed] p-[2.5px] shadow-[0_10px_26px_-18px_rgba(76,29,149,0.48)]">
        <div className="relative overflow-hidden rounded-[13px] bg-gradient-to-b from-violet-50 to-white">
          <div className="relative h-[5rem] overflow-hidden sm:h-[5.35rem]">
            <img
              src={petAvatarUrl}
              alt={`${petName} portrait`}
              draggable={false}
              className="absolute left-1/2 top-0 z-[1] h-[7.25rem] w-[7.25rem] max-w-none -translate-x-1/2 -translate-y-[26%] select-none object-cover object-top sm:h-[7.5rem] sm:w-[7.5rem] sm:-translate-y-[28%]"
            />
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="absolute bottom-1 right-1 z-[3] flex h-6 w-6 items-center justify-center rounded-full bg-white text-zinc-800 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.25)] ring-2 ring-violet-200 transition-[transform,filter] active:scale-[0.94]"
        aria-label={`Edit ${petName}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="m4 16.5-.7 4.2 4.2-.7L18.7 8.8l-3.5-3.5L4 16.5Z" stroke="currentColor" strokeWidth="2.25" strokeLinejoin="round" />
          <path d="m14.5 6 3.5 3.5" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

type FetchHomeTourTarget = 'addFunds' | 'backpack' | 'adventure' | 'bidWar' | 'liveStreams'

type FetchHomeTourStep = {
  id: FetchHomeTourTarget
  eyebrow: string
  title: string
  body: string
  placement: 'below' | 'left' | 'above'
}

const FETCH_HOME_TOUR_STORAGE_KEY = 'fetch.homeForYouTour.v1'

const FETCH_HOME_TOUR_STEPS: FetchHomeTourStep[] = [
  {
    id: 'addFunds',
    eyebrow: 'Step 1 of 5',
    title: 'Add funds',
    body: 'Top up your wallet first. Funds power adventures, quick actions, and anything Fetch needs to run for you.',
    placement: 'below',
  },
  {
    id: 'backpack',
    eyebrow: 'Step 2 of 5',
    title: 'Backpack',
    body: 'Your backpack stores rewards, passes, boosts, map cards, and the progress you earn while using Fetch.',
    placement: 'left',
  },
  {
    id: 'adventure',
    eyebrow: 'Step 3 of 5',
    title: 'Adventure card',
    body: 'Start an adventure to send Fetch out. The timer tracks the run, and first-time rewards unlock as you play.',
    placement: 'above',
  },
  {
    id: 'bidWar',
    eyebrow: 'Step 4 of 5',
    title: 'Bid War',
    body: 'Jump into Bid Wars to compete, bid, and win. This is where the high-energy auction game begins.',
    placement: 'below',
  },
  {
    id: 'liveStreams',
    eyebrow: 'Step 5 of 5',
    title: 'Live streams',
    body: 'Watch live drops and auctions here. Tap into streams to see items move in real time.',
    placement: 'above',
  },
]

function FetchitWelcomeHero({
  displayName,
  isAdventuring,
  adventureLevel,
  adventureXp,
  fundsLabel,
  gemsCount,
  notificationsCount,
  petName,
  petId,
  heroGender,
  petAvatarUrl,
  petFedBannerUrl,
  petHungryBannerUrl,
  petFeedTimerLabel,
  petRank,
  petHungerStage,
  isPetFed,
  canFeedPet,
  petCelebrationSeq,
  onAddDemoFunds,
  onViewBackpack,
  onOpenGemGames,
  onOpenPetEdit,
  onFeedPet,
}: {
  displayName: string
  isAdventuring: boolean
  adventureLevel: number
  /** 0–100 XP into current level (see `fetchAdventureRewards`). */
  adventureXp: number
  fundsLabel: string
  gemsCount: number
  notificationsCount: number
  petName: string
  petId: FetchPetId
  heroGender: HeroGender
  petAvatarUrl: string
  petFedBannerUrl: string
  petHungryBannerUrl: string
  petFeedTimerLabel: string
  petRank: number
  petHungerStage: 'hungry' | 'risk'
  isPetFed: boolean
  canFeedPet: boolean
  petCelebrationSeq: number
  onAddDemoFunds: () => void
  onViewBackpack: () => void
  onOpenGemGames: () => void
  onOpenPetEdit: () => void
  onFeedPet: () => void
}) {
  const firstName = firstNameFromDisplay(displayName).toUpperCase()
  const xpBar = heroXpBarNumbers(adventureLevel, adventureXp)
  const useMaleTigerAdventureBanner = heroGender === 'male' && petId === 'tiger'
  const bannerUrl = isAdventuring
    ? useMaleTigerAdventureBanner
      ? isPetFed
        ? fetchitAdventuringMaleTigerBannerUrl
        : fetchitAdventuringMaleTigerHungryBannerUrl
      : isPetFed
        ? fetchitAdventuringBannerUrl
        : fetchitAdventuringHour1BannerUrl
    : isPetFed
      ? petFedBannerUrl
      : petHungryBannerUrl
  const isPetBanner = bannerUrl === petFedBannerUrl || bannerUrl === petHungryBannerUrl
  const isAdventureBanner =
    bannerUrl === fetchitAdventuringBannerUrl ||
    bannerUrl === fetchitAdventuringHour1BannerUrl ||
    bannerUrl === fetchitAdventuringMaleTigerBannerUrl ||
    bannerUrl === fetchitAdventuringMaleTigerHungryBannerUrl
  const bannerAspectClass = isPetBanner ? 'aspect-square' : isAdventureBanner ? '' : 'aspect-[3/2]'
  const bannerObjectClass = isAdventureBanner ? 'object-contain object-center' : 'object-cover object-center'
  const backpackImageUrl = backpackImageForLevel(adventureLevel)
  return (
    <section
      className="relative w-full overflow-hidden rounded-t-xl"
      aria-label="Welcome and backpack"
    >
      <div className="flex items-stretch gap-2 bg-white px-2 py-2.5 text-[#1c1340]">
        <div className="flex min-h-[3.35rem] min-w-0 flex-[1.2] items-start gap-2 rounded-xl bg-white px-2 py-2 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-zinc-200/95">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] text-[14px] font-black tabular-nums text-white shadow-[0_4px_12px_-4px_rgba(76,29,149,0.55)]"
            aria-hidden
          >
            {adventureLevel}
          </span>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <p className="text-[10px] font-black uppercase leading-none tracking-[0.14em] text-[#4c1d95]">
              Level {adventureLevel}
            </p>
            <div className="h-[5px] overflow-hidden rounded-full bg-violet-100">
              <div
                className="h-full rounded-full bg-[#7c3aed]"
                style={{ width: `${xpBar.pct}%` }}
              />
            </div>
            <p className="text-[9px] font-bold tabular-nums leading-none text-zinc-600">
              {xpBar.current} / {xpBar.next} XP
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAddDemoFunds}
          className="flex min-h-[3.35rem] min-w-0 flex-1 items-center gap-1.5 rounded-xl bg-white px-2 py-2 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-zinc-200/95 transition-colors active:bg-zinc-50/90"
          aria-label={`Add funds, wallet balance ${fundsLabel}`}
          data-fetch-tour-target="addFunds"
        >
          <img
            src={heroWalletCashUrl}
            alt=""
            width={36}
            height={36}
            draggable={false}
            className="pointer-events-none h-8 w-8 shrink-0 select-none object-contain"
          />
          <span className="min-w-0 flex-1 truncate text-left text-[12px] font-black tabular-nums text-[#1c1340]">{fundsLabel}</span>
          <HeaderSquarePlusIcon />
        </button>
        <button
          type="button"
          onClick={onOpenGemGames}
          className="flex min-h-[3.35rem] min-w-0 flex-1 items-center gap-1.5 rounded-xl bg-white px-2 py-2 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-zinc-200/95 transition-colors active:bg-zinc-50/90"
          aria-label={`Open gem games, ${gemsCount} gems`}
          data-fetch-home-gems-chip
        >
          <img
            src={purpleGemIconUrl}
            alt=""
            aria-hidden
            className="h-[22px] w-[22px] shrink-0 object-contain"
            draggable={false}
            loading="lazy"
            data-fetch-home-gems-icon
          />
          <span className="min-w-0 flex-1 truncate text-left text-[12px] font-black tabular-nums text-[#1c1340]">{gemsCount}</span>
          <HeaderSquarePlusIcon />
        </button>
        <button
          type="button"
          className="relative flex h-auto min-h-[3.35rem] w-[3.05rem] shrink-0 items-center justify-center rounded-xl bg-white px-0 py-2 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-zinc-200/95 transition-colors active:bg-zinc-50/90"
          aria-label={`${notificationsCount} notifications`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-zinc-700">
            <path
              d="M18 10a6 6 0 1 0-12 0c0 7-2.5 7-2.5 8h17S18 17 18 10Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d="M9.5 20a2.8 2.8 0 0 0 5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {notificationsCount > 0 ? (
            <span className="absolute right-1 top-1 flex min-h-[1.05rem] min-w-[1.05rem] items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-black tabular-nums leading-none text-white ring-[2.5px] ring-white">
              {notificationsCount > 9 ? '9+' : notificationsCount}
            </span>
          ) : null}
        </button>
      </div>
      <div className={`relative ${bannerAspectClass} w-full overflow-hidden rounded-t-xl bg-gradient-to-b from-[#cdb7ff] via-[#a78bfa] to-[#7c3aed] shadow-[0_22px_48px_-22px_rgba(76,29,149,0.6)]`}>
        <img
          src={bannerUrl}
          alt=""
          aria-hidden
          draggable={false}
          className={[
            'pointer-events-none w-full select-none',
            isAdventureBanner ? 'block h-auto' : 'absolute inset-0 h-full',
            bannerObjectClass,
          ].join(' ')}
        />
        <div
          role="group"
          aria-label={`Welcome back, ${firstName}`}
          className="pointer-events-none absolute left-2 top-2 z-[3] max-w-[min(calc(100%-1rem),13rem)] rounded-xl bg-black/55 px-3 py-2.5 text-left text-white shadow-[0_16px_40px_-20px_rgba(0,0,0,0.65)] ring-1 ring-white/15 backdrop-blur-xl sm:left-3 sm:top-3 sm:max-w-[min(calc(100%-1.25rem),14rem)] sm:rounded-[1.1rem] sm:px-3.5 sm:py-3"
        >
          <p className="text-[9px] font-semibold leading-none tracking-[0.04em] text-white/85">Welcome back,</p>
          <h2
            className={[
              'mt-1 truncate font-black uppercase leading-none tracking-tight text-white',
              firstName.length > 8 ? 'text-[14px] sm:text-[15px]' : 'text-[17px] sm:text-[18px]',
            ].join(' ')}
            title={firstName}
          >
            {firstName}!
          </h2>
        </div>
        <div
          className={[
            'absolute z-[3] max-w-[min(72vw,7.5rem)] rounded-xl bg-white px-2 py-1.5 text-left text-[8px] font-black leading-snug text-[#1c1340] shadow-[0_14px_28px_-20px_rgba(30,15,80,0.65)] ring-1 ring-violet-100',
            'sm:max-w-[8.5rem] sm:rounded-2xl sm:px-2.5 sm:py-2 sm:text-[9px] sm:leading-tight',
            'md:max-w-[9rem] md:px-3 md:text-[9.5px]',
            'lg:max-w-[9.5rem] lg:text-[10px]',
            'xl:max-w-[10rem]',
            isPetBanner || isAdventureBanner
              ? [
                  'left-[58%] bottom-[50%] -translate-x-1/2',
                  'sm:left-[59%] sm:bottom-[51%]',
                  'md:left-[59.5%] md:bottom-[50%]',
                  'lg:left-[60%] lg:bottom-[49%]',
                  'xl:left-[61%] xl:bottom-[48%]',
                ].join(' ')
              : [
                  'right-[6%] top-[36%] -translate-y-1/2',
                  'sm:right-[8%] sm:top-[38%]',
                  'md:right-[10%] md:top-[40%]',
                  'lg:right-[11%] lg:top-[42%]',
                ].join(' '),
          ].join(' ')}
        >
          {isPetFed ? "I'm full and ready to find epic loot!" : "I'm hungry! Feed me so I can find loot!"}
          <span
            className={[
              'absolute h-2.5 w-2.5 rotate-45 border-r border-b border-violet-100 bg-white sm:h-3 sm:w-3',
              isPetBanner || isAdventureBanner
                ? '-bottom-1 left-1/2 -translate-x-1/2 sm:-bottom-1.5'
                : '-bottom-1 left-5 sm:-bottom-1.5 sm:left-6',
            ].join(' ')}
            aria-hidden
          />
        </div>
        <div
          className={[
            'absolute z-[3] flex h-7 w-7 items-center justify-center rounded-full text-white ring-2 ring-white',
            isAdventureBanner
              ? 'left-[66%] bottom-[9%] sm:left-[65%] sm:bottom-[10%]'
              : 'left-[54%] bottom-[8%]',
            isPetFed
              ? 'bg-emerald-500 shadow-[0_10px_24px_-12px_rgba(16,185,129,0.85)]'
              : petHungerStage === 'risk'
                ? 'bg-red-600 shadow-[0_10px_24px_-12px_rgba(185,28,28,0.85)]'
                : 'bg-amber-400 text-[#1c1340] shadow-[0_10px_24px_-12px_rgba(245,158,11,0.85)]',
          ].join(' ')}
          aria-label={
            isPetFed
              ? 'Pet has eaten'
              : petHungerStage === 'risk'
                ? 'Pet is at risk of starvation'
                : 'Pet is hungry'
          }
        >
          {isPetFed ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12.5 9.3 17 19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 4 21 19.5H3L12 4Z" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
              <path d="M12 9v4.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
              <path d="M12 17.25h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenPetEdit}
          className="absolute bottom-3 right-3 z-[4] flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-800 shadow-[0_6px_14px_-4px_rgba(0,0,0,0.2)] ring-2 ring-zinc-200 transition-[transform,filter] active:scale-[0.94] sm:bottom-4 sm:right-4"
          aria-label="Edit home and pet"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="m4 16.5-.7 4.2 4.2-.7L18.7 8.8l-3.5-3.5L4 16.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="m14.5 6 3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="absolute bottom-3 left-3 z-[3] w-[6.35rem] rounded-xl bg-white p-1 text-left text-[#1c1340] shadow-[0_14px_32px_-18px_rgba(0,0,0,0.18)] ring-1 ring-zinc-200 sm:bottom-4 sm:left-4 sm:w-[6.65rem]">
          <div className="border-b border-zinc-200 px-0.5 pb-1 pt-0.5 text-center">
            <p
              className="truncate text-[10px] font-black uppercase leading-none tracking-[0.14em] text-zinc-950 sm:text-[11px]"
              title={petName}
            >
              {petName}
            </p>
            <p className="mt-1 flex items-baseline justify-center gap-1">
              <span className="text-[8px] font-black uppercase leading-none tracking-[0.14em] text-zinc-500 sm:text-[8.5px]">
                Rank
              </span>
              <span className="text-[13px] font-black tabular-nums leading-none tracking-[-0.05em] text-zinc-950 sm:text-[14px]">
                {petRank}
              </span>
            </p>
          </div>
          <FetchPetHeroPortrait petAvatarUrl={petAvatarUrl} petName={petName} onEdit={onOpenPetEdit} />
          <div className="mt-0.5 flex items-center justify-between gap-1 px-0.5">
            <span
              className={[
                'shrink-0 text-[7px] font-black uppercase tracking-[0.06em] sm:text-[8px]',
                isPetFed ? 'text-emerald-600' : petHungerStage === 'risk' ? 'text-red-600' : 'text-amber-600',
              ].join(' ')}
            >
              {isPetFed ? 'Full' : petHungerStage === 'risk' ? 'Risk' : 'Hungry'}
            </span>
            <span className="min-w-0 truncate text-right text-[10px] font-black tabular-nums tracking-tight text-zinc-800 sm:text-[11px]">
              {petFeedTimerLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={onFeedPet}
            disabled={!canFeedPet}
            className={[
              'mt-0.5 flex w-full items-center justify-center gap-1 rounded-xl px-1.5 py-1 text-[7px] font-black uppercase tracking-[0.08em] shadow-none sm:py-1.5 sm:text-[8px]',
              canFeedPet
                ? [feed3dPurpleCta, 'ring-1 ring-[#7c3aed]/35'].join(' ')
                : 'cursor-not-allowed border-b-[4px] border-b-zinc-300/80 bg-zinc-100 text-zinc-500',
            ].join(' ')}
            aria-label={canFeedPet ? `Feed ${petName}` : `${petName} can eat again in ${petFeedTimerLabel}`}
          >
            {canFeedPet ? 'FEED' : 'FED'}
          </button>
        </div>
        {petCelebrationSeq > 0 ? (
          <div
            key={petCelebrationSeq}
            className="pointer-events-none absolute bottom-[6.2rem] left-[4.2rem] z-[7]"
            aria-hidden
          >
            <span className="fetch-pet-celebration-pop">💜</span>
            {PET_CELEBRATION_PARTICLES.map((particle, index) => (
              <span
                key={`${petCelebrationSeq}-${index}`}
                className="fetch-pet-celebration-particle"
                style={
                  {
                    '--pet-burst-x': `${particle.tx}px`,
                    '--pet-burst-y': `${particle.ty}px`,
                    '--pet-burst-r': `${particle.rot}deg`,
                    '--pet-burst-s': particle.scale,
                    '--pet-burst-delay': `${particle.delay}s`,
                  } as CSSProperties
                }
              >
                {particle.emoji}
              </span>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          onClick={onViewBackpack}
          data-fetch-backpack-target
          data-fetch-tour-target="backpack"
          className="group absolute top-3 right-3 z-[3] transition-transform active:scale-[0.98] sm:top-4 sm:right-4"
          aria-label="View backpack"
        >
          <div className="fetch-backpack-premium-card relative flex w-[4.6rem] flex-col gap-1 overflow-hidden rounded-xl bg-white px-1 py-1 shadow-none ring-1 ring-zinc-200 sm:w-[4.9rem]">
            <div className="relative z-0 flex flex-col gap-1">
              <span className="px-0.5 text-center text-[7px] font-black uppercase leading-tight tracking-[0.03em] text-[#1c1340]">
                Backpack
              </span>
              <img
                src={backpackImageUrl}
                alt=""
                aria-hidden
                draggable={false}
                className="pointer-events-none block h-auto w-full max-h-[3.2rem] min-h-[2.45rem] shrink-0 select-none object-contain object-center sm:max-h-[3.45rem]"
              />
              <span className="mx-auto flex shrink-0 items-center justify-center rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.04em] text-zinc-800 ring-1 ring-zinc-200">
                OPEN
              </span>
            </div>
            <div className="fetch-backpack-premium-card__flash" aria-hidden>
              <span className="fetch-backpack-premium-card__shimmer" />
            </div>
          </div>
        </button>
      </div>
      <style>{`
        @keyframes fetch-pet-celebration-pop {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
          18% { opacity: 1; transform: translate(-50%, -50%) scale(1.35); }
          55% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.72); }
        }
        @keyframes fetch-pet-celebration-burst {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
            filter: blur(0);
          }
          12% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.15) rotate(0deg);
          }
          72% {
            opacity: 1;
            transform:
              translate(calc(-50% + var(--pet-burst-x)), calc(-50% + var(--pet-burst-y)))
              scale(var(--pet-burst-s))
              rotate(var(--pet-burst-r));
            filter: blur(0);
          }
          100% {
            opacity: 0;
            transform:
              translate(calc(-50% + var(--pet-burst-x)), calc(-50% + var(--pet-burst-y) + 24px))
              scale(0.78)
              rotate(var(--pet-burst-r));
            filter: blur(1px);
          }
        }
        .fetch-pet-celebration-pop,
        .fetch-pet-celebration-particle {
          position: absolute;
          left: 0;
          top: 0;
          display: block;
          line-height: 1;
          text-shadow: 0 8px 18px rgba(30, 15, 80, 0.25);
          will-change: transform, opacity;
        }
        .fetch-pet-celebration-pop {
          font-size: 2.35rem;
          animation: fetch-pet-celebration-pop 820ms cubic-bezier(0.2, 0.9, 0.2, 1) both;
        }
        .fetch-pet-celebration-particle {
          font-size: 1.35rem;
          animation: fetch-pet-celebration-burst 1.35s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: var(--pet-burst-delay);
        }
      `}</style>
    </section>
  )
}

function PetEditSheet({
  open,
  pets,
  selectedPetId,
  petNames,
  petRanks,
  userDisplayName,
  heroGender,
  gemsCount,
  isPetFed,
  petFeedTimerLabel,
  onSelectPet,
  onPetNameChange,
  onUserDisplayNameChange,
  onHeroGenderChange,
  onRankUpSelectedPet,
  onClose,
}: {
  open: boolean
  pets: ReadonlyArray<FetchHomePet>
  selectedPetId: FetchPetId
  petNames: Record<FetchPetId, string>
  petRanks: Record<FetchPetId, number>
  userDisplayName: string
  heroGender: HeroGender
  gemsCount: number
  isPetFed: boolean
  petFeedTimerLabel: string
  onSelectPet: (petId: FetchPetId) => void
  onPetNameChange: (petId: FetchPetId, name: string) => void
  onUserDisplayNameChange: (name: string) => void
  onHeroGenderChange: (gender: HeroGender) => void
  onRankUpSelectedPet: () => void
  onClose: () => void
}) {
  if (!open) return null
  const selectedPet = pets.find((pet) => pet.id === selectedPetId) ?? pets[0]
  const selRank = normalizePetRank(petRanks[selectedPet.id])
  const rankCost = petRankUpGemCost(selRank)
  const atMaxRank = selRank >= PET_RANK_MAX
  const canAffordRankUp = gemsCount >= rankCost && !atMaxRank

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#120822]/45 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close editor"
        onClick={onClose}
      />
      <section className="relative z-[1] w-full max-w-[430px] overflow-hidden rounded-[2rem] bg-white p-4 text-[#1c1340] shadow-[0_28px_70px_-34px_rgba(30,15,80,0.75)] ring-1 ring-violet-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c3aed]">Home & pet</p>
            <h2 className="mt-1 text-[24px] font-black leading-none tracking-[-0.06em]">Make it yours</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-[#7c3aed] transition-colors active:bg-violet-100"
            aria-label="Close editor"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <label className="mt-4 block text-[10px] font-black uppercase tracking-[0.12em] text-[#7c3aed]" htmlFor="fetch-home-user-display-name">
          Your name
        </label>
        <input
          id="fetch-home-user-display-name"
          value={userDisplayName}
          onChange={(event) => onUserDisplayNameChange(event.target.value)}
          maxLength={48}
          className="mt-1 w-full rounded-2xl border-0 bg-violet-50 px-4 py-3 text-[16px] font-black text-[#1c1340] outline-none ring-1 ring-violet-100 focus:ring-2 focus:ring-[#7c3aed]"
          placeholder="Your first name"
          autoComplete="given-name"
          aria-label="Your display name"
        />
        <p className="mt-1 text-[11px] font-semibold leading-snug text-zinc-500">
          Shown on your welcome card.
        </p>

        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.12em] text-[#7c3aed]">Hero banner</p>
        <p className="mt-1 text-[11px] font-semibold leading-snug text-zinc-500">
          Female uses illustrated home banners while you&apos;re not adventuring: one when your pet is fed, another when hungry.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Hero banner gender">
          <button
            type="button"
            onClick={() => onHeroGenderChange('male')}
            className={[
              'rounded-2xl px-3 py-3 text-center text-[13px] font-black uppercase tracking-[0.06em] transition-transform active:scale-[0.98]',
              heroGender === 'male'
                ? 'bg-[#1c1340] text-white ring-2 ring-[#7c3aed]'
                : 'bg-violet-50 text-[#1c1340] ring-1 ring-violet-100',
            ].join(' ')}
          >
            Male
          </button>
          <button
            type="button"
            onClick={() => onHeroGenderChange('female')}
            className={[
              'rounded-2xl px-3 py-3 text-center text-[13px] font-black uppercase tracking-[0.06em] transition-transform active:scale-[0.98]',
              heroGender === 'female'
                ? 'bg-[#1c1340] text-white ring-2 ring-[#7c3aed]'
                : 'bg-violet-50 text-[#1c1340] ring-1 ring-violet-100',
            ].join(' ')}
          >
            Female
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {pets.map((pet) => {
            const selected = pet.id === selectedPetId
            const name = petNames[pet.id] || pet.defaultName
            return (
              <button
                key={pet.id}
                type="button"
                onClick={() => onSelectPet(pet.id)}
                className={[
                  'relative overflow-hidden rounded-3xl p-2 text-left transition-transform active:scale-[0.98]',
                  selected
                    ? 'bg-[#1c1340] text-white ring-2 ring-[#7c3aed]'
                    : 'bg-violet-50 text-[#1c1340] ring-1 ring-violet-100',
                ].join(' ')}
              >
                <div className="relative mx-auto w-[88%] rounded-2xl bg-gradient-to-br from-[#c4b5fd] via-[#a78bfa] to-[#7c3aed] p-[2px] shadow-[0_8px_22px_-16px_rgba(76,29,149,0.45)]">
                  <div className="relative overflow-hidden rounded-[11px] bg-white">
                    <div className="relative h-[7.25rem] overflow-hidden">
                      <img
                        src={pet.avatarUrl}
                        alt={`${name} avatar`}
                        draggable={false}
                        className="absolute left-1/2 top-0 z-[1] h-[10rem] w-[10rem] max-w-none -translate-x-1/2 -translate-y-[22%] select-none object-cover object-top"
                      />
                    </div>
                  </div>
                </div>
                <span className="pointer-events-none absolute right-3 top-3 rounded-md bg-[#1c1340]/85 px-1.5 py-0.5 text-[9px] font-black tabular-nums text-white ring-1 ring-white/30">
                  R{normalizePetRank(petRanks[pet.id])}
                </span>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-black leading-none">{name}</p>
                    <p className={['mt-1 text-[9px] font-bold uppercase tracking-[0.08em]', selected ? 'text-violet-200' : 'text-violet-500'].join(' ')}>
                      {pet.label}
                    </p>
                  </div>
                  {selected ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M5 12.5 9.3 17 19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>

        <label className="mt-4 block text-[10px] font-black uppercase tracking-[0.12em] text-[#7c3aed]" htmlFor="fetch-pet-editor-name">
          Pet name
        </label>
        <input
          id="fetch-pet-editor-name"
          value={petNames[selectedPet.id] || selectedPet.defaultName}
          onChange={(event) => onPetNameChange(selectedPet.id, event.target.value)}
          maxLength={16}
          className="mt-1 w-full rounded-2xl border-0 bg-violet-50 px-4 py-3 text-[16px] font-black text-[#1c1340] outline-none ring-1 ring-violet-100 focus:ring-2 focus:ring-[#7c3aed]"
          aria-label="Edit selected pet name"
        />

        <div className="mt-4 rounded-2xl bg-violet-50 p-3 ring-1 ring-violet-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7c3aed]">Pet rank</p>
              <p className="mt-1 text-[18px] font-black tabular-nums leading-none text-[#1c1340]">
                R{selRank}
                {atMaxRank ? (
                  <span className="ml-2 align-middle text-[10px] font-black uppercase tracking-[0.08em] text-emerald-600">
                    Max
                  </span>
                ) : (
                  <span className="ml-2 align-middle text-[11px] font-bold text-zinc-500">→ R{selRank + 1}</span>
                )}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-500">Gems</p>
              <p className="mt-0.5 flex items-center justify-end gap-1 text-[13px] font-black tabular-nums text-[#1c1340]">
                <img src={purpleGemIconUrl} alt="" aria-hidden className="h-4 w-4 object-contain" draggable={false} />
                {gemsCount}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRankUpSelectedPet}
            disabled={!canAffordRankUp}
            className={[
              'mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-b-[4px] px-4 py-3 text-[11px] font-black uppercase tracking-[0.06em] shadow-none transition-[transform,border-bottom-width] duration-150 sm:text-[12px]',
              canAffordRankUp
                ? 'border-[#4c1d95] bg-gradient-to-b from-[#a78bfa] to-[#7c3aed] text-white active:translate-y-0.5 active:border-b-2'
                : 'cursor-not-allowed border-zinc-300 border-b-zinc-400 bg-zinc-100 text-zinc-400',
            ].join(' ')}
            aria-label={
              atMaxRank ? 'Pet is at max rank' : `Spend ${rankCost} gems to rank up ${selectedPet.defaultName}`
            }
          >
            {atMaxRank ? (
              'Max rank reached'
            ) : (
              <>
                <img src={purpleGemIconUrl} alt="" aria-hidden className="h-4 w-4 object-contain" draggable={false} />
                Rank up — {rankCost} gems
              </>
            )}
          </button>
          {!atMaxRank && gemsCount < rankCost ? (
            <p className="mt-2 text-center text-[11px] font-semibold text-amber-700">
              Need {rankCost - gemsCount} more gems
            </p>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-violet-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#4c1d95]">
          <span>{isPetFed ? 'Fed and ready' : 'Hungry now'}</span>
          <span>{petFeedTimerLabel}</span>
        </div>
      </section>
    </div>,
    document.body,
  )
}

function AdventureRewardIcon({ type }: { type: 'loot' | 'discounts' | 'tickets' | 'mystery' }) {
  if (type === 'loot') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M4.5 8.75 12 13l7.5-4.25M12 13v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (type === 'discounts') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 12 12 4h6v6l-8 8-6-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="m9 15 6-6M9.5 9.5h.01M14.5 14.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    )
  }
  if (type === 'tickets') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 8.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4v-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 3" />
      </svg>
    )
  }
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4.5a6.5 6.5 0 0 0-6.5 6.5 6.2 6.2 0 0 0 2.2 4.8c.8.7 1.3 1.4 1.3 2.4h6c0-1 .5-1.7 1.3-2.4a6.2 6.2 0 0 0 2.2-4.8A6.5 6.5 0 0 0 12 4.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 21h4M10.5 11a1.5 1.5 0 1 1 2.6 1c-.7.6-1.1 1-1.1 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function AdventureRewardsRow() {
  const rewards: Array<{ type: 'loot' | 'discounts' | 'tickets' | 'mystery'; label: string; sub: string }> = [
    { type: 'loot', label: 'Loot', sub: 'Find items' },
    { type: 'discounts', label: 'Discounts', sub: 'Save money' },
    { type: 'tickets', label: 'Tickets', sub: 'Bid wars' },
    { type: 'mystery', label: 'Mystery', sub: 'Epic rewards' },
  ]

  return (
    <div className="mt-2 grid grid-cols-4 gap-1.5" aria-label="Adventure rewards">
      {rewards.map((reward) => (
        <div
          key={reward.type}
          className="flex min-w-0 flex-col items-center px-1 py-1 text-center text-[#4c1d95]"
        >
          <span className="flex h-8 w-8 items-center justify-center">
            <AdventureRewardIcon type={reward.type} />
          </span>
          <span className="mt-0.5 max-w-full truncate text-[8px] font-black leading-none text-[#1c1340]">{reward.label}</span>
          <span className="mt-0.5 max-w-full truncate text-[7px] font-bold leading-none text-zinc-500">{reward.sub}</span>
        </div>
      ))}
    </div>
  )
}

function AdventureReturnBar({
  canEndEarly,
  onEndEarly,
  onComplete,
  onElapsedSeconds,
  isPetFed,
  petName,
}: {
  canEndEarly: boolean
  onEndEarly: () => void
  onComplete: () => void
  onElapsedSeconds?: (elapsedSeconds: number) => void
  isPetFed: boolean
  petName: string
}) {
  const totalSeconds = ADVENTURE_MISSION_DURATION_SEC
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds)
  const [payPromptOpen, setPayPromptOpen] = useState(false)
  const missionPaused = !isPetFed

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!isPetFed) return
      setRemainingSeconds((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [isPetFed])

  useEffect(() => {
    if (remainingSeconds === 0) onComplete()
  }, [remainingSeconds, onComplete])

  useEffect(() => {
    onElapsedSeconds?.(Math.max(0, totalSeconds - remainingSeconds))
  }, [remainingSeconds, totalSeconds, onElapsedSeconds])

  const progress = Math.max(0, Math.min(1, 1 - remainingSeconds / totalSeconds))
  const backIn = formatBackInClock(remainingSeconds)

  return (
    <>
      <section
        className="-mx-0.5 px-0.5"
        aria-label={
          missionPaused
            ? `Adventure paused until ${petName} is fed. Time left ${backIn}.`
            : `Adventure in progress. Back in ${backIn}.`
        }
        data-fetch-tour-target="adventure"
      >
        <div className="overflow-visible rounded-3xl bg-white p-2.5 shadow-[0_12px_28px_-18px_rgba(76,29,149,0.45)] ring-1 ring-violet-200/70">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-black leading-none tracking-[-0.02em] text-[#1c1340]">
                {ADVENTURE_THEME_TITLE} mission
              </p>
              <p className="mt-1 truncate text-[11px] font-bold leading-none text-zinc-500">
                {missionPaused
                  ? `Paused — feed ${petName} to resume the timer.`
                  : 'Fetch is searching for loot while you wait.'}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-violet-100" aria-hidden>
                <div
                  className="h-full rounded-full bg-[#7c3aed] transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
            <div
              className={[
                'min-w-[8.6rem] rounded-2xl px-3 py-2 text-center ring-1',
                missionPaused ? 'bg-amber-50 ring-amber-200/80' : 'bg-violet-50 ring-violet-100',
              ].join(' ')}
            >
              <p
                className={[
                  'text-[8px] font-black uppercase leading-none tracking-[0.12em]',
                  missionPaused ? 'text-amber-800' : 'text-[#4c1d95]',
                ].join(' ')}
              >
                {missionPaused ? 'Timer paused' : 'Mission returns in'}
              </p>
              <p className="mt-1 text-[20px] font-black leading-none tracking-[-0.06em] text-[#1c1340] tabular-nums">
                {backIn}
              </p>
              <p className="mt-1 text-[9px] font-extrabold leading-none text-[#7c3aed]">View missions &gt;</p>
            </div>
          </div>
          <AdventureRewardsRow />
          <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-zinc-500">
              {missionPaused ? 'Paused' : `${Math.round(progress * 100)}% complete`}
            </p>
            <button
              type="button"
              onClick={() => setPayPromptOpen(true)}
              disabled={!canEndEarly}
              className={
                [
                  'shrink-0 rounded-2xl border-b-[4px] px-4 py-2 text-center text-[10px] font-black uppercase leading-none tracking-[0.06em] text-white shadow-none transition-[transform,border-bottom-width] duration-150 disabled:opacity-65',
                  canEndEarly
                    ? 'border-[#090514] bg-gradient-to-b from-[#33225f] to-[#1c1340] active:translate-y-0.5 active:border-b-2'
                    : 'cursor-not-allowed border-zinc-400 bg-gradient-to-b from-zinc-300 to-zinc-400 text-white/85',
                ].join(' ')
              }
              aria-label={canEndEarly ? 'End adventure early' : 'Add funds to end adventure early'}
            >
              End
            </button>
          </div>
        </div>
      </section>
      {payPromptOpen
        ? createPortal(
            <div className="fixed inset-0 z-[95] flex items-end justify-center bg-[#120822]/45 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm">
              <button
                type="button"
                className="absolute inset-0 cursor-default"
                aria-label="Cancel payment"
                onClick={() => setPayPromptOpen(false)}
              />
              <div className="relative z-[1] w-full max-w-sm rounded-3xl bg-white p-4 text-center text-[#1c1340] shadow-[0_22px_54px_-22px_rgba(30,15,80,0.65)] ring-1 ring-violet-100">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c3aed]">Finish mission early</p>
                <h3 className="mt-2 text-[20px] font-black leading-tight tracking-[-0.04em]">Pay $0.99?</h3>
                <p className="mx-auto mt-1 max-w-[15rem] text-[12px] font-semibold leading-snug text-zinc-600">
                  Fetch will return from the {ADVENTURE_THEME_TITLE.toLowerCase()} mission now.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayPromptOpen(false)}
                    className="rounded-2xl bg-zinc-100 px-4 py-3 text-[12px] font-black uppercase tracking-[0.06em] text-zinc-700 ring-1 ring-zinc-200 active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPayPromptOpen(false)
                      onEndEarly()
                    }}
                    className={[feed3dPurpleCta, 'rounded-2xl px-4 py-3 text-[12px] font-black uppercase tracking-[0.06em]'].join(' ')}
                  >
                    Pay now
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function StartAdventureBar({
  onStart,
  canStartMission,
  petName,
}: {
  onStart: () => void
  canStartMission: boolean
  petName: string
}) {
  return (
    <section
      className="-mx-0.5 px-0.5"
      aria-label={canStartMission ? 'Start adventure' : 'Start adventure locked until pet is fed'}
      data-fetch-tour-target="adventure"
    >
      <div className="overflow-visible rounded-3xl bg-white p-2.5 shadow-[0_12px_28px_-18px_rgba(76,29,149,0.45)] ring-1 ring-violet-200/70">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-black leading-none tracking-[-0.01em] text-[#1c1340]">
              Send Fetch on a mission!
            </p>
            <p className="mt-1 text-[11px] font-bold leading-none text-zinc-500">
              {canStartMission
                ? "He'll search for loot while you wait."
                : `Feed ${petName} first to start a mission.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!canStartMission) return
              onStart()
            }}
            disabled={!canStartMission}
            className={[
              'min-w-[8.9rem] shrink-0 rounded-2xl px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.06em]',
              canStartMission
                ? feed3dPurpleCta
                : 'cursor-not-allowed border-b-[4px] border-b-zinc-300/80 bg-zinc-100 text-zinc-500 shadow-none',
            ].join(' ')}
            aria-label={canStartMission ? 'Start adventure' : `Start mission locked — feed ${petName} first`}
          >
            Start mission
          </button>
        </div>
        <AdventureRewardsRow />
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

function BidWarsAdventurePromo({
  onJoin,
  bannerSrc,
}: {
  onJoin?: () => void
  bannerSrc: string
}) {
  return (
    <section className="px-2" aria-label="Bid Wars" data-fetch-tour-target="bidWar">
      <div className="flex items-center gap-2.5 rounded-3xl bg-white p-2.5">
        <button
          type="button"
          onClick={onJoin}
          className="fetch-bid-war-btn-rumble relative flex h-[2.85rem] min-w-[9.5rem] shrink-0 items-center justify-center whitespace-nowrap rounded-2xl border border-violet-200/25 border-b-[4px] border-b-[#4c1d95] bg-gradient-to-b from-[#a78bfa] via-[#7c3aed] to-[#5b21b6] px-4 text-center text-[13px] font-black uppercase leading-none tracking-[0.04em] text-white shadow-none ring-1 ring-[#4c1d95]/50 transition-[transform,border-bottom-width] duration-150 active:translate-y-0.5 active:border-b-[2px] active:brightness-[1.08] sm:h-[3rem] sm:min-w-[10.25rem] sm:text-[14px]"
          aria-label="Join a Bid War"
        >
          <span className="relative z-[1]">Join a Bid War</span>
        </button>
        <div className="min-w-0 flex-1 overflow-hidden rounded-2xl bg-white">
          <img
            src={bannerSrc}
            alt="Bid Wars. Compete. Bid. Win."
            className="block aspect-[2/1] w-full select-none object-cover object-left"
            draggable={false}
          />
        </div>
      </div>
    </section>
  )
}

type DailyGemClaimFxProps = {
  amount: number
  source: { x: number; y: number }
  target: { x: number; y: number }
  particleCount?: number
  onImpact: () => void
  onDone: () => void
}

function DailyGemClaimFx({ amount, source, target, particleCount = 14, onImpact, onDone }: DailyGemClaimFxProps) {
  const impactRef = useRef(onImpact)
  const doneRef = useRef(onDone)
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map((_, i) => {
      const h = ((i * 2654435761) >>> 0) / 4294967296
      const h2 = (((i + 17) * 2246822519) >>> 0) / 4294967296
      const sx = source.x + (h - 0.5) * 18
      const sy = source.y + h2 * 16
      const tx = target.x - sx + (h2 - 0.5) * 16
      const ty = target.y - sy + (h - 0.5) * 18
      return {
        sx,
        sy,
        tx,
        ty,
        delay: h2 * 0.2 + 0.35,
        dur: 0.65 + h * 0.24,
      }
    })
  }, [particleCount, source.x, source.y, target.x, target.y])

  useEffect(() => {
    impactRef.current = onImpact
    doneRef.current = onDone
  }, [onImpact, onDone])

  useEffect(() => {
    playUiFeedback('gems_collect')
    const sparkle1 = window.setTimeout(() => playUiFeedback('coin_hit'), 360)
    const sparkle2 = window.setTimeout(() => playUiFeedback('coin_hit'), 560)
    const hit = window.setTimeout(() => {
      playUiFeedback('coin_hit')
      impactRef.current()
    }, 920)
    const sparkle3 = window.setTimeout(() => playUiFeedback('coin_hit'), 1040)
    const done = window.setTimeout(() => doneRef.current(), 1400)
    return () => {
      window.clearTimeout(sparkle1)
      window.clearTimeout(sparkle2)
      window.clearTimeout(hit)
      window.clearTimeout(sparkle3)
      window.clearTimeout(done)
    }
  }, [])

  return createPortal(
    <>
      <div className="fetch-daily-gem-drop">
        <img src={purpleGemIconUrl} alt="" aria-hidden className="h-8 w-8 object-contain" draggable={false} />
        <span className="flex flex-col leading-none">
          <span className="text-[1.05rem] font-black tabular-nums">+{amount}</span>
          <span className="mt-0.5 text-[0.55rem] font-black uppercase tracking-[0.14em] text-[#7c3aed]/70">
            Gems added
          </span>
        </span>
      </div>
      <div
        className="fetch-daily-gem-target-burst"
        style={{ left: `${target.x}px`, top: `${target.y}px` }}
        aria-hidden
      >
        <img src={purpleGemIconUrl} alt="" className="h-6 w-6 object-contain" draggable={false} />
      </div>
      {particles.map((p, i) => (
        <img
          key={i}
          src={purpleGemIconUrl}
          alt=""
          aria-hidden
          className="fetch-daily-gem-fly"
          draggable={false}
          style={
            {
              left: `${p.sx}px`,
              top: `${p.sy}px`,
              '--fx-tx': `${p.tx}px`,
              '--fx-ty': `${p.ty}px`,
              '--fx-delay': `${p.delay}s`,
              '--fx-dur': `${p.dur}s`,
            } as CSSProperties
          }
        />
      ))}
    </>,
    document.body,
  )
}

function DailyRewardTaskCards({
  completed,
  onClaim,
}: {
  completed: readonly DailyRewardTaskId[]
  onClaim: (id: DailyRewardTaskId, sourceEl?: HTMLElement | null) => void
}) {
  return (
    <section className="px-2" aria-label="Daily gem tasks">
      <div className="grid grid-cols-1 gap-1.5">
        {DAILY_REWARD_TASKS.map((task) => {
          const done = completed.includes(task.id)
          return (
            <div
              key={task.id}
              data-daily-task-card
              className={[
                'flex min-h-[3.75rem] w-full items-center gap-2 rounded-xl border bg-white px-2 py-1.5 text-left shadow-none transition-colors duration-150',
                done
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-violet-200/80 active:bg-violet-50',
              ].join(' ')}
              aria-label={`${task.title}. Reward ${DAILY_REWARD_GEMS} gems. ${done ? 'Completed today' : 'Claim once per day'}`}
            >
              <span
                className={[
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#4c1d95] ring-1',
                  done ? 'bg-emerald-100 ring-emerald-200' : 'bg-violet-100 ring-violet-200',
                ].join(' ')}
                aria-hidden
              >
                {done ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M7 4h10l4 5-9 11L3 9l4-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M3 9h18M8 4l4 16 4-16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px] font-black leading-none tracking-[-0.02em] text-[#1c1340]">
                  {task.title}
              </span>
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-black text-[#4c1d95]">
                <img
                  src={purpleGemIconUrl}
                  alt=""
                  aria-hidden
                  className="h-3 w-3 object-contain"
                  draggable={false}
                  loading="lazy"
                />
                <span>{DAILY_REWARD_GEMS}</span>
              </span>
              {done ? (
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.06em] text-emerald-700">
                  Done
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => onClaim(task.id, e.currentTarget.closest('[data-daily-task-card]') as HTMLElement | null)}
                  className="shrink-0 rounded-full bg-[#7c3aed] px-2 py-1 text-[9px] font-black uppercase tracking-[0.06em] leading-none text-white"
                >
                  Claim
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function GemGameSelectionSheet({
  open,
  onClose,
  onOpenSpinWheel,
  onOpenMysteryFlip,
}: {
  open: boolean
  onClose: () => void
  onOpenSpinWheel?: () => void
  onOpenMysteryFlip?: () => void
}) {
  useEffect(() => {
    if (!open) return undefined

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#140b2f]/48 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-8 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close gem games"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="fetch-gem-games-title"
        className="relative w-full max-w-[26rem] overflow-hidden rounded-[1.7rem] border border-violet-200/80 bg-white p-3 text-[#1c1340] shadow-[0_24px_80px_rgba(28,19,64,0.38)]"
      >
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-violet-200/70 blur-2xl" aria-hidden />
        <div className="relative flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 ring-1 ring-violet-200">
            <img src={purpleGemIconUrl} alt="" aria-hidden className="h-8 w-8 object-contain" draggable={false} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7c3aed]">Gem games</p>
            <h2 id="fetch-gem-games-title" className="mt-0.5 text-[1.25rem] font-black leading-none tracking-[-0.05em]">
              Pick a game
            </h2>
            <p className="mt-1 text-[11px] font-bold leading-snug text-[#6b5a8f]">
              Spend or win gems in quick Fetch mini games.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-[#4c1d95] active:bg-violet-100"
            aria-label="Close"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="relative mt-3 grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => {
              playUiFeedback('gems_collect')
              onClose()
              onOpenSpinWheel?.()
            }}
            className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white p-3 text-left shadow-none active:bg-violet-100"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#7c3aed] text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="2.2" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-black leading-none tracking-[-0.03em]">Spin the wheel</span>
              <span className="mt-1 block text-[11px] font-bold leading-snug text-[#6b5a8f]">
                Open Prize Spin and try for gems, boosts, and bonuses.
              </span>
            </span>
            <span className="text-[#7c3aed]" aria-hidden>&rsaquo;</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playUiFeedback('gems_collect')
              onClose()
              onOpenMysteryFlip?.()
            }}
            className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-[#fff7ed] to-white p-3 text-left shadow-none active:bg-amber-50"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-300 to-orange-500 text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="4" y="3" width="13" height="18" rx="2.6" stroke="currentColor" strokeWidth="2.2" />
                <rect x="7" y="6" width="13" height="18" rx="2.6" stroke="currentColor" strokeWidth="2.2" fill="rgba(255,255,255,0.2)" />
                <path d="M11 13l1.5 1.5L16 11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-black leading-none tracking-[-0.03em]">
                Reveal what&rsquo;s behind
              </span>
              <span className="mt-1 block text-[11px] font-bold leading-snug text-[#6b5a8f]">
                Mystery Flip &mdash; flip cards, grab gifts, avoid the bombs.
              </span>
            </span>
            <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-black text-[#4c1d95]">
              Play
            </span>
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

function safeHasSeenFetchHomeTour(): boolean {
  try {
    return window.localStorage.getItem(FETCH_HOME_TOUR_STORAGE_KEY) === '1'
  } catch {
    return true
  }
}

function safeMarkFetchHomeTourSeen() {
  try {
    window.localStorage.setItem(FETCH_HOME_TOUR_STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}

function FetchHomeFirstEntryTour({ rootRef }: { rootRef: RefObject<HTMLDivElement | null> }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = FETCH_HOME_TOUR_STEPS[index]

  useEffect(() => {
    if (safeHasSeenFetchHomeTour()) return undefined
    const id = window.setTimeout(() => setOpen(true), 500)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!open) return undefined

    let frame = 0

    function updateRect() {
      const root = rootRef.current
      const target = root?.querySelector<HTMLElement>(`[data-fetch-tour-target="${step.id}"]`)
      if (!target) {
        setRect(null)
        return
      }
      setRect(target.getBoundingClientRect())
    }

    const root = rootRef.current
    const target = root?.querySelector<HTMLElement>(`[data-fetch-tour-target="${step.id}"]`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })

    frame = window.setTimeout(updateRect, 360)
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)

    return () => {
      window.clearTimeout(frame)
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [index, open, rootRef, step.id])

  if (!open || !step || !rect) return null

  const pad = 10
  const top = Math.max(6, rect.top - pad)
  const left = Math.max(6, rect.left - pad)
  const width = Math.min(window.innerWidth - left - 6, rect.width + pad * 2)
  const height = Math.min(window.innerHeight - top - 6, rect.height + pad * 2)
  const bubbleWidth = Math.min(320, window.innerWidth - 28)
  const bubbleLeft =
    step.placement === 'left'
      ? Math.max(14, Math.min(window.innerWidth - bubbleWidth - 14, left - bubbleWidth - 12))
      : Math.max(14, Math.min(window.innerWidth - bubbleWidth - 14, left + width / 2 - bubbleWidth / 2))
  const belowTop = top + height + 12
  const aboveTop = top - 12
  const bubbleTop =
    step.placement === 'above'
      ? Math.max(14, aboveTop - 176)
      : Math.min(window.innerHeight - 202, Math.max(14, belowTop))
  const isLast = index === FETCH_HOME_TOUR_STEPS.length - 1

  function finish() {
    safeMarkFetchHomeTourSeen()
    setOpen(false)
  }

  function next() {
    if (isLast) {
      finish()
      return
    }
    setIndex((current) => Math.min(FETCH_HOME_TOUR_STEPS.length - 1, current + 1))
  }

  return (
    <div className="fixed inset-0 z-[9997]" role="dialog" aria-modal="true" aria-label="Fetch app tutorial">
      <div
        className="fixed left-0 right-0 top-0 bg-[#13091f]/62 backdrop-blur-[5px]"
        style={{ height: top }}
        aria-hidden
      />
      <div
        className="fixed left-0 bg-[#13091f]/62 backdrop-blur-[5px]"
        style={{ top, width: left, height }}
        aria-hidden
      />
      <div
        className="fixed bg-[#13091f]/62 backdrop-blur-[5px]"
        style={{ top, left: left + width, right: 0, height }}
        aria-hidden
      />
      <div
        className="fixed bottom-0 left-0 right-0 bg-[#13091f]/62 backdrop-blur-[5px]"
        style={{ top: top + height }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed rounded-[1.35rem] ring-2 ring-white/95"
        style={{
          top,
          left,
          width,
          height,
          boxShadow: '0 0 0 1px rgba(124,58,237,0.8), 0 0 34px rgba(255,255,255,0.45)',
        }}
        aria-hidden
      />
      <div
        className="fixed rounded-[1.4rem] border border-white/20 bg-white p-4 text-[#1c1340] shadow-[0_28px_70px_-28px_rgba(15,23,42,0.75)]"
        style={{ top: bubbleTop, left: bubbleLeft, width: bubbleWidth }}
      >
        <span
          className={[
            'absolute h-4 w-4 rotate-45 border-white/20 bg-white',
            step.placement === 'above' ? '-bottom-2 border-b border-r' : '-top-2 border-l border-t',
          ].join(' ')}
          style={{
            left: Math.max(22, Math.min(bubbleWidth - 36, left + width / 2 - bubbleLeft - 8)),
          }}
          aria-hidden
        />
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7c3aed]">{step.eyebrow}</p>
        <h3 className="mt-1 text-[18px] font-black leading-tight tracking-[-0.04em]">{step.title}</h3>
        <p className="mt-2 text-[12.5px] font-semibold leading-snug text-zinc-600">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {FETCH_HOME_TOUR_STEPS.map((s, i) => (
              <span
                key={s.id}
                className={[
                  'h-1.5 rounded-full transition-[width,background-color]',
                  i === index ? 'w-5 bg-[#7c3aed]' : 'w-1.5 bg-violet-200',
                ].join(' ')}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            className={[
              feed3dPurpleCta,
              'rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-[0.1em]',
            ].join(' ')}
          >
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
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
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-b-[3px] border-violet-400/80 bg-gradient-to-b from-violet-50 to-violet-100/95 text-[#4c1d95] shadow-none transition-[transform,border-bottom-width] duration-150 active:translate-y-0.5 active:border-b-2"
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
                  className="rounded-2xl border-b-[3px] border-violet-400/85 bg-gradient-to-b from-violet-50 to-violet-100/95 px-2 py-3 text-center text-[11px] font-black text-[#4c1d95] shadow-none transition-[transform,border-bottom-width] duration-150 active:translate-y-0.5 active:border-b-2"
                >
                  {slot}
                </button>
              ))}
            </div>
          </section>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              className={[feed3dPurpleCta, 'rounded-3xl px-4 py-3 text-[12px] font-black uppercase tracking-[0.08em]'].join(
                ' ',
              )}
            >
              Add item
            </button>
            <button
              type="button"
              className={[feed3dDarkCta, 'rounded-3xl px-4 py-3 text-[12px] font-black uppercase tracking-[0.08em]'].join(
                ' ',
              )}
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
type HomeLiveNowReel = DropReel & { homeCategoryId: HomeCategoryChipId }

const HOME_LIVE_NOW_REELS: readonly HomeLiveNowReel[] = [
  {
    id: 'live-sneaker-seller-001',
    homeCategoryId: 'sneakers',
    imageUrls: [searchRealSneakersShoesUrl],
    mediaKind: 'images',
    poster: searchRealSneakersShoesUrl,
    title: 'Live sneaker deals',
    seller: '@SneakerScout',
    authorId: 'demo_sneaker_scout',
    priceLabel: 'From $89',
    blurb: 'A live seller walking through clean sneaker finds, quick sizing notes, and pickup-ready pairs.',
    likes: 128,
    growthVelocityScore: 1.35,
    watchTimeMsSeed: 186_000,
    categories: ['local_pickup', 'promo'],
    region: 'AU_WIDE',
  },
]

const HOME_SQUARE_LISTINGS = [
  {
    id: 'home-square-sneakers',
    homeCategoryId: 'sneakers',
    title: 'Fresh sneaker drops',
    priceLabel: 'From $89',
    imageUrl: searchRealSneakersShoesUrl,
  },
  {
    id: 'home-square-cards',
    homeCategoryId: 'cards',
    title: 'Trading card packs',
    priceLabel: 'From $12',
    imageUrl: searchRealTradingCardGamesUrl,
  },
  {
    id: 'home-square-jewellery',
    homeCategoryId: 'luxury',
    title: 'Jewellery finds',
    priceLabel: 'From $45',
    imageUrl: searchRealJewelleryWatchesUrl,
  },
  {
    id: 'home-square-electronics',
    homeCategoryId: 'tech',
    title: 'Tech deals',
    priceLabel: 'From $59',
    imageUrl: searchRealElectronicsUrl,
  },
  {
    id: 'home-square-watch',
    homeCategoryId: 'watches',
    title: 'Watch picks',
    priceLabel: 'From $120',
    imageUrl: searchRealJewelleryWatchesUrl,
  },
  {
    id: 'home-square-collectibles',
    homeCategoryId: 'collectibles',
    title: 'Collectibles shelf',
    priceLabel: 'From $18',
    imageUrl: searchRealToysHobbiesUrl,
  },
] as const

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
                'flex min-w-[5rem] shrink-0 flex-col items-center gap-1 rounded-2xl border-x border-t border-b-[3px] px-2.5 py-1.5 shadow-none transition-[transform,border-bottom-width,background-color,border-color,color] duration-150 active:translate-y-0.5 active:border-b-2',
                active
                  ? 'border-violet-300/90 border-b-violet-700/85 bg-gradient-to-b from-violet-100 to-violet-200/95 text-[#4c1d95]'
                  : 'border-zinc-200 border-b-zinc-400/80 bg-gradient-to-b from-white to-zinc-50 text-zinc-700 hover:text-[#4c1d95]',
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
  /** Live tiles on Explore — opens the Live tab + that stream (preferred over generic drops). */
  onOpenLiveStream?: (reel: DropReel) => void
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
  /** Opens the full Prize Spin game from the gem games picker. */
  onOpenSpinWheel?: () => void
  /** Opens the Mystery Flip card game from the gem games picker. */
  onOpenMysteryFlip?: () => void
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
    <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-b-[4px] border-violet-200/55 border-b-violet-300/70 bg-white text-left text-[#1c1528] shadow-none ring-1 ring-violet-200/50 transition-[transform,border-bottom-width] duration-150 active:translate-y-[1px] active:border-b-[2px]">
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
              'absolute right-1.5 top-1.5 z-[3] flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-b-[3px] border-zinc-200/95 border-b-zinc-400/90 bg-gradient-to-b from-white to-zinc-100 text-[#4c1d95] shadow-none transition-[transform,border-bottom-width] duration-150 active:translate-y-0.5 active:border-b-2',
              canQuickAdd ? '' : 'cursor-default opacity-45',
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

function HomeSquareListingCard({
  title,
  priceLabel,
  imageUrl,
  onOpen,
}: {
  title: string
  priceLabel: string
  imageUrl: string
  onOpen: () => void
}) {
  const label = `${title}, ${priceLabel}`
  const [notificationsOn, setNotificationsOn] = useState(false)
  const [saved, setSaved] = useState(false)

  return (
    <div
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border-x border-t border-violet-200/60 border-b-[4px] border-b-violet-400/55 bg-white text-left shadow-none transition-[transform,border-bottom-width,background-color] duration-150 active:translate-y-0.5 active:border-b-2 active:bg-violet-50"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-violet-100">
        <button
          type="button"
          aria-label={label}
          onClick={onOpen}
          className="absolute inset-0 z-[1] m-0 border-0 bg-transparent p-0"
        />
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />
        <div className="absolute right-1.5 top-1.5 z-[2] flex gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setNotificationsOn((v) => !v)
            }}
            className={[
              'flex h-7 w-7 items-center justify-center rounded-full border border-b-[3px] shadow-none transition-[transform,border-bottom-width] duration-150 active:translate-y-0.5 active:border-b-2',
              notificationsOn
                ? 'border-amber-200 border-b-amber-500 bg-amber-100 text-amber-700'
                : 'border-zinc-200 border-b-zinc-400 bg-white text-[#4c1d95]',
            ].join(' ')}
            aria-label={notificationsOn ? `Notifications on for ${title}` : `Turn on notifications for ${title}`}
            aria-pressed={notificationsOn}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M18 10a6 6 0 1 0-12 0c0 7-2.5 7-2.5 8h17S18 17 18 10Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path d="M9.5 20a2.8 2.8 0 0 0 5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setSaved((v) => !v)
            }}
            className={[
              'flex h-7 w-7 items-center justify-center rounded-full border border-b-[3px] shadow-none transition-[transform,border-bottom-width] duration-150 active:translate-y-0.5 active:border-b-2',
              saved
                ? 'border-violet-300 border-b-violet-700 bg-violet-100 text-[#4c1d95]'
                : 'border-zinc-200 border-b-zinc-400 bg-white text-[#4c1d95]',
            ].join(' ')}
            aria-label={saved ? `Saved ${title}` : `Save ${title}`}
            aria-pressed={saved}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} aria-hidden>
              <path
                d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-6-3.5L6 21V4.5Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-label={label}
        onClick={onOpen}
        className="min-w-0 p-2 text-left"
      >
        <p className="line-clamp-2 text-[11.5px] font-black leading-tight tracking-[-0.02em] text-[#1c1528]">
          {title}
        </p>
        <p className="mt-1 text-[11px] font-black tabular-nums text-violet-600">{priceLabel}</p>
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
  onOpenLiveStream,
  onOpenMarketplace,
  onOpenSearch: _onOpenSearch,
  onOpenPeerListing,
  onQuickBuyPeerListing,
  onJoinBidWar,
  onOpenSpinWheel,
  onOpenMysteryFlip,
  className = '',
  embedded = false,
  explorePromoBleed: _explorePromoBleed = 'page',
}: HomeShellForYouFeedProps) {
  const walletBalanceCents = useWalletBalanceCents()
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
  const [homeListingsRefreshNonce, setHomeListingsRefreshNonce] = useState(0)
  const homeLiveNowReels = useMemo<readonly DropReel[]>(
    () => HOME_LIVE_NOW_REELS.filter((reel) => reel.homeCategoryId === homeCategoryFilter),
    [homeCategoryFilter],
  )
  const homeSquareListings = useMemo(
    () => {
      const base =
        homeCategoryFilter === 'all'
          ? [...HOME_SQUARE_LISTINGS]
          : HOME_SQUARE_LISTINGS.filter((listing) => listing.homeCategoryId === homeCategoryFilter)
      if (base.length <= 1) return base
      const offset = homeListingsRefreshNonce % base.length
      return [...base.slice(offset), ...base.slice(0, offset)].slice(0, 4)
    },
    [homeCategoryFilter, homeListingsRefreshNonce],
  )
  /** Default off so ambient stays chill until the user starts an adventure (see `ambientRegisterAdventure`). */
  const [isAdventuring, setIsAdventuring] = useState(false)
  const [demoFundsCents, setDemoFundsCents] = useState(0)
  const [backpackStorageOpen, setBackpackStorageOpen] = useState(false)
  const [backpackItems, setBackpackItems] = useState<BackpackItem[]>(() => loadBackpackItems())
  const [adventureProgress, setAdventureProgress] = useState<AdventureProgress>(() =>
    loadAdventureProgress(),
  )
  const [demoGems, setDemoGems] = useState(() => loadDemoGems())
  const [dailyRewardState, setDailyRewardState] = useState<DailyRewardState>(() => loadDailyRewardState())
  const [dailyGemFx, setDailyGemFx] = useState<DailyGemFxState | null>(null)
  const [petProfile, setPetProfile] = useState<PetProfileState>(() => {
    const loaded = loadPetProfile()
    if (!embedded) return loaded
    const hungry = { ...loaded, fedUntil: 0, lastFedAt: Date.now() }
    savePetProfile(hungry)
    return hungry
  })
  const [petEditorOpen, setPetEditorOpen] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [gemGamesOpen, setGemGamesOpen] = useState(false)
  const [adventureRunSeq, setAdventureRunSeq] = useState(0)
  const [adventureElapsedSeconds, setAdventureElapsedSeconds] = useState(0)
  const [petCelebrationSeq, setPetCelebrationSeq] = useState(0)
  const demoGemsRef = useRef(demoGems)
  const rankUpLockRef = useRef(false)
  const adventureGemMinuteRef = useRef(0)
  const gemsAnimRef = useRef<number | null>(null)
  const [firstGiftOpen, setFirstGiftOpen] = useState(false)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const tourRootRef = useRef<HTMLDivElement | null>(null)
  const heroRef = useRef<HTMLDivElement | null>(null)
  const demoFundsLabel = `$${Math.floor(demoFundsCents / 100).toLocaleString('en-AU')}`
  const [heroDisplayName, setHeroDisplayName] = useState(() => {
    const s = loadSession()?.displayName?.trim()
    if (s && s.length >= 2) return s.slice(0, 48)
    return loadStoredHeroDisplayName() ?? 'Hayden'
  })
  const [heroGender, setHeroGender] = useState<HeroGender>(() => loadStoredHeroGender())

  function handleHeroDisplayNameChange(name: string) {
    const next = name.slice(0, 48)
    setHeroDisplayName(next)
    const t = next.trim()
    if (t.length >= 2) persistHeroDisplayName(t)
  }

  function handleHeroGenderChange(next: HeroGender) {
    setHeroGender(next)
    persistHeroGender(next)
  }

  useEffect(() => {
    if (!embedded || !isAdventuring) return undefined
    ambientRegisterAdventure(1)
    return () => ambientRegisterAdventure(-1)
  }, [embedded, isAdventuring])

  useEffect(
    () => () => {
      if (gemsAnimRef.current != null) cancelAnimationFrame(gemsAnimRef.current)
    },
    [],
  )

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    demoGemsRef.current = demoGems
  }, [demoGems])

  function handleStartAdventure() {
    setAdventureElapsedSeconds(0)
    adventureGemMinuteRef.current = 0
    setAdventureRunSeq((s) => s + 1)
    setIsAdventuring(true)
    playAdventureTrumpets()
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

  const animateGemCountTo = useCallback((target: number) => {
    const from = demoGemsRef.current
    const to = Math.max(from, target)
    if (to <= from) return
    if (gemsAnimRef.current != null) cancelAnimationFrame(gemsAnimRef.current)
    const start = performance.now()
    const dur = 920
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - (1 - t) ** 3
      const next = Math.round(from + (to - from) * eased)
      setDemoGems(next)
      if (t < 1) gemsAnimRef.current = requestAnimationFrame(tick)
      else {
        gemsAnimRef.current = null
        demoGemsRef.current = to
        setDemoGems(to)
        saveDemoGems(to)
      }
    }
    gemsAnimRef.current = requestAnimationFrame(tick)
  }, [])

  const pulseHomeGemIcon = useCallback(() => {
    const el = document.querySelector<HTMLElement>('[data-fetch-home-gems-icon]')
    if (!el) return
    el.classList.add('fetch-gems-impact-pulse')
    el.addEventListener('animationend', () => el.classList.remove('fetch-gems-impact-pulse'), { once: true })
  }, [])

  const spawnGemRewardFx = useCallback((amount: number, sourceEl?: HTMLElement | null, particleCount?: number) => {
    const chipRect = document.querySelector<HTMLElement>('[data-fetch-home-gems-chip]')?.getBoundingClientRect()
    const adventureRect = document
      .querySelector<HTMLElement>('[data-fetch-tour-target="adventure"]')
      ?.getBoundingClientRect()
    const srcRect = sourceEl?.getBoundingClientRect() ?? adventureRect
    setDailyGemFx({
      key: Date.now() + Math.floor(Math.random() * 1000),
      amount,
      particleCount,
      source: {
        x: srcRect ? srcRect.left + srcRect.width / 2 : window.innerWidth * 0.5,
        y: srcRect ? srcRect.top + srcRect.height / 2 : window.innerHeight * 0.62,
      },
      target: {
        x: chipRect ? chipRect.left + chipRect.width / 2 : window.innerWidth - 46,
        y: chipRect ? chipRect.top + chipRect.height / 2 : 34,
      },
    })
  }, [])

  function handleCompleteDailyRewardTask(id: DailyRewardTaskId, sourceEl?: HTMLElement | null) {
    if (dailyRewardState.completed.includes(id)) return
    const nextDaily: DailyRewardState = {
      date: todayKey(),
      completed: [...dailyRewardState.completed, id],
    }
    setDailyRewardState(nextDaily)
    saveDailyRewardState(nextDaily)
    spawnGemRewardFx(DAILY_REWARD_GEMS, sourceEl)
  }

  function handlePetEditorNameChange(petId: FetchPetId, name: string) {
    const nextName = name.slice(0, 16)
    setPetProfile((current) => {
      const next = {
        ...current,
        names: {
          ...current.names,
          [petId]: nextName,
        },
      }
      savePetProfile(next)
      return next
    })
  }

  function handleSelectPet(petId: FetchPetId) {
    setPetProfile((current) => {
      const next = {
        ...current,
        selectedPetId: petId,
      }
      savePetProfile(next)
      return next
    })
    playUiFeedback('coin_hit')
  }

  function handlePetRankUpSelectedPet() {
    if (rankUpLockRef.current) return
    const petId = petProfile.selectedPetId
    const currentRank = normalizePetRank(petProfile.ranks[petId])
    if (currentRank >= PET_RANK_MAX) return
    const cost = petRankUpGemCost(currentRank)
    const gems = demoGemsRef.current
    if (gems < cost) return
    rankUpLockRef.current = true
    const nextGems = gems - cost
    demoGemsRef.current = nextGems
    setDemoGems(nextGems)
    saveDemoGems(nextGems)
    setPetProfile((current) => {
      const r = normalizePetRank(current.ranks[petId])
      const next = {
        ...current,
        ranks: {
          ...current.ranks,
          [petId]: Math.min(PET_RANK_MAX, r + 1),
        },
      }
      savePetProfile(next)
      return next
    })
    playUiFeedback('coin_hit')
    pulseHomeGemIcon()
    queueMicrotask(() => {
      rankUpLockRef.current = false
    })
  }

  function handleFeedPet() {
    if (petProfile.fedUntil > nowMs) return
    const currentPet = FETCH_HOME_PETS.find((pet) => pet.id === petProfile.selectedPetId) ?? FETCH_HOME_PETS[0]
    const next: PetProfileState = {
      ...petProfile,
      names: {
        ...petProfile.names,
        [petProfile.selectedPetId]: petProfile.names[petProfile.selectedPetId]?.trim() || currentPet.defaultName,
      },
      fedUntil: nowMs + PET_FEED_COOLDOWN_MS,
      lastFedAt: nowMs,
    }
    setPetProfile(next)
    savePetProfile(next)
    playUiFeedback('gems_collect')
    playConfettiPops()
    setPetCelebrationSeq((seq) => seq + 1)
    window.setTimeout(() => playWinFanfare(), 120)
  }

  const petFeedRemainingMs = Math.max(0, petProfile.fedUntil - nowMs)
  const isPetFed = petFeedRemainingMs > 0
  const petFeedTimerLabel = isPetFed ? formatTimerLabel(petFeedRemainingMs) : 'Ready'
  const petHungrySinceMs = petProfile.lastFedAt > 0 ? Math.max(petProfile.lastFedAt, petProfile.fedUntil) : nowMs
  const petHungerStage: 'hungry' | 'risk' =
    !isPetFed && nowMs - petHungrySinceMs >= PET_STARVATION_RISK_AFTER_MS ? 'risk' : 'hungry'
  const activePet = FETCH_HOME_PETS.find((pet) => pet.id === petProfile.selectedPetId) ?? FETCH_HOME_PETS[0]
  const activePetName = petProfile.names[activePet.id]?.trim() || activePet.defaultName
  const activePetRank = normalizePetRank(petProfile.ranks[activePet.id])
  const useWomenHomeBanner = heroGender === 'female' && !isAdventuring
  const heroPetFedBannerUrl = useWomenHomeBanner ? fetchitHomeWomenBannerUrl : activePet.fedBannerUrl
  const heroPetHungryBannerUrl = useWomenHomeBanner ? fetchitHomeWomenHungryBannerUrl : activePet.hungryBannerUrl

  useEffect(() => {
    if (!embedded || !isAdventuring) return
    const completedMinute = Math.floor(adventureElapsedSeconds / 60)
    if (completedMinute <= 0 || completedMinute <= adventureGemMinuteRef.current) return
    adventureGemMinuteRef.current = completedMinute
    const adventureEl = document.querySelector<HTMLElement>('[data-fetch-tour-target="adventure"]')
      spawnGemRewardFx(1, adventureEl, 1)
  }, [adventureElapsedSeconds, embedded, isAdventuring, spawnGemRewardFx])

  useEffect(() => {
    if (isAdventuring) return
    adventureGemMinuteRef.current = 0
  }, [isAdventuring])

  function getBackpackRect(): DOMRect | null {
    const root = heroRef.current
    if (!root) return null
    const el = root.querySelector<HTMLElement>('[data-fetch-backpack-target]')
    return el ? el.getBoundingClientRect() : null
  }

  if (embedded) {
    return (
      <div
        ref={tourRootRef}
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
            adventureXp={adventureProgress.xp}
            fundsLabel={demoFundsLabel}
            gemsCount={demoGems}
            notificationsCount={1}
            petName={activePetName}
            petId={activePet.id}
            heroGender={heroGender}
            petAvatarUrl={activePet.avatarUrl}
            petFedBannerUrl={heroPetFedBannerUrl}
            petHungryBannerUrl={heroPetHungryBannerUrl}
            petFeedTimerLabel={petFeedTimerLabel}
            petRank={activePetRank}
            petHungerStage={petHungerStage}
            isPetFed={isPetFed}
            canFeedPet={!isPetFed}
            petCelebrationSeq={petCelebrationSeq}
            onAddDemoFunds={() => setDemoFundsCents((cents) => cents + 1000)}
            onViewBackpack={() => setBackpackStorageOpen(true)}
            onOpenGemGames={() => setGemGamesOpen(true)}
            onOpenPetEdit={() => setPetEditorOpen(true)}
            onFeedPet={handleFeedPet}
          />
          <div className="mt-3 px-2 sm:px-3">
            {isAdventuring ? (
              <AdventureReturnBar
                key={adventureRunSeq}
                isPetFed={isPetFed}
                petName={activePetName}
                canEndEarly={demoFundsCents >= EARLY_ADVENTURE_END_COST_CENTS}
                onElapsedSeconds={setAdventureElapsedSeconds}
                onEndEarly={() => {
                  if (demoFundsCents < EARLY_ADVENTURE_END_COST_CENTS) return
                  setDemoFundsCents((cents) => Math.max(0, cents - EARLY_ADVENTURE_END_COST_CENTS))
                  setAdventureElapsedSeconds(0)
                  setIsAdventuring(false)
                }}
                onComplete={() => {
                  setAdventureElapsedSeconds(0)
                  setIsAdventuring(false)
                }}
              />
            ) : (
              <StartAdventureBar
                canStartMission={isPetFed}
                petName={activePetName}
                onStart={handleStartAdventure}
              />
            )}
          </div>
        </div>
        <PetEditSheet
          open={petEditorOpen}
          pets={FETCH_HOME_PETS}
          selectedPetId={petProfile.selectedPetId}
          petNames={petProfile.names}
          petRanks={petProfile.ranks}
          userDisplayName={heroDisplayName}
          heroGender={heroGender}
          gemsCount={demoGems}
          isPetFed={isPetFed}
          petFeedTimerLabel={petFeedTimerLabel}
          onSelectPet={handleSelectPet}
          onPetNameChange={handlePetEditorNameChange}
          onUserDisplayNameChange={handleHeroDisplayNameChange}
          onHeroGenderChange={handleHeroGenderChange}
          onRankUpSelectedPet={handlePetRankUpSelectedPet}
          onClose={() => setPetEditorOpen(false)}
        />
        <div className="mt-3">
          <DailyRewardTaskCards completed={dailyRewardState.completed} onClaim={handleCompleteDailyRewardTask} />
        </div>
        <div className="mt-2">
          <BidWarsAdventurePromo
            onJoin={onJoinBidWar ?? onOpenMarketplace}
            bannerSrc={heroGender === 'female' ? fetchitBidWarsBannerFemaleUrl : fetchitBidWarsBannerUrl}
          />
        </div>
        <div className="mt-3 flex flex-col gap-3 px-2 pt-1">
          <div className="h-px w-full bg-violet-200/70" aria-hidden />
          <HomeCategoryChips value={homeCategoryFilter} onChange={setHomeCategoryFilter} />
          <section className="flex flex-col gap-2" aria-label="Live now" data-fetch-tour-target="liveStreams">
            <LiveNowGrid
              reels={homeLiveNowReels}
              onOpenDrops={onOpenDrops}
              onOpenLive={onOpenLiveStream}
              heroGender={heroGender}
            />
          </section>
          <div className="h-px w-full bg-violet-200/70" aria-hidden />
          <section className="min-w-0" aria-labelledby="fetch-home-live-listings-heading">
            <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-violet-100">
              <h3
                id="fetch-home-live-listings-heading"
                className="text-[15px] font-black leading-none tracking-[-0.04em] text-[#1c1340]"
              >
                {homeCategoryFilter === 'all'
                  ? 'Featured listings'
                  : `${HOME_CATEGORY_CHIPS.find((c) => c.id === homeCategoryFilter)?.label ?? 'Category'} listings`}
              </h3>
              <button
                type="button"
                onClick={() => setHomeListingsRefreshNonce((n) => n + 1)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[#4c1d95] shadow-none transition-colors active:bg-violet-200"
                aria-label="Refresh listings"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M20 6v5h-5M4 18v-5h5M18.2 9A7 7 0 0 0 6.4 6.4L4 8.8M5.8 15a7 7 0 0 0 11.8 2.6L20 15.2"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {homeSquareListings.map((listing) => (
                <HomeSquareListingCard
                  key={listing.id}
                  title={listing.title}
                  priceLabel={listing.priceLabel}
                  imageUrl={listing.imageUrl}
                  onOpen={onOpenMarketplace}
                />
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
        <FetchHomeFirstEntryTour rootRef={tourRootRef} />
        <GemGameSelectionSheet
          open={gemGamesOpen}
          onClose={() => setGemGamesOpen(false)}
          onOpenSpinWheel={onOpenSpinWheel}
          onOpenMysteryFlip={onOpenMysteryFlip}
        />
        {dailyGemFx ? (
          <DailyGemClaimFx
            key={dailyGemFx.key}
            amount={dailyGemFx.amount}
            source={dailyGemFx.source}
            target={dailyGemFx.target}
            particleCount={dailyGemFx.particleCount}
            onImpact={() => {
              playUiFeedback('coin_hit')
              pulseHomeGemIcon()
              animateGemCountTo(demoGemsRef.current + dailyGemFx.amount)
            }}
            onDone={() => setDailyGemFx(null)}
          />
        ) : null}
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
        <MyFetchRewardsBanner
          layout="standalone"
          walletBalanceCents={walletBalanceCents}
          onAddFunds={() => depositWallet(10_000, 'Added funds · quick top-up')}
        />
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
            className="shrink-0 rounded-lg border border-b-[3px] border-zinc-600/55 border-b-zinc-800/85 bg-gradient-to-b from-zinc-800 to-zinc-900 px-3 py-1 text-[11px] font-bold text-[#00ff6a] shadow-none transition-[transform,border-bottom-width] duration-150 hover:text-[#5cff9a] active:translate-y-0.5 active:border-b-2"
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
              className="flex w-[7.5rem] shrink-0 flex-col overflow-hidden rounded-2xl border-x border-t border-violet-200/60 border-b-[4px] border-b-violet-400/55 bg-gradient-to-b from-white to-violet-50/70 text-left shadow-none transition-[transform,border-bottom-width,background-color] duration-150 active:translate-y-0.5 active:border-b-2 active:bg-violet-100/75"
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
