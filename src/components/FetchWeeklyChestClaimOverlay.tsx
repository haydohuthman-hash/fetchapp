import { useCallback, useEffect, useId, useMemo, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'

export type FetchWeeklyChestClaimOverlayProps = {
  open: boolean
  onClose: () => void
}

type Phase = 'enter' | 'burst' | 'done'

const PRIZES = [
  { label: 'Rank Boost', sub: '+250 XP', accent: 'from-amber-400 to-orange-500' },
  { label: 'Fee Credit', sub: '$5 marketplace', accent: 'from-emerald-400 to-teal-500' },
  { label: 'Rare Badge', sub: 'Gold Hustler', accent: 'from-violet-400 to-fuchsia-500' },
] as const

function ChestOpeningSvg({ gid }: { gid: string }) {
  return (
    <svg viewBox="0 0 200 180" className="h-auto w-[min(72vw,280px)] drop-shadow-[0_24px_48px_rgba(0,0,0,0.55)]" aria-hidden>
      <defs>
        <linearGradient id={`${gid}-gold-a`} x1="40" y1="20" x2="160" y2="160" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde68a" />
          <stop offset="0.35" stopColor="#fbbf24" />
          <stop offset="0.65" stopColor="#d97706" />
          <stop offset="1" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id={`${gid}-gold-b`} x1="100" y1="100" x2="180" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fffbeb" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id={`${gid}-shadow`} x1="100" y1="140" x2="100" y2="175" gradientUnits="userSpaceOnUse">
          <stop stopColor="#451a03" stopOpacity="0.55" />
          <stop offset="1" stopColor="#451a03" stopOpacity="0" />
        </linearGradient>
        <filter id={`${gid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ground glow */}
      <ellipse cx="100" cy="158" rx="72" ry="14" fill={`url(#${gid}-shadow)`} />

      {/* Chest body — 3D wedge */}
      <g className="fetch-weekly-chest-overlay__body">
        <path
          fill={`url(#${gid}-gold-a)`}
          stroke="#78350f"
          strokeWidth="1.2"
          d="M38 108 100 76l62 32v46c0 5.5-4.5 10-10 10H48c-5.5 0-10-4.5-10-10v-46Z"
        />
        <path fill="#b45309" opacity="0.35" d="M38 108 100 76v68H48c-5.5 0-10-4.5-10-10v-26Z" />
        <path
          fill={`url(#${gid}-gold-b)`}
          opacity="0.9"
          d="M100 76 162 108 100 92 38 108Z"
        />
        <path stroke="#fef3c7" strokeOpacity="0.5" strokeWidth="0.8" d="M52 118h96" />
        {/* Lock plate */}
        <rect x="88" y="122" width="24" height="28" rx="3" fill="#292524" stroke="#fbbf24" strokeWidth="1.2" />
        <circle cx="100" cy="136" r="5" fill="none" stroke="#fde68a" strokeWidth="1.5" />
      </g>

      {/* Lid — pivots open (CSS animation in index.css) */}
      <g className="fetch-weekly-chest-overlay__lid">
        <g className="fetch-weekly-chest-overlay__lid-inner">
          <path
            fill={`url(#${gid}-gold-a)`}
            stroke="#78350f"
            strokeWidth="1.2"
            d="M38 108 100 54l62 54-62-18-62 18Z"
          />
          <path fill="#fef3c7" fillOpacity="0.25" d="M100 54l62 54-62-18V54Z" />
          <path fill="#451a03" fillOpacity="0.2" d="M38 108 100 90V54L38 108Z" />
          <path stroke="#fde68a" strokeOpacity="0.45" strokeWidth="0.9" d="M48 100h104" />
        </g>
      </g>

      {/* Burst rays (behind loot, shown after open) */}
      <g className="fetch-weekly-chest-overlay__rays opacity-0" filter={`url(#${gid}-glow)`}>
        {[...Array(10)].map((_, i) => (
          <line
            key={i}
            x1="100"
            y1="96"
            x2="100"
            y2="24"
            stroke="#fde047"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.55"
            transform={`rotate(${i * 36} 100 96)`}
          />
        ))}
      </g>
    </svg>
  )
}

/**
 * Fullscreen game-style weekly chest reward reveal.
 */
export function FetchWeeklyChestClaimOverlay({ open, onClose }: FetchWeeklyChestClaimOverlayProps) {
  const uid = useId()
  const gid = useMemo(() => `wk-ovl-${uid.replace(/:/g, '')}`, [uid])
  const [phase, setPhase] = useState<Phase>('enter')

  useEffect(() => {
    if (!open) {
      setPhase('enter')
      return
    }
    setPhase('enter')
    const t1 = window.setTimeout(() => setPhase('burst'), 750)
    const t2 = window.setTimeout(() => setPhase('done'), 1650)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const handleBackdrop = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && phase === 'done') onClose()
    },
    [onClose, phase],
  )

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fetch-weekly-chest-overlay fixed inset-0 z-[240] flex flex-col bg-[#0c0a09]"
      role="dialog"
      aria-modal="true"
      aria-label="Weekly chest rewards"
      onClick={handleBackdrop}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% 38%, rgba(251,191,36,0.22) 0%, transparent 55%), radial-gradient(circle at 50% 100%, rgba(120,53,15,0.5) 0%, transparent 45%)',
        }}
      />

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="mb-4 text-center text-[11px] font-black uppercase tracking-[0.35em] text-amber-200/90">
          Weekly vault
        </p>

        <div
          className={[
            'fetch-weekly-chest-overlay__stage relative flex flex-col items-center',
            open ? 'fetch-weekly-chest-overlay__stage--open' : '',
            phase === 'burst' || phase === 'done' ? 'fetch-weekly-chest-overlay__stage--burst' : '',
          ].join(' ')}
        >
          <ChestOpeningSvg gid={gid} />
        </div>

        <div
          className={[
            'mt-8 grid w-full max-w-sm gap-3 transition-all duration-500',
            phase === 'done' ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
          ].join(' ')}
        >
          {PRIZES.map((p, i) => (
            <div
              key={p.label}
              className={[
                'flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm',
                phase === 'done' ? 'fetch-weekly-chest-overlay__prize--in' : '',
              ].join(' ')}
              style={{ animationDelay: phase === 'done' ? `${120 + i * 90}ms` : '0ms' }}
            >
              <div>
                <p className="text-sm font-black text-white">{p.label}</p>
                <p className="text-[11px] font-semibold text-white/55">{p.sub}</p>
              </div>
              <div
                className={[
                  'h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br shadow-lg ring-1 ring-white/20',
                  p.accent,
                ].join(' ')}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          className={[
            'mt-8 min-h-[48px] w-full max-w-xs rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-6 text-[15px] font-black uppercase tracking-wide text-amber-950 shadow-[0_12px_40px_-8px_rgba(251,191,36,0.55)] transition-opacity',
            phase === 'done' ? 'opacity-100' : 'pointer-events-none opacity-0',
          ].join(' ')}
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          Claim all
        </button>
      </div>
    </div>,
    document.body,
  )
}
