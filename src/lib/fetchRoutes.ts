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
export const FETCH_MARKETPLACE_LIST_PATH = '/marketplace/sell' as const
export const FETCH_WALLET_CASH_OUT_PATH = '/wallet/cash-out' as const
export const FETCH_WALLET_ADD_CREDITS_PATH = '/wallet/add-credits' as const
export const FETCH_WALLET_TRANSACTIONS_PATH = '/wallet/transactions' as const
export const FETCH_GEMS_PATH = '/gems' as const
export const FETCH_SHOP_PATH = '/shop' as const
/** First-time “create your shop” flow (like a Facebook page). */
export const FETCH_SHOP_SETUP_PATH = '/shop/setup' as const
