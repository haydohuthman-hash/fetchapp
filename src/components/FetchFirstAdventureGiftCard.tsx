/**
 * First-adventure gift card — celebratory pop-up shown the first time the
 * user taps "Start adventure". The card holds an illustrated treasure map.
 *
 * Phases:
 *   1. `intro` — card scales in with confetti + sparkle behind it
 *   2. `flying` — Claim button collapses the card down to a small map chip
 *      that arcs across the screen toward the backpack icon
 *   3. `landed` — small radial pop at the backpack, gift card unmounts
 *
 * The parent wires this up by:
 *   - rendering it on `firstAdventureGiftOpen === true`
 *   - passing `getBackpackRect()` so we can compute the fly target
 *   - calling `onClaimed()` once the animation finishes (parent persists the
 *     claim flag + adds the map item to the backpack)
 */

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { initBattleAudio, playConfettiPops, playGiftPop } from '../lib/fetchBattleSounds'

type Phase = 'intro' | 'flying' | 'landed'

type Props = {
  open: boolean
  /** Returns the backpack icon's `getBoundingClientRect()` (or null if not mounted yet). */
  getBackpackRect: () => DOMRect | null
  /** Fires after the animation completes; parent should persist + close. */
  onClaimed: () => void
  /** Optional dismiss without claiming (e.g. tap outside). */
  onDismiss?: () => void
}

export const FetchFirstAdventureGiftCard = memo(FetchFirstAdventureGiftCardInner)

