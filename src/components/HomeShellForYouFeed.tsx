import { createPortal } from 'react-dom'
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { loadSession, updateUserProfile } from '../lib/fetchUserSession'
import {
  addBackpackItem,
  awardFirstAdventureXp,
  FIRST_ADVENTURE_MAP_ITEM,
  FIRST_ADVENTURE_XP_REWARD,
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
import type { DropReel } from '../lib/drops/types'
import fetchitStartPetUrl from '../assets/fetchit-start-pet.png'
import fetchitPetFrostUrl from '../assets/fetchit-pet-frost.png'
import fetchitPetFireUrl from '../assets/fetchit-pet-fire.png'
import fetchitPetAirUrl from '../assets/fetchit-pet-air.png'
import fetchitMysteryStarterPodUrl from '../assets/fetchit-mystery-starter-pod.png'
import fetchitBackpack3dUrl from '../assets/fetchit-backpack-3d.png'
import fetchitBackpackLevel1To4Url from '../assets/fetchit-backpack-level-1-4.png'
import fetchitHomePodRoomBgUrl from '../assets/fetchit-home-pod-room-bg.png'
import fetchitHomeHeroHumanLayerUrl from '../assets/fetchit-home-hero-human-layer.png'
import fetchitQuickBidWarsUrl from '../assets/fetchit-quick-bid-wars.png'
import fetchitQuickLiveAuctionsUrl from '../assets/fetchit-quick-live-auctions.png'
import fetchitQuickShopUrl from '../assets/fetchit-quick-shop.png'
import heroWalletCashUrl from '../assets/hero-wallet-cash.png'
import purpleGemIconUrl from '../assets/pokies-icons/gem.png'
import searchRealBabyKidsUrl from '../assets/search-categories-real/baby-kids.png'
import searchRealCoinsMoneyUrl from '../assets/search-categories-real/coins-money.png'
import searchRealElectronicsUrl from '../assets/search-categories-real/electronics.png'
import searchRealEventsUrl from '../assets/search-categories-real/events.png'
import searchRealJewelleryWatchesUrl from '../assets/search-categories-real/jewellery-watches.png'
import searchRealMensFashionUrl from '../assets/search-categories-real/mens-fashion.png'
import searchRealRocksCrystalsUrl from '../assets/search-categories-real/rocks-crystals.png'
import searchRealSneakersShoesUrl from '../assets/search-categories-real/sneakers-shoes.png'
import searchRealSportsCardsUrl from '../assets/search-categories-real/sports-cards.png'
import searchRealToysHobbiesUrl from '../assets/search-categories-real/toys-hobbies.png'
import searchRealTradingCardGamesUrl from '../assets/search-categories-real/trading-card-games.png'
import searchRealWomensFashionUrl from '../assets/search-categories-real/womens-fashion.png'
import { playAdventureTrumpets, playConfettiPops, playWinFanfare } from '../lib/fetchBattleSounds'
import { depositWallet, useWalletBalanceCents } from '../lib/data'
import { playUiFeedback } from '../voice/fetchFeedback'

const DAILY_REWARD_GEMS_STANDARD = 100
/** Win 3 bids / auctions (demo todo — Claim when finished). */
const DAILY_WIN_3_BIDS_GEMS = 300
/** Bonus after claiming every daily todo today. */
const DAILY_MYSTERY_UNLOCK_GEMS = 200
const DAILY_REWARD_STORAGE_KEY = 'fetch.home.dailyRewardTasks.v3'
const DAILY_REWARD_STORAGE_LEGACY_KEY = 'fetch.home.dailyRewardTasks.v2'
const DEMO_GEMS_STORAGE_KEY = 'fetch.home.demoGems.v1'
const PET_PROFILE_STORAGE_KEY = 'fetch.home.petProfile.v1'
const HOME_HERO_DISPLAY_NAME_KEY = 'fetch.home.heroDisplayName.v1'
const HOME_HERO_GENDER_KEY = 'fetch.home.heroGender.v1'
const HOME_PET_SLOTS_KEY = 'fetch.home.unlockedPetSlots.v1'
const STARTER_PET_REVEALED_KEY = 'fetch.home.starterPetRevealed.v1'
const PET_HUNTS_STORAGE_KEY = 'fetch.home.petHunts.v1'
const PET_HUNT_MAX_LIVE = 3
/** Minimum adventure level to open Bid Wars from the Explore quick-action card */
const BID_WARS_UNLOCK_ADVENTURE_LEVEL = 10
/** Same tiles as `WHATNOT_SEARCH_CATEGORIES` in HomeView (Search), plus Custom item. */
const PET_HUNT_CATEGORY_CAROUSEL_ITEMS: ReadonlyArray<{ label: string; image: string }> = [
  { label: 'Events', image: searchRealEventsUrl },
  { label: "Men's Fashion", image: searchRealMensFashionUrl },
  { label: 'Trading Card Games', image: searchRealTradingCardGamesUrl },
  { label: 'Jewellery & Watches', image: searchRealJewelleryWatchesUrl },
  { label: 'Sneakers & Shoes', image: searchRealSneakersShoesUrl },
  { label: 'Electronics', image: searchRealElectronicsUrl },
  { label: "Women's Fashion", image: searchRealWomensFashionUrl },
  { label: 'Baby & Kids', image: searchRealBabyKidsUrl },
  { label: 'Rocks & Crystals', image: searchRealRocksCrystalsUrl },
  { label: 'Toys & Hobbies', image: searchRealToysHobbiesUrl },
  { label: 'Coins & Money', image: searchRealCoinsMoneyUrl },
  { label: 'Sports Cards', image: searchRealSportsCardsUrl },
  { label: 'Custom item', image: fetchitMysteryStarterPodUrl },
]

const PH_SHEET =
  'relative z-[1] max-h-[min(44rem,calc(100dvh-1.5rem))] w-full max-w-[400px] overflow-y-auto rounded-t-[1.85rem] bg-gradient-to-b from-[#faf8ff] via-white to-[#f7f5ff] px-5 pb-6 pt-3 text-[#1c1340] shadow-[0_-24px_56px_-20px_rgba(49,16,95,0.42)] ring-1 ring-violet-200/45 [-webkit-overflow-scrolling:touch] sm:rounded-[1.85rem]'
const PH_CARD =
  'rounded-2xl border border-violet-100/85 bg-white/95 p-4 shadow-[0_14px_36px_-24px_rgba(76,29,149,0.28)]'
const PH_FIELD =
  'mt-1.5 w-full rounded-2xl border border-violet-100 bg-white px-3.5 py-3 text-[15px] font-black tracking-[-0.02em] text-[#1c1340] shadow-[inset_0_1px_3px_rgba(124,58,237,0.07)] outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-[#7c3aed]/12'
const PH_FIELD_SM =
  'mt-1.5 w-full rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-[13px] font-black text-[#1c1340] shadow-[inset_0_1px_2px_rgba(124,58,237,0.06)] outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-[#7c3aed]/20'

/** Persisted roster of which pals stay “included” when reopening Home & pet. */
const PET_EDITOR_INCLUDED_IDS_KEY = 'fetch.home.petEditorIncludedIds.v1'
const MAX_HOME_PET_SLOTS = 3
/** Pet edit sheet: max pals you can include at once (independent from banner unlock count). */
const PET_EDIT_INCLUDED_MAX = MAX_HOME_PET_SLOTS

type HeroGender = 'male' | 'female'
const PET_FEED_COOLDOWN_MS = 3 * 60 * 60 * 1000
const PET_STARVATION_RISK_AFTER_MS = 15 * 60 * 1000

type DailyRewardTaskId = 'bid_today' | 'watch_live_10' | 'win_3_bids'

type DailyRewardState = {
  date: string
  completed: DailyRewardTaskId[]
  /** Bonus row after finishing every todo for `date`. */
  dailyMysteryClaimed?: boolean
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

type FetchPetId = 'fetch' | 'frost' | 'fire' | 'air'

type FetchHomePet = {
  id: FetchPetId
  label: string
  defaultName: string
  avatarUrl: string
}

type PetProfileState = {
  selectedPetId: FetchPetId
  names: Record<FetchPetId, string>
  ranks: Record<FetchPetId, number>
  fedUntil: number
  lastFedAt: number
}

type PetHuntCondition = 'Any' | 'New' | 'Used'
type PetHuntAlertType = 'Instant' | 'Daily summary'
type PetHuntStatus = 'active' | 'found' | 'paused' | 'expired'
type PetHuntAutopilotAction = 'message' | 'bid' | 'buy'
type PetHuntListingSource = 'Listings' | 'Auctions' | 'Live drops'

type PetHunt = {
  id: string
  user_id: string
  pet_id: FetchPetId
  query: string
  category: string
  brand: string
  must_include: string
  exclude_terms: string
  sources: PetHuntListingSource[]
  max_price: number | null
  condition: PetHuntCondition
  alert_type: PetHuntAlertType
  autopilot_enabled: boolean
  autopilot_actions: PetHuntAutopilotAction[]
  autopilot_max_bid: number | null
  status: PetHuntStatus
  matched_listing_id: string | null
  created_at: number
  updated_at: number
}

const FETCH_HOME_PETS: ReadonlyArray<FetchHomePet> = [
  {
    id: 'fetch',
    label: 'Fetch pup',
    defaultName: 'Fetch',
    avatarUrl: fetchitStartPetUrl,
  },
  {
    id: 'frost',
    label: 'Frost pup',
    defaultName: 'Rime',
    avatarUrl: fetchitPetFrostUrl,
  },
  {
    id: 'fire',
    label: 'Fire pup',
    defaultName: 'Ember',
    avatarUrl: fetchitPetFireUrl,
  },
  {
    id: 'air',
    label: 'Air pup',
    defaultName: 'Nimbus',
    avatarUrl: fetchitPetAirUrl,
  },
]

/** Element vibes for roster card + optional banner glow accents. */
const FETCH_PET_CARD_EMOJI: Record<FetchPetId, string> = {
  fetch: '🐕',
  frost: '💧',
  fire: '🔥',
  air: '💨',
}

const FETCH_PET_ELEMENT: Record<FetchPetId, string> = {
  fetch: 'Loyal',
  frost: 'Frost',
  fire: 'Fire',
  air: 'Air',
}

const FETCH_PET_BANNER_PAD_TAILWIND: Record<FetchPetId, string> = {
  fetch: 'bg-amber-300/65',
  frost: 'bg-sky-400/55',
  fire: 'bg-orange-400/62',
  air: 'bg-violet-200/70',
}

function rosterPetBehindLeader(leader: FetchHomePet): FetchHomePet {
  const n = FETCH_HOME_PETS.length
  const idx = FETCH_HOME_PETS.findIndex((p) => p.id === leader.id)
  const ring = idx >= 0 ? idx : 0
  return FETCH_HOME_PETS[(ring - 1 + n) % n]!
}

type PetProfileCropPreset = 'circleSm' | 'circleLg' | 'rectMd'

/** Full-body greenscreen art → face-forward framing (less zoom = more of the mug + ears in frame). */
const PET_PROFILE_FACE_CROP: Record<FetchPetId, Record<PetProfileCropPreset, string>> = {
  fetch: {
    circleSm: 'min-h-[118%] min-w-[114%] translate-y-[0%] [object-position:50%_12%]',
    circleLg: 'min-h-[108%] min-w-[104%] translate-y-[0%] [object-position:50%_11%]',
    rectMd: 'min-h-[120%] min-w-[110%] translate-y-[3%] [object-position:50%_92%]',
  },
  frost: {
    circleSm: 'min-h-[114%] min-w-[112%] translate-y-[-1%] [object-position:50%_14%]',
    circleLg: 'min-h-[104%] min-w-[102%] translate-y-[-1%] [object-position:50%_13%]',
    rectMd: 'min-h-[116%] min-w-[108%] translate-y-[2%] [object-position:50%_90%]',
  },
  fire: {
    circleSm: 'min-h-[116%] min-w-[112%] translate-y-[0%] [object-position:50%_13%]',
    circleLg: 'min-h-[106%] min-w-[104%] translate-y-[0%] [object-position:50%_12%]',
    rectMd: 'min-h-[118%] min-w-[110%] translate-y-[3%] [object-position:50%_91%]',
  },
  air: {
    circleSm: 'min-h-[116%] min-w-[114%] translate-y-[1%] [object-position:50%_14%]',
    circleLg: 'min-h-[106%] min-w-[106%] translate-y-[1%] [object-position:50%_13%]',
    rectMd: 'min-h-[118%] min-w-[112%] translate-y-[4%] [object-position:50%_89%]',
  },
}

function petProfileFaceCrop(pet: FetchHomePet, preset: PetProfileCropPreset): string {
  return PET_PROFILE_FACE_CROP[pet.id]?.[preset] ?? PET_PROFILE_FACE_CROP.fetch[preset]
}

const STARTER_PET_SKILLS: ReadonlyArray<{ title: string; detail: string }> = [
  {
    title: 'Loyal companion',
    detail: 'Keeps morale high on adventures and recovers hunger a little faster after a good meal.',
  },
  {
    title: 'Deal nose',
    detail: 'Occasionally pings when a standout listing pops up nearby on the marketplace.',
  },
  {
    title: 'Playful spark',
    detail: 'While well-fed, snag a tiny bonus gem from select daily chores around Fetch.',
  },
]

const DEFAULT_PET_NAMES: Record<FetchPetId, string> = {
  fetch: 'Fetch',
  frost: 'Rime',
  fire: 'Ember',
  air: 'Nimbus',
}

const PET_RANK_MAX = 50

const DEFAULT_PET_RANKS: Record<FetchPetId, number> = {
  fetch: 1,
  frost: 1,
  fire: 1,
  air: 1,
}

function parseFetchPetId(value: unknown): FetchPetId | null {
  if (value === 'fetch' || value === 'frost' || value === 'fire' || value === 'air') return value
  return null
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
  {
    id: 'win_3_bids',
    title: 'Win 3 bids',
    detail: 'Win three auctions today — demo flow: Claim when done.',
  },
]

function dailyTaskRewardGems(id: DailyRewardTaskId): number {
  if (id === 'win_3_bids') return DAILY_WIN_3_BIDS_GEMS
  return DAILY_REWARD_GEMS_STANDARD
}

function allDailyRewardTasksComplete(completed: readonly DailyRewardTaskId[]): boolean {
  return DAILY_REWARD_TASKS.every((t) => completed.includes(t.id))
}

function parseDailyRewardTaskId(value: unknown): DailyRewardTaskId | null {
  if (value === 'bid_today' || value === 'watch_live_10' || value === 'win_3_bids') return value
  return null
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const DAILY_STREAK_STORAGE_KEY = 'fetch.home.dailyStreak.v1'

type DailyStreakPersisted = {
  lastDate: string
  count: number
}

function calendarDayAddYmd(ymd: string, deltaDays: number): string {
  const [ys, ms, ds] = ymd.split('-')
  const y = Number(ys)
  const m = Number(ms)
  const d = Number(ds)
  const dt = new Date(y, m - 1, d + deltaDays)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/** Visit-based streak on Home — bumps when the calendar day advances; resets after a missed day. */
function loadAndBumpDailyStreakCount(): number {
  const today = todayKey()
  try {
    const raw = window.localStorage.getItem(DAILY_STREAK_STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<DailyStreakPersisted>) : null
    const lastDate = typeof parsed?.lastDate === 'string' ? parsed.lastDate : null
    const prevCount =
      typeof parsed?.count === 'number' && Number.isFinite(parsed.count) ? Math.max(0, Math.floor(parsed.count)) : 0

    const validLast = lastDate && /^\d{4}-\d{2}-\d{2}$/.test(lastDate) ? lastDate : null

    if (!validLast) {
      const next: DailyStreakPersisted = { lastDate: today, count: 1 }
      window.localStorage.setItem(DAILY_STREAK_STORAGE_KEY, JSON.stringify(next))
      return 1
    }
    if (validLast === today) {
      return Math.max(1, prevCount || 1)
    }
    const nextCount =
      validLast === calendarDayAddYmd(today, -1) ? Math.max(1, prevCount || 1) + 1 : 1
    const next: DailyStreakPersisted = { lastDate: today, count: nextCount }
    window.localStorage.setItem(DAILY_STREAK_STORAGE_KEY, JSON.stringify(next))
    return nextCount
  } catch {
    return 1
  }
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
  const parseRaw = (raw: string | null): Partial<DailyRewardState> | null => {
    try {
      const parsed = JSON.parse(raw || 'null') as Partial<DailyRewardState> | null
      if (!parsed || typeof parsed !== 'object') return null
      return parsed
    } catch {
      return null
    }
  }
  const fromV3 = parseRaw(window.localStorage.getItem(DAILY_REWARD_STORAGE_KEY))
  const fromLegacy = fromV3 ? null : parseRaw(window.localStorage.getItem(DAILY_REWARD_STORAGE_LEGACY_KEY))
  const parsed = fromV3 ?? fromLegacy

  if (parsed?.date === date && Array.isArray(parsed.completed)) {
    const seen = new Set<DailyRewardTaskId>()
    const completed: DailyRewardTaskId[] = []
    for (const rawId of parsed.completed) {
      const id = parseDailyRewardTaskId(rawId)
      if (id != null && !seen.has(id)) {
        seen.add(id)
        completed.push(id)
      }
    }
    return {
      date,
      completed,
      dailyMysteryClaimed: parsed.dailyMysteryClaimed === true,
    }
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
    const selectedPetId: FetchPetId = parseFetchPetId(parsed?.selectedPetId) ?? 'fetch'
    const parsedNames = parsed?.names as Partial<Record<string, string>> | undefined
    const names: Record<FetchPetId, string> = { ...DEFAULT_PET_NAMES }
    for (const pet of FETCH_HOME_PETS) {
      const raw = parsedNames?.[pet.id]
      if (typeof raw === 'string' && raw.trim()) {
        names[pet.id] = raw.trim().slice(0, 16)
      } else if (pet.id === 'fetch' && legacyName) {
        names.fetch = legacyName
      }
    }
    const pr = parsed?.ranks as Partial<Record<string, unknown>> | undefined
    const ranks: Record<FetchPetId, number> = { ...DEFAULT_PET_RANKS }
    for (const pet of FETCH_HOME_PETS) {
      ranks[pet.id] = normalizePetRank(pr?.[pet.id] ?? DEFAULT_PET_RANKS[pet.id])
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

function parsePetHuntCondition(value: unknown): PetHuntCondition {
  return value === 'New' || value === 'Used' ? value : 'Any'
}

function parsePetHuntAlertType(value: unknown): PetHuntAlertType {
  return value === 'Daily summary' ? value : 'Instant'
}

function parsePetHuntStatus(value: unknown): PetHuntStatus {
  if (value === 'found' || value === 'paused' || value === 'expired') return value
  return 'active'
}

function parsePetHuntAutopilotAction(value: unknown): PetHuntAutopilotAction | null {
  if (value === 'message' || value === 'bid' || value === 'buy') return value
  return null
}

function parsePetHuntAutopilotActions(value: unknown): PetHuntAutopilotAction[] {
  const raw = Array.isArray(value) ? value : []
  const seen = new Set<PetHuntAutopilotAction>()
  for (const item of raw) {
    const action = parsePetHuntAutopilotAction(item)
    if (action) seen.add(action)
  }
  return seen.size ? [...seen] : ['message']
}

function parsePetHuntListingSource(value: unknown): PetHuntListingSource | null {
  if (value === 'Listings' || value === 'Auctions' || value === 'Live drops') return value
  return null
}

function parsePetHuntListingSources(value: unknown): PetHuntListingSource[] {
  const raw = Array.isArray(value) ? value : []
  const seen = new Set<PetHuntListingSource>()
  for (const item of raw) {
    const source = parsePetHuntListingSource(item)
    if (source) seen.add(source)
  }
  return seen.size ? [...seen] : ['Listings', 'Auctions', 'Live drops']
}

function normalizePetHuntPrice(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

function loadPetHunts(): PetHunt[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PET_HUNTS_STORAGE_KEY) || '[]') as Array<Partial<PetHunt>>
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((hunt): PetHunt[] => {
      const petId = parseFetchPetId(hunt.pet_id)
      const query = typeof hunt.query === 'string' ? hunt.query.trim().slice(0, 80) : ''
      if (!petId || !query) return []
      const createdAt = typeof hunt.created_at === 'number' && Number.isFinite(hunt.created_at) ? hunt.created_at : Date.now()
      return [
        {
          id: typeof hunt.id === 'string' && hunt.id.trim() ? hunt.id : `hunt_${createdAt}`,
          user_id: typeof hunt.user_id === 'string' && hunt.user_id.trim() ? hunt.user_id : 'local-demo-user',
          pet_id: petId,
          query,
          category: typeof hunt.category === 'string' && hunt.category.trim() ? hunt.category.trim().slice(0, 32) : 'Custom item',
          brand: typeof hunt.brand === 'string' && hunt.brand.trim() ? hunt.brand.trim().slice(0, 40) : '',
          must_include: typeof hunt.must_include === 'string' && hunt.must_include.trim() ? hunt.must_include.trim().slice(0, 120) : '',
          exclude_terms: typeof hunt.exclude_terms === 'string' && hunt.exclude_terms.trim() ? hunt.exclude_terms.trim().slice(0, 120) : '',
          sources: parsePetHuntListingSources(hunt.sources),
          max_price: typeof hunt.max_price === 'number' && Number.isFinite(hunt.max_price) ? Math.max(0, Math.round(hunt.max_price)) : null,
          condition: parsePetHuntCondition(hunt.condition),
          alert_type: parsePetHuntAlertType(hunt.alert_type),
          autopilot_enabled: hunt.autopilot_enabled === true,
          autopilot_actions: parsePetHuntAutopilotActions(hunt.autopilot_actions),
          autopilot_max_bid: typeof hunt.autopilot_max_bid === 'number' && Number.isFinite(hunt.autopilot_max_bid)
            ? Math.max(0, Math.round(hunt.autopilot_max_bid))
            : null,
          status: parsePetHuntStatus(hunt.status),
          matched_listing_id: typeof hunt.matched_listing_id === 'string' && hunt.matched_listing_id.trim() ? hunt.matched_listing_id : null,
          created_at: createdAt,
          updated_at: typeof hunt.updated_at === 'number' && Number.isFinite(hunt.updated_at) ? hunt.updated_at : createdAt,
        },
      ]
    })
  } catch {
    return []
  }
}

function savePetHunts(next: readonly PetHunt[]) {
  try {
    window.localStorage.setItem(PET_HUNTS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

function petHuntBoostPercent(petId: FetchPetId, rank: number): number {
  const base: Record<FetchPetId, number> = { fetch: 8, frost: 10, fire: 12, air: 14 }
  return Math.min(32, base[petId] + Math.floor(normalizePetRank(rank) / 5))
}

function normalizeHuntText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function huntTextTokens(value: string): string[] {
  return normalizeHuntText(value).split(/\s+/).filter((word) => word.length >= 2)
}

function petHuntMatchesListing(hunt: PetHunt, listing: PeerListing): boolean {
  if (hunt.max_price != null && listing.priceCents > hunt.max_price) return false
  if (hunt.condition === 'New' && listing.condition.toLowerCase() !== 'new') return false
  if (hunt.condition === 'Used' && listing.condition.toLowerCase() === 'new') return false
  if (listing.saleMode === 'auction' && !hunt.sources.includes('Auctions')) return false
  if (listing.saleMode !== 'auction' && !hunt.sources.includes('Listings') && !hunt.sources.includes('Live drops')) return false

  const query = normalizeHuntText(hunt.query)
  const brand = normalizeHuntText(hunt.brand)
  const category = normalizeHuntText(hunt.category)
  const haystack = normalizeHuntText([listing.title, listing.category, listing.keywords ?? '', listing.description].join(' '))
  /** 2+ chars so short phrases like “ps5”, “tv”, “grail” still match demo listings. */
  const queryWords = huntTextTokens(hunt.query).filter((word) => word.length >= 2)
  const queryHit =
    query.length >= 2 &&
    (haystack.includes(query) ||
      queryWords.some((word) => word.length >= 2 && haystack.includes(word)))
  const brandHit = !brand || haystack.includes(brand)
  const mustIncludeTokens = huntTextTokens(hunt.must_include)
  const mustIncludeHit = mustIncludeTokens.every((word) => haystack.includes(word))
  const excludeHit = huntTextTokens(hunt.exclude_terms).some((word) => haystack.includes(word))
  const categoryStem = category.replace(/s$/, '')
  const categoryHit =
    category.length >= 3 &&
    category !== 'custom item' &&
    category !== 'any' &&
    (haystack.includes(categoryStem) || haystack.includes(category))

  if (!brandHit || !mustIncludeHit || excludeHit) return false
  return queryHit || categoryHit || Boolean(brand && haystack.includes(brand))
}

function findPetHuntMatch(hunt: PetHunt, listings: readonly PeerListing[]): PeerListing | null {
  return listings.find((listing) => petHuntMatchesListing(hunt, listing)) ?? null
}

function petHuntDisplayPrice(cents: number | null): string {
  return cents == null ? 'Any price' : `Max ${formatAudFromCents(cents)}`
}

function petHuntDetailLabel(hunt: Pick<PetHunt, 'category' | 'max_price' | 'alert_type' | 'sources'>): string {
  const sourceLabel =
    hunt.sources.length >= 3
      ? 'All drops'
      : hunt.sources.join(' + ')
  return `${hunt.category} · ${sourceLabel} · ${petHuntDisplayPrice(hunt.max_price)} · ${hunt.alert_type}`
}

function petHuntAutopilotLabel(hunt: Pick<PetHunt, 'autopilot_enabled' | 'autopilot_actions'>): string {
  if (!hunt.autopilot_enabled) return 'Alerts only'
  const labelMap: Record<PetHuntAutopilotAction, string> = {
    message: 'Message',
    bid: 'Bid',
    buy: 'Buy',
  }
  return `Autopilot: ${hunt.autopilot_actions.map((action) => labelMap[action]).join(' + ')}`
}

function petHuntAutopilotResultLabel(hunt: Pick<PetHunt, 'autopilot_enabled' | 'autopilot_actions'>): string {
  if (!hunt.autopilot_enabled) return ''
  const parts: string[] = []
  if (hunt.autopilot_actions.includes('message')) parts.push('messaged the seller')
  if (hunt.autopilot_actions.includes('bid')) parts.push('placed your auto bid')
  if (hunt.autopilot_actions.includes('buy')) parts.push('started buy now')
  return parts.length ? ` Autopilot ${parts.join(', ')}.` : ''
}

/** First-time starter flow: Mystery Pod unlock (skip when already saved or veteran profile exists). */
function loadStarterPetRevealed(): boolean {
  try {
    const flagged = window.localStorage.getItem(STARTER_PET_REVEALED_KEY)
    if (flagged === '1') return true
    if (window.localStorage.getItem(PET_PROFILE_STORAGE_KEY)) {
      window.localStorage.setItem(STARTER_PET_REVEALED_KEY, '1')
      return true
    }
    return false
  } catch {
    return true
  }
}

function persistStarterPetRevealed() {
  try {
    window.localStorage.setItem(STARTER_PET_REVEALED_KEY, '1')
  } catch {
    /* ignore */
  }
}

/** Dev only: append `?resetStarterPet=1` to the URL once → clears starter flags & pet profile → reload → replay Mystery Pod flow. */
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  try {
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('resetStarterPet') === '1') {
      window.localStorage.removeItem(STARTER_PET_REVEALED_KEY)
      window.localStorage.removeItem(PET_PROFILE_STORAGE_KEY)
      sp.delete('resetStarterPet')
      const next = sp.toString()
      const base = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash}`
      window.history.replaceState({}, '', base)
      window.location.reload()
    }
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

function loadHomeUnlockedPetSlots(): number {
  try {
    const raw = window.localStorage.getItem(HOME_PET_SLOTS_KEY)
    const n = raw ? Number.parseInt(raw, 10) : 1
    const safe = Number.isFinite(n) ? n : 1
    return Math.min(MAX_HOME_PET_SLOTS, Math.max(1, Math.floor(safe)))
  } catch {
    return 1
  }
}

function saveHomeUnlockedPetSlots(next: number) {
  try {
    window.localStorage.setItem(
      HOME_PET_SLOTS_KEY,
      String(Math.min(MAX_HOME_PET_SLOTS, Math.max(1, Math.floor(next)))),
    )
  } catch {
    /* ignore */
  }
}

/** Gems for slot 2, then slot 3 (slot 1 is always included). */
function nextHomePetSlotUnlockGemCost(unlocked: number): number | null {
  if (unlocked >= MAX_HOME_PET_SLOTS) return null
  return unlocked === 1 ? 220 : unlocked === 2 ? 380 : null
}

/** Zero out alpha for typical lime / greenscreen backdrops (canvas, RGBA). */
function applyHomeBannerGreenscreenAlpha(data: Uint8ClampedArray) {
  const edge0 = 26
  const edge1 = 48
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a === 0) continue
    const maxRb = Math.max(r, b)
    const greenLead = g - maxRb
    if (greenLead > edge0 && g > 85) {
      const t = Math.min(1, Math.max(0, (greenLead - edge0) / edge1))
      data[i + 3] = Math.round(a * (1 - t))
      if (t > 0.15) {
        data[i + 1] = Math.round(Math.min(g, maxRb + (1 - t) * 40))
      }
    }
  }
}

/** Remove flat light studio backdrops (white / gray-white); tuned to avoid golden/cream fur. */
function applyNearWhiteBackdropAlpha(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!
    const a = data[i + 3]!
    if (a === 0) continue
    const mn = Math.min(r, g, b)
    const mx = Math.max(r, g, b)
    const spread = mx - mn
    if (mn < 250 || mx < 252 || spread > 12) continue
    const t = Math.min(1, Math.max(0, (mn - 242) / 14))
    data[i + 3] = Math.round(a * (1 - t))
  }
}

/** Tighter neutral-white key for full-body characters (avoids eating #f8–#fc white sneaker panels). */
function applyNearStrictWhiteBackdropAlpha(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!
    const a = data[i + 3]!
    if (a === 0) continue
    const mn = Math.min(r, g, b)
    const mx = Math.max(r, g, b)
    const spread = mx - mn
    if (mn < 252 || mx < 254 || spread > 8) continue
    const t = Math.min(1, Math.max(0, (mn - 246) / 10))
    data[i + 3] = Math.round(a * (1 - t))
  }
}

type WhiteBackdropKeyMode = boolean | 'strict'

function GreenscreenKeyedImage({
  src,
  className = '',
  imgClassName = '',
  keyNearWhiteBackdrop = false,
}: {
  src: string
  className?: string
  imgClassName?: string
  /** When set, keys bright neutral studio backdrops; `'strict'` only removes near-pure whites. */
  keyNearWhiteBackdrop?: WhiteBackdropKeyMode
}) {
  const [keyedSrc, setKeyedSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.decoding = 'async'
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      const w = img.naturalWidth
      const h = img.naturalHeight
      if (w < 2 || h < 2) return
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, w, h)
      applyHomeBannerGreenscreenAlpha(imageData.data)
      if (keyNearWhiteBackdrop === 'strict') {
        applyNearStrictWhiteBackdropAlpha(imageData.data)
      } else if (keyNearWhiteBackdrop) {
        applyNearWhiteBackdropAlpha(imageData.data)
      }
      ctx.putImageData(imageData, 0, 0)
      const dataUrl = canvas.toDataURL('image/png')
      if (!cancelled) setKeyedSrc(dataUrl)
    }
    img.onerror = () => {
      if (!cancelled) setKeyedSrc(null)
    }
    img.src = src
    return () => {
      cancelled = true
      setKeyedSrc(null)
    }
  }, [src, keyNearWhiteBackdrop])

  const hideGreenFlash = keyedSrc === null

  return (
    <span className={className}>
      <img
        src={hideGreenFlash ? src : keyedSrc}
        alt=""
        aria-hidden
        draggable={false}
        className={hideGreenFlash ? [imgClassName, 'opacity-0'].join(' ') : imgClassName}
      />
    </span>
  )
}

function homeDisplayImageForPet(pet: FetchHomePet): string {
  return pet.avatarUrl
}

function PetProfileImage({
  pet,
  className,
  preset = 'circleSm',
  imgClassName = '',
}: {
  pet: FetchHomePet
  className: string
  preset?: PetProfileCropPreset
  imgClassName?: string
}) {
  const crop = imgClassName.trim() ? imgClassName.trim() : petProfileFaceCrop(pet, preset)
  return (
    <GreenscreenKeyedImage
      src={homeDisplayImageForPet(pet)}
      className={className}
      imgClassName={['pointer-events-none w-auto max-w-none select-none object-cover', crop].join(' ')}
    />
  )
}

function formatTimerLabel(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatPetHuntElapsedLabel(createdAt: number, nowMs: number): string {
  const totalSeconds = Math.max(0, Math.floor((nowMs - createdAt) / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}:${String(s).padStart(2, '0')}`
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
    title: 'Pet Hunt',
    body: 'Send a pet to watch listings, auctions, and live drops for the exact item you want.',
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

function HeroMyPetsRosterMiniIconLock({ className = '' }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3M6 21h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HeroPetBowlIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={['shrink-0', className].join(' ')} aria-hidden>
      <path
        d="M4 11h16M7 11c.9 5.2 9.1 5.2 10 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
    </svg>
  )
}

function HeroMyPetsRosterCard({
  unlockedSlots,
  rosterActivePet,
  benchPet,
  petNames,
  petRanks: _petRanks,
  leaderName,
  leaderRank: _leaderRank,
  isPetFed,
  petFeedTimerLabel,
  petHungerStage,
  starterMysteryActive,
  mysteryPodImageUrl,
  canFeedPet,
  feedPetLabel,
  onOpenPetEdit,
  onFeedPet,
}: {
  unlockedSlots: number
  rosterActivePet: FetchHomePet
  benchPet: FetchHomePet | null
  petNames: Record<FetchPetId, string>
  petRanks: Record<FetchPetId, number>
  leaderName: string
  leaderRank: number
  isPetFed: boolean
  petFeedTimerLabel: string
  petHungerStage: 'hungry' | 'risk'
  starterMysteryActive: boolean
  mysteryPodImageUrl: string
  canFeedPet: boolean
  feedPetLabel: string
  onOpenPetEdit: () => void
  onFeedPet: () => void
}) {
  const benchName = benchPet ? petNames[benchPet.id]?.trim() || benchPet.defaultName : ''
  const trailPet =
    unlockedSlots >= 3 && benchPet && !starterMysteryActive ? rosterPetBehindLeader(rosterActivePet) : null
  const trailName = trailPet ? petNames[trailPet.id]?.trim() || trailPet.defaultName : ''
  const showTripleRosterRows = !!trailPet && !!benchPet && unlockedSlots >= 3 && !starterMysteryActive
  const nextUnlockGems = nextHomePetSlotUnlockGemCost(unlockedSlots)
  const trailUnlockGems = unlockedSlots === 2 ? nextHomePetSlotUnlockGemCost(2) : null
  const leadLabel = starterMysteryActive ? '???' : leaderName

  function rosterRow(
    pet: FetchHomePet | null,
    label: string,
    rowKey: string,
    emphasized: boolean,
    isMysteryAvatar: boolean,
  ) {
    return (
      <div
        key={rowKey}
        className={[
          'flex min-h-[1.65rem] items-center gap-1 rounded-md px-[3px] py-[2px] ring-1',
          emphasized && !isMysteryAvatar
            ? 'bg-gradient-to-br from-violet-50 to-white shadow-[0_2px_8px_-4px_rgba(15,23,42,0.1)] ring-zinc-200/90'
            : 'bg-white ring-zinc-200/90 shadow-[0_1px_6px_-4px_rgba(15,23,42,0.1)]',
        ].join(' ')}
      >
        {isMysteryAvatar || pet == null ? (
          <GreenscreenKeyedImage
            src={mysteryPodImageUrl}
            className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100"
            imgClassName="pointer-events-none h-[148%] w-auto max-w-[none] translate-y-[4%] object-contain object-center select-none"
          />
        ) : (
          <PetProfileImage
            pet={pet}
            className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-50/95"
          />
        )}
        <p className="min-w-0 flex-1 truncate text-[10px] font-black leading-tight tracking-tight text-zinc-950">{label}</p>
        <span className="shrink-0 text-[12px] leading-none" title="" aria-hidden>
          {pet ? FETCH_PET_CARD_EMOJI[pet.id] : '🎁'}
        </span>
      </div>
    )
  }

  return (
    <div
      className="pointer-events-auto absolute bottom-2.5 left-2 z-[3] w-[7.5rem] max-w-[calc(100%-0.85rem)] rounded-lg bg-white px-[3px] py-0.5 text-left text-[#1c1340] shadow-[0_12px_28px_-16px_rgba(0,0,0,0.18)] ring-1 ring-zinc-200 sm:bottom-3.5 sm:left-3 sm:w-[7.85rem]"
      data-fetch-home-my-pets-card
    >
      <div className="flex items-baseline justify-between gap-1 border-b border-zinc-200 px-[3px] pb-[3px] pt-px">
        <span className="flex min-w-0 items-center gap-0.5 text-[7px] font-black uppercase leading-none tracking-[0.1em] text-zinc-950">
          <span aria-hidden className="inline-block shrink-0 text-[8px]">
            🐾
          </span>
          My pets
        </span>
        <span className="shrink-0 font-black tabular-nums text-[6.75px] leading-none tracking-wide text-zinc-500">{unlockedSlots}/3</span>
      </div>
      <div className="mt-[3px] flex flex-col gap-[2px]">
        {trailPet && showTripleRosterRows ? rosterRow(trailPet, trailName, 'trail', false, false) : null}
        {rosterRow(
          starterMysteryActive ? null : rosterActivePet,
          leadLabel,
          'lead',
          true,
          starterMysteryActive,
        )}
        {unlockedSlots >= 2 && benchPet && !starterMysteryActive ? (
          rosterRow(benchPet, benchName, 'bench', false, false)
        ) : (
          <button
            type="button"
            onClick={onOpenPetEdit}
            className="flex min-h-[1.65rem] w-full items-center gap-1 rounded-md bg-zinc-50 px-[3px] py-[2px] text-left ring-1 ring-zinc-200 transition-colors active:bg-zinc-100"
            aria-label={
              nextUnlockGems != null
                ? `Unlock second roster slot (bench) for ${nextUnlockGems} gems — opens in Home and pet`
                : 'Pet slot locked. Open Home and pet'
            }
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-300/95 text-[#52525c] shadow-inner ring-2 ring-white">
              <HeroMyPetsRosterMiniIconLock className="text-zinc-600" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] font-black uppercase tracking-[0.06em] text-zinc-600">Bench locked</span>
              {nextUnlockGems != null ? (
                <span className="mt-0.5 flex items-center gap-0.5 text-[8.5px] font-black tabular-nums text-[#7c3aed]">
                  <img src={purpleGemIconUrl} alt="" aria-hidden className="h-3 w-3 object-contain" draggable={false} />
                  {nextUnlockGems}
                </span>
              ) : null}
            </span>
          </button>
        )}
        {showTripleRosterRows ? null : unlockedSlots >= MAX_HOME_PET_SLOTS ? (
          <div className="flex items-center gap-1 rounded-md bg-violet-50/55 px-[3px] py-[2px] ring-1 ring-zinc-200/85">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px]" aria-hidden>
              ✦
            </span>
            <p className="min-w-0 flex-1 truncate text-[8px] font-black uppercase tracking-[0.07em] text-violet-600">Soon</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenPetEdit}
            className="flex min-h-[1.65rem] w-full items-center gap-1 rounded-md bg-zinc-50 px-[3px] py-[2px] text-left ring-1 ring-zinc-200 transition-colors active:bg-zinc-100"
            aria-label={
              unlockedSlots <= 1
                ? 'Trail roster slot locked. Unlock the bench slot first in Home and pet'
                : trailUnlockGems != null
                  ? `Unlock third roster slot (trail) for ${trailUnlockGems} gems in Home and pet`
                  : 'Trail roster slot locked. Open Home and pet'
            }
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-300/95 text-[#52525c] shadow-inner ring-2 ring-white">
              <HeroMyPetsRosterMiniIconLock className="text-zinc-600" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] font-black uppercase tracking-[0.06em] text-zinc-600">Trail locked</span>
              {unlockedSlots > 1 && trailUnlockGems != null ? (
                <span className="mt-0.5 flex items-center gap-0.5 text-[8.5px] font-black tabular-nums text-[#7c3aed]">
                  <img src={purpleGemIconUrl} alt="" aria-hidden className="h-3 w-3 object-contain" draggable={false} />
                  {trailUnlockGems}
                </span>
              ) : null}
            </span>
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onOpenPetEdit}
        className="mt-[5px] w-full text-center text-[11px] font-black uppercase tracking-[0.1em] text-[#7c3aed] sm:text-[12px]"
        aria-label="View all pets"
      >
        View all pets
      </button>
      <div className="my-1 h-px w-full bg-zinc-100" aria-hidden />
      <p className="mb-[3px] flex items-center justify-between px-[3px] text-[7.75px] font-black uppercase tracking-[0.055em] text-zinc-500 sm:text-[8px]">
        <span>Appetite</span>
        <span
          className={[
            isPetFed ? 'text-emerald-600' : petHungerStage === 'risk' ? 'text-red-600' : 'text-amber-600',
          ].join(' ')}
        >
          {isPetFed ? 'Fed' : petHungerStage === 'risk' ? 'Risk' : 'Hungry'}
        </span>
      </p>
      <div className="flex items-center justify-between gap-1 px-[3px] pb-[3px]">
        <span className="min-w-0 truncate text-[10px] font-black tabular-nums text-zinc-800 sm:text-[11px]">
          {petFeedTimerLabel}
        </span>
      </div>
      <button
        type="button"
        onClick={onFeedPet}
        disabled={starterMysteryActive || !canFeedPet}
        className={[
          'flex w-full items-center justify-center gap-1.5 rounded-xl px-1.5 py-[5px] text-[10px] font-black uppercase tracking-[0.075em] shadow-none sm:text-[11px]',
          starterMysteryActive
            ? 'cursor-not-allowed border-b-[4px] border-b-zinc-300/80 bg-zinc-100 text-zinc-500'
            : canFeedPet
              ? feed3dPurpleCta
              : 'cursor-not-allowed border-b-[4px] border-b-zinc-300/80 bg-zinc-100 text-zinc-500',
        ].join(' ')}
        aria-label={
          starterMysteryActive
            ? `Unlock your companion in the banner to enable feeding (${feedPetLabel})`
            : feedPetLabel
        }
      >
        <HeroPetBowlIcon className="h-[14px] w-[14px] sm:h-4 sm:w-4" />
        {starterMysteryActive ? 'WAIT' : canFeedPet ? 'FEED' : 'FED'}
      </button>
    </div>
  )
}

function HomeBannerDockPetColumn({
  pet,
  layout,
  hungerFilterClass,
  lane = 'even',
}: {
  pet: FetchHomePet
  layout: 'triple' | 'dual' | 'solo'
  hungerFilterClass: string
  /** Triple / dual: banner leader reads “in front”. */
  lane?: 'even' | 'center' | 'side'
}) {
  const airFloat = pet.id === 'air'
  const padClass = FETCH_PET_BANNER_PAD_TAILWIND[pet.id] ?? 'bg-white/55'
  const isCenter = lane === 'center'
  const isSide = lane === 'side'

  const colHeights =
    layout === 'solo'
      ? 'h-[min(42vw,13.1rem)]'
      : layout === 'triple' && isCenter
        ? 'h-[min(39vw,11.55rem)] sm:h-[min(36vw,11.75rem)]'
        : layout === 'triple' && isSide
          ? 'h-[min(35vw,10.65rem)] sm:h-[min(33vw,10.8rem)]'
          : layout === 'dual' && isCenter
            ? 'h-[min(40vw,11.55rem)]'
            : layout === 'dual' && isSide
              ? 'h-[min(37vw,11.05rem)]'
              : 'h-[min(39vw,11.35rem)]'

  const imgSizing =
    layout === 'triple' && isCenter
      ? ['pointer-events-none h-[116%] w-auto max-w-[none] translate-y-[9.75%]', hungerFilterClass].filter(Boolean).join(' ')
      : layout === 'triple' && isSide
        ? ['pointer-events-none h-[108%] w-auto max-w-[none] translate-y-[9%]', hungerFilterClass].filter(Boolean).join(' ')
        : layout === 'dual' && isCenter
          ? ['pointer-events-none h-[110%] w-auto max-w-[none] translate-y-[10%]', hungerFilterClass].filter(Boolean).join(' ')
          : layout === 'dual' && isSide
            ? ['pointer-events-none h-[106%] w-auto max-w-[none] translate-y-[10%]', hungerFilterClass].filter(Boolean).join(' ')
            : layout === 'triple'
              ? ['pointer-events-none h-[108%] w-auto max-w-[none] translate-y-[9%]', hungerFilterClass].filter(Boolean).join(' ')
              : layout === 'dual'
                ? ['pointer-events-none h-[108%] w-auto max-w-[none] translate-y-[10%]', hungerFilterClass].filter(Boolean).join(' ')
                : ['pointer-events-none h-[114%] w-auto max-w-[none] translate-y-[10%]', hungerFilterClass].filter(Boolean).join(' ')

  const depthPresentation =
    layout === 'triple' && isCenter
      ? 'relative z-[6] origin-bottom scale-[1.1] sm:scale-[1.12]'
      : layout === 'triple' && isSide
        ? 'relative z-[1] origin-bottom scale-[0.9] sm:scale-[0.91] opacity-[0.96]'
        : layout === 'dual' && isCenter
          ? 'relative z-[5] origin-bottom scale-[1.07] sm:scale-[1.08]'
          : layout === 'dual' && isSide
            ? 'relative z-[1] origin-bottom scale-[0.93] sm:scale-[0.94]'
            : layout === 'solo'
              ? 'relative z-[2] origin-bottom scale-[1.04] sm:scale-[1.05]'
              : 'relative z-[1] origin-bottom'

  const colOuter =
    layout === 'solo'
      ? 'relative z-[2] flex min-h-0 min-w-0 flex-1 flex-col items-center justify-end overflow-visible'
      : [
          'relative flex flex-none shrink-0 flex-col items-center justify-end overflow-visible first:ml-0 -ml-[11px] sm:-ml-[13px]',
          isCenter
            ? 'z-[5] max-w-[6.62rem] w-[clamp(5.15rem,26.5vw,6.62rem)] sm:z-[6] sm:max-w-[6.82rem] sm:w-[clamp(5.25rem,26vw,6.82rem)]'
            : 'z-[1] max-w-[5.78rem] w-[clamp(4.55rem,22.5vw,5.78rem)] sm:max-w-[5.9rem] sm:w-[clamp(4.6rem,22vw,5.9rem)]',
        ].join(' ')

  const innerWrapMax =
    layout === 'solo'
      ? 'relative flex w-full max-w-[9rem] flex-col items-center justify-end sm:max-w-[9.55rem]'
      : isCenter
        ? 'relative flex w-full max-w-[6.75rem] flex-col items-center justify-end sm:max-w-[6.95rem]'
        : 'relative flex w-full max-w-[5.88rem] flex-col items-center justify-end sm:max-w-[6rem]'

  return (
    <div className={colOuter}>
      <span
        className={[
          'pointer-events-none absolute bottom-[2px] left-1/2 z-[0] h-[21%] min-h-[0.55rem] w-[72%] max-w-[6.75rem] -translate-x-1/2 rounded-[50%] blur-[10px]',
          isCenter ? 'h-[24%] opacity-90' : '',
          padClass,
        ].join(' ')}
        aria-hidden
      />
      <div className={[innerWrapMax, colHeights, depthPresentation, airFloat ? 'fetch-banner-air-pet-float' : ''].join(' ')}>
        <GreenscreenKeyedImage
          src={homeDisplayImageForPet(pet)}
          className="flex h-full w-full items-end justify-center"
          imgClassName={[imgSizing, 'object-contain object-bottom select-none'].join(' ')}
        />
      </div>
    </div>
  )
}

function HomeBannerPetDock({
  unlockedSlots,
  leaderPet,
  benchPet,
  trailPet,
  isPetFed,
  starterMysteryActive,
  starterUnlockRunning,
  mysteryPodImageUrl,
  onStarterUnlockClick,
}: {
  unlockedSlots: number
  leaderPet: FetchHomePet
  benchPet: FetchHomePet | null
  trailPet: FetchHomePet | null
  isPetFed: boolean
  starterMysteryActive: boolean
  starterUnlockRunning: boolean
  mysteryPodImageUrl: string
  onStarterUnlockClick: () => void
}) {
  const hungerFilterLeader = !isPetFed ? 'saturate-[0.88] hue-rotate-[-18deg] contrast-[1.05]' : ''
  const triple = unlockedSlots >= 3 && !starterMysteryActive && benchPet != null && trailPet != null
  const duo = unlockedSlots >= 2 && !starterMysteryActive && benchPet != null && !triple

  const frameClass = triple
    ? 'h-[min(45vw,12.95rem)] w-[min(54vw,16.35rem)] sm:h-[min(43vw,12.85rem)] sm:w-[min(50vw,16.05rem)]'
    : duo
      ? 'h-[min(43vw,12.65rem)] w-[min(52vw,15.05rem)]'
      : 'h-[min(43vw,12.95rem)] w-[min(58vw,15.85rem)]'

  if (starterMysteryActive) {
    return (
      <div className={['relative flex shrink-0 flex-col items-center justify-end', frameClass].join(' ')}>
        <div className="flex w-full flex-col items-center justify-end">
          <div className="relative flex w-full max-w-[8.5rem] flex-col items-center justify-end">
            <div
              className={['relative flex w-full flex-col items-center justify-end', starterUnlockRunning ? 'fetch-mystery-pod-unlock-burst' : ''].join(
                ' ',
              )}
            >
              <div className="flex w-full items-end justify-center [-webkit-tap-highlight-color:transparent]">
                <GreenscreenKeyedImage
                  src={mysteryPodImageUrl}
                  className="pointer-events-none flex h-full max-h-[min(34vw,10.5rem)] w-full items-end justify-center"
                  imgClassName="pointer-events-none h-[122%] w-auto max-w-[none] translate-y-[6%] object-contain object-bottom select-none"
                />
              </div>
              {!starterUnlockRunning ? (
                <button
                  type="button"
                  onClick={onStarterUnlockClick}
                  data-fetch-starter-unlock
                  className="pointer-events-auto relative z-[12] mb-[-2px] mt-1 w-[min(92%,11rem)] rounded-xl border-b-[4px] border-[#4c1d95] bg-gradient-to-b from-[#c4b5fd] to-[#7c3aed] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-none transition-[transform,border-bottom-width] duration-150 active:translate-y-0.5 active:border-b-2 sm:text-[11px] sm:tracking-[0.16em]"
                >
                  Unlock
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={['relative flex shrink-0 items-end justify-center', frameClass].join(' ')}>
      {triple && trailPet ? (
        <div className="flex h-full w-full items-end justify-end gap-0 pl-11 pr-0.5 sm:pl-[3.5rem] sm:pr-1">
          <HomeBannerDockPetColumn pet={trailPet} layout="triple" lane="side" hungerFilterClass="" />
          <HomeBannerDockPetColumn pet={leaderPet} layout="triple" lane="center" hungerFilterClass={hungerFilterLeader} />
          <HomeBannerDockPetColumn pet={benchPet} layout="triple" lane="side" hungerFilterClass="" />
        </div>
      ) : duo && benchPet ? (
        <div className="flex h-full w-full items-end justify-end gap-0 px-10 pr-1 sm:px-11 sm:pr-1.5">
          <HomeBannerDockPetColumn pet={leaderPet} layout="dual" lane="center" hungerFilterClass={hungerFilterLeader} />
          <HomeBannerDockPetColumn pet={benchPet} layout="dual" lane="side" hungerFilterClass="" />
        </div>
      ) : (
        <div className="flex h-full w-full items-end justify-center">
          <HomeBannerDockPetColumn pet={leaderPet} layout="solo" hungerFilterClass={hungerFilterLeader} />
        </div>
      )}
    </div>
  )
}

function FetchitWelcomeHero({
  displayName,
  dailyStreakCount,
  adventureLevel,
  adventureXp,
  fundsLabel,
  gemsCount,
  notificationsCount,
  petName,
  petFeedTimerLabel,
  petRank,
  petHungerStage,
  isPetFed,
  canFeedPet,
  petCelebrationSeq,
  unlockedHomePetSlots,
  rosterActivePet,
  benchPet,
  petNames,
  petRanks,
  starterPetRevealed,
  starterUnlockRunning,
  onStarterUnlockClick,
  onAddDemoFunds,
  onViewBackpack,
  onOpenPetEdit,
  onFeedPet,
}: {
  displayName: string
  dailyStreakCount: number
  adventureLevel: number
  /** 0–100 XP into current level (see `fetchAdventureRewards`). */
  adventureXp: number
  fundsLabel: string
  gemsCount: number
  notificationsCount: number
  petName: string
  petFeedTimerLabel: string
  petRank: number
  petHungerStage: 'hungry' | 'risk'
  isPetFed: boolean
  canFeedPet: boolean
  petCelebrationSeq: number
  unlockedHomePetSlots: number
  rosterActivePet: FetchHomePet
  benchPet: FetchHomePet | null
  petNames: Record<FetchPetId, string>
  petRanks: Record<FetchPetId, number>
  starterPetRevealed: boolean
  starterUnlockRunning: boolean
  onStarterUnlockClick: () => void
  onAddDemoFunds: () => void
  onViewBackpack: () => void
  onOpenPetEdit: () => void
  onFeedPet: () => void
}) {
  const levelCardName = firstNameFromDisplay(displayName)
  const levelCardTitle = `${levelCardName} · ${petName}`
  const xpBar = heroXpBarNumbers(adventureLevel, adventureXp)
  const backpackImageUrl = backpackImageForLevel(adventureLevel)
  const starterMysteryActive = !starterPetRevealed
  const bannerTrailPet =
    unlockedHomePetSlots >= 3 && benchPet && starterPetRevealed ? rosterPetBehindLeader(rosterActivePet) : null
  return (
    <section
      className="relative w-full overflow-hidden rounded-t-xl"
      aria-label="Home hero, header stats, and backpack"
    >
      <div className="flex items-stretch gap-1.5 bg-white px-2 py-1.5 text-[#1c1340]">
        <div className="flex min-h-[2.5rem] min-w-0 flex-[1.2] items-start gap-1.5 rounded-lg bg-white px-1.5 py-1 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-zinc-200/95">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] text-[12px] font-black tabular-nums text-white shadow-[0_4px_12px_-4px_rgba(76,29,149,0.55)]"
            aria-hidden
          >
            {adventureLevel}
          </span>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
            <p
              className={[
                'truncate font-black leading-none tracking-tight text-[#1c1340]',
                levelCardTitle.length > 18 ? 'text-[8px]' : levelCardTitle.length > 12 ? 'text-[9px]' : 'text-[10px]',
              ].join(' ')}
              title={levelCardTitle}
            >
              {levelCardName} · {petName}
            </p>
            <p className="text-[9px] font-black uppercase leading-none tracking-[0.14em] text-[#4c1d95]">
              Level {adventureLevel}
            </p>
            <div className="h-[4px] overflow-hidden rounded-full bg-violet-100">
              <div
                className="h-full rounded-full bg-[#7c3aed]"
                style={{ width: `${xpBar.pct}%` }}
              />
            </div>
            <p className="text-[8px] font-bold tabular-nums leading-none text-zinc-600">
              {xpBar.current} / {xpBar.next} XP
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAddDemoFunds}
          className="flex min-h-[2.5rem] min-w-0 flex-1 items-center gap-1 rounded-lg bg-white px-1.5 py-1 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-zinc-200/95 transition-colors active:bg-zinc-50/90"
          aria-label={`Add funds, wallet balance ${fundsLabel}`}
          data-fetch-tour-target="addFunds"
        >
          <img
            src={heroWalletCashUrl}
            alt=""
            width={36}
            height={36}
            draggable={false}
            className="pointer-events-none h-7 w-7 shrink-0 select-none object-contain"
          />
          <span className="min-w-0 flex-1 truncate text-left text-[11px] font-black tabular-nums text-[#1c1340]">{fundsLabel}</span>
          <HeaderSquarePlusIcon className="!h-6 !w-6" />
        </button>
        <div
          className="flex min-h-[2.5rem] min-w-[4.25rem] shrink-0 flex-col items-center justify-center gap-0 rounded-lg bg-white px-2 py-0.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-zinc-200/95 sm:min-w-[4.5rem]"
          aria-label={`${gemsCount} gems`}
          role="status"
          data-fetch-home-gems-chip
        >
          <img
            src={purpleGemIconUrl}
            alt=""
            aria-hidden
            className="h-[18px] w-[18px] shrink-0 object-contain"
            draggable={false}
            loading="lazy"
            data-fetch-home-gems-icon
          />
          <span className="text-[11px] font-black leading-none tabular-nums text-[#1c1340]">{gemsCount}</span>
        </div>
        <button
          type="button"
          className="relative flex h-auto min-h-[2.5rem] w-[2.68rem] shrink-0 flex-col items-center justify-center rounded-lg bg-white px-0 py-0.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-zinc-200/95 transition-colors active:bg-zinc-50/90"
          aria-label={`${notificationsCount} notifications`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-zinc-700">
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
      <div className="relative mt-2 aspect-square w-full overflow-hidden rounded-t-xl bg-gradient-to-b from-[#cdb7ff] via-[#a78bfa] to-[#7c3aed] shadow-[0_22px_48px_-22px_rgba(76,29,149,0.6)] sm:mt-2.5">
        <img
          src={fetchitHomePodRoomBgUrl}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-cover object-center"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[min(32%,156px)] bg-gradient-to-b from-white via-white/55 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[min(52%,260px)] bg-gradient-to-b from-transparent via-white/55 to-white"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[9%] z-[2]">
          <div className="absolute bottom-[-1.5%] left-[41%] z-[2] w-[min(72%,19.5rem)] max-w-none -translate-x-1/2 sm:left-[40%] sm:w-[min(68%,19.75rem)]">
            <GreenscreenKeyedImage
              src={fetchitHomeHeroHumanLayerUrl}
              className="block w-full"
              imgClassName="pointer-events-none h-auto w-full origin-bottom scale-[1.3] select-none object-contain object-bottom"
            />
          </div>
          <div
            className={[
              'absolute bottom-0 right-0 z-[5] -translate-x-5 -translate-y-1.5 px-0 sm:-translate-x-4 sm:-translate-y-2',
              starterMysteryActive || starterUnlockRunning ? 'pointer-events-auto' : 'pointer-events-none',
            ].join(' ')}
          >
            <HomeBannerPetDock
              unlockedSlots={unlockedHomePetSlots}
              leaderPet={rosterActivePet}
              benchPet={benchPet}
              trailPet={bannerTrailPet}
              isPetFed={isPetFed}
              starterMysteryActive={starterMysteryActive}
              starterUnlockRunning={starterUnlockRunning}
              mysteryPodImageUrl={fetchitMysteryStarterPodUrl}
              onStarterUnlockClick={onStarterUnlockClick}
            />
          </div>
        </div>
        <div
          role="group"
          aria-label={`Daily streak ${dailyStreakCount} ${dailyStreakCount === 1 ? 'day' : 'days'}`}
          title="Open Fetch again tomorrow to grow your streak."
          className="pointer-events-none absolute left-2 top-0.5 z-[3] flex max-w-[min(calc(100%-1rem),10.5rem)] items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-left text-[#1c1340] shadow-[0_6px_20px_-12px_rgba(30,15,80,0.22)] ring-1 ring-zinc-200/90 sm:left-3 sm:top-1"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center text-[17px] leading-none" aria-hidden>
            🔥
          </span>
          <div className="min-w-0 flex-1 leading-none">
            <p className="text-[7.5px] font-semibold uppercase tracking-[0.08em] text-[#4c1d95]/88">Daily streak</p>
            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1 gap-y-0 tabular-nums">
              <span
                className={
                  dailyStreakCount >= 100
                    ? 'text-[15px] font-black leading-none'
                    : 'text-[17px] font-black leading-none sm:text-[18px]'
                }
              >
                {dailyStreakCount}
              </span>
              <span className="text-[8px] font-bold leading-none text-zinc-500">
                {dailyStreakCount === 1 ? 'day' : 'days'}
              </span>
            </p>
          </div>
        </div>
        <HeroMyPetsRosterCard
          unlockedSlots={unlockedHomePetSlots}
          rosterActivePet={rosterActivePet}
          benchPet={benchPet}
          petNames={petNames}
          petRanks={petRanks}
          leaderName={petName}
          leaderRank={petRank}
          isPetFed={isPetFed}
          petFeedTimerLabel={petFeedTimerLabel}
          petHungerStage={petHungerStage}
          starterMysteryActive={starterMysteryActive}
          mysteryPodImageUrl={fetchitMysteryStarterPodUrl}
          canFeedPet={canFeedPet}
          feedPetLabel={canFeedPet ? `Feed ${petName}` : `${petName} can eat again in ${petFeedTimerLabel}`}
          onOpenPetEdit={onOpenPetEdit}
          onFeedPet={onFeedPet}
        />
        {petCelebrationSeq > 0 && starterPetRevealed ? (
          <div
            key={petCelebrationSeq}
            className={[
              'pointer-events-none absolute z-[7]',
              'bottom-[5.75rem] left-[70%] -translate-x-1/2 sm:bottom-[6.25rem] sm:left-[72%]',
            ].join(' ')}
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
          className="group absolute right-3 top-1.5 z-[3] transition-transform active:scale-[0.98] sm:right-4 sm:top-2"
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
        <button
          type="button"
          onClick={onOpenPetEdit}
          className="absolute bottom-2.5 right-2.5 z-[8] flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-800 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.22)] ring-2 ring-zinc-200 transition-transform active:scale-[0.94] sm:bottom-3 sm:right-3"
          aria-label="Edit home and pet"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="m4 16.5-.7 4.2 4.2-.7L18.7 8.8l-3.5-3.5L4 16.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="m14.5 6 3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
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
        @keyframes fetch-mystery-pod-unlock-burst-kf {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
            filter: brightness(1);
          }
          22% {
            transform: translateY(3px) rotate(-7deg) scale(1.04);
          }
          44% {
            transform: translateY(-3px) rotate(7deg) scale(1.07);
          }
          66% {
            transform: translateY(0) rotate(0deg) scale(1.1);
            filter: brightness(1.45) saturate(1.15);
          }
          84% {
            transform: translateY(-4px) scale(1.16);
            filter: brightness(1.9)
              drop-shadow(0 0 22px rgba(167, 139, 250, 0.85))
              drop-shadow(0 0 42px rgba(124, 58, 237, 0.5));
          }
          100% {
            transform: translateY(-18px) scale(0);
            opacity: 0;
            filter: brightness(2.25) blur(3px);
          }
        }
        .fetch-mystery-pod-unlock-burst {
          transform-origin: 50% 88%;
          animation: fetch-mystery-pod-unlock-burst-kf 1.45s cubic-bezier(0.38, 0.02, 0.09, 1) forwards;
        }
      `}</style>
    </section>
  )
}

function StarterPetSkillsSheet({
  open,
  petDisplayName,
  onClose,
}: {
  open: boolean
  petDisplayName: string
  onClose: () => void
}) {
  if (!open) return null
  const pet = FETCH_HOME_PETS[0]!
  return createPortal(
    <div className="fixed inset-0 z-[93] flex items-end justify-center bg-[#0f0820]/48 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur-[3px] sm:items-center sm:pb-3">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Dismiss" onClick={onClose} />
      <section
        className="relative z-[1] w-full max-w-[400px] overflow-hidden rounded-[1.85rem] bg-white text-[#1c1340] shadow-[0_28px_70px_-34px_rgba(30,15,80,0.82)] ring-1 ring-violet-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fetch-starter-skills-title"
      >
        <div className="relative overflow-hidden bg-gradient-to-b from-[#ddd6fe] via-[#a78bfa] to-[#6d28d9] px-5 pb-8 pt-6 text-center text-white">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl"
            aria-hidden
          />
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/90">Starter unlocked</p>
          <h2 id="fetch-starter-skills-title" className="mt-1 text-[26px] font-black leading-none tracking-[-0.05em]">
            {petDisplayName}
          </h2>
          <p className="mt-1 text-[12px] font-semibold text-white/85">{pet.label}</p>
          <div className="relative mx-auto mt-4 flex h-[7rem] w-[7rem] items-center justify-center overflow-hidden rounded-full bg-white/15">
            <PetProfileImage
              pet={pet}
              className="relative flex h-full w-full items-center justify-center"
              preset="circleLg"
            />
          </div>
        </div>
        <div className="px-4 pb-4 pt-3">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7c3aed]">Skills</p>
          <ul className="mt-2 flex flex-col gap-2">
            {STARTER_PET_SKILLS.map((skill) => (
              <li
                key={skill.title}
                className="rounded-2xl bg-violet-50/90 px-3 py-2.5 ring-1 ring-violet-100/90"
              >
                <p className="text-[13px] font-black leading-tight text-[#1c1340]">{skill.title}</p>
                <p className="mt-0.5 text-[11px] font-semibold leading-snug text-zinc-600">{skill.detail}</p>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 flex w-full items-center justify-center rounded-2xl border-b-[4px] border-[#4c1d95] bg-gradient-to-b from-[#a78bfa] to-[#7c3aed] px-4 py-3.5 text-[12px] font-black uppercase tracking-[0.08em] text-white shadow-none transition-[transform,border-bottom-width] duration-150 active:translate-y-0.5 active:border-b-2"
          >
            Let&apos;s go
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

function defaultIncludedPetIdsForEditSheet(
  pets: ReadonlyArray<FetchHomePet>,
  selectedPetId: FetchPetId,
  maxIncluded: number,
): Set<FetchPetId> {
  const cap = Math.min(Math.max(1, maxIncluded), PET_EDIT_INCLUDED_MAX, pets.length)
  if (pets.length <= cap) return new Set(pets.map((p) => p.id))
  const next = new Set<FetchPetId>([selectedPetId])
  for (const p of pets) {
    if (next.size >= cap) break
    next.add(p.id)
  }
  return next
}

function loadSavedPetEditorIncludedIds(): FetchPetId[] | null {
  try {
    const raw = window.localStorage.getItem(PET_EDITOR_INCLUDED_IDS_KEY)?.trim()
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    const out: FetchPetId[] = []
    for (const x of parsed) {
      const id = parseFetchPetId(x)
      if (id) out.push(id)
    }
    return [...new Set(out)]
  } catch {
    return null
  }
}

function savePetEditorIncludedIds(ids: ReadonlyArray<FetchPetId>) {
  try {
    window.localStorage.setItem(PET_EDITOR_INCLUDED_IDS_KEY, JSON.stringify([...new Set(ids)]))
  } catch {
    /* ignore */
  }
}

/** Merge locally saved roster with banner leader + PET_EDIT_INCLUDED_MAX cap. */
function resolvePetEditorIncludedIds(
  pets: ReadonlyArray<FetchHomePet>,
  selectedPetId: FetchPetId,
  cap: number,
): Set<FetchPetId> {
  const petIdOrder = pets.map((p) => p.id)
  const allowed = new Set(petIdOrder)
  const saved = loadSavedPetEditorIncludedIds()
  if (!saved?.length) {
    return defaultIncludedPetIdsForEditSheet(pets, selectedPetId, cap)
  }
  const next = new Set<FetchPetId>()
  for (const id of saved) {
    if (allowed.has(id)) next.add(id)
  }
  if (next.size === 0) return defaultIncludedPetIdsForEditSheet(pets, selectedPetId, cap)
  if (!next.has(selectedPetId)) next.add(selectedPetId)
  while (next.size > cap) {
    const drop = petIdOrder.find((id) => next.has(id) && id !== selectedPetId)
    if (!drop) break
    next.delete(drop)
  }
  return next.size ? next : defaultIncludedPetIdsForEditSheet(pets, selectedPetId, cap)
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
  homeUnlockedPetSlots,
  onSelectPet,
  onPetNameChange,
  onUserDisplayNameChange,
  onHeroGenderChange,
  onRankUpPet,
  onUnlockHomePetSlot,
  onClose,
  onSave,
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
  homeUnlockedPetSlots: number
  onSelectPet: (petId: FetchPetId) => void
  onPetNameChange: (petId: FetchPetId, name: string) => void
  onUserDisplayNameChange: (name: string) => void
  onHeroGenderChange: (gender: HeroGender) => void
  onRankUpPet: (petId: FetchPetId) => void
  onUnlockHomePetSlot: () => void
  onClose: () => void
  /** Commit and dismiss (profile already saves as you edit). */
  onSave: () => void
}) {
  /** Max editor “included” roster (banner slot gems are unrelated — capped at PET_EDIT_INCLUDED_MAX). */
  const sheetIncludeCap = Math.min(PET_EDIT_INCLUDED_MAX, pets.length)

  const prevSheetOpenRef = useRef(false)
  /** Banner id for swap math; updated each render and after each swap so batched swaps drop the right pet. */
  const bannerPetIdRef = useRef(selectedPetId)
  bannerPetIdRef.current = selectedPetId
  const [focusedPetId, setFocusedPetId] = useState<FetchPetId>(selectedPetId)
  const [includedIds, setIncludedIds] = useState<Set<FetchPetId>>(() =>
    resolvePetEditorIncludedIds(pets, selectedPetId, Math.min(PET_EDIT_INCLUDED_MAX, pets.length)),
  )

  useEffect(() => {
    if (!open) {
      prevSheetOpenRef.current = false
      return
    }
    const sheetJustOpened = !prevSheetOpenRef.current
    prevSheetOpenRef.current = true
    if (!sheetJustOpened) return
    setFocusedPetId(selectedPetId)
    setIncludedIds(resolvePetEditorIncludedIds(pets, selectedPetId, sheetIncludeCap))
  }, [open, selectedPetId, pets, sheetIncludeCap])

  useEffect(() => {
    if (!open || includedIds.size === 0) return
    savePetEditorIncludedIds([...includedIds])
  }, [open, includedIds])

  // Only re-point focus when roster membership changes (e.g. "Off").
  // Including `focusedPetId` here would reset focus when the user taps a pet that is not
  // yet in the sheet — they need to inspect it before tapping "Swap in".
  useEffect(() => {
    if (!open || includedIds.size === 0) return
    setFocusedPetId((current) => {
      if (includedIds.has(current)) return current
      return pets.find((p) => includedIds.has(p.id))?.id ?? current
    })
  }, [open, includedIds, pets])

  function setPetIncludedInSheet(petId: FetchPetId, turnOn: boolean) {
    setIncludedIds((prev) => {
      if (turnOn) {
        if (prev.has(petId)) return prev
        if (prev.size >= sheetIncludeCap) return prev
        const next = new Set(prev)
        next.add(petId)
        return next
      }
      if (!prev.has(petId)) return prev
      if (prev.size <= 1) return prev
      const next = new Set(prev)
      next.delete(petId)
      return next
    })
  }

  function swapBannerPet(petId: FetchPetId) {
    const retiringBannerId = bannerPetIdRef.current
    setFocusedPetId(petId)
    setIncludedIds((prev) => {
      const next = new Set(prev)
      next.add(petId)

      // A direct swap should work even when the roster is full: replace the old banner first.
      if (next.size > sheetIncludeCap && retiringBannerId !== petId) {
        next.delete(retiringBannerId)
      }
      while (next.size > sheetIncludeCap) {
        const drop = pets.find((p) => p.id !== petId && next.has(p.id))?.id
        if (!drop) break
        next.delete(drop)
      }
      return next
    })
    onSelectPet(petId)
    bannerPetIdRef.current = petId
  }

  if (!open) return null

  const focusedPet = pets.find((pet) => pet.id === focusedPetId) ?? pets[0]
  const selRank = normalizePetRank(petRanks[focusedPet.id])
  const rankCost = petRankUpGemCost(selRank)
  const atMaxRank = selRank >= PET_RANK_MAX
  const canAffordRankUp = gemsCount >= rankCost && !atMaxRank
  const nextBannerSlotGemCost = nextHomePetSlotUnlockGemCost(homeUnlockedPetSlots)
  const canUnlockBannerSlot =
    nextBannerSlotGemCost != null && gemsCount >= nextBannerSlotGemCost && homeUnlockedPetSlots < MAX_HOME_PET_SLOTS
  const focusedLabel = petNames[focusedPet.id]?.trim() || focusedPet.defaultName

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#120822]/45 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close editor"
        onClick={onClose}
      />
      <section
        className="relative z-[1] max-h-[min(38rem,calc(100dvh-1.25rem))] w-full max-w-[392px] overflow-y-auto overscroll-contain rounded-2xl bg-white px-3 py-3 text-[#1c1340] shadow-[0_24px_60px_-32px_rgba(30,15,80,0.72)] ring-1 ring-violet-100 [-webkit-overflow-scrolling:touch]"
        aria-labelledby="fetch-pet-edit-sheet-title"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7c3aed]">Home & pet</p>
            <h2 id="fetch-pet-edit-sheet-title" className="mt-0.5 text-[19px] font-black leading-none tracking-[-0.05em] sm:text-xl">
              Make it yours
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-[#7c3aed] transition-colors active:bg-violet-100"
            aria-label="Close editor"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <label className="mt-3 block text-[9px] font-black uppercase tracking-[0.12em] text-[#7c3aed]" htmlFor="fetch-home-user-display-name">
          Your name
        </label>
        <input
          id="fetch-home-user-display-name"
          value={userDisplayName}
          onChange={(event) => onUserDisplayNameChange(event.target.value)}
          maxLength={48}
          className="mt-1 w-full rounded-xl border-0 bg-violet-50 px-3 py-2 text-[15px] font-black text-[#1c1340] outline-none ring-1 ring-violet-100 focus:ring-2 focus:ring-[#7c3aed]"
          placeholder="Your first name"
          autoComplete="given-name"
          aria-label="Your display name"
        />

        <p className="mt-3 text-[9px] font-black uppercase tracking-[0.12em] text-[#7c3aed]">Hero banner</p>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5" role="group" aria-label="Hero banner gender">
          <button
            type="button"
            onClick={() => onHeroGenderChange('male')}
            className={[
              'rounded-xl px-2 py-2 text-center text-[11px] font-black uppercase tracking-[0.06em] transition-transform active:scale-[0.98]',
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
              'rounded-xl px-2 py-2 text-center text-[11px] font-black uppercase tracking-[0.06em] transition-transform active:scale-[0.98]',
              heroGender === 'female'
                ? 'bg-[#1c1340] text-white ring-2 ring-[#7c3aed]'
                : 'bg-violet-50 text-[#1c1340] ring-1 ring-violet-100',
            ].join(' ')}
          >
            Female
          </button>
        </div>

        <div className="mt-3">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#7c3aed]">Pets</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 min-[401px]:grid-cols-4">
            {pets.map((pet) => {
              const included = includedIds.has(pet.id)
              const atIncludeCap = includedIds.size >= sheetIncludeCap
              const onBlocked = !included && atIncludeCap
              const offBlocked = included && includedIds.size <= 1
              const isBanner = pet.id === selectedPetId
              const isFocus = pet.id === focusedPetId
              const name = petNames[pet.id] || pet.defaultName
              const swapButtonClass = isBanner
                ? 'cursor-default border-b-[2px] border-emerald-300 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                : [
                    'border-b-[2px] border-[#4c1d95] bg-gradient-to-b from-[#a78bfa] to-[#7c3aed] text-white shadow-none ring-1 ring-violet-400/40',
                    'active:border-b-[1px]',
                  ].join(' ')
              return (
                <div key={pet.id} className="relative flex min-w-0 flex-col">
                  <button
                    type="button"
                    onClick={() => setFocusedPetId(pet.id)}
                    className={[
                      'relative w-full overflow-hidden rounded-2xl p-1 text-left opacity-100 transition-[transform,opacity] active:scale-[0.97]',
                      isFocus ? 'ring-2 ring-[#7c3aed] ring-offset-1 ring-offset-white' : 'ring-1 ring-zinc-200/90',
                      included ? 'bg-zinc-50/95' : 'bg-zinc-100/85 opacity-[0.78]',
                    ].join(' ')}
                  >
                    <div className="relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-white to-violet-50/35 ring-1 ring-zinc-100">
                      <div className="relative flex h-[4.95rem] w-full items-end justify-center overflow-hidden">
                        <PetProfileImage
                          pet={pet}
                          className="flex max-h-none w-full translate-y-[1px] items-end justify-center"
                          preset="rectMd"
                        />
                      </div>
                      {isBanner ? (
                        <span className="pointer-events-none absolute right-0.5 top-0.5 z-[2] rounded px-1 py-px text-[6.25px] font-black uppercase tracking-[0.06em] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
                          Banner
                        </span>
                      ) : null}
                      <span className="pointer-events-none absolute bottom-0.5 left-0.5 z-[2] rounded bg-[#1c1340]/88 px-[3px] py-px text-[7.5px] font-black tabular-nums leading-none text-white">
                        R{normalizePetRank(petRanks[pet.id])}
                      </span>
                    </div>
                    <div className="mt-1 px-0.5">
                      <p className="truncate text-[11px] font-black leading-none text-[#1c1340]">{name}</p>
                      <p className="mt-px truncate text-[7.5px] font-bold uppercase tracking-[0.06em] text-violet-500">{pet.label}</p>
                    </div>
                  </button>
                  {included ? (
                    <div className="mt-1 grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        disabled={isBanner}
                        aria-disabled={isBanner}
                        aria-label={isBanner ? `${name} is already your banner pet` : `Swap banner pet to ${name}`}
                        className={[
                          'rounded-lg px-1 py-1.5 text-[8px] font-black uppercase leading-none tracking-[0.06em] transition-[transform] active:scale-[0.98] sm:text-[8.5px]',
                          swapButtonClass,
                        ].join(' ')}
                        onClick={() => {
                          if (isBanner) return
                          swapBannerPet(pet.id)
                        }}
                      >
                        {isBanner ? 'Banner' : 'Swap'}
                      </button>
                      <button
                        type="button"
                        disabled={offBlocked || isBanner}
                        aria-disabled={offBlocked || isBanner}
                        aria-label={
                          isBanner
                            ? `${name} is the banner pet — swap to another pet before deactivating`
                            : offBlocked
                              ? `${name} is the last pet in sheet — mark another Active before removing`
                              : `Deactivate ${name} · remove from sheet`
                        }
                        className={[
                          'rounded-lg border-b-[2px] border-zinc-400 bg-zinc-100 px-1 py-1.5 text-[8px] font-black uppercase leading-none tracking-[0.06em] text-zinc-800 ring-1 ring-zinc-200 transition-[transform] active:scale-[0.98] active:border-b-[1px] sm:text-[8.5px]',
                          offBlocked || isBanner ? 'cursor-not-allowed opacity-45 active:scale-100 active:border-b-[2px]' : '',
                        ].join(' ')}
                        onClick={() => setPetIncludedInSheet(pet.id, false)}
                      >
                        Off
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Swap banner pet to ${name}`}
                      className={[
                        'mt-1 w-full rounded-lg border-b-[2px] border-[#4c1d95] bg-gradient-to-b from-[#c4b5fd] to-[#7c3aed] px-1 py-1.5 text-[8px] font-black uppercase leading-none tracking-[0.06em] text-white ring-1 ring-violet-400/35 transition-[transform] active:scale-[0.98] active:border-b-[1px] sm:text-[8.5px]',
                        onBlocked ? 'ring-amber-200' : '',
                      ].join(' ')}
                      onClick={() => swapBannerPet(pet.id)}
                    >
                      Swap in
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {focusedPetId !== selectedPetId ? (
            <button
              type="button"
              onClick={() => {
                swapBannerPet(focusedPetId)
              }}
              className="mt-2 w-full rounded-xl bg-violet-50 py-2 text-center text-[10px] font-black uppercase tracking-[0.06em] text-[#4c1d95] ring-1 ring-violet-100 transition-colors active:bg-violet-100"
            >
              Make {focusedLabel} banner pet
            </button>
          ) : null}
        </div>

        <div className="mt-3 rounded-xl bg-zinc-50 p-2 ring-1 ring-zinc-100">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#7c3aed]">Roster slots</p>
          <p className="mt-1 text-[11px] font-black tabular-nums leading-snug text-[#1c1340]">
            {Math.min(MAX_HOME_PET_SLOTS, homeUnlockedPetSlots)} / {MAX_HOME_PET_SLOTS} unlocked
          </p>
          {homeUnlockedPetSlots >= MAX_HOME_PET_SLOTS ? (
            <p className="mt-2 text-[10px] font-bold text-emerald-600">All slots unlocked.</p>
          ) : nextBannerSlotGemCost != null ? (
            <>
              <button
                type="button"
                onClick={onUnlockHomePetSlot}
                disabled={!canUnlockBannerSlot}
                className={[
                  'mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border-b-[3px] px-3 py-2 text-[10px] font-black uppercase tracking-[0.06em] shadow-none transition-[transform,border-bottom-width] duration-150 sm:text-[11px]',
                  canUnlockBannerSlot
                    ? 'border-[#4c1d95] bg-gradient-to-b from-[#a78bfa] to-[#7c3aed] text-white active:translate-y-0.5 active:border-b-[1.5px]'
                    : 'cursor-not-allowed border-zinc-300 border-b-zinc-400 bg-zinc-100 text-zinc-400',
                ].join(' ')}
              >
                <img src={purpleGemIconUrl} alt="" aria-hidden className="h-3.5 w-3.5 object-contain" draggable={false} />
                Unlock · {nextBannerSlotGemCost} gems
              </button>
              {!canUnlockBannerSlot && gemsCount < (nextBannerSlotGemCost ?? 0) ? (
                <p className="mt-1.5 text-center text-[10px] font-semibold text-amber-700">
                  Need {(nextBannerSlotGemCost ?? 0) - gemsCount} more gems
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        <label className="mt-3 block text-[9px] font-black uppercase tracking-[0.12em] text-[#7c3aed]" htmlFor="fetch-pet-editor-name">
          Pet name · {focusedLabel}
        </label>
        <input
          id="fetch-pet-editor-name"
          value={petNames[focusedPet.id] || focusedPet.defaultName}
          onChange={(event) => onPetNameChange(focusedPet.id, event.target.value)}
          maxLength={16}
          className="mt-1 w-full rounded-xl border-0 bg-violet-50 px-3 py-2 text-[15px] font-black text-[#1c1340] outline-none ring-1 ring-violet-100 focus:ring-2 focus:ring-[#7c3aed]"
          aria-label={`Edit name for ${focusedLabel}`}
        />

        <div className="mt-3 rounded-xl bg-violet-50 p-2 ring-1 ring-violet-100">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#7c3aed]">Rank · {focusedLabel}</p>
              <p className="mt-1 text-[16px] font-black tabular-nums leading-none text-[#1c1340]">
                R{selRank}
                {atMaxRank ? (
                  <span className="ml-1.5 align-middle text-[9px] font-black uppercase tracking-[0.08em] text-emerald-600">Max</span>
                ) : (
                  <span className="ml-1.5 align-middle text-[10px] font-bold text-zinc-500">→ R{selRank + 1}</span>
                )}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-zinc-500">Gems</p>
              <p className="mt-0.5 flex items-center justify-end gap-0.5 text-[12px] font-black tabular-nums text-[#1c1340]">
                <img src={purpleGemIconUrl} alt="" aria-hidden className="h-3.5 w-3.5 object-contain" draggable={false} />
                {gemsCount}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRankUpPet(focusedPet.id)}
            disabled={!includedIds.has(focusedPet.id) || !canAffordRankUp}
            className={[
              'mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border-b-[3px] px-3 py-2 text-[10px] font-black uppercase tracking-[0.06em] shadow-none transition-[transform,border-bottom-width] duration-150 sm:text-[11px]',
              includedIds.has(focusedPet.id) && canAffordRankUp
                ? 'border-[#4c1d95] bg-gradient-to-b from-[#a78bfa] to-[#7c3aed] text-white active:translate-y-0.5 active:border-b-[1.5px]'
                : 'cursor-not-allowed border-zinc-300 border-b-zinc-400 bg-zinc-100 text-zinc-400',
            ].join(' ')}
            aria-label={atMaxRank ? `${focusedLabel} is at max rank` : `Spend ${rankCost} gems to rank up ${focusedLabel}`}
          >
            {atMaxRank ? (
              'Max rank'
            ) : (
              <>
                <img src={purpleGemIconUrl} alt="" aria-hidden className="h-3.5 w-3.5 object-contain" draggable={false} />
                Rank up · {rankCost}
              </>
            )}
          </button>
          {!atMaxRank && gemsCount < rankCost ? (
            <p className="mt-1.5 text-center text-[10px] font-semibold text-amber-700">Need {rankCost - gemsCount} gems</p>
          ) : null}
        </div>

        <div className="my-3 flex items-center justify-between rounded-xl bg-violet-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#4c1d95]">
          <span>{isPetFed ? 'Fed' : 'Hungry'}</span>
          <span className="tabular-nums">{petFeedTimerLabel}</span>
        </div>

        <div className="sticky bottom-0 z-[4] mt-4 border-t border-violet-100 bg-gradient-to-b from-white via-white to-violet-50/40 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] pt-4 shadow-[0_-8px_24px_-18px_rgba(76,29,149,0.18)] backdrop-blur-sm">
          <button
            type="button"
            onClick={onSave}
            aria-label="Save and close home and pet editor"
            className="flex w-full items-center justify-center rounded-2xl border-b-[4px] border-[#4c1d95] bg-gradient-to-b from-[#a78bfa] to-[#7c3aed] px-4 py-3 text-[12px] font-black uppercase tracking-[0.09em] text-white shadow-none transition-[transform,border-bottom-width] duration-150 active:translate-y-0.5 active:border-b-2"
          >
            Save
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

function PetHuntMissionCard({
  hunts,
  matchesByHuntId,
  petNames,
  petRanks,
  fallbackPetName: _fallbackPetName,
  nowMs,
  canStartHunt,
  starterLocked: _starterLocked,
  onStartHunt,
  onViewHunt,
  onViewListing,
  onMessage,
  onBid,
  onBuyNow,
}: {
  hunts: readonly PetHunt[]
  matchesByHuntId: Readonly<Record<string, PeerListing | null>>
  petNames: Record<FetchPetId, string>
  petRanks: Record<FetchPetId, number>
  fallbackPetName: string
  nowMs: number
  canStartHunt: boolean
  starterLocked?: boolean
  onStartHunt: (preset?: string) => void
  onViewHunt: (huntId: string) => void
  onViewListing: (huntId: string) => void
  onMessage: (huntId: string) => void
  onBid: (huntId: string) => void
  onBuyNow: (huntId: string) => void
}) {
  const presets = PET_HUNT_CATEGORY_CAROUSEL_ITEMS.map((c) => c.label)
  const liveHuntCount = hunts.length
  const canAddMore = canStartHunt && liveHuntCount < PET_HUNT_MAX_LIVE

  if (liveHuntCount > 0) {
    return (
      <section className="-mx-0.5 px-0.5" aria-label="Active Pet Hunts" data-fetch-tour-target="adventure">
        <div className="overflow-hidden rounded-2xl border border-violet-100/80 bg-gradient-to-b from-white to-violet-50/20 p-4 shadow-[0_16px_40px_-26px_rgba(76,29,149,0.45)] ring-1 ring-violet-100/60">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7c3aed]">Pet Hunt</p>
              <h3 className="mt-1 text-[17px] font-black leading-tight tracking-[-0.04em] text-[#1c1340]">
                {liveHuntCount}/{PET_HUNT_MAX_LIVE} pets hunting
              </h3>
            </div>
            <button
              type="button"
              onClick={() => canAddMore && onStartHunt()}
              disabled={!canAddMore}
              className={[
                'shrink-0 rounded-xl px-3.5 py-2.5 text-[9px] font-black uppercase tracking-[0.06em]',
                canAddMore
                  ? feed3dPurpleCta
                  : 'cursor-not-allowed bg-zinc-100 text-zinc-400 ring-1 ring-zinc-200',
              ].join(' ')}
            >
              {liveHuntCount >= PET_HUNT_MAX_LIVE ? 'Max 3' : 'Add hunt'}
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {hunts.map((hunt) => {
              const pet = FETCH_HOME_PETS.find((p) => p.id === hunt.pet_id) ?? FETCH_HOME_PETS[0]
              const petName = petNames[hunt.pet_id]?.trim() || pet.defaultName
              const petRank = normalizePetRank(petRanks[hunt.pet_id])
              const matchedListing = matchesByHuntId[hunt.id] ?? null
              const found = hunt.status === 'found' && matchedListing
              const elapsedLabel = formatPetHuntElapsedLabel(hunt.created_at, nowMs)
              const findBoost = petHuntBoostPercent(pet.id, petRank)
              const huntPulse =
                ((Math.max(0, nowMs - hunt.created_at) / 4200 + findBoost * 0.085 + petRank * 0.04) % 1) * 56
              const scanProgress = Math.min(97, Math.round(22 + findBoost * 0.45 + huntPulse))

              return (
                <div
                  key={hunt.id}
                  className={[
                    'rounded-2xl bg-white/95 p-3 shadow-sm ring-1',
                    found
                      ? 'ring-emerald-200'
                      : 'ring-violet-100',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={[
                        'relative flex h-[4.75rem] w-[4.75rem] shrink-0 items-end justify-center overflow-visible rounded-2xl bg-gradient-to-b from-violet-50 to-violet-100/50 ring-1 ring-violet-100/80',
                        found ? 'drop-shadow-[0_8px_10px_rgba(16,185,129,0.14)]' : 'drop-shadow-[0_8px_10px_rgba(124,58,237,0.12)]',
                      ].join(' ')}
                    >
                      <PetProfileImage
                        pet={pet}
                        className="flex h-full w-full scale-[1.18] items-end justify-center"
                        preset="rectMd"
                        imgClassName="pointer-events-none h-[138%] w-auto max-w-none translate-y-[8%] object-contain object-bottom select-none"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={['text-[9px] font-black uppercase tracking-[0.12em]', found ? 'text-emerald-600' : 'text-[#7c3aed]'].join(' ')}>
                            {found ? 'Found it' : `Searching · ${elapsedLabel}`}
                          </p>
                          <h4 className="mt-0.5 truncate text-[14px] font-black leading-tight tracking-[-0.04em] text-[#1c1340]">
                            {found ? `${hunt.query} just dropped` : `${petName} wants ${hunt.query}`}
                          </h4>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-violet-700 shadow-sm ring-1 ring-violet-100">
                          Lv {petRank}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[10px] font-bold text-zinc-500">
                        {found && matchedListing
                          ? `${matchedListing.title} · ${formatAudFromCents(matchedListing.priceCents)}`
                          : petHuntDetailLabel(hunt)}
                      </p>
                      <p className="mt-1 truncate text-[10px] font-black text-[#4c1d95]">
                        {petHuntAutopilotLabel(hunt)}
                        {hunt.autopilot_enabled && hunt.autopilot_max_bid != null ? ` · Bid cap ${formatAudFromCents(hunt.autopilot_max_bid)}` : ''}
                      </p>
                    </div>
                  </div>

                  {found ? (
                    <div className="mt-3 space-y-2">
                      <button
                        type="button"
                        onClick={() => onViewListing(hunt.id)}
                        className={[
                          'flex w-full items-center justify-center rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-[0.07em] shadow-[0_10px_28px_-14px_rgba(16,185,129,0.45)] transition-[transform] duration-150 active:scale-[0.99]',
                          'border-b-[4px] border-b-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white ring-1 ring-emerald-400/40',
                        ].join(' ')}
                      >
                        View finding
                      </button>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => onMessage(hunt.id)}
                          className="rounded-xl bg-white px-1.5 py-2 text-[8px] font-black uppercase tracking-[0.04em] text-[#4c1d95] shadow-sm ring-1 ring-violet-100"
                        >
                          Message
                        </button>
                        <button
                          type="button"
                          onClick={() => onBid(hunt.id)}
                          className="rounded-xl bg-white px-1.5 py-2 text-[8px] font-black uppercase tracking-[0.04em] text-[#4c1d95] shadow-sm ring-1 ring-violet-100"
                        >
                          Bid
                        </button>
                        <button
                          type="button"
                          onClick={() => onBuyNow(hunt.id)}
                          className={[feed3dPurpleCta, 'rounded-xl px-1.5 py-2 text-[8px] font-black uppercase tracking-[0.04em]'].join(' ')}
                        >
                          Buy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.08em] text-violet-500">
                            Watching
                            <span className="inline-flex items-center gap-0.5" aria-hidden>
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7c3aed] [animation-delay:-180ms]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8b5cf6] [animation-delay:-90ms]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#a78bfa]" />
                            </span>
                          </span>
                          <span className="text-[9px] font-black tabular-nums text-zinc-400">{elapsedLabel}</span>
                        </div>
                        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-violet-100/90 ring-1 ring-violet-100/60" aria-hidden>
                          <div
                            className="fetch-seq-cta-shine relative h-full overflow-hidden rounded-full bg-gradient-to-r from-[#c4b5fd] via-[#7c3aed] to-[#a78bfa] transition-[width] duration-500"
                            style={{ width: `${scanProgress}%` }}
                          />
                        </div>
                      </div>
                      <button type="button" onClick={() => onViewHunt(hunt.id)} className="shrink-0 rounded-xl bg-white px-3 py-2 text-[8px] font-black uppercase tracking-[0.05em] text-[#4c1d95] shadow-sm ring-1 ring-violet-100">
                        View hunt
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {canAddMore ? (
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onStartHunt(preset)}
                  className="shrink-0 rounded-full bg-violet-50/90 px-3 py-2 text-[9px] font-black text-[#4c1d95] shadow-sm ring-1 ring-violet-100"
                >
                  {preset}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    )
  }

  return (
    <section
      className="-mx-0.5 px-0.5"
      aria-label={canStartHunt ? 'Start Pet Hunt' : 'Pet Hunt locked until pet is fed'}
      data-fetch-tour-target="adventure"
    >
      <div className="overflow-visible rounded-2xl border border-violet-100/70 bg-gradient-to-b from-white to-violet-50/30 p-4 shadow-[0_16px_40px_-26px_rgba(76,29,149,0.4)] ring-1 ring-violet-100/60">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-black leading-none tracking-[-0.02em] text-[#1c1340]">
            Send your pets on a hunt
          </p>
        </div>
        <button
          type="button"
          onClick={() => canStartHunt && onStartHunt()}
          disabled={!canStartHunt}
          className={[
            'mt-4 flex w-full items-center justify-center rounded-2xl px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.08em] shadow-[0_8px_22px_-12px_rgba(76,29,149,0.35)]',
            canStartHunt
              ? feed3dPurpleCta
              : 'cursor-not-allowed border-b-[4px] border-b-zinc-300/80 bg-zinc-100 text-zinc-500 shadow-none',
          ].join(' ')}
        >
          Start Hunt
        </button>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => canStartHunt && onStartHunt(preset)}
              disabled={!canStartHunt}
              className="shrink-0 rounded-full bg-violet-50/90 px-3 py-2 text-[9px] font-black text-[#4c1d95] shadow-sm ring-1 ring-violet-100 disabled:opacity-45"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function PetHuntSetupSheet({
  open,
  pets,
  petNames,
  petRanks,
  liveHunts,
  defaultPetId,
  presetQuery,
  listings,
  onClose,
  onCreate,
}: {
  open: boolean
  pets: readonly FetchHomePet[]
  petNames: Record<FetchPetId, string>
  petRanks: Record<FetchPetId, number>
  liveHunts: readonly PetHunt[]
  defaultPetId: FetchPetId
  presetQuery: string
  listings: readonly PeerListing[]
  onClose: () => void
  onCreate: (input: {
    petId: FetchPetId
    query: string
    category: string
    brand: string
    mustInclude: string
    excludeTerms: string
    sources: PetHuntListingSource[]
    maxPrice: number | null
    condition: PetHuntCondition
    alertType: PetHuntAlertType
    autopilotEnabled: boolean
    autopilotActions: PetHuntAutopilotAction[]
    autopilotMaxBid: number | null
  }) => void
}) {
  const prevPetHuntSetupOpenRef = useRef(false)
  const [selectedPetId, setSelectedPetId] = useState<FetchPetId>(defaultPetId)
  const [query, setQuery] = useState('')
  const [brand, setBrand] = useState('')
  const [mustInclude, setMustInclude] = useState('')
  const [excludeTerms, setExcludeTerms] = useState('')
  const [category, setCategory] = useState('Custom item')
  const [sources, setSources] = useState<PetHuntListingSource[]>(['Listings', 'Auctions', 'Live drops'])
  const [maxPrice, setMaxPrice] = useState('')
  const [condition, setCondition] = useState<PetHuntCondition>('Any')
  const [alertType, setAlertType] = useState<PetHuntAlertType>('Instant')
  const [autopilotEnabled, setAutopilotEnabled] = useState(false)
  const [autopilotActions, setAutopilotActions] = useState<PetHuntAutopilotAction[]>(['message'])
  const [autopilotMaxBid, setAutopilotMaxBid] = useState('')

  // Initialise only when the sheet opens — `defaultPetId` floats with live hunts / banner pet and
  // must not wipe the player's choice mid-flow.
  useEffect(() => {
    if (!open) {
      prevPetHuntSetupOpenRef.current = false
      return
    }
    const sheetJustOpened = !prevPetHuntSetupOpenRef.current
    prevPetHuntSetupOpenRef.current = true
    if (!sheetJustOpened) return
    setSelectedPetId(defaultPetId)
    setQuery(presetQuery === 'Custom item' ? '' : presetQuery)
    setBrand('')
    setMustInclude('')
    setExcludeTerms('')
    setCategory(presetQuery || 'Custom item')
    setSources(['Listings', 'Auctions', 'Live drops'])
    setMaxPrice('')
    setCondition('Any')
    setAlertType('Instant')
    setAutopilotEnabled(false)
    setAutopilotActions(['message'])
    setAutopilotMaxBid('')
  }, [defaultPetId, open, presetQuery])

  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null

  const trimmedQuery = query.trim()
  const draftHunt: PetHunt = {
    id: 'draft',
    user_id: 'local-demo-user',
    pet_id: selectedPetId,
    query: trimmedQuery || 'item',
    category,
    brand: brand.trim().slice(0, 40),
    must_include: mustInclude.trim().slice(0, 120),
    exclude_terms: excludeTerms.trim().slice(0, 120),
    sources,
    max_price: normalizePetHuntPrice(maxPrice),
    condition,
    alert_type: alertType,
    autopilot_enabled: autopilotEnabled,
    autopilot_actions: autopilotActions,
    autopilot_max_bid: normalizePetHuntPrice(autopilotMaxBid),
    status: 'active',
    matched_listing_id: null,
    created_at: Date.now(),
    updated_at: Date.now(),
  }
  const currentMatch = trimmedQuery ? findPetHuntMatch(draftHunt, listings) : null
  const selectedPet = pets.find((pet) => pet.id === selectedPetId) ?? pets[0]
  const selectedPetName = petNames[selectedPet.id]?.trim() || selectedPet.defaultName
  const liveHuntCount = liveHunts.length
  const usedPetIds = new Set(liveHunts.map((hunt) => hunt.pet_id))
  const limitReached = liveHuntCount >= PET_HUNT_MAX_LIVE
  const selectedPetBusy = usedPetIds.has(selectedPetId)
  const canCreate = Boolean(trimmedQuery) && !limitReached && !selectedPetBusy

  function toggleAutopilotAction(action: PetHuntAutopilotAction) {
    setAutopilotActions((current) => {
      if (current.includes(action)) {
        const next = current.filter((item) => item !== action)
        return next.length ? next : ['message']
      }
      return [...current, action]
    })
  }

  function toggleSource(source: PetHuntListingSource) {
    setSources((current) => {
      if (current.includes(source)) {
        const next = current.filter((item) => item !== source)
        return next.length ? next : [source]
      }
      return [...current, source]
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#0f0824]/55 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-10 backdrop-blur-md">
      <button type="button" aria-label="Close Pet Hunt setup" className="absolute inset-0 cursor-default" onClick={onClose} />
      <section className={PH_SHEET} aria-labelledby="fetch-pet-hunt-title">
        <div className="mx-auto mb-2 h-1 w-11 rounded-full bg-violet-200/90" aria-hidden />
        <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-violet-500">Pet Hunt</p>
        <h2 id="fetch-pet-hunt-title" className="mt-1 text-center text-[22px] font-black leading-tight tracking-[-0.05em] text-[#1c1340]">
          Choose your hunter
        </h2>
        <div className="mt-4 rounded-2xl bg-gradient-to-r from-violet-100/90 via-violet-50 to-fuchsia-50/80 px-3.5 py-2.5 text-center text-[11px] font-black text-[#4c1d95] shadow-inner shadow-violet-200/50 ring-1 ring-violet-200/60">
          {liveHuntCount}/{PET_HUNT_MAX_LIVE} slots in use
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {pets.map((pet) => {
            const active = selectedPetId === pet.id
            const busy = usedPetIds.has(pet.id)
            const name = petNames[pet.id]?.trim() || pet.defaultName
            const rank = normalizePetRank(petRanks[pet.id])
            const boost = petHuntBoostPercent(pet.id, rank)
            return (
              <button
                key={pet.id}
                type="button"
                onClick={() => setSelectedPetId(pet.id)}
                disabled={busy && !active}
                className={[
                  'relative overflow-hidden rounded-2xl bg-white p-2.5 text-left shadow-sm transition-[transform,box-shadow] active:scale-[0.98]',
                  active
                    ? 'ring-2 ring-[#7c3aed] shadow-[0_12px_28px_-14px_rgba(124,58,237,0.45)]'
                    : 'ring-1 ring-violet-100/90',
                  busy && !active ? 'opacity-45' : '',
                ].join(' ')}
                aria-pressed={active}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-[3.25rem] w-[3.25rem] shrink-0 items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b from-violet-50 to-violet-100/80 ring-1 ring-violet-100">
                    <PetProfileImage pet={pet} className="flex h-full w-full items-end justify-center" preset="rectMd" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-black leading-none">{name}</p>
                    <p className="mt-1 text-[8px] font-black uppercase tracking-[0.08em] text-violet-500">
                      Lv {rank} · {FETCH_PET_ELEMENT[pet.id]}
                    </p>
                    <p className="mt-0.5 text-[9px] font-bold text-zinc-500">+{boost}% finds</p>
                    {busy ? <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-emerald-600">Busy</p> : null}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">What are you looking for?</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. Nike cap, vintage watch…"
                className={PH_FIELD}
                autoComplete="off"
              />
            </label>
          </div>

          <PetHuntCategoryCarousel value={category} onChange={setCategory} />

          <div>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">Max budget</span>
              <input
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                inputMode="decimal"
                placeholder="$100"
                className={PH_FIELD_SM}
              />
            </label>
          </div>

          <div className={PH_CARD}>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-violet-600">Fine-tune (optional)</p>
            <label className="mt-3 block">
              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">Brand / maker</span>
              <input
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                placeholder="Nike, Seiko…"
                className={PH_FIELD_SM}
              />
            </label>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">Must include</span>
                <input
                  value={mustInclude}
                  onChange={(event) => setMustInclude(event.target.value)}
                  placeholder="size 10, box…"
                  className={PH_FIELD_SM}
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">Avoid</span>
                <input
                  value={excludeTerms}
                  onChange={(event) => setExcludeTerms(event.target.value)}
                  placeholder="replica, damaged…"
                  className={PH_FIELD_SM}
                />
              </label>
            </div>
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">Watch sources</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['Listings', 'Auctions', 'Live drops'] as const).map((source) => {
                  const active = sources.includes(source)
                  return (
                    <button
                      key={source}
                      type="button"
                      onClick={() => toggleSource(source)}
                      className={[
                        'rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.06em] shadow-sm transition-transform active:scale-[0.97]',
                        active
                          ? 'bg-[#7c3aed] text-white shadow-[0_4px_14px_-6px_rgba(124,58,237,0.55)]'
                          : 'bg-violet-50/90 text-[#4c1d95] ring-1 ring-violet-100',
                      ].join(' ')}
                      aria-pressed={active}
                    >
                      {source}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PetHuntOptionGroup label="Condition" value={condition} options={['Any', 'New', 'Used']} onChange={(next) => setCondition(next as PetHuntCondition)} />
            <PetHuntOptionGroup label="Alerts" value={alertType} options={['Instant', 'Daily summary']} onChange={(next) => setAlertType(next as PetHuntAlertType)} />
          </div>

          <div className={`${PH_CARD} bg-gradient-to-br from-violet-50/90 to-white`}>
            <button
              type="button"
              onClick={() => setAutopilotEnabled((value) => !value)}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-pressed={autopilotEnabled}
            >
              <span>
                <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-violet-600">Autopilot</span>
                <span className="mt-0.5 block text-[11px] font-medium leading-snug text-zinc-500">Auto message, bid, or buy on your rules.</span>
              </span>
              <span
                className={[
                  'relative h-8 w-[3.25rem] shrink-0 rounded-full transition-colors',
                  autopilotEnabled ? 'bg-[#7c3aed]' : 'bg-zinc-300',
                ].join(' ')}
                aria-hidden
              >
                <span
                  className={[
                    'absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform',
                    autopilotEnabled ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')}
                />
              </span>
            </button>
            {autopilotEnabled ? (
              <div className="mt-4 space-y-3 border-t border-violet-100/80 pt-4">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.1em] text-violet-600">Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ['message', 'Message'],
                      ['bid', 'Bid'],
                      ['buy', 'Buy'],
                    ] as const).map(([action, label]) => {
                      const active = autopilotActions.includes(action)
                      return (
                        <button
                          key={action}
                          type="button"
                          onClick={() => toggleAutopilotAction(action)}
                          className={[
                            'rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.05em]',
                            active ? 'bg-[#7c3aed] text-white shadow-sm' : 'bg-white text-[#4c1d95] ring-1 ring-violet-100',
                          ].join(' ')}
                          aria-pressed={active}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {autopilotActions.includes('bid') ? (
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">Autopilot max bid</span>
                    <input
                      value={autopilotMaxBid}
                      onChange={(event) => setAutopilotMaxBid(event.target.value)}
                      inputMode="decimal"
                      placeholder={maxPrice || '$80'}
                      className={PH_FIELD_SM}
                    />
                  </label>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {limitReached ? (
          <div className="mt-5 rounded-2xl bg-amber-50 px-3.5 py-3 text-[11px] font-bold leading-snug text-amber-900 ring-1 ring-amber-100/80">
            You already have 3 hunts running. Finish or pause one before adding another item.
          </div>
        ) : selectedPetBusy ? (
          <div className="mt-5 rounded-2xl bg-amber-50 px-3.5 py-3 text-[11px] font-bold leading-snug text-amber-900 ring-1 ring-amber-100/80">
            {selectedPetName} is already hunting. Choose another pet for this item.
          </div>
        ) : trimmedQuery ? (
          <div
            className={[
              'mt-5 rounded-2xl px-3.5 py-3 text-[11px] font-semibold leading-snug ring-1',
              currentMatch ? 'bg-emerald-50 text-emerald-900 ring-emerald-100' : 'bg-violet-50 text-violet-900 ring-violet-100/80',
            ].join(' ')}
          >
            {currentMatch ? (
              <>Strong match: {currentMatch.title}. {selectedPetName} can alert you right away.</>
            ) : (
              <>No “{trimmedQuery}” yet — {selectedPetName} will watch listings, auctions, and drops.</>
            )}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-[0.78fr_1.22fr] gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-zinc-100/95 px-4 py-3.5 text-[12px] font-black uppercase tracking-[0.06em] text-zinc-700 shadow-sm ring-1 ring-zinc-200/90 transition-transform active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canCreate}
            onClick={() => {
              if (!canCreate) return
              onCreate({
                petId: selectedPetId,
                query: trimmedQuery,
                category,
                brand: brand.trim().slice(0, 40),
                mustInclude: mustInclude.trim().slice(0, 120),
                excludeTerms: excludeTerms.trim().slice(0, 120),
                sources,
                maxPrice: normalizePetHuntPrice(maxPrice),
                condition,
                alertType,
                autopilotEnabled,
                autopilotActions,
                autopilotMaxBid: normalizePetHuntPrice(autopilotMaxBid),
              })
            }}
            className={[
              'rounded-2xl px-4 py-3.5 text-[12px] font-black uppercase tracking-[0.06em] shadow-[0_8px_24px_-12px_rgba(76,29,149,0.45)] transition-transform active:scale-[0.98]',
              canCreate
                ? feed3dPurpleCta
                : 'cursor-not-allowed border-b-[4px] border-b-zinc-300/80 bg-zinc-100 text-zinc-400 shadow-none',
            ].join(' ')}
          >
            {limitReached ? '3 hunts max' : 'Start hunt'}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

function tryPetHuntFoundBrowserNotification(title: string, body: string) {
  try {
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    new Notification(title, { body, tag: 'fetch-pet-hunt-found' })
  } catch {
    // Non-secure contexts or blocked APIs — ignore.
  }
}

function PetHuntFoundModal({
  open,
  hunt,
  listing,
  petName,
  onViewFinding,
  onDismiss,
}: {
  open: boolean
  hunt: PetHunt | null
  listing: PeerListing | null
  petName: string
  onViewFinding: () => void
  onDismiss: () => void
}) {
  if (!open || !hunt || !listing) return null
  const imgUrl = listing.images?.[0]?.url
  const priceLabel = formatAudFromCents(listing.priceCents ?? 0)
  const autopilotHint = petHuntAutopilotResultLabel(hunt).trim()

  return createPortal(
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pet-hunt-found-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#0c0518]/55 backdrop-blur-sm"
        aria-label="Dismiss match dialog"
        onClick={onDismiss}
      />
      <div className="relative z-[1] w-full max-w-[22rem] overflow-hidden rounded-[1.65rem] bg-white p-5 shadow-[0_28px_70px_-28px_rgba(15,8,40,0.75)] ring-2 ring-emerald-200/90">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Match found</p>
        <h2 id="pet-hunt-found-modal-title" className="mt-1.5 text-[20px] font-black leading-tight tracking-[-0.04em] text-[#1c1340]">
          {petName} found “{hunt.query}”
        </h2>
        {autopilotHint ? (
          <p className="mt-2 text-[11px] font-semibold leading-snug text-emerald-800/95">{autopilotHint}</p>
        ) : null}
        <div className="mt-4 flex gap-3 rounded-2xl bg-gradient-to-br from-emerald-50/90 to-violet-50/40 p-3 ring-1 ring-emerald-100/80">
          <div className="h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-violet-100">
            {imgUrl ? (
              <img
                src={listingImageAbsoluteUrl(imgUrl)}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-zinc-400">No image</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-3 text-[13px] font-black leading-snug text-[#1c1340]">{listing.title}</p>
            <p className="mt-1 text-[14px] font-black tabular-nums text-[#4c1d95]">{priceLabel}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onViewFinding}
            className={[
              'flex w-full items-center justify-center rounded-2xl px-4 py-3.5 text-[11px] font-black uppercase tracking-[0.08em] shadow-[0_10px_28px_-14px_rgba(76,29,149,0.55)] transition-[transform,border-bottom-width] duration-150 active:translate-y-0.5 active:border-b-2',
              feed3dPurpleCta,
            ].join(' ')}
          >
            View finding
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl py-2.5 text-[12px] font-bold text-zinc-500 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-zinc-700"
          >
            Not now
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function PetHuntFindingsSheet({
  open,
  hunt,
  matchedListing,
  petDisplayName,
  pet,
  nowMs,
  onClose,
  onViewFinding,
  onAdjustHunt,
}: {
  open: boolean
  hunt: PetHunt | null
  matchedListing: PeerListing | null
  petDisplayName: string
  pet: FetchHomePet
  nowMs: number
  onClose: () => void
  onViewFinding: () => void
  onAdjustHunt: () => void
}) {
  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open || !hunt) return null

  const hasListing = matchedListing != null
  const found = hunt.status === 'found' && hasListing
  const foundPending = hunt.status === 'found' && !hasListing
  const elapsedLabel = formatPetHuntElapsedLabel(hunt.created_at, nowMs)

  return createPortal(
    <div className="fixed inset-0 z-[91] flex items-end justify-center bg-[#0f0824]/55 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-10 backdrop-blur-md">
      <button type="button" aria-label="Close hunt details" className="absolute inset-0 cursor-default" onClick={onClose} />
      <section className={PH_SHEET} aria-labelledby="pet-hunt-findings-title">
        <div className="mx-auto mb-2 h-1 w-11 rounded-full bg-violet-200/90" aria-hidden />
        <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-violet-500">Pet Hunt</p>
        <h2 id="pet-hunt-findings-title" className="mt-1 text-center text-[22px] font-black leading-tight tracking-[-0.05em] text-[#1c1340]">
          What&apos;s been found
        </h2>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-violet-100 bg-white/95 p-3 ring-1 ring-violet-100/80">
          <div className="flex h-14 w-14 shrink-0 items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b from-violet-50 to-violet-100/80 ring-1 ring-violet-100">
            <PetProfileImage
              pet={pet}
              className="flex h-full w-full items-end justify-center"
              preset="rectMd"
              imgClassName="pointer-events-none h-[125%] w-auto max-w-none translate-y-[6%] object-contain object-bottom select-none"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#7c3aed]">{petDisplayName}</p>
            <p className="mt-0.5 truncate text-[16px] font-black leading-tight text-[#1c1340]">{hunt.query}</p>
            <p className="mt-1 text-[11px] font-bold text-zinc-500">{petHuntDetailLabel(hunt)}</p>
          </div>
        </div>

        {found && matchedListing ? (
          <div className="mt-4 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/95 to-white p-4 ring-1 ring-emerald-100/80">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">Match</p>
            <div className="mt-2 flex gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-emerald-100">
                {matchedListing.images?.[0]?.url ? (
                  <img
                    src={listingImageAbsoluteUrl(matchedListing.images[0].url)}
                    alt=""
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] font-bold text-zinc-400">No photo</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[13px] font-black leading-snug text-[#1c1340]">{matchedListing.title}</p>
                <p className="mt-1 text-[15px] font-black tabular-nums text-[#4c1d95]">
                  {formatAudFromCents(matchedListing.priceCents ?? 0)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onViewFinding}
              className={[
                'mt-4 flex w-full items-center justify-center rounded-2xl px-4 py-3.5 text-[11px] font-black uppercase tracking-[0.08em] shadow-[0_10px_28px_-14px_rgba(76,29,149,0.55)] transition-[transform,border-bottom-width] duration-150 active:translate-y-0.5 active:border-b-2',
                feed3dPurpleCta,
              ].join(' ')}
            >
              View finding
            </button>
          </div>
        ) : (
          <div className={`${PH_CARD} mt-4`}>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-violet-600">Status</p>
            <p className="mt-2 text-[14px] font-bold leading-snug text-[#1c1340]">
              {foundPending
                ? 'Match found — loading listing details. Pull to refresh the feed or try again in a moment.'
                : hunt.status === 'active'
                  ? `Still watching for “${hunt.query}”. We’ll alert you when something matches.`
                  : 'This hunt is no longer active.'}
            </p>
            {hunt.status === 'active' || foundPending ? (
              <p className="mt-2 text-[12px] font-semibold text-zinc-500">Watching · {elapsedLabel}</p>
            ) : null}
            <p className="mt-2 text-[11px] font-semibold text-[#4c1d95]">
              {petHuntAutopilotLabel(hunt)}
              {hunt.autopilot_enabled && hunt.autopilot_max_bid != null
                ? ` · Bid cap ${formatAudFromCents(hunt.autopilot_max_bid)}`
                : ''}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl border border-zinc-200 bg-zinc-50/95 py-3.5 text-[13px] font-black uppercase tracking-[0.06em] text-zinc-700 shadow-sm ring-1 ring-zinc-200/90 transition-transform active:scale-[0.99]"
        >
          Cancel
        </button>
        <button type="button" onClick={onAdjustHunt} className="mt-3 w-full text-center text-[12px] font-bold text-[#7c3aed] underline decoration-violet-300 underline-offset-2 transition-colors hover:text-[#5b21b6]">
          Adjust hunt settings
        </button>
      </section>
    </div>,
    document.body,
  )
}

function PetHuntChromaKeyImage({ src, className }: { src: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [useFallback, setUseFallback] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      setUseFallback(true)
      return
    }

    let cancelled = false
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      if (cancelled) return
      const w = img.naturalWidth
      const h = img.naturalHeight
      if (w === 0 || h === 0) {
        setUseFallback(true)
        return
      }
      canvas.width = w
      canvas.height = h
      ctx.drawImage(img, 0, 0)
      try {
        const imageData = ctx.getImageData(0, 0, w, h)
        const d = imageData.data
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i]!
          const g = d[i + 1]!
          const b = d[i + 2]!
          const a = d[i + 3]!
          if (a === 0) continue
          const dg = g - (r + b) / 2
          if (dg > 48 && g > 72) {
            d[i + 3] = 0
          } else if (dg > 14 && g > 48) {
            const t = Math.min(1, (dg - 14) / 42)
            d[i + 3] = Math.round(a * (1 - t))
          }
        }
        ctx.putImageData(imageData, 0, 0)
      } catch {
        setUseFallback(true)
      }
    }
    img.onerror = () => setUseFallback(true)
    img.src = src
    return () => {
      cancelled = true
    }
  }, [src])

  if (useFallback) {
    return <img src={src} alt="" className={className} draggable={false} />
  }

  return <canvas ref={canvasRef} className={className} aria-hidden style={{ display: 'block' }} />
}

function PetHuntCategoryCarousel({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    const idx = PET_HUNT_CATEGORY_CAROUSEL_ITEMS.findIndex((item) => item.label === value)
    if (idx < 0) return
    const el = itemRefs.current[idx]
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [value])

  return (
    <div>
      <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-violet-700">Category</p>
      <div
        className="-mx-1 flex gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 [scrollbar-width:none] snap-x snap-mandatory [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        role="listbox"
        aria-label="Hunt category"
      >
        {PET_HUNT_CATEGORY_CAROUSEL_ITEMS.map((item, index) => {
          const active = item.label === value
          return (
            <button
              key={item.label}
              type="button"
              ref={(el) => {
                itemRefs.current[index] = el
              }}
              role="option"
              aria-selected={active}
              aria-label={item.label}
              onClick={() => onChange(item.label)}
              className={[
                'snap-start flex w-[6rem] shrink-0 flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-md transition-[transform,box-shadow] active:scale-[0.98]',
                active
                  ? 'border-violet-500 shadow-[0_12px_28px_-14px_rgba(124,58,237,0.5)] ring-[3px] ring-[#7c3aed]/30'
                  : 'border-violet-200/95',
              ].join(' ')}
            >
              <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-gradient-to-b from-violet-50 to-violet-100/50">
                {item.label === 'Custom item' ? (
                  <PetHuntChromaKeyImage src={item.image} className="h-full w-full object-cover" />
                ) : (
                  <img src={item.image} alt="" className="h-full w-full object-cover object-center" draggable={false} />
                )}
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1c1340]/92 via-[#1c1340]/55 to-transparent px-1.5 pb-2 pt-7"
                  aria-hidden
                >
                  <p className="text-center text-[8px] font-black leading-[1.15] tracking-[-0.02em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] line-clamp-3 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
                    {item.label}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PetHuntOptionGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (next: string) => void
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option === value
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={[
                'rounded-full px-3.5 py-2 text-[10px] font-black transition-[transform,box-shadow] active:scale-[0.97]',
                active
                  ? 'bg-[#7c3aed] text-white shadow-[0_4px_14px_-6px_rgba(124,58,237,0.55)]'
                  : 'bg-violet-50/90 text-[#4c1d95] ring-1 ring-violet-100 shadow-sm',
              ].join(' ')}
              aria-pressed={active}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
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

function HomeAdventureQuickActions({
  onOpenLiveAuctions,
  onOpenBidWars,
  onOpenShop,
  adventureLevel,
}: {
  onOpenLiveAuctions: () => void
  onOpenBidWars: () => void
  onOpenShop: () => void
  adventureLevel: number
}) {
  const bidWarsUnlocked = adventureLevel >= BID_WARS_UNLOCK_ADVENTURE_LEVEL
  return (
    <section aria-label="Quick actions">
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onOpenLiveAuctions}
          className="relative flex min-h-[8.35rem] flex-col overflow-hidden rounded-[1.1rem] border border-violet-200/70 bg-white px-2 py-2 text-left text-[#1c1340] shadow-[0_14px_26px_-20px_rgba(76,29,149,0.55)] transition-colors active:bg-violet-50"
          aria-label="Open lives"
        >
          <p className="relative z-[1] truncate text-[11px] font-black uppercase leading-none tracking-[0.04em]">Live</p>
          <div className="pointer-events-none relative z-0 mt-1 flex min-h-[4.5rem] flex-1 items-start justify-center overflow-hidden">
            <img
              src={fetchitQuickLiveAuctionsUrl}
              alt=""
              aria-hidden
              className="mt-0 h-[4.95rem] w-[4.95rem] object-contain mix-blend-multiply"
              draggable={false}
            />
          </div>
          <span
            className={[
              feed3dPurpleCta,
              'relative z-[1] mt-1 flex w-full items-center justify-center rounded-xl px-2 py-2 text-[9px] font-black uppercase leading-none tracking-[0.06em]',
            ].join(' ')}
            aria-hidden
          >
            Open lives
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (!bidWarsUnlocked) {
              playUiFeedback('error')
              return
            }
            onOpenBidWars()
          }}
          className={[
            'relative flex min-h-[8.35rem] flex-col overflow-hidden rounded-[1.1rem] border px-2 py-2 text-left text-[#1c1340] shadow-[0_14px_26px_-20px_rgba(76,29,149,0.55)] transition-colors',
            bidWarsUnlocked ? 'border-violet-200/70 bg-white active:bg-violet-50' : 'cursor-not-allowed border-zinc-200/90 bg-zinc-50/90',
          ].join(' ')}
          aria-label={
            bidWarsUnlocked ? 'Open bid wars' : `Bid wars — unlocks at adventure level ${BID_WARS_UNLOCK_ADVENTURE_LEVEL}`
          }
        >
          <p className="relative z-[1] truncate text-[11px] font-black uppercase leading-none tracking-[0.04em]">Bid wars</p>
          <div className="pointer-events-none relative z-0 mt-1 flex min-h-[4.5rem] flex-1 items-center justify-center overflow-hidden">
            <img
              src={fetchitQuickBidWarsUrl}
              alt=""
              aria-hidden
              className={[
                'h-[5.05rem] w-[5.05rem] object-contain mix-blend-multiply',
                bidWarsUnlocked ? '' : 'opacity-55 grayscale',
              ].join(' ')}
              draggable={false}
            />
            {!bidWarsUnlocked ? (
              <div
                className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-[#1c1340]/35 px-1"
                aria-hidden
              >
                <div className="max-w-[5.5rem] rounded-md bg-white/95 px-2 py-1.5 text-center shadow-md ring-1 ring-zinc-200/90">
                  <p className="text-[8px] font-black uppercase leading-tight tracking-[0.06em] text-[#7c3aed]">
                    Level {BID_WARS_UNLOCK_ADVENTURE_LEVEL}
                  </p>
                  <p className="mt-0.5 text-[7px] font-bold leading-tight text-zinc-500">Required to play</p>
                </div>
              </div>
            ) : null}
          </div>
          <span
            className={[
              bidWarsUnlocked ? feed3dPurpleCta : 'border-b-[3px] border-zinc-300/90 bg-zinc-200 text-zinc-600 shadow-none ring-1 ring-zinc-300/80',
              'relative z-[1] mt-1 flex w-full items-center justify-center rounded-xl px-2 py-2 text-[9px] font-black uppercase leading-none tracking-[0.06em]',
            ].join(' ')}
            aria-hidden
          >
            {bidWarsUnlocked ? 'View battles' : 'Locked'}
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenShop}
          className="relative flex min-h-[8.35rem] flex-col overflow-hidden rounded-[1.1rem] border border-violet-200/70 bg-white px-2 py-2 text-left text-[#1c1340] shadow-[0_14px_26px_-20px_rgba(76,29,149,0.55)] transition-colors active:bg-violet-50"
          aria-label="Open shop"
        >
          <p className="relative z-[1] truncate text-[11px] font-black uppercase leading-none tracking-[0.04em]">Shop</p>
          <div className="pointer-events-none relative z-0 mt-1 flex min-h-[4.5rem] flex-1 items-center justify-center overflow-hidden">
            <img
              src={fetchitQuickShopUrl}
              alt=""
              aria-hidden
              className="h-[5rem] w-[5rem] object-contain mix-blend-multiply"
              draggable={false}
            />
          </div>
          <span
            className={[
              feed3dPurpleCta,
              'fetch-seq-cta-shine relative z-[1] mt-1 flex w-full items-center justify-center overflow-hidden rounded-xl px-2 py-2 text-[9px] font-black uppercase leading-none tracking-[0.06em]',
            ].join(' ')}
            aria-hidden
          >
            Open shop
          </span>
        </button>
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
  mysteryClaimed,
  onClaim,
  onClaimMystery,
}: {
  completed: readonly DailyRewardTaskId[]
  mysteryClaimed: boolean
  onClaim: (id: DailyRewardTaskId, sourceEl?: HTMLElement | null) => void
  onClaimMystery: (sourceEl?: HTMLElement | null) => void
}) {
  const showMysteryRow = allDailyRewardTasksComplete(completed)
  const mysteryDone = mysteryClaimed

  return (
    <section className="px-2" aria-label="Daily gem tasks">
      <div className="grid grid-cols-1 gap-1.5">
        {DAILY_REWARD_TASKS.map((task) => {
          const done = completed.includes(task.id)
          const rewardGems = dailyTaskRewardGems(task.id)
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
              aria-label={`${task.title}. Reward ${rewardGems} gems. ${done ? 'Completed today' : 'Claim once per day'}`}
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
                <span>{rewardGems}</span>
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
        {showMysteryRow ? (
          <div
            data-daily-mystery-card
            className={[
              'flex min-h-[3.75rem] w-full items-center gap-2 rounded-xl border bg-white px-2 py-1.5 text-left shadow-none transition-colors duration-150',
              mysteryDone ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-violet-50 active:bg-amber-50/80',
            ].join(' ')}
            aria-label={`Mystery unlock bonus. Reward ${DAILY_MYSTERY_UNLOCK_GEMS} gems. ${mysteryDone ? 'Claimed today' : 'Complete all daily tasks to claim'}`}
          >
            <span
              className={[
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#4c1d95] ring-1',
                mysteryDone ? 'bg-emerald-100 ring-emerald-200' : 'bg-amber-100 ring-amber-200',
              ].join(' ')}
              aria-hidden
            >
              {mysteryDone ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span className="text-[11px] font-black leading-none">?</span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-black leading-none tracking-[-0.02em] text-[#1c1340]">
                Mystery unlock
              </div>
              {!mysteryDone ? (
                <div className="mt-0.5 truncate text-[9px] font-semibold leading-tight text-violet-600/90">
                  Bonus for finishing every todo today
                </div>
              ) : null}
            </div>
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-black text-[#4c1d95]">
              <img
                src={purpleGemIconUrl}
                alt=""
                aria-hidden
                className="h-3 w-3 object-contain"
                draggable={false}
                loading="lazy"
              />
              <span>{DAILY_MYSTERY_UNLOCK_GEMS}</span>
            </span>
            {mysteryDone ? (
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.06em] text-emerald-700">
                Done
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) =>
                  onClaimMystery(e.currentTarget.closest('[data-daily-mystery-card]') as HTMLElement | null)
                }
                className="shrink-0 rounded-full bg-[#7c3aed] px-2 py-1 text-[9px] font-black uppercase tracking-[0.06em] leading-none text-white"
              >
                Claim
              </button>
            )}
          </div>
        ) : null}
      </div>
    </section>
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
  /** For You “Live” tile — marketplace live grid (defaults to generic marketplace). */
  onOpenMarketplaceAuctions?: () => void
  /** For You “Shop” tile — marketplace store catalog (defaults to generic marketplace). */
  onOpenMarketplaceShop?: () => void
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
  onOpenDrops: _onOpenDrops,
  onOpenLiveStream: _onOpenLiveStream,
  onOpenMarketplace,
  onOpenMarketplaceAuctions,
  onOpenMarketplaceShop,
  onOpenSearch: _onOpenSearch,
  onOpenPeerListing,
  onQuickBuyPeerListing,
  onJoinBidWar,
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

  const [demoFundsCents, setDemoFundsCents] = useState(0)
  const [backpackStorageOpen, setBackpackStorageOpen] = useState(false)
  const [backpackItems, setBackpackItems] = useState<BackpackItem[]>(() => loadBackpackItems())
  const [adventureProgress, setAdventureProgress] = useState<AdventureProgress>(() =>
    loadAdventureProgress(),
  )
  const [demoGems, setDemoGems] = useState(() => loadDemoGems())
  const [dailyRewardState, setDailyRewardState] = useState<DailyRewardState>(() => loadDailyRewardState())
  const [dailyStreakCount] = useState<number>(() => (embedded ? loadAndBumpDailyStreakCount() : 1))
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
  const [petCelebrationSeq, setPetCelebrationSeq] = useState(0)
  const [petHunts, setPetHunts] = useState<PetHunt[]>(() => loadPetHunts())
  const [petHuntSheetOpen, setPetHuntSheetOpen] = useState(false)
  const [petHuntPresetQuery, setPetHuntPresetQuery] = useState('')
  const [petHuntToast, setPetHuntToast] = useState<{ huntId: string; message: string } | null>(null)
  const [petHuntFoundModalHuntId, setPetHuntFoundModalHuntId] = useState<string | null>(null)
  const [petHuntFindingsSheetHuntId, setPetHuntFindingsSheetHuntId] = useState<string | null>(null)
  const [starterPetRevealed, setStarterPetRevealed] = useState(() => loadStarterPetRevealed())
  const [starterUnlockRunning, setStarterUnlockRunning] = useState(false)
  const [starterSkillsSheetOpen, setStarterSkillsSheetOpen] = useState(false)
  const demoGemsRef = useRef(demoGems)
  const rankUpLockRef = useRef(false)
  const starterUnlockGuardRef = useRef(false)
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
  const [unlockedHomePetSlots, setUnlockedHomePetSlots] = useState(() => loadHomeUnlockedPetSlots())
  const activePet = FETCH_HOME_PETS.find((pet) => pet.id === petProfile.selectedPetId) ?? FETCH_HOME_PETS[0]
  const activePetName = petProfile.names[activePet.id]?.trim() || activePet.defaultName
  const activePetRank = normalizePetRank(petProfile.ranks[activePet.id])
  const handleOpenLiveAuctions = useCallback(() => {
    ;(onOpenMarketplaceAuctions ?? onOpenMarketplace)()
  }, [onOpenMarketplaceAuctions, onOpenMarketplace])
  const benchPet = useMemo(() => {
    if (FETCH_HOME_PETS.length < 2) return null
    const idx = FETCH_HOME_PETS.findIndex((p) => p.id === petProfile.selectedPetId)
    const ringAt = idx >= 0 ? idx : 0
    return FETCH_HOME_PETS[(ringAt + 1) % FETCH_HOME_PETS.length] ?? null
  }, [petProfile.selectedPetId])
  const livePetHunts = useMemo(
    () =>
      [...petHunts]
        .filter((hunt) => hunt.status === 'found' || hunt.status === 'active')
        .sort((a, b) => b.updated_at - a.updated_at)
        .slice(0, PET_HUNT_MAX_LIVE),
    [petHunts],
  )
  const petHuntMatchesById = useMemo(() => {
    const matches: Record<string, PeerListing | null> = {}
    for (const hunt of livePetHunts) {
      matches[hunt.id] = hunt.matched_listing_id
        ? allListings.find((listing) => listing.id === hunt.matched_listing_id) ?? null
        : null
    }
    return matches
  }, [allListings, livePetHunts])
  const defaultPetHuntPetId = useMemo(() => {
    const busyPetIds = new Set(livePetHunts.map((hunt) => hunt.pet_id))
    return FETCH_HOME_PETS.find((pet) => !busyPetIds.has(pet.id))?.id ?? petProfile.selectedPetId
  }, [livePetHunts, petProfile.selectedPetId])

  const heroNotificationCount = useMemo(() => {
    const foundCount = petHunts.filter((h) => h.status === 'found').length
    return Math.min(9, Math.max(1, 1 + foundCount))
  }, [petHunts])

  const notifyPetHuntMatch = useCallback((hunt: PetHunt, listing: PeerListing) => {
    setPetHuntFoundModalHuntId(hunt.id)
    setPetHuntToast(null)
    const pet = FETCH_HOME_PETS.find((p) => p.id === hunt.pet_id)
    const petName = petProfile.names[hunt.pet_id]?.trim() || pet?.defaultName || 'Your pet'
    const preview =
      listing.title.length > 110 ? `${listing.title.slice(0, 110).trim()}…` : listing.title
    tryPetHuntFoundBrowserNotification('Pet Hunt · Match found', `${petName}: ${preview}`)
  }, [petProfile.names])

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

  useEffect(() => {
    const next = petHunts.map((hunt) => {
      if (hunt.status !== 'active') return hunt
      const match = findPetHuntMatch(hunt, allListings)
      if (!match) return hunt
      return {
        ...hunt,
        status: 'found' as PetHuntStatus,
        matched_listing_id: match.id,
        updated_at: Date.now(),
      }
    })
    if (next.some((hunt, idx) => hunt !== petHunts[idx])) {
      setPetHunts(next)
      savePetHunts(next)
      const found = next.find((hunt, idx) => hunt !== petHunts[idx] && hunt.status === 'found')
      if (found) {
        const matchListing = allListings.find((listing) => listing.id === found.matched_listing_id)
        if (matchListing) notifyPetHuntMatch(found, matchListing)
        playUiFeedback('gems_collect')
      }
    }
  }, [allListings, notifyPetHuntMatch, petHunts])

  function handleStartPetHuntScan() {
    playAdventureTrumpets()
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

  const handleStarterUnlockClick = useCallback(() => {
    if (starterPetRevealed || starterUnlockGuardRef.current) return
    starterUnlockGuardRef.current = true
    playUiFeedback('gems_collect')
    setStarterUnlockRunning(true)
    window.setTimeout(() => {
      persistStarterPetRevealed()
      setStarterPetRevealed(true)
      setStarterUnlockRunning(false)
      starterUnlockGuardRef.current = false
      setStarterSkillsSheetOpen(true)
      playConfettiPops()
      setPetCelebrationSeq((seq) => seq + 1)
      window.setTimeout(() => playWinFanfare(), 120)
    }, 1460)
  }, [starterPetRevealed])

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
      dailyMysteryClaimed: dailyRewardState.dailyMysteryClaimed,
    }
    setDailyRewardState(nextDaily)
    saveDailyRewardState(nextDaily)
    spawnGemRewardFx(dailyTaskRewardGems(id), sourceEl)
  }

  function handleClaimDailyMysteryBonus(sourceEl?: HTMLElement | null) {
    if (dailyRewardState.dailyMysteryClaimed) return
    if (!allDailyRewardTasksComplete(dailyRewardState.completed)) return
    const nextDaily: DailyRewardState = {
      date: todayKey(),
      completed: dailyRewardState.completed,
      dailyMysteryClaimed: true,
    }
    setDailyRewardState(nextDaily)
    saveDailyRewardState(nextDaily)
    spawnGemRewardFx(DAILY_MYSTERY_UNLOCK_GEMS, sourceEl)
    playConfettiPops()
  }

  function openPetHuntSetup(preset?: string) {
    setPetHuntPresetQuery(preset ?? '')
    setPetHuntSheetOpen(true)
  }

  function handleCreatePetHunt(input: {
    petId: FetchPetId
    query: string
    category: string
    brand: string
    mustInclude: string
    excludeTerms: string
    sources: PetHuntListingSource[]
    maxPrice: number | null
    condition: PetHuntCondition
    alertType: PetHuntAlertType
    autopilotEnabled: boolean
    autopilotActions: PetHuntAutopilotAction[]
    autopilotMaxBid: number | null
  }) {
    const currentLiveHunts = petHunts.filter((hunt) => hunt.status === 'active' || hunt.status === 'found')
    if (currentLiveHunts.length >= PET_HUNT_MAX_LIVE) return
    if (currentLiveHunts.some((hunt) => hunt.pet_id === input.petId)) return
    const now = Date.now()
    const draft: PetHunt = {
      id: `hunt_${now}_${Math.floor(Math.random() * 1000)}`,
      user_id: loadSession()?.email?.trim() || 'local-demo-user',
      pet_id: input.petId,
      query: input.query.trim().slice(0, 80),
      category: input.category,
      brand: input.brand.trim().slice(0, 40),
      must_include: input.mustInclude.trim().slice(0, 120),
      exclude_terms: input.excludeTerms.trim().slice(0, 120),
      sources: input.sources.length ? input.sources : ['Listings', 'Auctions', 'Live drops'],
      max_price: input.maxPrice,
      condition: input.condition,
      alert_type: input.alertType,
      autopilot_enabled: input.autopilotEnabled,
      autopilot_actions: input.autopilotActions,
      autopilot_max_bid: input.autopilotMaxBid,
      status: 'active',
      matched_listing_id: null,
      created_at: now,
      updated_at: now,
    }
    const match = findPetHuntMatch(draft, allListings)
    const nextHunt: PetHunt = match
      ? { ...draft, status: 'found', matched_listing_id: match.id, updated_at: now }
      : draft
    const next = [nextHunt, ...petHunts]
    setPetHunts(next)
    savePetHunts(next)
    setPetHuntSheetOpen(false)
    if (!match) handleStartPetHuntScan()
    else playUiFeedback('gems_collect')
    if (match) notifyPetHuntMatch(nextHunt, match)
  }

  function getPetHuntListingMatch(huntId: string): PeerListing | null {
    const fromCard = petHuntMatchesById[huntId]
    if (fromCard) return fromCard
    const hunt = petHunts.find((item) => item.id === huntId)
    if (!hunt?.matched_listing_id) return null
    return allListings.find((listing) => listing.id === hunt.matched_listing_id) ?? null
  }

  function handleViewPetHunt(huntId: string) {
    setPetHuntFindingsSheetHuntId(huntId)
  }

  function handleAdjustPetHuntFromFindingsSheet() {
    const huntId = petHuntFindingsSheetHuntId
    const hunt = huntId ? petHunts.find((item) => item.id === huntId) : null
    setPetHuntFindingsSheetHuntId(null)
    setPetHuntPresetQuery(hunt?.query ?? '')
    setPetHuntSheetOpen(true)
  }

  function handleViewPetHuntListing(huntId: string) {
    const match = getPetHuntListingMatch(huntId)
    if (!match) return
    setPetHuntToast(null)
    setPetHuntFoundModalHuntId(null)
    onOpenPeerListing(match.id)
  }

  function handleMessagePetHuntListing(huntId: string) {
    const match = getPetHuntListingMatch(huntId)
    const hunt = petHunts.find((item) => item.id === huntId)
    if (!match || !hunt) return
    setPetHuntFoundModalHuntId(null)
    setPetHuntToast({ huntId, message: `Autopilot message ready for ${hunt.query}.` })
    onOpenPeerListing(match.id)
  }

  function handleBuyPetHuntListing(huntId: string) {
    const match = getPetHuntListingMatch(huntId)
    if (!match) return
    setPetHuntToast(null)
    setPetHuntFoundModalHuntId(null)
    if (onQuickBuyPeerListing) onQuickBuyPeerListing(match.id)
    else onOpenPeerListing(match.id)
  }

  function handleBidPetHuntListing(huntId: string) {
    const match = getPetHuntListingMatch(huntId)
    if (!match) return
    setPetHuntToast(null)
    setPetHuntFoundModalHuntId(null)
    onOpenPeerListing(match.id)
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

  function handlePetRankUpPet(petId: FetchPetId) {
    if (rankUpLockRef.current) return
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

  function handleUnlockHomePetSlot() {
    const cost = nextHomePetSlotUnlockGemCost(unlockedHomePetSlots)
    if (cost == null || demoGemsRef.current < cost) return
    const nextGems = demoGemsRef.current - cost
    demoGemsRef.current = nextGems
    setDemoGems(nextGems)
    saveDemoGems(nextGems)
    const nextSlots = Math.min(MAX_HOME_PET_SLOTS, unlockedHomePetSlots + 1)
    setUnlockedHomePetSlots(nextSlots)
    saveHomeUnlockedPetSlots(nextSlots)
    playUiFeedback('coin_hit')
    pulseHomeGemIcon()
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
  function getBackpackRect(): DOMRect | null {
    const root = heroRef.current
    if (!root) return null
    const el = root.querySelector<HTMLElement>('[data-fetch-backpack-target]')
    return el ? el.getBoundingClientRect() : null
  }

  const petHuntFoundModalHunt = useMemo(
    () => (petHuntFoundModalHuntId ? petHunts.find((h) => h.id === petHuntFoundModalHuntId) ?? null : null),
    [petHuntFoundModalHuntId, petHunts],
  )
  const petHuntFoundModalListing = useMemo(
    () =>
      petHuntFoundModalHunt?.matched_listing_id
        ? allListings.find((listing) => listing.id === petHuntFoundModalHunt.matched_listing_id) ?? null
        : null,
    [allListings, petHuntFoundModalHunt],
  )
  const petHuntFoundModalPetName = useMemo(() => {
    if (!petHuntFoundModalHunt) return ''
    const pet = FETCH_HOME_PETS.find((p) => p.id === petHuntFoundModalHunt.pet_id)
    return petProfile.names[petHuntFoundModalHunt.pet_id]?.trim() || pet?.defaultName || 'Your pet'
  }, [petHuntFoundModalHunt, petProfile.names])

  const petHuntFindingsSheetHunt = useMemo(
    () =>
      petHuntFindingsSheetHuntId ? petHunts.find((item) => item.id === petHuntFindingsSheetHuntId) ?? null : null,
    [petHuntFindingsSheetHuntId, petHunts],
  )
  const petHuntFindingsSheetListing = useMemo(() => {
    if (!petHuntFindingsSheetHunt?.matched_listing_id) return null
    return allListings.find((listing) => listing.id === petHuntFindingsSheetHunt.matched_listing_id) ?? null
  }, [allListings, petHuntFindingsSheetHunt])
  const petHuntFindingsSheetPet = useMemo(() => {
    if (!petHuntFindingsSheetHunt) return FETCH_HOME_PETS[0]
    return FETCH_HOME_PETS.find((p) => p.id === petHuntFindingsSheetHunt.pet_id) ?? FETCH_HOME_PETS[0]
  }, [petHuntFindingsSheetHunt])
  const petHuntFindingsSheetPetName = useMemo(() => {
    if (!petHuntFindingsSheetHunt) return ''
    const pet = FETCH_HOME_PETS.find((p) => p.id === petHuntFindingsSheetHunt.pet_id)
    return petProfile.names[petHuntFindingsSheetHunt.pet_id]?.trim() || pet?.defaultName || 'Your pet'
  }, [petHuntFindingsSheetHunt, petProfile.names])

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
            dailyStreakCount={dailyStreakCount}
            adventureLevel={adventureProgress.level}
            adventureXp={adventureProgress.xp}
            fundsLabel={demoFundsLabel}
            gemsCount={demoGems}
            notificationsCount={heroNotificationCount}
            petName={activePetName}
            petFeedTimerLabel={petFeedTimerLabel}
            petRank={activePetRank}
            petHungerStage={petHungerStage}
            isPetFed={isPetFed}
            canFeedPet={!isPetFed}
            petCelebrationSeq={petCelebrationSeq}
            unlockedHomePetSlots={unlockedHomePetSlots}
            rosterActivePet={activePet}
            benchPet={benchPet}
            petNames={petProfile.names}
            petRanks={petProfile.ranks}
            starterPetRevealed={starterPetRevealed}
            starterUnlockRunning={starterUnlockRunning}
            onStarterUnlockClick={handleStarterUnlockClick}
            onAddDemoFunds={() => setDemoFundsCents((cents) => cents + 1000)}
            onViewBackpack={() => setBackpackStorageOpen(true)}
            onOpenPetEdit={() => setPetEditorOpen(true)}
            onFeedPet={handleFeedPet}
          />
          <div className="mt-3 px-2 sm:px-3">
            <PetHuntMissionCard
              hunts={livePetHunts}
              matchesByHuntId={petHuntMatchesById}
              petNames={petProfile.names}
              petRanks={petProfile.ranks}
              fallbackPetName={activePetName}
              nowMs={nowMs}
              canStartHunt={isPetFed && starterPetRevealed}
              starterLocked={!starterPetRevealed}
              onStartHunt={openPetHuntSetup}
              onViewHunt={handleViewPetHunt}
              onViewListing={handleViewPetHuntListing}
              onMessage={handleMessagePetHuntListing}
              onBid={handleBidPetHuntListing}
              onBuyNow={handleBuyPetHuntListing}
            />
          </div>
          <div className="mt-2 px-2 sm:px-3">
            <HomeAdventureQuickActions
              adventureLevel={adventureProgress.level}
              onOpenLiveAuctions={handleOpenLiveAuctions}
              onOpenBidWars={onJoinBidWar ?? onOpenMarketplace}
              onOpenShop={() => (onOpenMarketplaceShop ?? onOpenMarketplace)()}
            />
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
          homeUnlockedPetSlots={unlockedHomePetSlots}
          onSelectPet={handleSelectPet}
          onPetNameChange={handlePetEditorNameChange}
          onUserDisplayNameChange={handleHeroDisplayNameChange}
          onHeroGenderChange={handleHeroGenderChange}
          onRankUpPet={handlePetRankUpPet}
          onUnlockHomePetSlot={handleUnlockHomePetSlot}
          onClose={() => setPetEditorOpen(false)}
          onSave={() => {
            playUiFeedback('coin_hit')
            setPetEditorOpen(false)
          }}
        />
        <StarterPetSkillsSheet
          open={starterSkillsSheetOpen}
          petDisplayName={activePetName}
          onClose={() => setStarterSkillsSheetOpen(false)}
        />
        <PetHuntSetupSheet
          open={petHuntSheetOpen}
          pets={FETCH_HOME_PETS}
          petNames={petProfile.names}
          petRanks={petProfile.ranks}
          liveHunts={livePetHunts}
          defaultPetId={defaultPetHuntPetId}
          presetQuery={petHuntPresetQuery}
          listings={allListings}
          onClose={() => setPetHuntSheetOpen(false)}
          onCreate={handleCreatePetHunt}
        />
        <PetHuntFoundModal
          open={Boolean(petHuntFoundModalHunt && petHuntFoundModalListing)}
          hunt={petHuntFoundModalHunt}
          listing={petHuntFoundModalListing}
          petName={petHuntFoundModalPetName}
          onViewFinding={() => {
            if (petHuntFoundModalHunt) handleViewPetHuntListing(petHuntFoundModalHunt.id)
          }}
          onDismiss={() => setPetHuntFoundModalHuntId(null)}
        />
        <PetHuntFindingsSheet
          open={petHuntFindingsSheetHuntId != null && petHuntFindingsSheetHunt != null}
          hunt={petHuntFindingsSheetHunt}
          matchedListing={petHuntFindingsSheetListing}
          petDisplayName={petHuntFindingsSheetPetName}
          pet={petHuntFindingsSheetPet}
          nowMs={nowMs}
          onClose={() => setPetHuntFindingsSheetHuntId(null)}
          onViewFinding={() => {
            if (petHuntFindingsSheetHuntId) {
              handleViewPetHuntListing(petHuntFindingsSheetHuntId)
              setPetHuntFindingsSheetHuntId(null)
            }
          }}
          onAdjustHunt={handleAdjustPetHuntFromFindingsSheet}
        />
        <div className="mt-3">
          <DailyRewardTaskCards
            completed={dailyRewardState.completed}
            mysteryClaimed={dailyRewardState.dailyMysteryClaimed === true}
            onClaim={handleCompleteDailyRewardTask}
            onClaimMystery={handleClaimDailyMysteryBonus}
          />
        </div>
        {petHuntToast ? (
          <button
            type="button"
            onClick={() => handleViewPetHuntListing(petHuntToast.huntId)}
            className="fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top,0px)+0.5rem)] z-[95] w-[min(23rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-2xl bg-white px-3 py-2 text-left text-[#1c1340] shadow-[0_18px_42px_-20px_rgba(30,15,80,0.6)] ring-1 ring-emerald-200"
            aria-label={petHuntToast.message}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600">Pet Hunt alert</p>
            <p className="mt-0.5 text-[13px] font-black leading-tight">{petHuntToast.message}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-zinc-500">Tap to open the listing.</p>
          </button>
        ) : null}
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
              onClick={() => (onOpenMarketplaceShop ?? onOpenMarketplace)()}
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
