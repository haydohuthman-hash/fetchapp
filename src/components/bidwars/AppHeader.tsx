/**
 * Light-theme app header reused on the new Bid Wars surfaces (Browse, Category
 * detail, Activity, Wallet, Rewards). The home shell still uses the existing
 * FetchHomeAppAddressHeader.
 */

import type { ReactNode } from 'react'

type Props = {
  title?: string
  showBack?: boolean
  onBack?: () => void
  trailing?: ReactNode
  subtitle?: string
}

export function AppHeader({ title, showBack, onBack, trailing, subtitle }: Props) {
  return (
    <header
      className="sticky top-0 z-[5] flex shrink-0 items-center gap-2 bg-white/95 px-4 pt-[max(0.7rem,env(safe-area-inset-top,0px))] pb-3 ring-1 ring-zinc-200 backdrop-blur"
    >
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-zinc-800 ring-1 ring-zinc-200 active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        {title ? (
          <p className="truncate text-[16px] font-black tracking-tight text-zinc-950">{title}</p>
        ) : null}
        {subtitle ? (
          <p className="truncate text-[11px] font-semibold text-zinc-500">{subtitle}</p>
        ) : null}
      </div>
      {trailing}
    </header>
  )
}
