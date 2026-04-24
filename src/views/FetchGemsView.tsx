import { useCallback } from 'react'

export type FetchGemsViewProps = {
  onBack: () => void
}

/**
 * Gems hub — earn and spend in-app gems (placeholder until ledger is wired).
 */
export default function FetchGemsView({ onBack }: FetchGemsViewProps) {
  const handleBack = useCallback(() => {
    onBack()
  }, [onBack])

  return (
    <div className="min-h-dvh bg-[#f8f6fd] px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))] text-[#1c1528]">
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-200/60 bg-violet-50 text-[#4c1d95] active:scale-[0.97]"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-lg font-semibold tracking-tight">Gems</h1>
      </header>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div className="mb-4 flex items-center gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00ff6a]/15 text-[#00ff6a]"
            aria-hidden
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2.5l7.2 5.2v8.6L12 21.5l-7.2-5.2V7.7L12 2.5z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
                fill="currentColor"
                fillOpacity="0.12"
              />
              <path d="M12 2.5v19M4.8 7.7l14.4 8.6M19.2 7.7L4.8 16.3" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.35" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold tracking-tight text-[#1c1528]">Your gems</p>
            <p className="mt-0.5 text-[12px] text-zinc-500">Collect gems from drops, live sales, and challenges.</p>
          </div>
        </div>
        <p className="text-[13px] leading-relaxed text-zinc-500">
          Gem balance and redemptions will show here when the rewards program is connected. You can still use Fetch
          wallet credits for bookings and checkout.
        </p>
      </div>
    </div>
  )
}
