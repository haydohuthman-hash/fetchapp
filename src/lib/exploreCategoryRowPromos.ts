import type { MarketplacePeerBrowseFilter } from '../components/ExploreBrowseBanner'
import exploreRowAllUrl from '../assets/explore-row-all.png'
import exploreRowBedframeUrl from '../assets/explore-row-bedframe.png'
import exploreRowBikeUrl from '../assets/explore-row-bike.png'
import exploreRowDiningUrl from '../assets/explore-row-dining.png'
import exploreRowFashionUrl from '../assets/explore-row-fashion.png'
import exploreRowFreeUrl from '../assets/explore-row-free.png'
import exploreRowFridgeUrl from '../assets/explore-row-fridge.png'
import exploreRowLaptopUrl from '../assets/explore-row-laptop.png'
import exploreRowMattressUrl from '../assets/explore-row-mattress.png'
import exploreRowOutdoorUrl from '../assets/explore-row-outdoor.png'
import exploreRowSofaUrl from '../assets/explore-row-sofa.png'
import exploreRowWasherUrl from '../assets/explore-row-washer.png'

export type ExploreCategoryRowPromoDef = {
  id: string
  title: string
  subline: string
  imageSrc: string
  handoff: MarketplacePeerBrowseFilter
  ariaLabel: string
}

export const EXPLORE_CATEGORY_ROW_PROMOS: ExploreCategoryRowPromoDef[] = [
  {
    id: 'explore-all',
    title: 'For you',
    subline: 'See all nearby listings in one feed',
    imageSrc: exploreRowAllUrl,
    handoff: {},
    ariaLabel: 'For you — all categories and live picks',
  },
  {
    id: 'sofa',
    title: 'Sofas & lounge',
    subline: 'Local picks under $300 · Delivery-friendly',
    imageSrc: exploreRowSofaUrl,
    handoff: { maxPriceCents: 30_000, category: 'furniture', q: 'sofa' },
    ariaLabel: 'Browse sofas and lounge furniture under three hundred dollars',
  },
  {
    id: 'fridge',
    title: 'Fridges',
    subline: 'Kitchen upgrades near you · Big appliances',
    imageSrc: exploreRowFridgeUrl,
    handoff: { category: 'furniture', q: 'fridge', maxPriceCents: 30_000 },
    ariaLabel: 'Browse fridges and refrigerators under three hundred dollars',
  },
  {
    id: 'washer',
    title: 'Washers',
    subline: 'Laundry deals · Local pickup',
    imageSrc: exploreRowWasherUrl,
    handoff: { category: 'electronics', q: 'washing machine', maxPriceCents: 40_000 },
    ariaLabel: 'Browse washing machines',
  },
  {
    id: 'bedframe',
    title: 'Bed frames',
    subline: 'Timber & upholstered · Room-ready',
    imageSrc: exploreRowBedframeUrl,
    handoff: { category: 'furniture', q: 'bed frame', maxPriceCents: 30_000 },
    ariaLabel: 'Browse bed frames',
  },
  {
    id: 'mattress',
    title: 'Mattresses',
    subline: 'Sleep better · Sizes from single to queen',
    imageSrc: exploreRowMattressUrl,
    handoff: { category: 'furniture', q: 'mattress', maxPriceCents: 35_000 },
    ariaLabel: 'Browse mattresses',
  },
  {
    id: 'dining',
    title: 'Dining tables',
    subline: 'Tables & chairs from locals',
    imageSrc: exploreRowDiningUrl,
    handoff: { category: 'furniture', q: 'table' },
    ariaLabel: 'Browse dining tables and chairs',
  },
  {
    id: 'tech',
    title: 'Laptops & tech',
    subline: 'Screens & gear under $500',
    imageSrc: exploreRowLaptopUrl,
    handoff: { category: 'electronics', maxPriceCents: 50_000 },
    ariaLabel: 'Browse laptops and electronics under five hundred dollars',
  },
  {
    id: 'sports',
    title: 'Bikes & sport',
    subline: 'Gear for every season',
    imageSrc: exploreRowBikeUrl,
    handoff: { category: 'sports', q: 'bike' },
    ariaLabel: 'Browse bikes and sporting gear',
  },
  {
    id: 'outdoor',
    title: 'Outdoor living',
    subline: 'Patio, plants & benches',
    imageSrc: exploreRowOutdoorUrl,
    handoff: { category: 'furniture', q: 'outdoor' },
    ariaLabel: 'Browse outdoor furniture and patio',
  },
  {
    id: 'fashion',
    title: 'Streetwear',
    subline: 'Fashion picks refreshed daily',
    imageSrc: exploreRowFashionUrl,
    handoff: { category: 'fashion', q: 'streetwear' },
    ariaLabel: 'Browse streetwear and fashion',
  },
  {
    id: 'freebies',
    title: 'Curbside freebies',
    subline: 'Zero-dollar finds near you',
    imageSrc: exploreRowFreeUrl,
    handoff: { category: 'free' },
    ariaLabel: 'Browse free listings and curbside giveaways',
  },
]
