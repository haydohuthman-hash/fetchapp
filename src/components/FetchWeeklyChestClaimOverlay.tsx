import { useCallback, useEffect, useId, useMemo, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { playChestOpenSound } from '../lib/playStreakCelebrationSound'

export type FetchWeeklyChestClaimOverlayProps = {
  open: boolean
  onClose: () => void
}

type Phase = 'idle' | 'opening' | 'burst' | 'prizes' | 'done'

const PRIZES = [
  { label: 'Rank Boost', sub: '+250 XP', icon: '⚡', accent: 'from-amber-400 to-orange-500' },
  { label: 'Fee Credit', sub: '$5 marketplace', icon: '💎', accent: 'from-emerald-400 to-teal-500' },
  { label: 'Rare Badge', sub: 'Gold Hustler', icon: '🏅', accent: 'from-violet-400 to-fuchsia-500' },
] as const

function ChestOpeningSvg({ gid, phase }: { gid: string; phase: Phase }) {
  const isOpen = phase !== 'idle' && phase !== 'opening'
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-auto w-[min(68vw,260px)]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${gid}-body`} x1="40" y1="180" x2="160" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#451a03" />
          <stop offset="0.3" stopColor="#78350f" />
          <stop offset="0.6" stopColor="#b45309" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id={`${gid}-lid`} x1="100" y1="60" x2="100" y2="110" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fef3c7" />
          <stop offset="0.4" stopColor="#fbbf24" />
          <stop offset="0.75" stopColor="#d97706" />
          <stop offset="1" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id={`${gid}-trim`} x1="60" y1="105" x2="140" y2="105" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fef08a" />
          <stop offset="0.5" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#fef08a" />
        </linearGradient>
        <linearGradient id={`${gid}-glow-r`} x1="100" y1="100" x2="100" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde047" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </linearGradient>
        <filter id={`${gid}-blur`}>
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={`${gid}-soft`}>
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="100" cy="178" rx="60" ry="10" fill="#1c1917" opacity="0.5" filter={`url(#${gid}-blur)`} />

      {/* Burst rays */}
      <g
        className="fetch-chest-overlay__rays"
        style={{ opacity: isOpen ? 1 : 0, transition: 'opacity 0.6s ease' }}
      >
        {[...Array(12)].map((_, i) => (
          <line
            key={i}
            x1="100" y1="100" x2="100" y2="20"
            stroke={`url(#${gid}-glow-r)`}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.4"
            transform={`rotate(${i * 30} 100 100)`}
          />
        ))}
        <circle cx="100" cy="95" r="30" fill="#fde047" opacity="0.15" filter={`url(#${gid}-blur)`} />
      </g>

      {/* Chest body */}
      <g>
        {/* Main body */}
        <rect x="42" y="108" width="116" height="65" rx="6" fill={`url(#${gid}-body)`} stroke="#78350f" strokeWidth="1" />
        {/* Body bevel line */}
        <line x1="50" y1="118" x2="150" y2="118" stroke="#fef3c7" strokeWidth="0.6" strokeOpacity="0.3" />
        {/* Left face shadow for depth */}
        <rect x="42" y="108" width="58" height="65" rx="6" fill="#451a03" opacity="0.25" />
        {/* Horizontal gold trim band */}
        <rect x="42" y="106" width="116" height="5" rx="1.5" fill={`url(#${gid}-trim)`} />
        {/* Lock */}
        <rect x="88" y="126" width="24" height="30" rx="3" fill="#0c0a09" stroke="#fbbf24" strokeWidth="1" />
        <circle cx="100" cy="141" r="5" fill="none" stroke="#fde68a" strokeWidth="1.4" />
        <circle cx="100" cy="141" r="1.8" fill="#fde68a" />
        {/* Corner studs */}
        <circle cx="52" cy="116" r="3" fill="#d97706" stroke="#92400e" strokeWidth="0.5" />
        <circle cx="148" cy="116" r="3" fill="#d97706" stroke="#92400e" strokeWidth="0.5" />
        <circle cx="52" cy="165" r="3" fill="#d97706" stroke="#92400e" strokeWidth="0.5" />
        <circle cx="148" cy="165" r="3" fill="#d97706" stroke="#92400e" strokeWidth="0.5" />
      </g>

      {/* Lid — animated via CSS */}
      <g className="fetch-chest-overlay__lid-group" style={{ transformOrigin: '100px 108px' }}>
        <path
          fill={`url(#${gid}-lid)`}
          stroke="#92400e"
          strokeWidth="1"
          d="M38 108 c0-28 28-50 62-50 s62 22 62 50 Z"
        />
        <path
          fill="#fffbeb"
          fillOpacity="0.15"
          d="M100 58 c34 0 62 22 62 50 L100 98Z"
        />
        <line x1="55" y1="100" x2="145" y2="100" stroke="#fef08a" strokeWidth="0.7" strokeOpacity="0.45" />
        {/* Lid trim */}
        <rect x="42" y="104" width="116" height="4" rx="1" fill={`url(#${gid}-trim)`} opacity="0.65" />
        {/* Lid keyhole ornament */}
        <circle cx="100" cy="85" r="6" fill="none" stroke="#fde68a" strokeWidth="0.9" strokeOpacity="0.4" />
      </g>

      {/* Inner glow from inside chest (visible when open) */}
      <ellipse
        cx="100" cy="108" rx="38" ry="12"
        fill="#fde047"
        opacity={isOpen ? 0.35 : 0}
        filter={`url(#${gid}-soft)`}
        style={{ transition: 'opacity 0.4s ease 0.3s' }}
      />
    </svg>
  )
}

/**
 * Fullscreen premium chest-opening reward reveal.
 */
export function FetchWeeklyChestClaimOverlay({ open, onClose }: FetchWeeklyChestClaimOverlayProps) {
  const uid = useId()
  const gid = useMemo(() => `wk-ovl-${uid.replace(/:/g, '')}`, [uid])
  const [phase, setPhase] = useState<Phase>('idle')

  useEffect(() => {
    if (!open) {
      setPhase('idle')
      return
    }

    setPhase('opening')
    playChestOpenSound()

    const t1 = window.setTimeout(() => setPhase('burst'), 650)
    const t2 = window.setTimeout(() => setPhase('prizes'), 1200)
    const t3 = window.setTimeout(() => setPhase('done'), 1800)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
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

  const showPrizes = phase === 'prizes' || phase === 'done'
  const lidOpen = phase !== 'idle' && phase !== 'opening'

  return createPortal(
    <div
      className="fetch-weekly-chest-overlay fixed inset-0 z-[240] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Weekly chest rewards"
      onClick={handleBackdrop}
      style={{
        background: 'linear-gradient(180deg, #0c0a09 0%, #1c1917 40%, #0c0a09 100%)',
      }}
    >
      {/* Ambient radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'radial-gradient(ellipse 90% 50% at 50% 40%, rgba(251,191,36,0.18) 0%, transparent 60%)',
            'radial-gradient(circle at 50% 95%, rgba(120,53,15,0.35) 0%, transparent 40%)',
          ].join(', '),
          opacity: lidOpen ? 1 : 0.4,
          transition: 'opacity 0.8s ease',
        }}
      />

      {/* Floating particles */}
      {lidOpen ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="fetch-chest-overlay__particle absolute rounded-full bg-amber-300/60"
              style={{
                width: 3 + (i % 3) * 2,
                height: 3 + (i % 3) * 2,
                left: `${20 + (i * 8.5)}%`,
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        {/* Title */}
        <p
          className="mb-6 text-center text-[11px] font-black uppercase tracking-[0.4em] transition-opacity duration-500"
          style={{ color: 'rgba(253,230,138,0.85)', opacity: lidOpen ? 1 : 0.5 }}
        >
          Weekly vault
        </p>

        {/* Chest */}
        <div
          className={[
            'fetch-chest-overlay__stage relative flex flex-col items-center',
            phase === 'opening' ? 'fetch-chest-overlay__stage--shake' : '',
            lidOpen ? 'fetch-chest-overlay__stage--open' : '',
          ].join(' ')}
        >
          <ChestOpeningSvg gid={gid} phase={phase} />
        </div>

        {/* Prizes */}
        <div
          className="mt-6 flex w-full max-w-sm flex-col gap-2.5 transition-all duration-500"
          style={{
            opacity: showPrizes ? 1 : 0,
            transform: showPrizes ? 'translateY(0)' : 'translateY(16px)',
          }}
        >
          {PRIZES.map((p, i) => (
            <div
              key={p.label}
              className="fetch-chest-overlay__prize flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3 backdrop-blur-sm"
              style={{
                animationDelay: showPrizes ? `${80 + i * 100}ms` : '0ms',
                opacity: showPrizes ? undefined : 0,
              }}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-lg shadow-lg ring-1 ring-white/15 ${p.accent}`}
              >
                <span aria-hidden>{p.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-white/90">{p.label}</p>
                <p className="text-[11px] font-medium text-white/45">{p.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          className="mt-6 min-h-[48px] w-full max-w-xs rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-6 text-[14px] font-black uppercase tracking-wider text-amber-950 shadow-[0_8px_32px_-6px_rgba(251,191,36,0.6)] transition-all duration-500 active:scale-[0.97]"
          style={{
            opacity: phase === 'done' ? 1 : 0,
            transform: phase === 'done' ? 'translateY(0)' : 'translateY(8px)',
            pointerEvents: phase === 'done' ? 'auto' : 'none',
          }}
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          Collect rewards
        </button>
      </div>

      {/* Close hint */}
      {phase === 'done' ? (
        <p className="pointer-events-none pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-[10px] font-medium tracking-wide text-white/25">
          Tap anywhere to close
        </p>
      ) : null}
    </div>,
    document.body,
  )
}
