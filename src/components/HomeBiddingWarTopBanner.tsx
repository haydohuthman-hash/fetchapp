import { STARTING_SOON_BATTLES } from '../lib/fetchBidWarsBattles'
import homeBannerBiddingWarUrl from '../assets/home-banner-bidding-war.png'

type HomeBiddingWarTopBannerProps = {
  onJoin: () => void
}

export function HomeBiddingWarTopBanner({ onJoin }: HomeBiddingWarTopBannerProps) {
  const total = STARTING_SOON_BATTLES.length
  const a11yLabel =
    total > 0
      ? `Bidding war promotion — ${total} battles starting soon`
      : 'Bidding war promotion'
  return (
    <section className="-mx-0.5 px-0.5" aria-label={a11yLabel}>
      <button
        type="button"
        onClick={onJoin}
        aria-label={`Open Bidding War — ${total} battles lined up`}
        className="relative block w-full overflow-visible rounded-2xl text-left transition-transform active:scale-[0.99]"
      >
        <div className="overflow-hidden rounded-2xl">
          <img
            src={homeBannerBiddingWarUrl}
            alt="Join the bidding war — beat other bidders, win epic deals"
            draggable={false}
            className="pointer-events-none block w-full select-none"
          />
        </div>
        <span className="fetch-bidwar-home-banner-cta-3d pointer-events-none absolute inset-x-3 bottom-2.5 z-[2] rounded-full border-2 border-white bg-[#5b21b6] px-3.5 py-2.5 text-center text-[13px] font-black uppercase tracking-[0.1em] text-white">
          <span className="relative block overflow-hidden rounded-full">
            <span
              aria-hidden
              className="fetch-bidwar-premium-cta-shimmer absolute inset-y-0 -left-[45%] w-[38%] skew-x-[-18deg] bg-white/25 blur-[1px]"
            />
            <span className="relative z-[1] inline-flex items-center justify-center gap-2">
              Join the war
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M9 5l7 7-7 7-1.4-1.4L13.2 12 7.6 6.4 9 5z" />
              </svg>
            </span>
          </span>
        </span>
      </button>
    </section>
  )
}
