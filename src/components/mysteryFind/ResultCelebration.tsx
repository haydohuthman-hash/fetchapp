import type { CSSProperties } from 'react'
import { memo, useMemo } from 'react'
import type { MysteryRevealTierId } from '../../lib/mysteryFind/outcomeTier'

const CONFETTI_HEX = ['#8b5cf6', '#a78bfa', '#c084fc', '#6366f1', '#34d399', '#f472b6', '#fcd34d']

/** Premium reveal accents — Lower Find stays subtle (never empty). */
export const ResultCelebration = memo(function ResultCelebration({ tier }: { tier: MysteryRevealTierId }) {
  const burst =
    tier === 'rare' ? 48 : tier === 'great' ? 32 : tier === 'fair' ? 18 : tier === 'lower' ? 10 : 0
  const glow = tier === 'rare' || tier === 'great'

  const pieces = useMemo(() => {
    return Array.from({ length: burst }, (_, i) => ({
      left: `${(i * 41 + ((i * 13) % 37)) % 100}%`,
      delay: `${(i % 9) * 0.065}s`,
      dur: `${1.95 + (i % 5) * 0.2}s`,
      dx: `${-52 + ((i * 83) % 104)}px`,
      c: CONFETTI_HEX[i % CONFETTI_HEX.length],
    }))
  }, [burst])

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-[2] overflow-hidden rounded-t-xl select-none"
      aria-hidden
      style={{ height: 'min(22rem, 58vh)' }}
    >
      {glow ? (
        <div
          className="absolute left-1/2 top-[8%] h-[132%] w-[138%] -translate-x-1/2 rounded-full opacity-70"
          style={{
            background:
              'radial-gradient(ellipse 55% 40% at 50% 32%, rgba(139,92,246,0.38), transparent 74%)',
          }}
        />
      ) : null}
      {tier === 'lower' ? (
        <div
          className="absolute left-1/2 top-[18%] h-[55%] w-[88%] -translate-x-1/2 rounded-full opacity-40"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(139,92,246,0.15), transparent 70%)',
          }}
        />
      ) : null}
      {burst > 0
        ? pieces.map((p, i) => (
            <span
              key={i}
              className="fetch-mystery-confetti-piece absolute h-2.5 w-2 shrink-0 rounded-[2px]"
              style={
                {
                  left: p.left,
                  animationDelay: p.delay,
                  animationDuration: p.dur,
                  ['--mf-dx']: p.dx,
                  backgroundColor: p.c,
                } as CSSProperties & { '--mf-dx': string }
              }
            />
          ))
        : null}
    </div>
  )
})
