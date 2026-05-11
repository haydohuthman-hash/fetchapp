import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import {
  type AccountSettingsSection,
  FETCH_AUTH_PATH,
  FETCH_PROFILE_ADDRESSES_PATH,
  FETCH_PROFILE_EDIT_PATH,
  FETCH_PROFILE_PAYMENTS_SHIPPING_PATH,
} from '../lib/fetchRoutes'
import { loadSession } from '../lib/fetchUserSession'

export type AccountSubPageViewProps = {
  section: AccountSettingsSection
  onBack: () => void
}

const SECTION_META: Record<
  AccountSettingsSection,
  { title: string; subtitle: string; bullets: string[] }
> = {
  'payments-shipping': {
    title: 'Payments & shipping',
    subtitle: 'Manage how you pay on Fetch and where we ship your orders.',
    bullets: [
      'Top up your wallet for instant checkout.',
      'Save default shipping addresses for marketplace orders.',
    ],
  },
  addresses: {
    title: 'Saved addresses',
    subtitle: 'Billing and shipping destinations used at checkout.',
    bullets: [
      'We store these on this device for demo checkout flows.',
      'Update your profile city or location label in Edit profile if you use it on listings.',
    ],
  },
  notifications: {
    title: 'Notifications',
    subtitle: 'Control alerts for orders, messages, and marketplace activity.',
    bullets: [
      'Push and email preferences roll out with the next native build.',
      'For now, tap through your order updates in Shop and Activity.',
    ],
  },
  'account-controls': {
    title: 'Account controls',
    subtitle: 'Sign-in, trusted devices, and high-level account limits.',
    bullets: [
      'Use Sign out on the main account screen to end this session everywhere in the browser.',
      'Contact support if you need a full account hold or deletion.',
    ],
  },
  email: {
    title: 'Email',
    subtitle: 'Your sign-in email comes from your Fetch / Supabase identity.',
    bullets: [
      'To change the address on your public profile, edit it in Profile.',
      'Provider-managed emails (Apple private relay, etc.) stay tied to that sign-in method.',
    ],
  },
  password: {
    title: 'Password',
    subtitle: 'If you use email + password, rotate it from the security provider you used to sign up.',
    bullets: [
      'Fetch uses Supabase Auth — use “Forgot password” on the sign-in screen to reset.',
      'Passkeys offer a faster alternative when your device supports them.',
    ],
  },
  passkeys: {
    title: 'Passkeys',
    subtitle: 'Sign in with Face ID, Touch ID, or your device PIN through WebAuthn.',
    bullets: [
      'Register passkeys from the sign-in sheet when your browser prompts you.',
      'You can revoke them from the same device or browser that created them.',
    ],
  },
  preferences: {
    title: 'Preferences',
    subtitle: 'Regional format, accessibility, and marketplace defaults.',
    bullets: [
      'Currency and locale follow your browser; charges are processed in AUD.',
      'Listing defaults and Drops profile live under Sell and Drops.',
    ],
  },
  'tax-exemption': {
    title: 'Sales tax exemption',
    subtitle: 'Eligible organizations can submit exemption certificates before large purchases.',
    bullets: [
      'Have your ABN / resale certificate ready — our team reviews submissions manually.',
      'Tap Contact Us on the account screen to start a ticket.',
    ],
  },
  'user-reports': {
    title: 'User reports',
    subtitle: 'Safety issues, harassment, or suspicious listings belong here.',
    bullets: [
      'Include links, screenshots, and approximate times so we can investigate quickly.',
      'For urgent threats, contact local authorities first, then file a report with us.',
    ],
  },
}

/** Focused account screens linked from the marketplace profile hub. */
export default function AccountSubPageView({ section, onBack }: AccountSubPageViewProps) {
  const navigate = useNavigate()
  const session = loadSession()
  const loggedIn = Boolean(session?.email?.trim())

  const meta = SECTION_META[section]

  const secondaryActions = useMemo(() => {
    const editProfile = {
      label: 'Edit public profile',
      hint: 'Name, @username, bio, avatar',
      onClick: () => navigate(FETCH_PROFILE_EDIT_PATH),
    }
    if (section === 'payments-shipping') {
      return [
        {
          label: 'Saved addresses',
          hint: 'Shipping & billing defaults',
          onClick: () => navigate(FETCH_PROFILE_ADDRESSES_PATH),
        },
        editProfile,
      ]
    }
    if (section === 'addresses' || section === 'email') {
      return [editProfile]
    }
    if (section === 'user-reports') {
      return [
        {
          label: 'Payments & shipping',
          hint: 'Cards, payouts, order history',
          onClick: () => navigate(FETCH_PROFILE_PAYMENTS_SHIPPING_PATH),
        },
      ]
    }
    return [editProfile]
  }, [navigate, section])

  return (
    <div className="min-h-dvh bg-white pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="sticky top-0 z-[1] flex items-center gap-3 border-b border-[#ECECEC] bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F4F4F4] text-[#111111] transition-opacity active:opacity-70"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-black tracking-tight text-[#111111]">{meta.title}</h1>
          <p className="truncate text-[12px] font-semibold text-[#777777]">{meta.subtitle}</p>
        </div>
      </header>

      <div className="space-y-6 px-5 py-5">
        {!loggedIn ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold leading-snug text-amber-950">
            Sign in to manage this on your account.
            <button
              type="button"
              onClick={() => navigate(FETCH_AUTH_PATH)}
              className="mt-3 flex w-full items-center justify-center rounded-full bg-amber-900 py-3 text-[14px] font-bold text-white transition-opacity active:opacity-90"
            >
              Sign in
            </button>
          </div>
        ) : null}

        <ul className="space-y-2 text-[14px] font-medium leading-relaxed text-[#444444]">
          {meta.bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-600" aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        {secondaryActions.length > 0 ? (
          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#999999]">Shortcuts</p>
            <div className="overflow-hidden rounded-2xl border border-[#ECECEC] bg-[#FAFAFA]">
              {secondaryActions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={a.onClick}
                  className="flex w-full items-center gap-3 border-b border-[#ECECEC] px-4 py-3.5 text-left transition-colors last:border-b-0 active:bg-white"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold text-[#111111]">{a.label}</span>
                    <span className="mt-0.5 block text-[12px] font-medium text-[#777777]">{a.hint}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[#C4C4C4]" strokeWidth={2} aria-hidden />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {section === 'user-reports' ? (
          <a
            href="mailto:support@fetchit.app?subject=Fetch%20user%20report"
            className="flex w-full items-center justify-center rounded-full border border-[#E8E8E8] bg-[#F4F4F4] py-3.5 text-[15px] font-bold text-[#111111] transition-opacity active:opacity-80"
          >
            Email support@fetchit.app
          </a>
        ) : null}
      </div>
    </div>
  )
}
