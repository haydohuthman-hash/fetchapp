type Props = {
  title: string
  subtitle?: string
}

/**
 * Lightweight Suspense fallback used between route chunks. White surface +
 * purple play mark to match the Fetchit Bid Wars brand. Replaces the older
 * yellow boomerang orb.
 */
export function FetchAppShellSuspenseFallback({ title, subtitle }: Props) {
  if (import.meta.env.DEV) {
    console.log('[AUTH] rendering fallback UI', title)
  }

  return (
    <div
      className="fetch-app-phase-fallback flex min-h-dvh min-h-[100dvh] flex-col items-center justify-center gap-5 bg-white px-6 pb-20 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={title}
    >
      <div className="flex flex-col items-center gap-3">
        <span className="grid h-16 w-16 place-items-center rounded-3xl bg-violet-100 ring-1 ring-violet-200">
          <svg
            viewBox="0 0 20 20"
            className="h-9 w-9 text-[#4c1d95]"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M5.25 5.653c0-.856.927-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.346a1.125 1.125 0 0 1-1.667-.985V5.653z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <div className="max-w-sm">
          <p className="text-[18px] font-black tracking-tight text-zinc-950">Fetchit</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#4c1d95]">
            Bid Wars
          </p>
          <p className="mt-3 text-[14px] font-medium leading-snug text-zinc-700">{title}</p>
          {subtitle ? (
            <p className="mt-2 text-[12px] font-medium leading-relaxed text-zinc-500">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#4c1d95]/70" />
        <span
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#4c1d95]/55"
          style={{ animationDelay: '140ms' }}
        />
        <span
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#4c1d95]/35"
          style={{ animationDelay: '280ms' }}
        />
      </div>
    </div>
  )
}
