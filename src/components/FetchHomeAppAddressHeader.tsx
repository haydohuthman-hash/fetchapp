import { useCallback, useEffect, useId, useState } from 'react'
import fetchitBoomerangUrl from '../assets/fetchit-boomerang-logo.png'
import { loadSession } from '../lib/fetchUserSession'
import { getMySupabaseProfile } from '../lib/supabase/profiles'
import { WalletGlyph } from './FetchWalletBanner'
import { AccountNavIconFilled, NotificationsNavIconFilled } from './icons/HomeShellNavIcons'

function audFromCents(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0
  return (safe / 100).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

/** Black outline search (magnifying glass) — minimal top bar. */
function SearchNavGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM16.5 16.5L21 21"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Purple gem — launches the Pokies / arcade overlay. */
function PurpleGemGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7.15 4.75h9.7l3.35 5.1L12 20.1 3.8 9.85l3.35-5.1z"
        fill="rgba(76,29,149,0.08)"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M3.8 9.85h16.4M7.15 4.75l2.25 5.1L12 20.1m4.85-15.35-2.25 5.1L12 20.1M9.4 9.85h5.2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.72"
      />
    </svg>
  )
}

function BackpackGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 7V5.5a3 3 0 016 0V7M8.2 7h7.6A3.8 3.8 0 0119.8 10.8V18a2.2 2.2 0 01-2.2 2.2H6.4A2.2 2.2 0 014.2 18v-7.2A3.8 3.8 0 018.2 7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 11.5V16M7.5 12h-1M17.5 12h-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Gold coin for gems — fixed palette (not `currentColor`) so it reads on the dark header. */
function GemsGoldCoinGlyph({ className = '' }: { className?: string }) {
  const gid = useId().replace(/:/g, '')
  const gradGold = `gems-coin-gold-${gid}`
  const gradShine = `gems-coin-shine-${gid}`
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id={gradGold} x1="5" y1="4" x2="19" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde68a" />
          <stop offset="0.35" stopColor="#fbbf24" />
          <stop offset="0.72" stopColor="#d97706" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <radialGradient id={gradShine} cx="32%" cy="28%" r="65%">
          <stop offset="0" stopColor="#fffbeb" stopOpacity="0.9" />
          <stop offset="0.45" stopColor="#fffbeb" stopOpacity="0.25" />
          <stop offset="1" stopColor="#fffbeb" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill={`url(#${gradGold})`} stroke="#78350f" strokeWidth="0.85" />
      <circle cx="12" cy="12" r="9.25" fill={`url(#${gradShine})`} />
      <circle cx="12" cy="12" r="7.75" fill="none" stroke="#92400e" strokeWidth="0.55" opacity="0.7" />
    </svg>
  )
}

export function FetchItWordmark({
  imageClassName,
}: {
  /** Override sizing/alignment (e.g. auth hero: larger + centered). */
  imageClassName?: string
} = {}) {
  return (
    <div className="flex shrink-0 items-center py-0.5" aria-label="fetchit">
      <img
        src={fetchitBoomerangUrl}
        alt=""
        width={128}
        height={128}
        draggable={false}
        className={
          imageClassName ??
          'h-[2.1rem] w-auto object-contain object-left sm:h-[2.3rem]'
        }
      />
    </div>
  )
}

/** Round header controls (account, chat, gems, backpack) — shared chrome. */
const headerChromeIconBtn =
  'fetch-apple-warp-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-transparent text-[#1c1528] transition-colors hover:text-[#4c1d95] active:scale-[0.98]'

const brandMinimalIconBtn =
  'fetch-apple-warp-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-transparent text-[#1c1528] transition-colors hover:text-[#4c1d95] active:scale-[0.97]'

const headerEase =
  'duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-150 motion-reduce:ease-out'
const chromeShellSlide =
  'transition-[box-shadow,background-color,transform] duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-150 motion-reduce:ease-out will-change-transform'

