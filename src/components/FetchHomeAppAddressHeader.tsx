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

/**
 * Game controller glyph — gamepad silhouette used in the header to launch
 * the Pokies / arcade overlay. Replaces the older slot-machine glyph.
 */
function GameControllerGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.2 6.5h11.6c2.2 0 3.7 1.6 3.7 3.9v3.1c0 1.7-1.1 3.2-2.7 3.2-1.1 0-2-.6-2.6-1.7l-.7-1.3H8.5l-.7 1.3c-.6 1.1-1.5 1.7-2.6 1.7-1.6 0-2.7-1.5-2.7-3.2v-3.1c0-2.3 1.5-3.9 3.7-3.9z"
        fill="#4c1d95"
      />
      {/* D-pad */}
      <rect x="6.2" y="10.5" width="3.4" height="1.4" rx="0.35" fill="#fff" />
      <rect x="7.4" y="9.3" width="1.4" height="3.4" rx="0.35" fill="#fff" />
      {/* Action buttons */}
      <circle cx="14.5" cy="9.6" r="0.95" fill="#fde047" />
      <circle cx="16.6" cy="11.2" r="0.95" fill="#22c55e" />
      <circle cx="14.5" cy="12.8" r="0.95" fill="#fb7185" />
      <circle cx="12.4" cy="11.2" r="0.95" fill="#fff" />
    </svg>
  )
}

function CartGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 4h2l2.1 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="19" r="1.4" fill="currentColor" />
      <circle cx="17" cy="19" r="1.4" fill="currentColor" />
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

/** Round header controls (account, chat, gems, cart) — shared chrome. */
const headerChromeIconBtn =
  'fetch-apple-warp-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100/60 text-[#4c1d95]/70 transition-colors hover:bg-violet-100 hover:text-[#4c1d95] active:scale-[0.98]'

const brandMinimalIconBtn =
  'fetch-apple-warp-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-900 transition-colors hover:bg-zinc-100/90 active:scale-[0.97]'

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
 * Home top bar: wallet, account & chat shortcuts, gems, cart.
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
   * `wallet` — wallet chip + account, chat, gems, cart (map / default home).
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
          'fetch-app-address-header pointer-events-auto fixed left-0 right-0 top-0 z-[56] bg-white shadow-[0_1px_0_rgba(76,29,149,0.06)]',
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
              className="fetch-apple-warp-btn flex min-w-0 flex-1 items-center gap-2 rounded-full bg-violet-50/80 px-3.5 py-2 text-left ring-1 ring-violet-200/80 transition-[background-color,transform] hover:bg-violet-100/80 active:scale-[0.99]"
              aria-label="Search Fetchit"
            >
              <SearchNavGlyph className="block h-[18px] w-[18px] shrink-0 text-[#4c1d95]/80" />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold leading-none text-[#4c1d95]/70">
                Search categories, sellers, drops…
              </span>
            </button>
            <div className="flex shrink-0 items-center gap-0.5 self-center">
              {onOpenPokies ? (
                <button
                  type="button"
                  onClick={onOpenPokies}
                  className={`${brandMinimalIconBtn} fetch-pokies-icon-btn`}
                  aria-label="Open arcade"
                >
                  <GameControllerGlyph />
                </button>
              ) : null}
              <button
                type="button"
                onClick={onOpenChat}
                className={brandMinimalIconBtn}
                aria-label="Notifications"
              >
                <NotificationsNavIconFilled className="block h-[22px] w-[22px]" active={false} />
              </button>
            </div>
          </div>
        </div>
      </header>
    )
  }

  const controlsRight = (
    <div className="flex shrink-0 items-center gap-2 self-center">
      {onOpenPokies ? (
        <button
          type="button"
          onClick={onOpenPokies}
          className={`${headerChromeIconBtn} fetch-pokies-icon-btn`}
          aria-label="Open arcade"
        >
          <GameControllerGlyph />
        </button>
      ) : null}
      <button type="button" onClick={onOpenAccount} className={headerChromeIconBtn} aria-label="Account">
        <AccountNavIconFilled className="block h-[18px] w-[18px]" active={false} />
      </button>
      <button type="button" onClick={onOpenChat} className={headerChromeIconBtn} aria-label="Chat">
        <NotificationsNavIconFilled className="block h-[18px] w-[18px]" active={false} />
      </button>
      <button type="button" onClick={onOpenGems} className={`${headerChromeIconBtn} relative`} aria-label="Open gems" data-fetch-gems-icon>
        <GemsGoldCoinGlyph className="h-[1.125rem] w-[1.125rem] shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]" />
        {coinBalance > 0 ? (
          <span className="absolute -right-1 -top-1 z-[2] min-w-[1.15rem] rounded-full bg-white px-1 py-[1px] text-center text-[9px] font-black leading-tight tabular-nums text-black shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
            {coinBalance}
          </span>
        ) : null}
      </button>
      <button type="button" onClick={onOpenCart} className={headerChromeIconBtn} aria-label="Open cart">
        <CartGlyph className="h-4 w-4" />
      </button>
    </div>
  )

  return (
    <header
      className={[
        'fetch-app-address-header pointer-events-auto fixed left-0 right-0 top-0 z-[56] bg-white shadow-[0_1px_0_rgba(76,29,149,0.06)]',
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
