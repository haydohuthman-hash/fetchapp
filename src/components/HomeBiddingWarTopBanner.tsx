import homeBannerBiddingWarUrl from '../assets/home-banner-bidding-war.png'

type HomeBiddingWarTopBannerProps = {
  onJoin: () => void
}

export function HomeBiddingWarTopBanner({ onJoin }: HomeBiddingWarTopBannerProps) {
  return (
    <section className="-mx-0.5 px-0.5" aria-label="Bidding war promotion">
      <div className="relative block w-full overflow-hidden rounded-2xl shadow-[0_14px_36px_-16px_rgba(76,29,149,0.45)]">
        <img
          src={homeBannerBiddingWarUrl}
          alt="Join the bidding war — beat other bidders, win epic deals"
          draggable={false}
          className="pointer-events-none block w-full select-none"
        />

        {/* Red "Join the battle" button with crossed-swords icon */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onJoin()
          }}
          className="fetch-apple-warp-btn absolute bottom-[5.5%] left-[4%] z-[3] flex items-center gap-[0.45em] rounded-full bg-[linear-gradient(180deg,#ef4444_0%,#dc2626_50%,#b91c1c_100%)] px-[9.5%] py-[2.8%] text-[clamp(10px,2.6vw,15px)] font-black uppercase tracking-[0.06em] text-white shadow-[0_8px_24px_-8px_rgba(185,28,28,0.75)] ring-1 ring-white/20 transition-[transform,box-shadow,filter] hover:brightness-105 active:scale-[0.97] motion-reduce:transition-none"
        >
          <svg className="h-[1.2em] w-[1.2em] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            {/* Sword 1: top-left to bottom-right */}
            <rect x="10.8" y="1" width="2.4" height="15" rx="0.5" transform="rotate(45 12 12)" />
            <rect x="9.5" y="14" width="5" height="2.2" rx="0.5" transform="rotate(45 12 12)" />
            {/* Sword 2: top-right to bottom-left */}
            <rect x="10.8" y="1" width="2.4" height="15" rx="0.5" transform="rotate(-45 12 12)" />
            <rect x="9.5" y="14" width="5" height="2.2" rx="0.5" transform="rotate(-45 12 12)" />
          </svg>
          Join the battle
          <svg className="h-[1.2em] w-[1.2em] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <rect x="10.8" y="1" width="2.4" height="15" rx="0.5" transform="rotate(45 12 12)" />
            <rect x="9.5" y="14" width="5" height="2.2" rx="0.5" transform="rotate(45 12 12)" />
            <rect x="10.8" y="1" width="2.4" height="15" rx="0.5" transform="rotate(-45 12 12)" />
            <rect x="9.5" y="14" width="5" height="2.2" rx="0.5" transform="rotate(-45 12 12)" />
          </svg>
        </button>
      </div>
    </section>
  )
}
