import { createPortal } from 'react-dom'
import { memo, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import type { DropReel } from '../lib/drops/types'

import flameVideoUrl from '../assets/flame.mp4'
import {
  HOME_SHELL_UNIFIED_TOP_HEADER_CLASS,
  HomeShellHeaderSearchRingIcon,
} from './HomeShellUnifiedTopHeader'
import {
  consumePendingStreakCelebrateIfMatches,
  DAILY_STREAK_STORAGE_KEY,
  loadAndBumpDailyStreakWithCelebrate,
  readDailyStreakCount,
} from '../lib/homeDailyStreak'
import { ChromaKeyedMascotVideo } from './ChromaKeyedMascot'
import { LiveAuctionFeedSection } from './LiveAuctionFeedCardsMock'
import { dropsReelsForLiveAuctionFloor, getMockStreamCapableLiveReels } from '../lib/liveFeedDemo'
import { useDropsApiFeed } from '../lib/drops/useDropsApiFeed'
export type HomeFeedV2Props = {
  onOpenLiveStream?: (reel: DropReel) => void
  onOpenSellerProfile?: (reel: DropReel) => void
  onOpenMarketplaceAuctions?: () => void
  onOpenMarketplaceShop?: () => void
/** Opens in-shell Discover (search tab). */
  onWatchLive?: () => void
  /** Dedicated seller flow at `/go-live`. */
  onSellerGoLive?: () => void
  /** Opens full browse — defaults to marketplace shop entry when omitted. */
  onViewAllForYou?: () => void
  onOpenSearch?: () => void
  onOpenPeerListing?: (listingId: string) => void
  onJoinBidWar?: () => void
  onGoLive?: () => void
  onCreateListing?: () => void
  onAddHunt?: () => void
  /** Header: profile / account tab. */
  onOpenProfile?: () => void
  /** Header: heart replaces chat + bell; opens same flow as alerts (typically profile notifications). */
  onOpenNotifications?: () => void
  /** Stream-capable live reels shown in Explore (powers random-live join dock). */
  onExploreLiveAuctionReelsResolved?: (reels: DropReel[]) => void
}
/** Filled heart — single combined header control beside search. */
function ExploreHeaderHeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-8.74 1.06-1.06a5.5 5.5 0 1 0-7.78-7.78z"
      />
    </svg>
  )
}

function DailyStreakCelebrateModal({
  open,
  streakDays,
  flameSrc,
  onDismiss,
}: {
  open: boolean
  streakDays: number
  flameSrc: string
  onDismiss: () => void
}) {
  if (typeof document === 'undefined' || !open) return null

  const safe = Number.isFinite(streakDays) ? Math.min(999, Math.max(1, Math.floor(streakDays))) : 1

  return createPortal(
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-5">
            <button
              type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Dismiss streak celebration"
        onClick={onDismiss}
      />
      <div
        className="relative z-[1] w-full max-w-[min(100%,20rem)] rounded-2xl bg-gradient-to-b from-violet-50 to-white px-5 pt-7 pb-6 text-center shadow-[0_28px_72px_-28px_rgba(49,16,95,0.55)] ring-1 ring-violet-200/80"
        role="dialog"
        aria-modal="true"
        aria-label={`${safe}-day streak celebration`}
      >
        <div className="mx-auto mb-5 flex h-40 items-end justify-center">
          <ChromaKeyedMascotVideo
            src={flameSrc}
            maxProcessWidth={178}
            maxCssHeight={168}
            chromaPixelRatioMax={4}
            chromaResolutionScale={1.85}
          />
        </div>
        <p className="text-xl font-black tracking-tight text-violet-950">You're on fire</p>
        <p className="mt-1.5 text-[2.05rem] font-black tabular-nums leading-none text-orange-700">
          {safe} <span className="text-[1rem] font-extrabold text-zinc-600">{safe === 1 ? 'day' : 'days'}</span>
        </p>
        <p className="mt-2 px-2 text-[13px] font-medium leading-snug text-zinc-600">
          Come back tomorrow to keep your streak going.
        </p>
            <button
              type="button"
          onClick={onDismiss}
          className="mt-6 w-full rounded-xl bg-violet-600 px-4 py-3 text-[15px] font-black text-white shadow-md transition-colors active:bg-violet-700"
        >
          Got it
            </button>
      </div>
    </div>,
    document.body,
  )
}

