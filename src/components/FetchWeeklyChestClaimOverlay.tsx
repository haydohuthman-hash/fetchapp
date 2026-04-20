import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { playChestOpenSound } from '../lib/playStreakCelebrationSound'
import { CHEST_TIER_META, type ChestTier } from '../lib/rewardProgress'

export type FetchWeeklyChestClaimOverlayProps = {
  open: boolean
  onClose: () => void
  tier: ChestTier
}

type Phase = 'idle' | 'opening' | 'burst' | 'prizes' | 'done'

const TIER_PRIZES: Record<ChestTier, readonly { label: string; sub: string; icon: string }[]> = {
  bronze:   [{ label: 'Coin Pouch', sub: '+50 coins', icon: '🪙' }, { label: 'XP Boost', sub: '+100 XP', icon: '⚡' }],
  silver:   [{ label: 'Silver Sack', sub: '+100 coins', icon: '🪙' }, { label: 'XP Boost', sub: '+200 XP', icon: '⚡' }, { label: 'Badge', sub: 'Silver Seller', icon: '🥈' }],
  gold:     [{ label: 'Gold Haul', sub: '+200 coins', icon: '🪙' }, { label: 'Fee Credit', sub: '$5 marketplace', icon: '💎' }, { label: 'Rare Badge', sub: 'Gold Hustler', icon: '🏅' }],
  platinum: [{ label: 'Platinum Vault', sub: '+350 coins', icon: '🪙' }, { label: 'Fee Credit', sub: '$10 marketplace', icon: '💎' }, { label: 'Elite Badge', sub: 'Platinum Pro', icon: '🏆' }],
  diamond:  [{ label: 'Diamond Treasury', sub: '+500 coins', icon: '🪙' }, { label: 'Fee Credit', sub: '$20 marketplace', icon: '💎' }, { label: 'Legendary Badge', sub: 'Diamond Legend', icon: '👑' }, { label: 'Boomerang', sub: 'Rank 2 unlock', icon: '🪃' }],
}

export function FetchWeeklyChestClaimOverlay({ open, onClose, tier }: FetchWeeklyChestClaimOverlayProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const meta = CHEST_TIER_META[tier]
  const prizes = TIER_PRIZES[tier]

  useEffect(() => {
    if (!open) { setPhase('idle'); return }
    setPhase('opening')
    playChestOpenSound()
    const t1 = window.setTimeout(() => setPhase('burst'), 650)
    const t2 = window.setTimeout(() => setPhase('prizes'), 1200)
    const t3 = window.setTimeout(() => setPhase('done'), 1800)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const handleBackdrop = useCallback(
    (e: MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget && phase === 'done') onClose() },
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
      aria-label={`${meta.label} chest rewards`}
      onClick={handleBackdrop}
      style={{ background: `linear-gradient(180deg, #0c0a09 0%, ${meta.bg} 50%, #0c0a09 100%)` }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 90% 50% at 50% 42%, ${meta.glow} 0%, transparent 60%)`,
          opacity: lidOpen ? 1 : 0.3,
          transition: 'opacity 0.8s ease',
        }}
      />

      {/* Particles */}
      {lidOpen ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="fetch-chest-overlay__particle absolute rounded-full"
              style={{
                width: 3 + (i % 3) * 2, height: 3 + (i % 3) * 2,
                left: `${15 + i * 7}%`,
                backgroundColor: meta.text,
                opacity: 0.5,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p
          className="mb-4 text-center text-[11px] font-black uppercase tracking-[0.4em] transition-opacity duration-500"
          style={{ color: meta.text, opacity: lidOpen ? 1 : 0.5 }}
        >
          {meta.label} vault
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
            alt={`${meta.label} treasure chest`}
            className="h-auto w-[min(60vw,220px)]"
            style={{
              filter: `drop-shadow(0 16px 40px ${meta.glow})`,
              ...(tier !== 'gold' ? { filter: `drop-shadow(0 16px 40px ${meta.glow}) hue-rotate(${hueForTier(tier)}deg)` } : {}),
            }}
            draggable={false}
          />
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: '130%', height: '130%',
              background: `radial-gradient(circle, ${meta.glow} 0%, transparent 60%)`,
              opacity: lidOpen ? 0.6 : 0,
              transition: 'opacity 0.6s ease',
            }}
          />
        </div>

        {/* Prizes */}
        <div
          className="mt-5 flex w-full max-w-sm flex-col gap-2 transition-all duration-500"
          style={{ opacity: showPrizes ? 1 : 0, transform: showPrizes ? 'translateY(0)' : 'translateY(16px)' }}
        >
          {prizes.map((p, i) => (
            <div
              key={p.label}
              className="fetch-chest-overlay__prize flex items-center gap-3 rounded-xl border px-4 py-2.5 backdrop-blur-sm"
              style={{
                borderColor: `${meta.border}`,
                backgroundColor: 'rgba(255,255,255,0.03)',
                animationDelay: showPrizes ? `${80 + i * 90}ms` : '0ms',
                opacity: showPrizes ? undefined : 0,
              }}
            >
              <span className="text-lg" aria-hidden>{p.icon}</span>
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
          className="mt-5 min-h-[48px] w-full max-w-xs rounded-xl px-6 text-[14px] font-black uppercase tracking-wider transition-all duration-500 active:scale-[0.97]"
          style={{
            background: `linear-gradient(135deg, ${meta.text}, ${meta.border})`,
            color: '#0c0a09',
            boxShadow: `0 8px 32px -6px ${meta.glow}`,
            opacity: phase === 'done' ? 1 : 0,
            transform: phase === 'done' ? 'translateY(0)' : 'translateY(8px)',
            pointerEvents: phase === 'done' ? 'auto' : 'none',
          }}
          onClick={(e) => { e.stopPropagation(); onClose() }}
        >
          Collect {meta.coins} coins
        </button>
      </div>

      {phase === 'done' ? (
        <p className="pointer-events-none pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-[10px] font-medium tracking-wide text-white/20">
          Tap anywhere to close
        </p>
      ) : null}
    </div>,
    document.body,
  )
}

function hueForTier(tier: ChestTier): number {
  switch (tier) {
    case 'bronze': return -15
    case 'silver': return 180
    case 'gold': return 0
    case 'platinum': return 155
    case 'diamond': return 240
  }
}
