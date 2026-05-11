import type { MarketplacePeerBrowseFilter } from '../components/ExploreBrowseBanner'

const SI_PKG = '13.21.0'
const SIMPLE_ICONS_ICON = `https://cdn.jsdelivr.net/npm/simple-icons@${SI_PKG}/icons`

export type DiscoverPopularBrandDef = {
  id: string
  label: string
  /** Always set — used when no SI slug or as logo fallback via Google favicons. */
  fallbackDomain: string
  /** Simple Icons slug (`icons/{slug}.svg`) when the mark loads from CDN reliably. */
  iconSlug?: string
  handoff: MarketplacePeerBrowseFilter
}

export function discoverPopularBrandGoogleFavicon(domain: string, size = 128): string {
  const host = domain.replace(/^https?:\/\//iu, '').replace(/^www\./iu, '').split('/')[0]?.trim()
  const d = encodeURIComponent(host || 'fetch.it')
  return `https://www.google.com/s2/favicons?sz=${size}&domain=${d}`
}

export function discoverPopularBrandLogoPrimary(def: DiscoverPopularBrandDef): string {
  const slug = def.iconSlug?.trim().toLowerCase()
  if (slug)
    return `${SIMPLE_ICONS_ICON}/${encodeURIComponent(slug)}.svg`
  return discoverPopularBrandGoogleFavicon(def.fallbackDomain)
}

export function discoverPopularBrandLogoFallback(def: DiscoverPopularBrandDef): string | null {
  if (!def.iconSlug?.trim()) return null
  return discoverPopularBrandGoogleFavicon(def.fallbackDomain)
}

/**
 * Brands for Discover › Popular carousel (SI marks + Google favicon fallback).
 */
export const DISCOVER_POPULAR_BRANDS: DiscoverPopularBrandDef[] = [
  // Streetwear / sportswear / footwear
  { id: 'nike', label: 'Nike', fallbackDomain: 'nike.com', iconSlug: 'nike', handoff: { q: 'nike' } },
  { id: 'adidas', label: 'Adidas', fallbackDomain: 'adidas.com', iconSlug: 'adidas', handoff: { q: 'adidas' } },
  { id: 'jordan', label: 'Jordan', fallbackDomain: 'nike.com', iconSlug: 'jordan', handoff: { q: 'air jordan' } },
  { id: 'puma', label: 'Puma', fallbackDomain: 'puma.com', iconSlug: 'puma', handoff: { q: 'puma' } },
  { id: 'newbalance', label: 'New Balance', fallbackDomain: 'newbalance.com.au', iconSlug: 'newbalance', handoff: { q: 'new balance' } },
  { id: 'reebok', label: 'Reebok', fallbackDomain: 'reebok.com', iconSlug: 'reebok', handoff: { q: 'reebok' } },
  { id: 'underarmour', label: 'Under Armour', fallbackDomain: 'underarmour.com', iconSlug: 'underarmour', handoff: { q: 'under armour' } },
  { id: 'thenorthface', label: 'North Face', fallbackDomain: 'thenorthface.com', iconSlug: 'thenorthface', handoff: { q: 'north face jacket' } },
  // Lifestyle / apparel
  { id: 'zara', label: 'ZARA', fallbackDomain: 'zara.com', iconSlug: 'zara', handoff: { q: 'zara fashion' } },
  { id: 'hm', label: 'H&M', fallbackDomain: 'hm.com', iconSlug: 'handm', handoff: { q: 'h&m' } },
  { id: 'uniqlo', label: 'Uniqlo', fallbackDomain: 'uniqlo.com', iconSlug: 'uniqlo', handoff: { q: 'uniqlo' } },
  { id: 'dior', label: 'Dior', fallbackDomain: 'dior.com', iconSlug: 'dior', handoff: { category: 'fashion', q: 'dior' } },
  { id: 'hermes', label: 'Hermès', fallbackDomain: 'hermes.com', iconSlug: 'hermes', handoff: { category: 'fashion', q: 'hermes bag' } },
  // Toys / collectibles (favicon-only trademarks)
  { id: 'lego', label: 'LEGO', fallbackDomain: 'lego.com', handoff: { q: 'lego' } },
  { id: 'funko', label: 'Funko', fallbackDomain: 'funko.com', handoff: { q: 'funko pop' } },
  { id: 'supreme', label: 'Supreme', fallbackDomain: 'supremenewyork.com', handoff: { q: 'supreme' } },
  { id: 'pokemon', label: 'Pokémon', fallbackDomain: 'pokemon.com', iconSlug: 'pokemon', handoff: { q: 'pokemon cards' } },
  { id: 'nintendo', label: 'Nintendo', fallbackDomain: 'nintendo.com.au', iconSlug: 'nintendo', handoff: { category: 'collectibles', q: 'nintendo' } },
  { id: 'nintendoswitch', label: 'Switch', fallbackDomain: 'nintendo.com', iconSlug: 'nintendoswitch', handoff: { category: 'electronics', q: 'nintendo switch' } },
  { id: 'playstation', label: 'PlayStation', fallbackDomain: 'playstation.com', iconSlug: 'playstation', handoff: { category: 'electronics', q: 'playstation' } },
  { id: 'dji', label: 'DJI', fallbackDomain: 'dji.com', iconSlug: 'dji', handoff: { category: 'electronics', q: 'dji' } },
  // Tech
  { id: 'apple', label: 'Apple', fallbackDomain: 'apple.com', iconSlug: 'apple', handoff: { category: 'electronics', q: 'apple' } },
  { id: 'samsung', label: 'Samsung', fallbackDomain: 'samsung.com', iconSlug: 'samsung', handoff: { category: 'electronics', q: 'samsung' } },
  { id: 'sony', label: 'Sony', fallbackDomain: 'sony.com', iconSlug: 'sony', handoff: { category: 'electronics', q: 'sony' } },
  { id: 'bose', label: 'Bose', fallbackDomain: 'bose.com.au', iconSlug: 'bose', handoff: { category: 'electronics', q: 'bose headphones' } },
  { id: 'beats', label: 'Beats', fallbackDomain: 'beatsbydre.com', iconSlug: 'beatsbydre', handoff: { category: 'electronics', q: 'beats headphones' } },
  { id: 'microsoft', label: 'Microsoft', fallbackDomain: 'microsoft.com', handoff: { category: 'electronics', q: 'microsoft surface' } },
  { id: 'canon', label: 'Canon', fallbackDomain: 'canon.com.au', handoff: { category: 'electronics', q: 'canon camera' } },
  // Marketplace / commerce
  { id: 'amazon', label: 'Amazon', fallbackDomain: 'amazon.com.au', iconSlug: 'amazon', handoff: { q: 'amazon' } },
  { id: 'ebay', label: 'eBay', fallbackDomain: 'ebay.com.au', iconSlug: 'ebay', handoff: { q: 'ebay' } },
  { id: 'etsy', label: 'Etsy', fallbackDomain: 'etsy.com', iconSlug: 'etsy', handoff: { q: 'etsy vintage' } },
  { id: 'walmart', label: 'Walmart', fallbackDomain: 'walmart.com', iconSlug: 'walmart', handoff: { q: 'walmart haul' } },
  { id: 'target', label: 'Target AU', fallbackDomain: 'target.com.au', iconSlug: 'target', handoff: { q: 'target homewares' } },
  { id: 'ikea', label: 'IKEA', fallbackDomain: 'ikea.com.au', iconSlug: 'ikea', handoff: { category: 'furniture', q: 'ikea' } },
  { id: 'aliexpress', label: 'AliExpress', fallbackDomain: 'aliexpress.com', iconSlug: 'aliexpress', handoff: { q: 'aliexpress' } },
  { id: 'costco', label: 'Costco', fallbackDomain: 'costco.com.au', handoff: { q: 'costco' } },
  // Digital / creators
  { id: 'google', label: 'Google', fallbackDomain: 'google.com', iconSlug: 'google', handoff: { category: 'electronics', q: 'google pixel' } },
  { id: 'youtube', label: 'YouTube', fallbackDomain: 'youtube.com', iconSlug: 'youtube', handoff: { q: 'youtube merch' } },
  { id: 'youtubemusic', label: 'Yt Music', fallbackDomain: 'music.youtube.com', iconSlug: 'youtubemusic', handoff: { q: 'speaker' } },
  { id: 'youtubekids', label: 'Yt Kids', fallbackDomain: 'youtubekids.com', iconSlug: 'youtubekids', handoff: { q: 'kids toys' } },
  { id: 'tiktok', label: 'TikTok', fallbackDomain: 'tiktok.com', iconSlug: 'tiktok', handoff: { q: 'tiktok trending' } },
  { id: 'instagram', label: 'Instagram', fallbackDomain: 'instagram.com', iconSlug: 'instagram', handoff: { q: 'instagram sale' } },
  { id: 'spotify', label: 'Spotify', fallbackDomain: 'spotify.com', iconSlug: 'spotify', handoff: { q: 'spotify collector' } },
  { id: 'discord', label: 'Discord', fallbackDomain: 'discord.com', iconSlug: 'discord', handoff: { q: 'discord nitro gamer' } },
  { id: 'twitch', label: 'Twitch', fallbackDomain: 'twitch.tv', iconSlug: 'twitch', handoff: { category: 'collectibles', q: 'gaming stream merch' } },
  { id: 'linkedin', label: 'LinkedIn', fallbackDomain: 'linkedin.com', iconSlug: 'linkedin', handoff: { q: 'business tech' } },
  // Lifestyle / FMCG / shipping
  { id: 'starbucks', label: 'Starbucks', fallbackDomain: 'starbucks.com.au', iconSlug: 'starbucks', handoff: { q: 'starbucks collectible' } },
  { id: 'cocacola', label: 'Coca-Cola', fallbackDomain: 'coca-cola.com', iconSlug: 'cocacola', handoff: { q: 'coca cola collectible' } },
  { id: 'paypal', label: 'PayPal', fallbackDomain: 'paypal.com', iconSlug: 'paypal', handoff: { q: 'paypal accepted' } },
  { id: 'visa', label: 'Visa', fallbackDomain: 'visa.com', iconSlug: 'visa', handoff: { q: 'secure checkout' } },
  { id: 'mastercard', label: 'Mastercard', fallbackDomain: 'mastercard.com', iconSlug: 'mastercard', handoff: { q: 'card payment' } },
  { id: 'amex', label: 'Amex', fallbackDomain: 'americanexpress.com.au', iconSlug: 'americanexpress', handoff: { q: 'amex promo' } },
  { id: 'ups', label: 'UPS', fallbackDomain: 'ups.com', iconSlug: 'ups', handoff: { q: 'ups shipping supply' } },
  { id: 'fedex', label: 'FedEx', fallbackDomain: 'fedex.com', iconSlug: 'fedex', handoff: { q: 'fedex ship' } },
  { id: 'dhl', label: 'DHL', fallbackDomain: 'dhl.com.au', iconSlug: 'dhl', handoff: { q: 'dhl express parcel' } },
  // Sport leagues
  { id: 'nba', label: 'NBA', fallbackDomain: 'nba.com', iconSlug: 'nba', handoff: { category: 'sports', q: 'nba jersey' } },
  { id: 'mlb', label: 'MLB', fallbackDomain: 'mlb.com', iconSlug: 'mlb', handoff: { category: 'sports', q: 'mlb card' } },
  { id: 'nhl', label: 'NHL', fallbackDomain: 'nhl.com', iconSlug: 'nhl', handoff: { category: 'sports', q: 'nhl jersey' } },
  { id: 'fifa', label: 'FIFA', fallbackDomain: 'fifa.com', iconSlug: 'fifa', handoff: { category: 'sports', q: 'fifa ball' } },
  // Media (favicon)
  { id: 'disney', label: 'Disney', fallbackDomain: 'disney.com.au', handoff: { q: 'disney plush' } },
  { id: 'netflix', label: 'Netflix', fallbackDomain: 'netflix.com', handoff: { q: 'netflix collectible' } },
]