function HomeFeedV2Inner({
  onOpenLiveStream,
  onOpenSellerProfile,
  onOpenSearch,
  onWatchLive,
  onGoLive,
  onOpenMarketplaceAuctions: _onOpenMarketplaceAuctions,
  onOpenMarketplaceShop,
  onViewAllForYou: _onViewAllForYou,
  onOpenPeerListing: _onOpenPeerListing,
  onJoinBidWar: _onJoinBidWar,
  onOpenProfile: _onOpenProfile,
  onOpenNotifications,
  onExploreLiveAuctionReelsResolved,
  onAddHunt: _onAddHunt,
}: HomeFeedV2Props) {
  const { reels: feedReels, loading: feedLoading, error: feedError, refresh: refreshFeed } =
    useDropsApiFeed()
  const liveFeedReels = useMemo(() => {
    const fromApi = dropsReelsForLiveAuctionFloor(feedReels)
    if (feedLoading) return fromApi
    if (fromApi.length > 0) return fromApi
    return getMockStreamCapableLiveReels()
  }, [feedReels, feedLoading])

  useEffect(() => {
    onExploreLiveAuctionReelsResolved?.(liveFeedReels)
  }, [liveFeedReels, onExploreLiveAuctionReelsResolved])

  const [dailyStreakCount, setDailyStreakCount] = useState(() => readDailyStreakCount())
  const [streakCelebrateOpen, setStreakCelebrateOpen] = useState(false)

  useLayoutEffect(() => {
    const { count, celebrate } = loadAndBumpDailyStreakWithCelebrate()
    setDailyStreakCount(count)
    const fromQueue = consumePendingStreakCelebrateIfMatches(count)
    if (celebrate || fromQueue) setStreakCelebrateOpen(true)
  }, [])

  useEffect(() => {
    const onStreakStorage = (e: StorageEvent) => {
      if (e.key === DAILY_STREAK_STORAGE_KEY || e.key === null) {
        setDailyStreakCount(readDailyStreakCount())
      }
    }
    window.addEventListener('storage', onStreakStorage)
    return () => window.removeEventListener('storage', onStreakStorage)
  }, [])

  return (
    <>
      <div className="flex w-full min-w-0 flex-col overflow-x-hidden bg-white px-3 pb-2 pt-0 sm:px-5">
        <div className="mx-auto flex w-full max-w-[min(100%,430px)] flex-col">
          <header
            className={[HOME_SHELL_UNIFIED_TOP_HEADER_CLASS, '-mx-0'].join(' ')}
          >
            <h1 className="shrink-0 text-[clamp(1.5rem,6.5vw,2.1rem)] font-black leading-none tracking-tight text-zinc-900 sm:text-[2.125rem]">
              Live
            </h1>
            <div className="min-w-0 flex-1" aria-hidden />
            <button
              type="button"
              onClick={() => onOpenSearch?.()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent text-zinc-900 outline-none transition-[opacity,filter] active:opacity-70 focus-visible:ring-2 focus-visible:ring-violet-400/55 focus-visible:ring-offset-2"
              aria-label="Search"
            >
              <HomeShellHeaderSearchRingIcon className="h-7 w-7 shrink-0 text-zinc-900" />
            </button>

            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => onOpenNotifications?.()}
                className="flex h-11 w-11 items-center justify-center rounded-xl border-0 bg-transparent text-zinc-900 outline-none transition-[opacity,filter] active:opacity-70 focus-visible:ring-2 focus-visible:ring-violet-400/55 focus-visible:ring-offset-2"
                aria-label="Notifications"
              >
                <ExploreHeaderHeartIcon className="block h-7 w-7 text-zinc-900" />
              </button>
            </div>
          </header>

          <div className="relative z-[3] mt-3 flex w-full min-w-0 flex-col items-center pb-[calc(env(safe-area-inset-bottom,0px)+7.35rem)] pt-0 sm:mt-4">
            <LiveAuctionFeedSection
              liveReels={liveFeedReels}
              loading={feedLoading}
              error={feedError}
              onRetry={refreshFeed}
              onOpenLiveStream={onOpenLiveStream}
              onNotifyWhenLive={onOpenNotifications}
              onGoLive={onGoLive}
              onWatchLive={onWatchLive}
              onViewShop={onOpenMarketplaceShop}
              onOpenSellerProfile={onOpenSellerProfile}
              presentation="twoUpPortraitGrid"
            />
          </div>
        </div>
      </div>
      <DailyStreakCelebrateModal
        open={streakCelebrateOpen}
        streakDays={dailyStreakCount}
        flameSrc={flameVideoUrl}
        onDismiss={() => setStreakCelebrateOpen(false)}
      />
    </>
  )
}

export const HomeFeedV2 = memo(HomeFeedV2Inner)
