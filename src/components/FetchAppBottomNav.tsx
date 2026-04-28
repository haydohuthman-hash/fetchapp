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
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FetchActivityNavIcon,
  FetchEyesHomeIcon,
  FetchProfileNavIcon,
  FetchSearchNavIcon,
} from './icons/HomeShellNavIcons'
import {
  FETCH_APP_PATH,
  FETCH_GEMS_PATH,
  FETCH_MARKETPLACE_LIST_PATH,
  FETCH_PROFILE_EDIT_PATH,
  FETCH_PROFILE_PATH,
  FETCH_WALLET_ADD_CREDITS_PATH,
  FETCH_WALLET_CASH_OUT_PATH,
} from '../lib/fetchRoutes'

type ActiveTab = 'forYou' | 'search' | 'sell' | 'activity' | 'profile' | null

function activeTabFor(pathname: string): ActiveTab {
  if (
    pathname === FETCH_PROFILE_PATH ||
    pathname === FETCH_PROFILE_EDIT_PATH ||
    pathname === FETCH_GEMS_PATH ||
    pathname === FETCH_WALLET_CASH_OUT_PATH ||
    pathname === FETCH_WALLET_ADD_CREDITS_PATH
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
  const onActivity = useCallback(() => navigateToHomeShellTab('chat'), [navigateToHomeShellTab])
  const onSell = useCallback(() => navigate(FETCH_MARKETPLACE_LIST_PATH), [navigate])
  const onProfile = useCallback(() => navigate(FETCH_PROFILE_PATH), [navigate])

  if (hidden) return null

  return (
    <nav
      className="fetch-app-bottom-nav fetch-home-intent-bottom-nav fetch-home-intent-bottom-nav--compact fetch-home-intent-bottom-nav--with-fab"
      aria-label="For you, search, sell, activity, and profile"
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
        aria-label="Search"
        aria-current={tab === 'search' ? 'page' : undefined}
        onClick={onSearch}
      >
        <span className="fetch-home-intent-bottom-nav__icon-inner">
          <FetchSearchNavIcon className="block" active={tab === 'search'} />
          <span className="fetch-home-intent-bottom-nav__label">Search</span>
        </span>
      </button>
      <button
        type="button"
        className={[
          'fetch-home-intent-bottom-nav__fab',
          tab === 'sell' ? 'fetch-home-intent-bottom-nav__fab--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Sell — list an item"
        onClick={onSell}
      >
        <span className="fetch-home-intent-bottom-nav__fab-stack">
          <span className="fetch-home-intent-bottom-nav__fab-orb" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" className="h-[55%] w-[55%]">
              <path
                d="M12 7v10M7 12h10"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="fetch-home-intent-bottom-nav__label">Sell</span>
        </span>
      </button>
      <button
        type="button"
        className={[
          'fetch-home-intent-bottom-nav__icon',
          tab === 'activity' ? 'fetch-home-intent-bottom-nav__icon--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Activity"
        aria-current={tab === 'activity' ? 'page' : undefined}
        onClick={onActivity}
      >
        <span className="fetch-home-intent-bottom-nav__icon-inner">
          <FetchActivityNavIcon className="block" active={tab === 'activity'} />
          <span className="fetch-home-intent-bottom-nav__label">Activity</span>
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
