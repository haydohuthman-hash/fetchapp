import { useId } from 'react'

/**
 * Shared top row for Fetch home-shell tabs (Explore, Search, Marketplace browse, Inbox hub).
 * Translucent white + blur; intentionally no bottom border divider.
 */
export const HOME_SHELL_UNIFIED_TOP_HEADER_CLASS =
  'sticky top-0 z-[15] flex w-full min-w-0 shrink-0 items-center gap-2 border-0 px-3 py-2 pb-2 pt-[max(0.35rem,calc(env(safe-area-inset-top,0px)+0.15rem))] bg-white/92 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-white/80 sm:px-5'

/** Chunky ring + handle — same glyph as Explore search pill. */
export function HomeShellHeaderSearchRingIcon({ className }: { className?: string }) {
  const uid = useId().replace(/[:]/g, '')
  const maskId = `home-shell-explore-search-${uid}`
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <mask id={maskId}>
          <rect width="24" height="24" fill="white" />
          <circle cx="11.05" cy="11.05" r="5.35" fill="black" />
        </mask>
      </defs>
      <circle cx="11.05" cy="11.05" r="8.05" fill="currentColor" mask={`url(#${maskId})`} />
      <path d="M17.85 17.95 L21.45 21.55" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function HomeShellHeaderHeartGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-8.74 1.06-1.06a5.5 5.5 0 1 0-7.78-7.78z"
      />
    </svg>
  )
}
