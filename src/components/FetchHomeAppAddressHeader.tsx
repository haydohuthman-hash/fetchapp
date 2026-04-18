import { useEffect, useId, useState } from 'react'
import fetchitBoomerangUrl from '../assets/fetchit-boomerang-logo.png'

function SearchGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM16.5 16.5L21 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CartGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" aria-hidden>
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
        style={{ mixBlendMode: 'screen' }}
        className={
          imageClassName ??
          'h-[2.1rem] w-auto object-contain object-left sm:h-[2.3rem]'
        }
      />
    </div>
  )
}

/**
 * Header icon hits — uniform tap + glyph size (see `.fetch-header-chrome-icon-btn` in CSS).
 */
const headerChromeIconBtn =
  'fetch-header-chrome-icon-btn fetch-apple-warp-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 text-white shadow-none ring-0 transition-[transform,opacity] hover:opacity-75 active:scale-[0.96]'
const headerChromeIconGlyph = 'block h-6 w-6 shrink-0'

const headerEase =
  'duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-150 motion-reduce:ease-out'
const chromeShellSlide =
  'transition-[box-shadow,background-color,transform] duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-150 motion-reduce:ease-out will-change-transform'

/** Rotating hints in the header search pill (opens full search on tap). */
const HEADER_SEARCH_HINTS = [
  'Search furniture & more',
  'Find live sellers near you',
  'Browse drops and deals',
  'Try "vintage camera"…',
  'Discover local listings',
] as const

/**
 * Home top bar: search bar, gems / cart (account + chat live in bottom nav).
 * Fixed under the safe area.
 */
export function FetchHomeAppAddressHeader({
  onSearchSubmit,
  onOpenSearch,
  onOpenGems,
  onOpenCart,
  coinBalance = 0,
}: {
  onSearchSubmit: (query: string) => void
  /** Opens search / categories (header magnifying glass). Falls back to `onSearchSubmit('')` if omitted. */
  onOpenSearch?: () => void
  onOpenGems: () => void
  onOpenCart: () => void
  /** Visible coin count next to the coin icon. */
  coinBalance?: number
}) {
  const [hintIdx, setHintIdx] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setHintIdx((i) => (i + 1) % HEADER_SEARCH_HINTS.length)
    }, 3200)
    return () => window.clearInterval(id)
  }, [])

  const searchHint = HEADER_SEARCH_HINTS[hintIdx]

  const handleOpenSearch = () => {
    if (onOpenSearch) onOpenSearch()
    else onSearchSubmit('')
  }

  const controlsRight = (
    <div className="flex shrink-0 items-center gap-1 self-center">
      <button type="button" onClick={onOpenGems} className={`${headerChromeIconBtn} relative`} aria-label="Open gems" data-fetch-gems-icon>
        <GemsGoldCoinGlyph className={`${headerChromeIconGlyph} drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]`} />
        {coinBalance > 0 ? (
          <span className="absolute -right-1 -top-1 z-[2] min-w-[1.15rem] rounded-full bg-white px-1 py-[1px] text-center text-[9px] font-black leading-tight tabular-nums text-black shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
            {coinBalance}
          </span>
        ) : null}
      </button>
      <button type="button" onClick={onOpenCart} className={headerChromeIconBtn} aria-label="Open cart">
        <CartGlyph className={headerChromeIconGlyph} />
      </button>
    </div>
  )

  return (
    <header
      className={[
        'fetch-app-address-header pointer-events-auto fixed left-0 right-0 top-0 z-[56] bg-[#1a1d22]',
        chromeShellSlide,
        'translate-y-0',
      ].join(' ')}
      style={{ paddingTop: 'max(0.55rem, env(safe-area-inset-top, 0px))' }}
    >
      <div
        className={[
          'mx-auto flex w-full max-w-[min(100%,430px)] flex-col px-3 transition-[padding,gap] will-change-[padding,gap]',
          headerEase,
          'gap-1.5 pb-2 pt-0.5',
        ].join(' ')}
        style={{ backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
      >
        <div className="flex w-full min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={handleOpenSearch}
            className="fetch-header-search-bar fetch-apple-warp-btn flex min-h-[2.5rem] min-w-0 flex-1 items-center gap-2 rounded-full border border-white/[0.14] bg-transparent py-0 pl-3 pr-3 text-left transition-[border-color,opacity,transform] hover:border-white/25 active:scale-[0.99]"
            aria-label={`Search — ${searchHint}`}
          >
            <SearchGlyph className="shrink-0 text-white/55" />
            <span
              key={hintIdx}
              className="fetch-header-search-hint min-w-0 truncate text-[14px] font-medium text-white/45"
            >
              {searchHint}
            </span>
          </button>
          {controlsRight}
        </div>
      </div>
    </header>
  )
}

/** Extra top offset for stacks that sit below this header (fixed; does not shift map). */
export const FETCH_HOME_APP_ADDRESS_HEADER_BELOW_REM = '4.125rem'
