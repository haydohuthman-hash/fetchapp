import { useEffect } from 'react'

export function FetchBoomerangSplash({ onDone }: { onDone?: () => void }) {
  useEffect(() => {
    const t = onDone ? window.setTimeout(onDone, 980) : 0
    return () => {
      if (t) clearTimeout(t)
    }
  }, [onDone])

  return (
    <div className="fetch-boomerang-splash-root pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-[#4c1d95] text-white">
      <div className="fetch-entry-brand-splash flex flex-col items-center justify-center text-center">
        <p className="text-[clamp(3.5rem,18vw,6.25rem)] font-black leading-none tracking-[-0.08em] text-white">
          fetchit
        </p>
        <p className="mt-2 text-[clamp(0.9rem,4vw,1.25rem)] font-black uppercase leading-none tracking-[0.28em] text-white/95">
          Bid Wars
        </p>
      </div>
    </div>
  )
}
