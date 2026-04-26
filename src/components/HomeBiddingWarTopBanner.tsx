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
      </button>
    </section>
  )
}
