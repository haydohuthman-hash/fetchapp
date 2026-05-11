import { useId } from 'react'

export type FetchitCartAppIconProps = {
  className?: string
  /** Badge number only (no captions). */
  badgeCount?: number
  showBadge?: boolean
  /** Set when this icon is the accessible name; otherwise use `aria-hidden` on a parent. */
  'aria-label'?: string
}

/**
 * Fetchit cart glyph for mobile: rounded outline (iOS-like stroke), subtle shadow, optional purple badge.
 * Transparent background — designed for white / light surfaces.
 */
export function FetchitCartAppIcon({
  className,
  badgeCount = 2,
  showBadge = true,
  'aria-label': ariaLabel,
}: FetchitCartAppIconProps) {
  const uid = useId().replace(/\W/g, '') || 'fc'
  const shadowId = `fetchit-cart-sh-${uid}`

  const label =
    badgeCount > 99 ? '99+' : String(Math.max(0, Math.floor(Number.isFinite(badgeCount) ? badgeCount : 0)))

  const brandPurple = '#291050'
  const strokeSoft = 'rgba(28,28,30,0.44)'
  const sw = 1.52

  const a11y =
    ariaLabel != null && ariaLabel !== ''
      ? ({ 'aria-label': ariaLabel, role: 'img' as const } as const)
      : ({ 'aria-hidden': true as const } as const)

  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...a11y}
    >
      <defs>
        <filter
          id={shadowId}
          x="-55%"
          y="-55%"
          width="210%"
          height="210%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow dx="0" dy="1.35" stdDeviation="1.45" floodColor="#101014" floodOpacity="0.1" />
          <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#291050" floodOpacity="0.045" />
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`} strokeLinecap="round" strokeLinejoin="round">
        <rect
          x={9.88}
          y={14.38}
          width={14.24}
          height={13.68}
          rx={4.22}
          ry={4.22}
          stroke={strokeSoft}
          strokeWidth={sw}
        />
        <path
          d="M13.25 14.38v-1.18a3.82 3.82 0 017.5 0v1.18"
          stroke={strokeSoft}
          strokeWidth={sw}
          fill="none"
        />
        <circle cx={13.55} cy={27.12} r={2.04} stroke={strokeSoft} strokeWidth={sw} fill="none" />
        <circle cx={21.42} cy={27.12} r={2.04} stroke={strokeSoft} strokeWidth={sw} fill="none" />
      </g>

      {showBadge ? (
        <g>
          <circle
            cx={25.65}
            cy={9.88}
            r={5.88}
            fill={brandPurple}
            stroke="rgba(255,255,255,0.94)"
            strokeWidth={1.32}
          />
          <circle cx={24.65} cy={8.88} r={2.35} fill="rgba(255,255,255,0.26)" />
          <text
            x={25.65}
            y={9.96}
            fill="#FFFFFF"
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontSize: label.length > 1 ? 8.8 : 9.65,
              fontWeight: 700,
              letterSpacing: label.length > 2 ? '-0.03em' : '0',
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif',
            }}
          >
            {label}
          </text>
        </g>
      ) : null}
    </svg>
  )
}
