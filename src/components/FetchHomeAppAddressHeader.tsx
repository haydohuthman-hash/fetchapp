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
 * Pokies (slot machine) glyph — small playful icon used in the header to
 * launch the Pokies overlay.
 */
function PokiesGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="3" fill="#4c1d95" stroke="#4c1d95" strokeWidth="0.6" />
      <rect x="5" y="8" width="14" height="6" rx="1.6" fill="#fff" />
      <path d="M9 8v6M14 8v6" stroke="#4c1d95" strokeWidth="0.9" />
      <circle cx="6.6" cy="11" r="0.9" fill="#f59e0b" />
      <circle cx="11.5" cy="11" r="0.9" fill="#22c55e" />
      <circle cx="16.4" cy="11" r="0.9" fill="#fb7185" />
      <path d="M3 16h18" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M19.5 13.4c.7-.4 1.3.5.6 1.1l-1 .9.3 1.4c.2.7-.6 1-1 .5l-.9-.9-1.3.4c-.7.2-1-.7-.4-1l1-.7-.2-1.4c-.1-.7.7-1 1.1-.4z"
        fill="#fde047"
        stroke="#92400e"
        strokeWidth="0.4"
      />
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
          <div className="flex w-full min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2" aria-label="fetchit, bid wars">
              {/* Rounded purple play mark — no circle bg (Heroicons-style rounded play) */}
              <svg
                viewBox="0 0 20 20"
                className="fetch-header-violet-ink mt-0.5 h-7 w-7 shrink-0"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M5.25 5.653c0-.856.927-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.346a1.125 1.125 0 0 1-1.667-.985V5.653z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="fetch-app-brand-wordmark flex min-w-0 items-baseline font-extrabold tracking-[-0.03em]">
                  <span className="text-[1.35rem] leading-none text-zinc-900 sm:text-[1.45rem]">fetch</span>
                  <span className="fetch-header-violet-ink text-[1.35rem] leading-none sm:text-[1.45rem]">it</span>
                </div>
                <p className="fetch-header-violet-ink text-[10px] font-black uppercase leading-none tracking-[0.2em] sm:text-[11px]">
                  BID WARS
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 self-center">
              {onOpenPokies ? (
                <button
                  type="button"
                  onClick={onOpenPokies}
                  className={`${brandMinimalIconBtn} fetch-pokies-icon-btn`}
                  aria-label="Open Pokies"
                >
                  <PokiesGlyph />
                </button>
              ) : null}
              <button
                type="button"
                onClick={onOpenSearch}
                className={brandMinimalIconBtn}
                aria-label="Search"
              >
                <SearchNavGlyph className="block" />
              </button>
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
          aria-label="Open Pokies"
        >
          <PokiesGlyph />
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
