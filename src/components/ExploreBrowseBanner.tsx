/** Filter applied to peer listing fetch when user taps an Explore category banner. */
export type MarketplacePeerBrowseFilter = {
  category?: string
  q?: string
  maxPriceCents?: number
  /** Search / explore: nearby-focused vs everywhere (passed through browse handoff). */
  scope?: 'local' | 'global'
}

export type ExploreBrowseBannerDef = {
  id: string
  headline: string
  subline: string
  handoff: MarketplacePeerBrowseFilter
  art: 'fridge' | 'sofa' | 'laptop' | 'table' | 'shirt' | 'ball' | 'gift' | 'plant'
}

export const EXPLORE_ROTATING_BANNERS: ExploreBrowseBannerDef[] = [
  {
    id: 'furniture-cap',
    headline: 'Furniture under $300',
    subline: 'Local delivery • Browse deals',
    handoff: { category: 'furniture', maxPriceCents: 30_000 },
    art: 'sofa',
  },
  {
    id: 'fridge-line',
    headline: 'Fridges under $300',
    subline: 'Kitchen upgrades nearby',
    handoff: { category: 'furniture', q: 'fridge', maxPriceCents: 30_000 },
    art: 'fridge',
  },
  {
    id: 'electronics',
    headline: 'Tech under $500',
    subline: 'Laptops, screens & more',
    handoff: { category: 'electronics', maxPriceCents: 50_000 },
    art: 'laptop',
  },
  {
    id: 'dining',
    headline: 'Dining steals',
    subline: 'Tables & chairs from locals',
    handoff: { category: 'furniture', q: 'table' },
    art: 'table',
  },
  {
    id: 'fashion',
    headline: 'Streetwear picks',
    subline: 'Fashion listings refreshed daily',
    handoff: { category: 'fashion', q: 'streetwear' },
    art: 'shirt',
  },
  {
    id: 'sports',
    headline: 'Sporting clearance',
    subline: 'Gear for every season',
    handoff: { category: 'sports', q: 'bike' },
    art: 'ball',
  },
  {
    id: 'freebies',
    headline: 'Curbside freebies',
    subline: 'Zero-dollar finds near you',
    handoff: { category: 'free' },
    art: 'gift',
  },
  {
    id: 'outdoor',
    headline: 'Outdoor living',
    subline: 'Plants, benches & patio',
    handoff: { category: 'furniture', q: 'outdoor' },
    art: 'plant',
  },
]

