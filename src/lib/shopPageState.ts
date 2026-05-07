/** Client-side shop profile + “page creation” completion (demo until Supabase shop rows exist). */

const SETUP_KEY = 'fetch.shop.setupComplete.v1'
const PROFILE_KEY = 'fetch.shop.profileDraft.v1'

export type ShopProfileDraft = {
  name: string
  handle: string
  tagline: string
  locationLabel: string
  shipsCopy: string
  /** Optional cover/banner (data URL or https). */
  coverImageUrl?: string
  /** Optional shop avatar / profile pic (data URL or https). */
  avatarImageUrl?: string
}

const DEFAULT_PROFILE: ShopProfileDraft = {
  name: 'KickVault',
  handle: 'kickvault',
  tagline: 'RARE FINDS. REAL VALUE.',
  locationLabel: 'Brisbane, Australia',
  shipsCopy: 'Ships worldwide',
}

export function readShopSetupComplete(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SETUP_KEY) === '1'
  } catch {
    return false
  }
}

export function setShopSetupComplete(done: boolean): void {
  try {
    window.localStorage.setItem(SETUP_KEY, done ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function readShopProfileDraft(): ShopProfileDraft {
  if (typeof window === 'undefined') return DEFAULT_PROFILE
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY)
    if (!raw) return DEFAULT_PROFILE
    const o = JSON.parse(raw) as Partial<ShopProfileDraft>
    const cover =
      typeof o.coverImageUrl === 'string' && o.coverImageUrl.trim().length > 0 ? o.coverImageUrl.trim() : undefined
    const avatar =
      typeof o.avatarImageUrl === 'string' && o.avatarImageUrl.trim().length > 0 ? o.avatarImageUrl.trim() : undefined
    return {
      name: typeof o.name === 'string' && o.name.trim() ? o.name.trim() : DEFAULT_PROFILE.name,
      handle: typeof o.handle === 'string' && o.handle.trim() ? o.handle.replace(/^@/, '').trim() : DEFAULT_PROFILE.handle,
      tagline: typeof o.tagline === 'string' ? o.tagline : DEFAULT_PROFILE.tagline,
      locationLabel: typeof o.locationLabel === 'string' ? o.locationLabel : DEFAULT_PROFILE.locationLabel,
      shipsCopy: typeof o.shipsCopy === 'string' ? o.shipsCopy : DEFAULT_PROFILE.shipsCopy,
      ...(cover ? { coverImageUrl: cover } : {}),
      ...(avatar ? { avatarImageUrl: avatar } : {}),
    }
  } catch {
    return DEFAULT_PROFILE
  }
}

export function writeShopProfileDraft(profile: ShopProfileDraft): void {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    /* ignore */
  }
}
