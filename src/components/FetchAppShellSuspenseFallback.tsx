import boomerangUrl from '../assets/fetchit-boomerang-logo.png'

type Props = {
  title: string
  subtitle?: string
}

export function FetchAppShellSuspenseFallback({ title, subtitle }: Props) {
  if (import.meta.env.DEV) {
    console.log('[AUTH] rendering fallback UI', title)
  }

  return (
    <div
      className="fetch-app-phase-fallback fetch-app-shell-bg flex min-h-dvh min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 pb-20 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={title}
    >
      <div className="flex flex-col items-center gap-5">
        <img
          src={boomerangUrl}
          alt=""
          width={80}
          height={80}
          draggable={false}
          className="h-16 w-16 object-contain opacity-95"
          aria-hidden="true"
        />
        <div className="max-w-sm">
          <p className="text-lg font-semibold tracking-tight text-[#1c1528]">Fetch</p>
          <p className="mt-2 text-[15px] font-medium leading-snug text-[#1c1528]/80">{title}</p>
          {subtitle ? (
            <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400/55" />
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400/45" style={{ animationDelay: '140ms' }} />
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400/35" style={{ animationDelay: '280ms' }} />
      </div>
    </div>
  )
}
