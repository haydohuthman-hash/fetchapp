/**
 * Shared fixed-bottom navigation used outside the home shell (profile, wallet,
 * gems, marketplace listing creation). Inside the home shell the nav is
 * rendered as part of the shell footer; here we re-use the same icon set + CSS
 * rules so the chrome reads identically across surfaces.
 *
 * Active state is derived from {@link useLocation} so the user always sees
 * which surface they are on. Inactive icons are full-strength outlines (never
 * faded) per the Fetch dock spec.
 */

import { useCallback } from 'react'
import { Lock } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthState } from '../lib/authState'
import {
  FetchShopNavIcon,
  FetchEyesHomeIcon,
  FetchProfileNavIcon,
  FetchLivesNavIcon,
  PlusCircleNavIcon,
} from './icons/HomeShellNavIcons'
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
} from '../lib/fetchRoutes'

type ActiveTab = 'forYou' | 'search' | 'sell' | 'activity' | 'profile' | null

function activeTabFor(pathname: string): ActiveTab {
  if (pathname === FETCH_SHOP_PATH || pathname === FETCH_SHOP_SETUP_PATH) {
    return 'activity'
  }
  if (
    pathname === FETCH_PROFILE_PATH ||
    pathname === FETCH_PROFILE_EDIT_PATH ||
    pathname === FETCH_GEMS_PATH ||
    pathname === FETCH_WALLET_CASH_OUT_PATH ||
    pathname === FETCH_WALLET_ADD_CREDITS_PATH ||
    pathname === FETCH_WALLET_TRANSACTIONS_PATH
  ) {
    return 'profile'
  }
  if (pathname === FETCH_MARKETPLACE_LIST_PATH) return 'sell'
  return null
}

export type FetchAppBottomNavProps = {
  /** Force a specific active tab (e.g., when not derived from a route). */
  activeTab?: ActiveTab
  /** Hide the nav (e.g., during a full-screen sheet). */
  hidden?: boolean
}

export function FetchAppBottomNav({ activeTab, hidden }: FetchAppBottomNavProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const tab = activeTab ?? activeTabFor(pathname)
  const { sessionUserId } = useAuthState()
  const shopLocked = !sessionUserId

  const navigateToHomeShellTab = useCallback(
    (slot: 'services' | 'search' | 'chat') => {
      try {
        sessionStorage.setItem('fetch.pendingHomeShellTab', slot)
      } catch {
        /* ignore */
      }
      navigate(FETCH_APP_PATH)
    },
    [navigate],
  )

  const onForYou = useCallback(() => navigateToHomeShellTab('services'), [navigateToHomeShellTab])
  const onSearch = useCallback(() => navigateToHomeShellTab('search'), [navigateToHomeShellTab])
  const onActivity = useCallback(() => {
    if (shopLocked) {
      navigate(FETCH_AUTH_PATH)
      return
    }
    navigate({ pathname: FETCH_SHOP_PATH, search: '' })
  }, [navigate, shopLocked])
  const onSell = useCallback(() => navigate(FETCH_MARKETPLACE_LIST_PATH), [navigate])
  const onProfile = useCallback(() => navigate(FETCH_PROFILE_PATH), [navigate])

  if (hidden) return null

  return (
    <nav
      className="fetch-app-bottom-nav fetch-home-intent-bottom-nav fetch-home-intent-bottom-nav--compact"
      aria-label="For you, lives, sell, shop, and profile"
    >
      <button
        type="button"
        className={[
          'fetch-home-intent-bottom-nav__icon',
          tab === 'forYou' ? 'fetch-home-intent-bottom-nav__icon--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="For you"
        aria-current={tab === 'forYou' ? 'page' : undefined}
        onClick={onForYou}
      >
        <span className="fetch-home-intent-bottom-nav__icon-inner">
          <FetchEyesHomeIcon className="block" active={tab === 'forYou'} />
          <span className="fetch-home-intent-bottom-nav__label">For you</span>
        </span>
      </button>
      <button
        type="button"
        className={[
          'fetch-home-intent-bottom-nav__icon',
          tab === 'search' ? 'fetch-home-intent-bottom-nav__icon--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Lives"
        aria-current={tab === 'search' ? 'page' : undefined}
        onClick={onSearch}
      >
        <span className="fetch-home-intent-bottom-nav__icon-inner">
          <FetchLivesNavIcon className="block" active={tab === 'search'} />
          <span className="fetch-home-intent-bottom-nav__label">Lives</span>
        </span>
      </button>
      <button
        type="button"
        className={[
          'fetch-home-intent-bottom-nav__icon',
          tab === 'sell' ? 'fetch-home-intent-bottom-nav__icon--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Sell — list an item"
        aria-current={tab === 'sell' ? 'page' : undefined}
        onClick={onSell}
      >
        <span className="fetch-home-intent-bottom-nav__icon-inner">
          <PlusCircleNavIcon className="block" active={tab === 'sell'} />
          <span className="fetch-home-intent-bottom-nav__label">Sell</span>
        </span>
      </button>
      <button
        type="button"
        className={[
          'fetch-home-intent-bottom-nav__icon',
          tab === 'activity' && !shopLocked ? 'fetch-home-intent-bottom-nav__icon--active' : '',
          shopLocked ? 'fetch-home-intent-bottom-nav__icon--shop-locked' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={shopLocked ? 'Shop — sign in required' : 'Shop'}
        aria-current={tab === 'activity' && !shopLocked ? 'page' : undefined}
        onClick={onActivity}
      >
        <span className="relative inline-block">
          <span
            className={[
              'fetch-home-intent-bottom-nav__icon-inner',
              shopLocked ? 'opacity-40 grayscale' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <FetchShopNavIcon className="block" active={tab === 'activity' && !shopLocked} />
            <span className="fetch-home-intent-bottom-nav__label">Shop</span>
          </span>
          {shopLocked ? (
            <Lock
              className="pointer-events-none absolute -bottom-0.5 -right-1 h-3.5 w-3.5 rounded-full bg-white text-zinc-500 ring-1 ring-zinc-200"
              strokeWidth={2.5}
              aria-hidden
            />
          ) : null}
        </span>
      </button>
      <button
        type="button"
        className={[
          'fetch-home-intent-bottom-nav__icon',
          tab === 'profile' ? 'fetch-home-intent-bottom-nav__icon--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Profile"
        aria-current={tab === 'profile' ? 'page' : undefined}
        onClick={onProfile}
      >
        <span className="fetch-home-intent-bottom-nav__icon-inner">
          <FetchProfileNavIcon className="block" active={tab === 'profile'} />
          <span className="fetch-home-intent-bottom-nav__label">Profile</span>
        </span>
      </button>
    </nav>
  )
}
