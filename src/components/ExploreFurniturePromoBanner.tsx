import type { MarketplacePeerBrowseFilter } from './ExploreBrowseBanner'
import furnitureFeedBannerUrl from '../assets/fetch-furniture-feed-banner.png'

type Props = {
  onOpen: (handoff: MarketplacePeerBrowseFilter) => void
  className?: string
}

/** Hero at top of Explore feed. Creative: `src/assets/fetch-furniture-feed-banner.png`. */
export function ExploreFurniturePromoBanner({ onOpen, className = '' }: Props) {
  return (
    <div className={['min-w-0', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        onClick={() => onOpen({ maxPriceCents: 30_000, category: 'furniture' })}
        className="group relative w-full overflow-hidden rounded-none border-0 bg-transparent p-0 text-left shadow-none ring-0 transition-opacity active:opacity-95"
        aria-label="Shop furniture deals under three hundred dollars"
      >
        <img
          src={furnitureFeedBannerUrl}
          alt=""
          width={1200}
          height={480}
          className="block h-auto w-full object-cover"
          decoding="async"
        />
      </button>
    </div>
  )
}
