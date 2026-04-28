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
        <span className="pointer-events-none absolute inset-x-3 bottom-2.5 z-[2] overflow-hidden rounded-full border border-white/95 bg-gradient-to-b from-white via-[#faf8ff] to-[#e9e4f4] px-4 py-3 text-center text-[14px] font-black uppercase tracking-[0.1em] text-[#4c1d95] shadow-[inset_0_3px_6px_rgba(255,255,255,1),inset_0_-10px_24px_rgba(76,29,149,0.12),0_5px_0_0_#5b21b6,0_12px_28px_-10px_rgba(76,29,149,0.45)]">
          <span
            aria-hidden
            className="fetch-bidwar-premium-cta-shimmer absolute inset-y-0 -left-[45%] w-[42%] skew-x-[-18deg] bg-white/45 blur-[1px]"
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
