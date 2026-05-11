import { memo, useEffect, useState } from 'react'
import {
  EXPLORE_LISTING_HUNT_CHANGED,
  readExploreListingHuntActive,
  setExploreListingHuntActive,
} from '../lib/exploreListingHunt'
import { AutoHuntOnboardingFlow } from './AutoHuntOnboardingFlow'

export type ExploreStickyIconDockHostProps = {
  /** Shows the fixed hunt / go-live toolbar above the shell bottom nav. Hunt onboarding can stay open when this is false. */
  dockVisible: boolean
  onGoLive?: () => void
  onOpenPeerListing?: (listingId: string) => void
}

function ExploreStickyIconDockToolbar({
  listingHuntActive,
  onOpenHuntSettings,
  onGoLive,
}: {
  listingHuntActive: boolean
  onOpenHuntSettings: () => void
  onGoLive?: () => void
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+0.5rem)] z-[59] px-3 sm:px-5">
      <div className="pointer-events-none flex justify-center">
        <div
          role="toolbar"
          aria-label="Explore quick actions"
          className="pointer-events-auto flex overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-black/[0.04] sm:rounded-3xl"
        >
          <button
            type="button"
            onClick={onOpenHuntSettings}
            className={
              listingHuntActive
                ? 'relative flex min-h-11 items-center justify-center bg-violet-50 px-4 py-2.5 transition-[filter] active:bg-zinc-100 sm:min-h-12 sm:px-5 sm:py-3'
                : 'relative flex min-h-11 items-center justify-center bg-white px-4 py-2.5 transition-[filter] active:bg-zinc-100 sm:min-h-12 sm:px-5 sm:py-3'
            }
            aria-label={
              listingHuntActive ? 'Listing hunt active — tap to adjust' : 'Hunt for listings — open onboarding'
            }
          >
            {listingHuntActive ? (
              <span
                className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white"
                aria-hidden
              />
            ) : null}
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:h-11 sm:w-11">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white sm:h-6 sm:w-6" aria-hidden>
                <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
                <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="11" cy="11" r="2.25" fill="currentColor" />
              </svg>
            </span>
          </button>

          <div className="w-px shrink-0 bg-zinc-200" aria-hidden />

          <button
            type="button"
            onClick={() => onGoLive?.()}
            className="flex min-h-11 items-center justify-center bg-white px-4 py-2.5 transition-[filter] active:bg-zinc-100 sm:min-h-12 sm:px-5 sm:py-3"
            aria-label="Sell or go live"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:h-11 sm:w-11">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white sm:h-6 sm:w-6" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

function ExploreStickyIconDockHostInner({
  dockVisible,
  onGoLive,
  onOpenPeerListing,
}: ExploreStickyIconDockHostProps) {
  const [listingHuntActive, setListingHuntActive] = useState(() => readExploreListingHuntActive())
  const [autoHuntOnboardingOpen, setAutoHuntOnboardingOpen] = useState(false)

  useEffect(() => {
    const syncHunt = () => setListingHuntActive(readExploreListingHuntActive())
    window.addEventListener(EXPLORE_LISTING_HUNT_CHANGED, syncHunt)
    window.addEventListener('storage', syncHunt)
    return () => {
      window.removeEventListener(EXPLORE_LISTING_HUNT_CHANGED, syncHunt)
      window.removeEventListener('storage', syncHunt)
    }
  }, [])

  return (
    <>
      {dockVisible ? (
        <ExploreStickyIconDockToolbar
          listingHuntActive={listingHuntActive}
          onOpenHuntSettings={() => setAutoHuntOnboardingOpen(true)}
          onGoLive={onGoLive}
        />
      ) : null}
      <AutoHuntOnboardingFlow
        open={autoHuntOnboardingOpen}
        onClose={() => setAutoHuntOnboardingOpen(false)}
        exploreHuntActive={listingHuntActive}
        onExploreHuntChange={setExploreListingHuntActive}
        onOpenPeerListing={onOpenPeerListing}
      />
    </>
  )
}

export const ExploreStickyIconDockHost = memo(ExploreStickyIconDockHostInner)
