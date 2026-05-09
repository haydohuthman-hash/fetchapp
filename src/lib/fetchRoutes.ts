/** Canonical client routes for auth, onboarding, and main app shell. */
export const FETCH_HOME_PATH = '/home' as const
/** Old entry URL; redirected to {@link FETCH_HOME_PATH} one-shot in `App.tsx`. */
export const FETCH_LEGACY_APP_REDIRECT_PATH = '/app' as const
/** Main Explore / dashboard route (today: `/home`). */
export const FETCH_APP_PATH = FETCH_HOME_PATH
export const FETCH_ONBOARDING_PATH = '/onboarding' as const
export const FETCH_AUTH_PATH = '/auth' as const
export const FETCH_PROFILE_PATH = '/profile' as const
export const FETCH_PROFILE_EDIT_PATH = '/profile/edit' as const
/** Dedicated account settings surfaces (shown under profile tab + bottom nav). */
export const FETCH_PROFILE_PAYMENTS_SHIPPING_PATH = '/profile/payments-shipping' as const
export const FETCH_PROFILE_ADDRESSES_PATH = '/profile/addresses' as const
export const FETCH_PROFILE_NOTIFICATIONS_PATH = '/profile/notifications' as const
export const FETCH_PROFILE_ACCOUNT_CONTROLS_PATH = '/profile/account-controls' as const
export const FETCH_PROFILE_EMAIL_PATH = '/profile/email' as const
export const FETCH_PROFILE_PASSWORD_PATH = '/profile/password' as const
export const FETCH_PROFILE_PASSKEYS_PATH = '/profile/passkeys' as const
export const FETCH_PROFILE_PREFERENCES_PATH = '/profile/preferences' as const
export const FETCH_PROFILE_TAX_EXEMPT_PATH = '/profile/tax-exemption' as const
export const FETCH_PROFILE_USER_REPORTS_PATH = '/profile/user-reports' as const

export const FETCH_PROFILE_ACCOUNT_SUB_PATHS = [
  FETCH_PROFILE_PAYMENTS_SHIPPING_PATH,
  FETCH_PROFILE_ADDRESSES_PATH,
  FETCH_PROFILE_NOTIFICATIONS_PATH,
  FETCH_PROFILE_ACCOUNT_CONTROLS_PATH,
  FETCH_PROFILE_EMAIL_PATH,
  FETCH_PROFILE_PASSWORD_PATH,
  FETCH_PROFILE_PASSKEYS_PATH,
  FETCH_PROFILE_PREFERENCES_PATH,
  FETCH_PROFILE_TAX_EXEMPT_PATH,
  FETCH_PROFILE_USER_REPORTS_PATH,
] as const

export type FetchProfileAccountSubPath = (typeof FETCH_PROFILE_ACCOUNT_SUB_PATHS)[number]

export type AccountSettingsSection =
  | 'payments-shipping'
  | 'addresses'
  | 'notifications'
  | 'account-controls'
  | 'email'
  | 'password'
  | 'passkeys'
  | 'preferences'
  | 'tax-exemption'
  | 'user-reports'

const PATH_TO_ACCOUNT_SECTION: Record<FetchProfileAccountSubPath, AccountSettingsSection> = {
  [FETCH_PROFILE_PAYMENTS_SHIPPING_PATH]: 'payments-shipping',
  [FETCH_PROFILE_ADDRESSES_PATH]: 'addresses',
  [FETCH_PROFILE_NOTIFICATIONS_PATH]: 'notifications',
  [FETCH_PROFILE_ACCOUNT_CONTROLS_PATH]: 'account-controls',
  [FETCH_PROFILE_EMAIL_PATH]: 'email',
  [FETCH_PROFILE_PASSWORD_PATH]: 'password',
  [FETCH_PROFILE_PASSKEYS_PATH]: 'passkeys',
  [FETCH_PROFILE_PREFERENCES_PATH]: 'preferences',
  [FETCH_PROFILE_TAX_EXEMPT_PATH]: 'tax-exemption',
  [FETCH_PROFILE_USER_REPORTS_PATH]: 'user-reports',
}

export function isFetchProfileAccountSubPath(pathname: string): pathname is FetchProfileAccountSubPath {
  return (FETCH_PROFILE_ACCOUNT_SUB_PATHS as readonly string[]).includes(pathname)
}

export function accountSettingsSectionFromPath(pathname: string): AccountSettingsSection | null {
  if (!isFetchProfileAccountSubPath(pathname)) return null
  return PATH_TO_ACCOUNT_SECTION[pathname]
}
export const FETCH_MARKETPLACE_LIST_PATH = '/marketplace/sell' as const

/** Seller multi-step wizard — camera prep, lineup, LiveKit go-live */
export const FETCH_GO_LIVE_PATH = '/go-live' as const
/** Browse Fetchit realtime rooms (seller-commerce livestreams). */
export const FETCH_LIVES_FEED_PATH = '/lives' as const
/** Room player: `/live/:roomName` */
export const FETCH_LIVE_ROOM_PREFIX = '/live/' as const

const LIVE_ROOM_RE = /^\/live\/([^/]+)$/

/** @returns decoded room slug or null */
export function liveRoomSlugFromPathname(pathname: string): string | null {
  const m = pathname.trim().match(LIVE_ROOM_RE)
  return m?.[1] ? decodeURIComponent(m[1]) : null
}
export const FETCH_WALLET_CASH_OUT_PATH = '/wallet/cash-out' as const
export const FETCH_WALLET_ADD_CREDITS_PATH = '/wallet/add-credits' as const
export const FETCH_WALLET_TRANSACTIONS_PATH = '/wallet/transactions' as const
export const FETCH_GEMS_PATH = '/gems' as const
export const FETCH_SHOP_PATH = '/shop' as const
/** First-time “create your shop” flow (like a Facebook page). */
export const FETCH_SHOP_SETUP_PATH = '/shop/setup' as const