function BannerArt({ art, className = '' }: { art: ExploreBrowseBannerDef['art']; className?: string }) {
  const stroke = '#5c5348'
  const fill = '#c4a574'
  const fill2 = '#8b7355'
  const common = { className, viewBox: '0 0 64 64', fill: 'none', 'aria-hidden': true as const }
  switch (art) {
    case 'fridge':
      return (
        <svg {...common}>
          <rect x="14" y="10" width="36" height="48" rx="4" stroke={stroke} strokeWidth="2.25" fill="#f5efe6" />
          <rect x="18" y="16" width="28" height="18" rx="2" stroke={stroke} strokeWidth="1.5" fill={fill} fillOpacity={0.35} />
          <path d="M20 40h24M20 46h18" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
          <circle cx="42" cy="43" r="2.5" fill={fill2} />
        </svg>
      )
    case 'sofa':
      return (
        <svg {...common}>
          <path
            d="M8 38c0-4 3.5-7 8-7h32c4.5 0 8 3 8 7v8H8v-8z"
            stroke={stroke}
            strokeWidth="2"
            fill={fill}
            fillOpacity={0.4}
            strokeLinejoin="round"
          />
          <path d="M12 38V28c0-3 2.5-5 5-5h30c2.5 0 5 2 5 5v10" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M10 46h44" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'laptop':
      return (
        <svg {...common}>
          <rect x="10" y="18" width="44" height="28" rx="3" stroke={stroke} strokeWidth="2" fill="#f5efe6" />
          <rect x="14" y="22" width="36" height="20" rx="1.5" fill={fill} fillOpacity={0.35} stroke={stroke} strokeWidth="1.25" />
          <path d="M6 50h52l-4-6H10l-4 6z" stroke={stroke} strokeWidth="2" fill={fill2} fillOpacity={0.25} strokeLinejoin="round" />
        </svg>
      )
    case 'table':
      return (
        <svg {...common}>
          <ellipse cx="32" cy="22" rx="22" ry="7" stroke={stroke} strokeWidth="2" fill={fill} fillOpacity={0.35} />
          <path d="M16 28v22M32 29v21M48 28v22" stroke={stroke} strokeWidth="2.25" strokeLinecap="round" />
        </svg>
      )
    case 'shirt':
      return (
        <svg {...common}>
          <path
            d="M22 14h20l8 10-6 6v26H20V30l-6-6 8-10z"
            stroke={stroke}
            strokeWidth="2"
            fill={fill}
            fillOpacity={0.4}
            strokeLinejoin="round"
          />
          <path d="M26 18h12" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'ball':
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="18" stroke={stroke} strokeWidth="2" fill={fill} fillOpacity={0.45} />
          <path d="M14 32h36M32 14c8 8 8 36 0 44" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      )
    case 'gift':
      return (
        <svg {...common}>
          <rect x="14" y="24" width="36" height="28" rx="3" stroke={stroke} strokeWidth="2" fill={fill} fillOpacity={0.35} />
          <path d="M14 32h36" stroke={stroke} strokeWidth="2" />
          <path d="M32 24v-8c-4 0-6 2-6 6s2 6 6 6 6-2 6-6-2-6-6-6z" stroke={stroke} strokeWidth="1.75" fill="#f5efe6" />
        </svg>
      )
    case 'plant':
      return (
        <svg {...common}>
          <path d="M28 52h8v8h-8z" fill={fill2} />
          <path d="M20 52h24l-4-8H24l-4 8z" stroke={stroke} strokeWidth="1.75" fill={fill} fillOpacity={0.35} />
          <path d="M32 44c-10-12-8-22 0-28 8 6 10 16 0 28z" stroke={stroke} strokeWidth="1.75" fill="#7d9a6e" fillOpacity={0.45} />
          <path d="M32 44c10-10 12-20 4-26-6 8-8 18-4 26z" stroke={stroke} strokeWidth="1.5" fill="#a3c48b" fillOpacity={0.5} />
        </svg>
      )
  }
  return null
}

export function ExploreBrowseBanner({
  def,
  onOpen,
}: {
  def: ExploreBrowseBannerDef
  onOpen: (handoff: MarketplacePeerBrowseFilter) => void
}) {
  return (
    <section className="min-w-0 px-0.5" aria-label={def.headline}>
      <button
        type="button"
        onClick={() => onOpen(def.handoff)}
        className="group flex w-full min-w-0 items-stretch gap-3 overflow-hidden rounded-2xl border border-amber-900/10 bg-[#EDE6DC] px-3 py-2.5 text-left shadow-none ring-0 transition-transform active:scale-[0.99] dark:border-amber-100/10 dark:bg-[#2a2620]"
      >
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <p className="text-[0.95rem] font-extrabold leading-tight tracking-[-0.02em] text-amber-950 dark:text-[#f5ebe0]">
            {def.headline}
          </p>
          <p className="text-[11px] font-semibold leading-snug text-amber-900/75 dark:text-amber-100/70">{def.subline}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800/80 dark:text-amber-200/75">
            Shop category →
          </p>
        </div>
        <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 self-center opacity-[0.92] transition-transform duration-300 group-hover:scale-105 dark:opacity-100">
          <BannerArt art={def.art} className="h-full w-full" />
        </div>
      </button>
    </section>
  )
}