function HeaderWalletChip({ onOpen }: { onOpen: () => void }) {
  const [balanceCents, setBalanceCents] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!loadSession()) {
      setBalanceCents(0)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const p = await getMySupabaseProfile()
      const c = p?.credits_balance_cents
      setBalanceCents(typeof c === 'number' ? c : 0)
    } catch {
      setBalanceCents(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const label = loading ? '…' : audFromCents(balanceCents ?? 0)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="fetch-apple-warp-btn flex w-max max-w-[min(52vw,12rem)] shrink-0 items-center gap-2 rounded-full border border-violet-200/80 bg-violet-50/60 py-1.5 pl-2.5 pr-2.5 transition-[background-color,transform] hover:bg-violet-100/80 active:scale-[0.98] sm:gap-2.5 sm:py-2 sm:pl-3 sm:pr-3"
      aria-label={`Wallet, balance ${label}`}
    >
      <span className="flex shrink-0 items-center justify-center text-[#4c1d95]/80" aria-hidden>
        <WalletGlyph className="text-[#4c1d95]/80" size={18} />
      </span>
      <span className="min-w-0 truncate text-left text-[12px] font-semibold tabular-nums leading-none text-[#1c1528] sm:text-[13px]">
        {label}
      </span>
    </button>
  )
}

/**
 * Home top bar: wallet, account & chat shortcuts, gems, backpack.
 * Fixed under the safe area.
 */
