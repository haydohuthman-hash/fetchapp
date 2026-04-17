import { useEffect, useState } from 'react'
import boomerangUrl from '../assets/fetchit-boomerang-logo.png'

export function FetchBoomerangSplash({ onDone }: { onDone?: () => void }) {
  const [phase, setPhase] = useState<'arc' | 'landed'>('arc')

  useEffect(() => {
    const arcMs = 1200
    const t1 = window.setTimeout(() => setPhase('landed'), arcMs)
    const t2 = onDone ? window.setTimeout(onDone, arcMs + 360) : 0
    return () => { clearTimeout(t1); if (t2) clearTimeout(t2) }
  }, [onDone])

  return (
    <div className="fetch-boomerang-splash-root pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      <div className="fetch-entry-galactic pointer-events-none absolute inset-0 z-0" aria-hidden>
        <span className="fetch-entry-galactic__shooting-star" />
        <span className="fetch-entry-galactic__shooting-star" />
        <span className="fetch-entry-galactic__shooting-star" />
      </div>

      {/* w-0 h-0 origin at viewport center; must not sit under overflow:hidden or the scaled art clips away */}
      <div className="fetch-boomerang-splash-position fetch-boomerang-splash-position--fly pointer-events-none absolute left-1/2 top-1/2 z-10 h-0 w-0 overflow-visible">
        <img
          src={boomerangUrl}
          alt=""
          width={384}
          height={384}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          draggable={false}
          className={[
            'fetch-boomerang-img pointer-events-none',
            phase === 'arc' ? 'fetch-boomerang-img--arc' : '',
            phase === 'landed' ? 'fetch-boomerang-img--landed' : '',
          ].join(' ')}
        />
      </div>
    </div>
  )
}
