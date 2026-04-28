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
        className="relative block w-full overflow-hidden rounded-2xl text-left shadow-[0_14px_36px_-16px_rgba(76,29,149,0.45)] transition-transform active:scale-[0.99]"
      >
        <img
          src={homeBannerBiddingWarUrl}
          alt="Join the bidding war — beat other bidders, win epic deals"
          draggable={false}
          className="pointer-events-none block w-full select-none"
        />
        <span className="pointer-events-none absolute inset-x-3 bottom-3 z-[2] overflow-hidden rounded-full bg-gradient-to-b from-[#a855f7] via-[#7c3aed] to-[#4c1d95] px-4 py-3 text-center text-[14px] font-black uppercase tracking-[0.1em] text-white shadow-[0_14px_28px_-12px_rgba(76,29,149,0.75),inset_0_1px_0_rgba(255,255,255,0.28)] ring-1 ring-white/25">
          <span
            aria-hidden
            className="fetch-bidwar-premium-cta-shimmer absolute inset-y-0 -left-[45%] w-[42%] skew-x-[-18deg] bg-white/35 blur-[1px]"
          />
          <span className="relative z-[1] inline-flex items-center justify-center gap-2">
            Join the war
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M9 5l7 7-7 7-1.4-1.4L13.2 12 7.6 6.4 9 5z" />
            </svg>
          </span>
        </span>
      </button>
    </section>
  )
}