function FetchFirstAdventureGiftCardInner({ open, getBackpackRect, onClaimed }: Props) {
  const portalTarget = typeof document !== 'undefined' ? document.body : null
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [phase, setPhase] = useState<Phase>('intro')
  const [flightVars, setFlightVars] = useState<{ x: number; y: number } | null>(null)
  const [popAt, setPopAt] = useState<{ x: number; y: number } | null>(null)

  /* Reset on each open */
  useEffect(() => {
    if (!open) return
    setPhase('intro')
    setFlightVars(null)
    setPopAt(null)
    initBattleAudio()
    /** Confetti on entrance to set the tone. */
    const id = window.setTimeout(() => playConfettiPops(), 220)
    return () => window.clearTimeout(id)
  }, [open])

  function handleClaim() {
    if (phase !== 'intro') return
    const cardEl = cardRef.current
    const targetRect = getBackpackRect()
    if (!cardEl || !targetRect) {
      // Without a target we can't fly — just play the sound and finish.
      playGiftPop()
      onClaimed()
      return
    }
    const cardRect = cardEl.getBoundingClientRect()
    const cardCenter = {
      x: cardRect.left + cardRect.width / 2,
      y: cardRect.top + cardRect.height / 2,
    }
    const targetCenter = {
      x: targetRect.left + targetRect.width / 2,
      y: targetRect.top + targetRect.height / 2,
    }
    setFlightVars({
      x: targetCenter.x - cardCenter.x,
      y: targetCenter.y - cardCenter.y,
    })
    setPopAt(targetCenter)
    setPhase('flying')

    /** Pop sound + flag flip exactly when the card "lands" (~900ms). */
    window.setTimeout(() => {
      playGiftPop()
      setPhase('landed')
    }, 880)

    /** Unmount slightly after the pop so the burst can render. */
    window.setTimeout(() => {
      onClaimed()
    }, 1280)
  }

  const sparkleSeeds = useMemo(
    () =>
      Array.from({ length: 14 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 1.6,
        scale: 0.6 + Math.random() * 0.7,
      })),
    [],
  )

  if (!open || !portalTarget) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-5"
      role="dialog"
      aria-modal
      aria-label="First adventure gift"
    >
      {/* Backdrop */}
      <div
        aria-hidden
        className={[
          'absolute inset-0 bg-[#1c1340]/45 backdrop-blur-md transition-opacity duration-300',
          phase === 'flying' || phase === 'landed' ? 'opacity-50' : 'opacity-100',
        ].join(' ')}
      />

      {/* Sparkles (entrance ambience) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {sparkleSeeds.map((s, i) => (
          <span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_18px_4px_rgba(251,191,36,0.5)]"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              transform: `scale(${s.scale})`,
              animation: `fetch-gift-sparkle 1.6s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Gift card */}
      <div
        ref={cardRef}
        className={[
          'relative z-[2] w-full max-w-[22rem] overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#fff5dc] via-[#fcecbb] to-[#f3d490] text-[#3b2410] shadow-[0_30px_70px_-20px_rgba(28,19,64,0.7)] ring-1 ring-amber-300/50',
          phase === 'intro' ? 'fetch-gift-intro' : '',
          phase === 'flying' ? 'fetch-gift-fly' : '',
          phase === 'landed' ? 'opacity-0' : '',
        ].join(' ')}
        style={
          flightVars
            ? ({
                ['--fly-x' as string]: `${flightVars.x}px`,
                ['--fly-y' as string]: `${flightVars.y}px`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {/* Ribbon / header */}
        <div className="relative bg-gradient-to-r from-rose-500 via-rose-500 to-amber-500 px-5 py-3 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.34em]">Welcome gift</p>
          <h2 className="mt-1 text-[18px] font-black leading-tight">
            Your first adventure starts here
          </h2>
          <span
            aria-hidden
            className="absolute -right-3 -top-2 inline-flex h-9 items-center justify-center rounded-l-full rounded-tr-full bg-amber-400 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-amber-950 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.4)]"
          >
            +1 Item
          </span>
        </div>

        {/* Illustrated map */}
        <div className="relative px-5 py-5">
          <TreasureMapIllustration />
          <div className="mt-4 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700/80">
              Explorer Map
            </p>
            <p className="mt-1 text-[14px] font-bold leading-snug text-[#3b2410]">
              Marks where Fetch finds rare drops on every adventure.
            </p>
          </div>
        </div>

        {/* Claim CTA */}
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={handleClaim}
            disabled={phase !== 'intro'}
            className="fetch-apple-warp-btn flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-b-[5px] border-[#7a3e0c] bg-gradient-to-b from-[#ff9a3c] to-[#f06a1a] text-[15px] font-black uppercase tracking-[0.06em] text-white shadow-[0_18px_30px_-14px_rgba(240,106,26,0.6)] transition-transform active:translate-y-0.5 active:border-b-2 disabled:opacity-70"
          >
            <SparkleIcon className="h-5 w-5" />
            Claim & stash in backpack
          </button>
          <p className="mt-2 text-center text-[11px] font-semibold text-amber-800/80">
            Tap to send it flying into your pack.
          </p>
        </div>
      </div>

      {/* Landing pop burst */}
      {phase === 'landed' && popAt ? (
        <div
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-[3]"
          style={{ transform: `translate(${popAt.x}px, ${popAt.y}px)` }}
        >
          <span className="fetch-gift-pop block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300" />
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="fetch-gift-pop-shard absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_12px_4px_rgba(251,191,36,0.6)]"
              style={{
                ['--shard-deg' as string]: `${(i * 360) / 8}deg`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      ) : null}

      <style>{`
        @keyframes fetch-gift-intro-kf {
          0%   { transform: scale(0.6) translateY(40px); opacity: 0; }
          55%  { transform: scale(1.04) translateY(-6px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .fetch-gift-intro {
          animation: fetch-gift-intro-kf 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes fetch-gift-sparkle {
          0%, 100% { transform: scale(0.6) translateY(0); opacity: 0; }
          50%      { transform: scale(1.2) translateY(-6px); opacity: 1; }
        }
        @keyframes fetch-gift-fly-kf {
          0% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            opacity: 1;
          }
          25% {
            transform: translate(calc(var(--fly-x) * 0.25), calc(var(--fly-y) * 0.18 - 80px)) scale(0.7) rotate(-6deg);
          }
          70% {
            transform: translate(calc(var(--fly-x) * 0.78), calc(var(--fly-y) * 0.6 - 40px)) scale(0.32) rotate(8deg);
            opacity: 1;
          }
          100% {
            transform: translate(var(--fly-x), var(--fly-y)) scale(0.1) rotate(14deg);
            opacity: 0.85;
          }
        }
        .fetch-gift-fly {
          animation: fetch-gift-fly-kf 0.88s cubic-bezier(0.66, 0, 0.85, 0.35) forwards;
        }
        @keyframes fetch-gift-pop-kf {
          0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0.95; }
          60%  { transform: translate(-50%, -50%) scale(2.6); opacity: 0.5; }
          100% { transform: translate(-50%, -50%) scale(3.6); opacity: 0; }
        }
        .fetch-gift-pop {
          animation: fetch-gift-pop-kf 0.4s ease-out both;
          box-shadow: 0 0 24px 8px rgba(251, 191, 36, 0.6);
        }
        @keyframes fetch-gift-pop-shard-kf {
          0%   { transform: translate(-50%, -50%) rotate(var(--shard-deg)) translate(0px); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(var(--shard-deg)) translate(46px); opacity: 0; }
        }
        .fetch-gift-pop-shard {
          animation: fetch-gift-pop-shard-kf 0.45s ease-out both;
        }
      `}</style>
    </div>,
    portalTarget,
  )
}

/* ============================================================================
 * Inline SVG — illustrated treasure / explorer map
 * ============================================================================ */

function TreasureMapIllustration() {
  return (
    <svg
      viewBox="0 0 320 200"
      role="img"
      aria-label="Illustrated explorer map"
      className="block w-full drop-shadow-[0_18px_24px_rgba(159,103,40,0.35)]"
    >
      <defs>
        <linearGradient id="parchment" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2cd" />
          <stop offset="1" stopColor="#f5d99b" />
        </linearGradient>
        <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9bd6e7" />
          <stop offset="1" stopColor="#5fa6c8" />
        </linearGradient>
        <radialGradient id="island" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#cae39a" />
          <stop offset="1" stopColor="#8ab35d" />
        </radialGradient>
        <pattern id="mapGrid" width="14" height="14" patternUnits="userSpaceOnUse">
          <path
            d="M14 0H0V14"
            fill="none"
            stroke="#caa86a"
            strokeOpacity="0.18"
            strokeWidth="0.6"
          />
        </pattern>
      </defs>

      {/* Parchment */}
      <path
        d="M14 22 C 8 18, 8 12, 22 12 L 296 14 C 312 14, 314 22, 308 28 L 312 174 C 314 188, 304 192, 290 188 L 26 188 C 12 192, 6 184, 12 172 Z"
        fill="url(#parchment)"
        stroke="#a87a3a"
        strokeWidth="2"
      />
      <path
        d="M14 22 C 8 18, 8 12, 22 12 L 296 14 C 312 14, 314 22, 308 28 L 312 174 C 314 188, 304 192, 290 188 L 26 188 C 12 192, 6 184, 12 172 Z"
        fill="url(#mapGrid)"
      />

      {/* Burnt corners */}
      <circle cx="18" cy="18" r="4" fill="#b07435" opacity="0.45" />
      <circle cx="304" cy="22" r="3.5" fill="#b07435" opacity="0.45" />
      <circle cx="22" cy="184" r="3" fill="#b07435" opacity="0.4" />
      <circle cx="298" cy="180" r="4" fill="#b07435" opacity="0.45" />

      {/* Ocean / coast */}
      <path
        d="M40 132 Q 70 116, 100 130 Q 132 144, 160 124 Q 188 102, 220 122 Q 250 142, 282 128 L 282 178 L 38 178 Z"
        fill="url(#ocean)"
        opacity="0.82"
      />
      {/* Wavy lines */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M 60 ${152 + i * 8} q 6 -4 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0 t 12 0`}
          fill="none"
          stroke="#fff"
          strokeOpacity="0.5"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ))}

      {/* Island */}
      <path
        d="M120 60 Q 150 38, 188 50 Q 226 60, 232 90 Q 232 122, 198 130 Q 168 138, 142 128 Q 110 116, 110 92 Q 110 70, 120 60 Z"
        fill="url(#island)"
        stroke="#5d7e3a"
        strokeWidth="1.6"
      />

      {/* Trees / details */}
      {[
        [142, 78],
        [156, 70],
        [186, 76],
        [206, 88],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy - 4} r="6" fill="#557f33" />
          <rect x={cx - 1} y={cy - 1} width="2" height="6" fill="#7a4d28" />
        </g>
      ))}

      {/* Mountain */}
      <path d="M158 86 L 174 60 L 188 86 Z" fill="#9a7945" stroke="#6a4f29" strokeWidth="1.4" />
      <path d="M170 70 L 176 62 L 182 70 Z" fill="#fff" opacity="0.7" />

      {/* Dotted route */}
      <path
        d="M58 156 Q 86 138, 110 144 Q 134 148, 150 132 Q 168 116, 196 110 Q 220 106, 226 92"
        fill="none"
        stroke="#a23022"
        strokeWidth="2.2"
        strokeDasharray="2 6"
        strokeLinecap="round"
      />

      {/* X marks the spot */}
      <g transform="translate(226 92)">
        <circle r="9" fill="#fff" stroke="#a23022" strokeWidth="2" />
        <path
          d="M-5 -5 L 5 5 M 5 -5 L -5 5"
          stroke="#a23022"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>

      {/* Compass rose */}
      <g transform="translate(70 50)">
        <circle r="14" fill="#fff" stroke="#8a6228" strokeWidth="1.4" />
        <path d="M0 -12 L 3 0 L 0 12 L -3 0 Z" fill="#a23022" />
        <path d="M-12 0 L 0 -3 L 12 0 L 0 3 Z" fill="#3b2410" />
        <text
          x="0"
          y="-16"
          textAnchor="middle"
          fontSize="7"
          fontWeight="700"
          fill="#3b2410"
        >
          N
        </text>
      </g>

      {/* Title banner */}
      <g transform="translate(160 26)">
        <rect x="-58" y="-9" width="116" height="18" rx="4" fill="#fff5dc" stroke="#8a6228" strokeWidth="1.2" />
        <text
          x="0"
          y="3"
          textAnchor="middle"
          fontSize="9"
          fontWeight="900"
          letterSpacing="3"
          fill="#7a4d28"
        >
          FETCH ATLAS
        </text>
      </g>
    </svg>
  )
}

function SparkleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2zm6 11l1 2.7L21.7 17l-2.7 1L18 21l-1-3-2.7-1 2.7-1L18 13z" />
    </svg>
  )
}
