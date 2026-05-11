/**
 * Shared fixed-bottom navigation used outside the home shell (profile, gems,
 * etc.). Inside the home shell the nav is rendered as
 * part of the shell footer; here we reuse the same icon set + CSS so the chrome
 * matches.
 *
 * Active tab is derived from {@link useLocation}. Icons stay filled; muted grey
 * vs black ink is driven by `.fetch-home-intent-bottom-nav__icon--active`.
 * The second tab opens the browse / lives feed and uses the search magnifier.
 * The first tab selects home Explore (`services`) and shows {@link FetchLivesNavIcon}. The dock’s marketplace tab opens marketplace browse.
 */

import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FetchActivityNavIcon,
  FetchLivesNavIcon,
  FetchProfileNavIcon,
  FetchSearchNavIcon,
  CartNavIcon,
} from './icons/HomeShellNavIcons'
import {
  FETCH_APP_PATH,
  FETCH_GEMS_PATH,
  FETCH_MARKETPLACE_LIST_PATH,
  FETCH_PROFILE_PATH,
} from '../lib/fetchRoutes'
import { playHomeIntentNavTap } from '../lib/playHomeIntentNavTap'

type ActiveTab = 'forYou' | 'search' | 'sell' | 'activity' | 'profile' | null

function activeTabFor(pathname: string): ActiveTab {
  if (pathname.startsWith('/live/')) return null
  if (
    pathname === FETCH_PROFILE_PATH ||
    pathname.startsWith(`${FETCH_PROFILE_PATH}/`) ||
    pathname === FETCH_GEMS_PATH
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
  const onSearch = useCallback(() => {
    try {
      sessionStorage.setItem('fetch.pendingHomeShellTab', 'search')
    } catch {
      /* ignore */
    }
    navigate(FETCH_APP_PATH)
  }, [navigate])
  const onActivity = useCallback(() => navigateToHomeShellTab('chat'), [navigateToHomeShellTab])
  const navigateToMarketplaceTab = useCallback(() => {
    try {
      sessionStorage.setItem('fetch.pendingHomeShellTab', 'marketplace')
    } catch {
      /* ignore */
    }
    navigate(FETCH_APP_PATH)
  }, [navigate])
  const onProfile = useCallback(() => navigate(FETCH_PROFILE_PATH), [navigate])

  if (hidden) return null

  return (
    <nav
      className="fetch-app-bottom-nav fetch-home-intent-bottom-nav fetch-home-intent-bottom-nav--compact"
        aria-label="Live, search, marketplace, messages, and profile"
    >
      <button
        type="button"
        className={[
          'fetch-home-intent-bottom-nav__icon',
          tab === 'forYou' ? 'fetch-home-intent-bottom-nav__icon--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Live"
        aria-current={tab === 'forYou' ? 'page' : undefined}
        onClick={(e) => {
          playHomeIntentNavTap(e.currentTarget)
          void onForYou()
        }}
      >
        <span className="fetch-home-intent-bottom-nav__icon-inner">
          <FetchLivesNavIcon className="block" active />
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
        onClick={(e) => {
          playHomeIntentNavTap(e.currentTarget)
          void onSearch()
        }}
      >
        <span className="fetch-home-intent-bottom-nav__icon-inner">
          <FetchSearchNavIcon className="block" active />
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
        aria-label="Marketplace — browse listings"
        aria-current={tab === 'sell' ? 'page' : undefined}
        onClick={(e) => {
          playHomeIntentNavTap(e.currentTarget)
          void navigateToMarketplaceTab()
        }}
      >
        <span className="fetch-home-intent-bottom-nav__icon-inner">
          <CartNavIcon className="block" active />
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
        aria-label="Messages"
        aria-current={tab === 'activity' ? 'page' : undefined}
        onClick={(e) => {
          playHomeIntentNavTap(e.currentTarget)
          void onActivity()
        }}
      >
        <span className="fetch-home-intent-bottom-nav__icon-inner">
          <FetchActivityNavIcon className="block" active />
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
        onClick={(e) => {
          playHomeIntentNavTap(e.currentTarget)
          void onProfile()
        }}
      >
        <span className="fetch-home-intent-bottom-nav__icon-inner">
          <FetchProfileNavIcon className="block" active />
        </span>
      </button>
    </nav>
  )
}
