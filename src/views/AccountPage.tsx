import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  CreditCard,
  FileText,
  HelpCircle,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Percent,
  ScanFace,
  SlidersHorizontal,
  Shield,
  UserCog,
  Users,
} from 'lucide-react'
import { AccountQuickCards } from '../components/account/AccountQuickCards'
import { ProfileHeader } from '../components/account/ProfileHeader'
import { CartBanner } from '../components/account/CartBanner'
import { SettingsRow } from '../components/account/SettingsRow'
import {
  FETCH_APP_PATH,
  FETCH_AUTH_PATH,
  FETCH_GEMS_PATH,
  FETCH_PROFILE_EDIT_PATH,
  FETCH_WALLET_ADD_CREDITS_PATH,
  FETCH_WALLET_TRANSACTIONS_PATH,
} from '../lib/fetchRoutes'
import { navigateToHomeMarketplace, useMarketplaceCartItemCount } from '../lib/marketplaceCartSnapshot'
import { loadSession, signOutUser } from '../lib/fetchUserSession'

/**
 * Fetchit account hub — Whatnot-style marketplace account (mobile-first).
 */
export default function AccountPage() {
  const navigate = useNavigate()
  const session = loadSession()
  const isLoggedIn = Boolean(session)

  const username = session?.username?.trim() || session?.email?.split('@')[0] || 'hayban47551'
  const display = session?.displayName?.trim() || username
  const emailSubtitle = session?.email?.trim() || 'srtk5xgb8w@privaterelay.appleid.com'
  const initial = useMemo(() => display.slice(0, 1) || 'h', [display])
  const cartItemCount = useMarketplaceCartItemCount()

  const openAuth = useCallback(() => {
    try {
      sessionStorage.removeItem('fetch.intentAfterAuth')
    } catch {
      /* ignore */
    }
    navigate(FETCH_AUTH_PATH)
  }, [navigate])
  const openAuthForProfileSetup = useCallback(() => {
    try {
      sessionStorage.setItem('fetch.intentAfterAuth', 'profile-edit')
    } catch {
      /* ignore */
    }
    navigate(FETCH_AUTH_PATH)
  }, [navigate])
  const openExternal = useCallback((href: string) => () => window.open(href, '_blank', 'noopener,noreferrer'), [])

  /** Logged-in destinations; guests are sent to sign-in. */
  const gated = useCallback(
    (path: string) => {
      if (isLoggedIn) navigate(path)
      else navigate(FETCH_AUTH_PATH)
    },
    [isLoggedIn, navigate],
  )

  const onSignOut = useCallback(() => {
    signOutUser()
    navigate(FETCH_APP_PATH, { replace: true })
  }, [navigate])

  return (
    <div className="min-h-dvh bg-white pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))]">
      {isLoggedIn ? (
        <ProfileHeader
          variant="signedIn"
          initial={initial}
          username={username}
          onViewProfile={() => navigate(FETCH_PROFILE_EDIT_PATH)}
        />
      ) : (
        <ProfileHeader variant="guest" onSignIn={openAuth} onProfileSetup={openAuthForProfileSetup} />
      )}

      <div className="space-y-8 px-6">
        <CartBanner
          itemCount={cartItemCount}
          onViewCart={() => navigateToHomeMarketplace(navigate, { openCart: true })}
          onContinueShopping={() => navigateToHomeMarketplace(navigate, { openCart: false })}
        />

        <section>
          <h2 className="mb-3 text-[15px] font-black text-[#111111]">Account</h2>
          <AccountQuickCards
            balanceLabel="$0.00"
            locked={!isLoggedIn}
            onReferralsClick={() => gated(FETCH_WALLET_ADD_CREDITS_PATH)}
            onRewardsClick={() => gated(FETCH_GEMS_PATH)}
          />
        </section>

        <section className="space-y-0">
          <SettingsRow icon={Shield} title="Account Health" onClick={() => gated(FETCH_WALLET_TRANSACTIONS_PATH)} />
          <SettingsRow icon={Users} title="Affiliate Program: Earn Cash" onClick={() => gated(FETCH_GEMS_PATH)} />
          <SettingsRow icon={CreditCard} title="Payments & Shipping" onClick={() => gated(FETCH_WALLET_ADD_CREDITS_PATH)} />
          <SettingsRow icon={MapPin} title="Addresses" onClick={() => gated(FETCH_PROFILE_EDIT_PATH)} />
          <SettingsRow icon={Bell} title="Notifications" onClick={() => gated(FETCH_PROFILE_EDIT_PATH)} />
          <SettingsRow icon={UserCog} title="Account Controls" onClick={() => gated(FETCH_PROFILE_EDIT_PATH)} />
          <SettingsRow
            icon={Mail}
            title="Change Email"
            subtitle={emailSubtitle}
            onClick={() => gated(FETCH_PROFILE_EDIT_PATH)}
          />
          <SettingsRow icon={Lock} title="Change Password" onClick={() => gated(FETCH_PROFILE_EDIT_PATH)} />
          <SettingsRow icon={ScanFace} title="Manage Passkeys" onClick={() => gated(FETCH_PROFILE_EDIT_PATH)} />
          <SettingsRow icon={SlidersHorizontal} title="Preferences" onClick={() => gated(FETCH_PROFILE_EDIT_PATH)} />
        </section>

        <div className="-mx-6 h-3 w-[calc(100%+3rem)] bg-[#F2F2F2]" aria-hidden />

        <section className="space-y-0 pb-4">
          <SettingsRow
            icon={MessageCircle}
            title="Contact Us"
            onClick={openExternal('mailto:support@fetchit.app')}
          />
          <SettingsRow icon={AlertTriangle} title="User Reports" onClick={() => gated(FETCH_APP_PATH)} />
          <SettingsRow icon={Percent} title="Sales Tax Exemption" onClick={() => gated(FETCH_PROFILE_EDIT_PATH)} />
          <SettingsRow
            icon={FileText}
            title="Privacy Policy"
            external
            href="https://fetchit.app/legal/privacy"
          />
          <SettingsRow
            icon={FileText}
            title="Terms & Conditions"
            external
            href="https://fetchit.app/legal/terms"
          />
          <SettingsRow icon={HelpCircle} title="FAQ" external href="https://fetchit.app/help" />
        </section>

        {isLoggedIn ? (
          <section className="pb-6">
            <button
              type="button"
              onClick={onSignOut}
              className="flex h-[52px] w-full items-center justify-center gap-3 rounded-full border border-[#E8E8E8] bg-[#F4F4F4] text-[15px] font-bold text-[#111111] transition-opacity active:opacity-80"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Sign Out
            </button>
            <p className="mt-5 text-center text-[11px] font-medium leading-relaxed text-[#777777]">
              v1.0.0 (1)
              <br />
              © 2026 Fetchit, Inc.
            </p>
          </section>
        ) : (
          <section className="pb-6">
            <p className="mt-1 text-center text-[11px] font-medium leading-relaxed text-[#777777]">
              v1.0.0 (1)
              <br />
              © 2026 Fetchit, Inc.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
