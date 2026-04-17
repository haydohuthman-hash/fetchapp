import { useId } from 'react'

/**
 * Vector splash mark: overlapping eyes, black rims, warm ember under pupils, lightning bolt.
 * Motion is driven by CSS on `fetch-splash-brand-*` classes (see `index.css`).
 */
export function FetchSplashBrandMark({
  className = '',
  variant = 'full',
}: {
  className?: string
  /** `eyesOnly` hides bolt/shards for focused eye moments (e.g. Live Auctions splash). */
  variant?: 'full' | 'eyesOnly'
}) {
  const id = useId().replace(/:/g, '')
  const boltGrad = `splash-bolt-${id}`
  const emberGrad = `splash-ember-${id}`

  return (
    <svg
      className={['fetch-splash-brand-svg', className].filter(Boolean).join(' ')}
      viewBox="0 0 280 168"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={boltGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF9C3" />
          <stop offset="38%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>
        <linearGradient id={emberGrad} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFB74D" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
      </defs>

      {/* Left eye: wiggle outer; blink sclera + pupil together */}
      <g className="fetch-splash-brand-eye-l">
        <g className="fetch-splash-brand-blink-l">
          <circle cx="88" cy="86" r="36" fill="#ffffff" stroke="#0a0a0a" strokeWidth={3.5} />
          <g className="fetch-splash-brand-pupil-l">
            <circle cx="80" cy="90" r="17" fill="#0a0a0a" />
            <ellipse
              className="fetch-splash-brand-ember"
              cx="80"
              cy="100"
              rx="11"
              ry="5.5"
              fill={`url(#${emberGrad})`}
              opacity={0.95}
            />
            <circle cx="72" cy="82" r="4.5" fill="#ffffff" />
            <circle cx="73" cy="83" r="1.6" fill="rgba(255,255,255,0.5)" />
          </g>
        </g>
      </g>

      {/* Right eye */}
      <g className="fetch-splash-brand-eye-r">
        <g className="fetch-splash-brand-blink-r">
          <circle cx="168" cy="84" r="38" fill="#ffffff" stroke="#0a0a0a" strokeWidth={3.5} />
          <g className="fetch-splash-brand-pupil-r">
            <circle cx="160" cy="88" r="18" fill="#0a0a0a" />
            <ellipse
              className="fetch-splash-brand-ember"
              cx="160"
              cy="99"
              rx="12"
              ry="6"
              fill={`url(#${emberGrad})`}
              opacity={0.95}
            />
            <circle cx="151" cy="80" r="4.8" fill="#ffffff" />
            <circle cx="152" cy="81" r="1.7" fill="rgba(255,255,255,0.5)" />
          </g>
        </g>
      </g>

      {variant === 'full' ? (
        <g transform="translate(178 6) scale(2.15)">
          <g className="fetch-splash-brand-bolt-core">
            <path
              d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              fill={`url(#${boltGrad})`}
              stroke="#A16207"
              strokeWidth={1.15}
              strokeLinejoin="round"
            />
            <path
              className="fetch-splash-brand-shard-a"
              d="M22 4.5l2.2 5.1-1.4-.4 1.8 4.1-2.6-3.4z"
              fill="#EAB308"
              stroke="#A16207"
              strokeWidth={0.55}
            />
            <path
              className="fetch-splash-brand-shard-b"
              d="M25.5 12l3 2.8-2.1.3 2.4 2.2-3.3-1.8z"
              fill="#FEF08A"
              stroke="#A16207"
              strokeWidth={0.45}
              opacity={0.95}
            />
          </g>
        </g>
      ) : null}
    </svg>
  )
}
