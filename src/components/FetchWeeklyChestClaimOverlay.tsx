import { useCallback, useEffect, useState, type MouseEvent } from 'react'
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

/**
 * Fullscreen premium chest-opening reward reveal.
 */
export function FetchWeeklyChestClaimOverlay({ open, onClose }: FetchWeeklyChestClaimOverlayProps) {
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
                left: `${20 + i * 8.5}%`,
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

        {/* Chest image */}
        <div
          className={[
            'fetch-chest-overlay__stage relative flex flex-col items-center',
            phase === 'opening' ? 'fetch-chest-overlay__stage--shake' : '',
            lidOpen ? 'fetch-chest-overlay__stage--open' : '',
          ].join(' ')}
        >
          <img
            src="/weekly-chest.png"
            alt="Gold treasure chest"
            className="h-auto w-[min(64vw,240px)] drop-shadow-[0_16px_40px_rgba(120,53,15,0.7)]"
            draggable={false}
          />

          {/* Burst glow behind chest */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: '120%',
              height: '120%',
              background: 'radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 65%)',
              opacity: lidOpen ? 1 : 0,
              transform: `translate(-50%, -50%) scale(${lidOpen ? 1 : 0.5})`,
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          />
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