export function FetchHomeAppAddressHeader({
  onSearchSubmit: _onSearchSubmit,
  onOpenAccount,
  onOpenChat,
  onOpenGems,
  onOpenCart,
  onOpenWallet,
  onOpenPokies,
  coinBalance = 0,
  variant = 'wallet',
  onOpenSearch,
}: {
  onSearchSubmit: (query: string) => void
  onOpenAccount: () => void
  onOpenChat: () => void
  onOpenGems: () => void
  onOpenCart: () => void
  /** Opens wallet / credits (defaults to account). */
  onOpenWallet?: () => void
  /** Opens the Pokies (slot machine) game overlay. */
  onOpenPokies?: () => void
  /** Visible coin count next to the coin icon. */
  coinBalance?: number
  /**
   * `wallet` — wallet chip + account, chat, gems, backpack (map / default home).
   * `brand-minimal` — wordmark “fetch” + “it” and search + bell (Explore full page).
   */
  variant?: 'wallet' | 'brand-minimal'
  /** Required when `variant` is `brand-minimal`; opens global search. */
  onOpenSearch?: () => void
}) {
  const openWallet = onOpenWallet ?? onOpenAccount

  if (variant === 'brand-minimal') {
    return (
      <header
        className={[
          'fetch-app-address-header pointer-events-auto fixed left-0 right-0 top-0 z-[56] bg-transparent shadow-none',
          chromeShellSlide,
          'translate-y-0',
        ].join(' ')}
        style={{ paddingTop: 'max(0.55rem, env(safe-area-inset-top, 0px))' }}
      >
        <div
          className={[
            'mx-auto flex w-full max-w-[min(100%,430px)] flex-col px-3 transition-[padding,gap] will-change-[padding,gap]',
            headerEase,
            'gap-2 pb-2.5 pt-1',
          ].join(' ')}
          style={{ backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
        >
          <div className="flex w-full min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenSearch}
              className="fetch-apple-warp-btn fetch-home-search-chip-bar flex min-w-0 flex-1 items-center gap-2 rounded-full border border-violet-200/80 bg-white/60 px-3 py-2 text-left shadow-[0_1px_0_rgba(76,29,149,0.06)] backdrop-blur-[2px] transition-[color,transform,border-color,background-color] hover:border-violet-300/90 hover:text-[#4c1d95] active:scale-[0.99]"
              aria-label="Search Fetchit"
            >
              <SearchNavGlyph className="block h-[24px] w-[24px] shrink-0 text-[#1c1528]" />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold leading-none text-[#1c1528]">
                Search categories, sellers, drops…
              </span>
            </button>
            <div className="flex shrink-0 items-center gap-0.5 self-center">
              {onOpenPokies ? (
                <button
                  type="button"
                  onClick={onOpenPokies}
                  className={`${brandMinimalIconBtn} fetch-pokies-icon-btn fetch-purple-gem-pulse`}
                  aria-label="Open arcade"
                >
                  <PurpleGemGlyph />
                </button>
              ) : null}
              <button
                type="button"
                onClick={onOpenChat}
                className={brandMinimalIconBtn}
                aria-label="Notifications"
              >
                <NotificationsNavIconFilled className="block h-[26px] w-[26px]" active={false} />
              </button>
            </div>
          </div>
        </div>
      </header>
    )
  }

  const controlsRight = (
    <div className="-mt-1 flex shrink-0 items-center gap-2 self-start sm:-mt-0.5">
      {onOpenPokies ? (
        <button
          type="button"
          onClick={onOpenPokies}
          className={`${headerChromeIconBtn} fetch-pokies-icon-btn fetch-purple-gem-pulse`}
          aria-label="Open arcade"
        >
          <PurpleGemGlyph />
        </button>
      ) : null}
      <button type="button" onClick={onOpenAccount} className={headerChromeIconBtn} aria-label="Account">
        <AccountNavIconFilled className="block h-[25px] w-[25px]" active={false} />
      </button>
      <button type="button" onClick={onOpenChat} className={headerChromeIconBtn} aria-label="Chat">
        <NotificationsNavIconFilled className="block h-[25px] w-[25px]" active={false} />
      </button>
      <button type="button" onClick={onOpenGems} className={`${headerChromeIconBtn} relative`} aria-label="Open gems" data-fetch-gems-icon>
        <GemsGoldCoinGlyph className="h-[1.45rem] w-[1.45rem] shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" />
        {coinBalance > 0 ? (
          <span className="absolute -right-1 -top-1 z-[2] min-w-[1.15rem] rounded-full bg-white px-1 py-[1px] text-center text-[9px] font-black leading-tight tabular-nums text-black shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
            {coinBalance}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={onOpenCart}
        className="fetch-apple-warp-btn flex max-w-[min(42vw,9.5rem)] shrink-0 items-center gap-1.5 rounded-full border border-violet-200/80 bg-violet-50/60 py-1.5 pl-2 pr-2.5 transition-[background-color,transform] hover:bg-violet-100/80 active:scale-[0.98] sm:py-2 sm:pl-2.5 sm:pr-3"
        aria-label="View backpack"
      >
        <BackpackGlyph className="h-[22px] w-[22px] shrink-0 text-[#1c1528]" />
        <span className="min-w-0 truncate text-left text-[11px] font-semibold leading-none text-[#1c1528] sm:text-[12px]">
          View backpack
        </span>
      </button>
    </div>
  )

  return (
    <header
      className={[
        'fetch-app-address-header pointer-events-auto fixed left-0 right-0 top-0 z-[56] bg-transparent shadow-none',
        chromeShellSlide,
        'translate-y-0',
      ].join(' ')}
      style={{ paddingTop: 'max(0.55rem, env(safe-area-inset-top, 0px))' }}
    >
      <div
        className={[
          'mx-auto flex w-full max-w-[min(100%,430px)] flex-col px-3 transition-[padding,gap] will-change-[padding,gap]',
          headerEase,
          'gap-2 pb-2.5 pt-1',
        ].join(' ')}
        style={{ backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
      >
        <div className="flex w-full min-w-0 items-start gap-2">
          <div className="relative flex min-w-0 flex-1 items-center gap-2">
            <HeaderWalletChip onOpen={openWallet} />
          </div>
          {controlsRight}
        </div>
      </div>
    </header>
  )
}

/** Extra top offset for stacks that sit below this header (fixed; does not shift map). */
export const FETCH_HOME_APP_ADDRESS_HEADER_BELOW_REM = '3.875rem'
