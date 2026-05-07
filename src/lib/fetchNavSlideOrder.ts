/**
 * Monotonic order matching bottom nav left → right (For you → … → Profile)
 * so horizontal slide direction can be inferred from pathname alone.
 */
import {
  FETCH_APP_PATH,
  FETCH_AUTH_PATH,
  FETCH_GEMS_PATH,
  FETCH_MARKETPLACE_LIST_PATH,
  FETCH_PROFILE_EDIT_PATH,
  FETCH_PROFILE_PATH,
  FETCH_SHOP_PATH,
  FETCH_SHOP_SETUP_PATH,
  FETCH_WALLET_ADD_CREDITS_PATH,
  FETCH_WALLET_CASH_OUT_PATH,
  FETCH_WALLET_TRANSACTIONS_PATH,
} from './fetchRoutes'

/** Larger = further right in the dock. Auth is last so it always slides in from the right. */
export function navSlideOrder(pathname: string): number {
  if (pathname === FETCH_APP_PATH) return 0
  if (pathname === FETCH_MARKETPLACE_LIST_PATH) return 200
  if (pathname === FETCH_SHOP_PATH) return 300
  if (pathname === FETCH_SHOP_SETUP_PATH) return 310
  if (pathname === FETCH_PROFILE_PATH) return 400
  if (pathname === FETCH_PROFILE_EDIT_PATH) return 410
  if (pathname === FETCH_GEMS_PATH) return 420
  if (pathname === FETCH_WALLET_TRANSACTIONS_PATH) return 430
  if (pathname === FETCH_WALLET_CASH_OUT_PATH) return 440
  if (pathname === FETCH_WALLET_ADD_CREDITS_PATH) return 450
  if (pathname === FETCH_AUTH_PATH) return 900
  return 600
}
