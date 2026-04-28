/**
 * Icons for home shell nav (bottom bar + peek chrome) and sheet menus.
 *
 * Bottom-bar nav uses a "half-filled" treatment: the outline is always drawn
 * and the lower half of the glyph is filled, so the icon reads at-a-glance
 * even at 22-28px. Active state thickens the outline; both states inherit
 * `currentColor` from the dock so they never look faded.
 */

import { useId } from 'react'

type IconProps = {
  className?: string
  /** Tighter hit areas (nav map chrome): slightly smaller artwork via viewBox crop. */
  tight?: boolean
  /** True when the tab is currently active (filled glyph). False renders the outline pair. */
  active?: boolean
}

/** Outline weight tuned for ~20–26px render (reads crisp on mobile). */
const navStroke = 1.75
/** Sheet rows: lighter + rounder (minimal). */
const menuStroke = 1.5
/** Bottom-bar outline weights — slightly thicker when the tab is active. */
const NAV_OUTLINE_STROKE = 1.85
const NAV_OUTLINE_STROKE_ACTIVE = 2.25

/**
 * Two rounded pill eyes — Fetch orb language. Bottom half is filled, outline
 * always visible. Pupils sit on the unfilled half so they read as bright dots.
 */
export function FetchEyesHomeIcon({ className, tight, active = true }: IconProps) {
  const vb = tight ? '1 5 22 15' : '0 0 24 24'
  const stroke = active ? NAV_OUTLINE_STROKE_ACTIVE : NAV_OUTLINE_STROKE
  const clipId = `fetch-eyes-half-${useId()}`
  return (
    <svg className={className} viewBox={vb} fill="none" aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="12" width="24" height="12" />
        </clipPath>
      </defs>
      {/* Left eye — bottom half fill */}
      <rect
        x="2.5"
        y="8"
        width="8"
        height="8"
        rx="4"
        fill="currentColor"
        clipPath={`url(#${clipId})`}
      />
      <rect
        x="2.5"
        y="8"
        width="8"
        height="8"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      {/* Right eye — bottom half fill */}
      <rect
        x="13.5"
        y="8"
        width="8"
        height="8"
        rx="4"
        fill="currentColor"
        clipPath={`url(#${clipId})`}
      />
      <rect
        x="13.5"
        y="8"
        width="8"
        height="8"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      {/* Pupils sit just above the half-fill line */}
      <circle cx="6.5" cy="10.85" r="1.25" fill="currentColor" />
      <circle cx="17.5" cy="10.85" r="1.25" fill="currentColor" />
    </svg>
  )
}

/**
 * Magnifying glass — bottom half of the lens is filled, outline + handle always
 * stroked.
 */
export function FetchSearchNavIcon({ className, active = true }: IconProps) {
  const stroke = active ? NAV_OUTLINE_STROKE_ACTIVE : NAV_OUTLINE_STROKE
  const clipId = `fetch-search-half-${useId()}`
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="11" width="24" height="13" />
        </clipPath>
      </defs>
      <circle
        cx="10.75"
        cy="10.75"
        r="6.5"
        fill="currentColor"
        clipPath={`url(#${clipId})`}
      />
      <circle
        cx="10.75"
        cy="10.75"
        r="6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      <path
        d="M15.5 15.5 20.5 20.5"
        stroke="currentColor"
        strokeWidth={stroke + 0.55}
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Chat bubble — outline + bottom-half fill. Three dots cluster on the unfilled
 * upper half so they always read crisply.
 */
export function FetchActivityNavIcon({ className, active = true }: IconProps) {
  const stroke = active ? NAV_OUTLINE_STROKE_ACTIVE : NAV_OUTLINE_STROKE
  const clipId = `fetch-activity-half-${useId()}`
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="11.5" width="24" height="12.5" />
        </clipPath>
      </defs>
      <path
        d="M5.5 5.5h13c1.1 0 2 .9 2 2v6.4c0 1.1-.9 2-2 2h-4.4l-3.4 2.7v-2.7H5.5c-1.1 0-2-.9-2-2V7.5c0-1.1.9-2 2-2Z"
        fill="currentColor"
        clipPath={`url(#${clipId})`}
      />
      <path
        d="M5.5 5.5h13c1.1 0 2 .9 2 2v6.4c0 1.1-.9 2-2 2h-4.4l-3.4 2.7v-2.7H5.5c-1.1 0-2-.9-2-2V7.5c0-1.1.9-2 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="9.6" r="1.1" fill="currentColor" />
      <circle cx="12" cy="9.6" r="1.1" fill="currentColor" />
      <circle cx="15.5" cy="9.6" r="1.1" fill="currentColor" />
    </svg>
  )
}

/**
 * Profile head + shoulders — outline always, lower half filled (so the
 * shoulders read as a solid silhouette and the head is half-filled).
 */
export function FetchProfileNavIcon({ className, active = true }: IconProps) {
  const stroke = active ? NAV_OUTLINE_STROKE_ACTIVE : NAV_OUTLINE_STROKE
  const clipId = `fetch-profile-half-${useId()}`
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="12" width="24" height="12" />
        </clipPath>
      </defs>
      <circle
        cx="12"
        cy="8.6"
        r="3.7"
        fill="currentColor"
        clipPath={`url(#${clipId})`}
      />
      <circle
        cx="12"
        cy="8.6"
        r="3.7"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      <path
        d="M5.2 19.85v-0.4c0-3.1 2.65-5.6 6.1-5.6h1.4c3.45 0 6.1 2.5 6.1 5.6v0.4"
        fill="currentColor"
        clipPath={`url(#${clipId})`}
      />
      <path
        d="M5.2 19.85v-0.4c0-3.1 2.65-5.6 6.1-5.6h1.4c3.45 0 6.1 2.5 6.1 5.6v0.4"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Same face as {@link FetchEyesHomeIcon}, with looping slow blinks and drifting pupils in
 * `index.css` (`.fetch-marketplace-eyes-intro__*`).
 */
export function FetchEyesMarketplaceIntroIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <g className="fetch-marketplace-eyes-intro__blink">
        <rect x="2" y="7.5" width="9" height="9" rx="4.5" fill="currentColor" />
        <rect x="13" y="7.5" width="9" height="9" rx="4.5" fill="currentColor" />
        <g className="fetch-marketplace-eyes-intro__pupils">
          <circle cx="6.5" cy="12" r="1.5" fill="currentColor" fillOpacity="0.52" />
          <circle cx="17.5" cy="12" r="1.5" fill="currentColor" fillOpacity="0.52" />
        </g>
      </g>
    </svg>
  )
}

/** Map pin — teardrop + inner dot. */
export function MapsNavIconFilled({ className, tight }: IconProps) {
  return (
    <svg
      className={className}
      viewBox={tight ? '3 2 18 21' : '0 0 24 24'}
      fill="none"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 21.35s-5.85-5.2-5.85-10.65A5.85 5.85 0 1117.85 10.7c0 5.45-5.85 10.65-5.85 10.65z"
      />
      <circle cx="12" cy="10.35" r="2.2" fill="currentColor" fillOpacity="0.48" />
    </svg>
  )
}

/** Upward navigation arrow — maps / directions. */
export function NavShellArrowIcon({ className, tight }: IconProps) {
  return (
    <svg
      className={className}
      viewBox={tight ? '3.5 2.5 17 19' : '0 0 24 24'}
      fill="none"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 3.75L20.5 18h-6.25v6.25h-4.5V18H3.5L12 3.75z"
      />
    </svg>
  )
}

/** Peer buy ↔ sell — horizontal swap arrows (reads clearly at small sizes). */
export function BuySellNavIconFilled({ className, active = true }: IconProps) {
  if (!active) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          fill="currentColor"
          fillOpacity="0.52"
          d="M6.65 7.5L9.35 5.25V6.45H16.9v2.1H9.35V9.75L6.65 7.5z"
        />
        <path
          fill="currentColor"
          fillOpacity="0.42"
          d="M17.35 16.5L14.65 14.85V15.55H7.1v1.9h7.55v0.7L17.35 16.5z"
        />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M6.65 7.5L9.35 5.25V6.45H16.9v2.1H9.35V9.75L6.65 7.5z"
      />
      <path
        fill="currentColor"
        fillOpacity="0.68"
        d="M17.35 16.5L14.65 14.85V15.55H7.1v1.9h7.55v0.7L17.35 16.5z"
      />
    </svg>
  )
}

/** Shop tab — lightning bolt (inherits `color` from bottom nav: muted vs emerald active). */
export function BoltNavIcon({ className, active = true }: IconProps) {
  if (!active) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path fill="currentColor" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path fill="currentColor" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  )
}

/** Drops tab — flame silhouette (asymmetric flicker shape; reads at ~20px). */
export function DropsFlameNavIcon({ className, active = true }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="currentColor"
        fillOpacity={active ? 1 : 0.48}
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
      />
    </svg>
  )
}

/** Marketplace — dollar mark. */
export function MarketplaceNavIconFilled({ className, active = true }: IconProps) {
  const textProps = active
    ? { fill: 'currentColor' as const, fillOpacity: 1 }
    : { fill: 'currentColor' as const, fillOpacity: 0.82 }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <text
        x="12"
        y="12"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize="17"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        {...textProps}
      >
        $
      </text>
    </svg>
  )
}

/** Drops tab — circle (inactive ring + light fill; active solid). */
export function ReelsNavIconFilled({ className, active = true }: IconProps) {
  if (!active) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8.35" fill="currentColor" fillOpacity="0.48" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.35" fill="currentColor" />
      <rect x="11" y="7.5" width="2" height="9" rx="1" fill="#ffffff" />
      <rect x="7.5" y="11" width="9" height="2" rx="1" fill="#ffffff" />
    </svg>
  )
}

/** Notifications — bell (aligned with top bubble bar bell geometry). */
export function NotificationsNavIconFilled({ className, active = true }: IconProps) {
  if (!active) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path fill="currentColor" d="M12 3a5 5 0 00-5 5v3.5L5 18h14l-2-6.5V8a5 5 0 00-5-5z" />
        <path
          d="M10 18a2 2 0 004 0"
          fill="none"
          stroke="currentColor"
          strokeWidth={navStroke}
          strokeLinecap="round"
        />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M12 3a5 5 0 00-5 5v3.5L5 18h14l-2-6.5V8a5 5 0 00-5-5z"
      />
    </svg>
  )
}

/** Account — head + shoulders arc. */
export function AccountNavIconFilled({ className, active = true }: IconProps) {
  if (!active) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="9" r="3.85" fill="currentColor" />
        <path
          fill="currentColor"
          d="M5.15 20.35v-0.45c0-3.2 2.65-5.85 6.1-6.1h3.5c3.45 0.25 6.1 2.9 6.1 6.1v0.45c0 0.5-0.4 0.9-0.9 0.9H6.05a0.9 0.9 0 01-0.9-0.9z"
        />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="9" r="3.85" fill="currentColor" />
      <path
        fill="currentColor"
        d="M5.15 20.35v-0.45c0-3.2 2.65-5.85 6.1-6.1h3.5c3.45 0.25 6.1 2.9 6.1 6.1v0.45c0 0.5-0.4 0.9-0.9 0.9H6.05a0.9 0.9 0 01-0.9-0.9z"
      />
    </svg>
  )
}

/**
 * Header / sheet menu — three soft pills (full rounding).
 */
export function ShellMenuIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5.5" width="16" height="3" rx="1.5" fill="currentColor" />
      <rect x="4" y="10.5" width="16" height="3" rx="1.5" fill="currentColor" />
      <rect x="4" y="15.5" width="16" height="3" rx="1.5" fill="currentColor" />
    </svg>
  )
}

/** Refresh / sync — two soft arcs (minimal loop). */
export function ShellMenuRefreshIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17.5 8.25A7 7 0 0 0 6 14.25M6.5 15.75A7 7 0 0 1 17.5 9.75"
        stroke="currentColor"
        strokeWidth={menuStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.25 6.5v3.25h-3"
        stroke="currentColor"
        strokeWidth={menuStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.75 17.5v-3.25h3"
        stroke="currentColor"
        strokeWidth={menuStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** New listing — squircle + simple plus. */
export function ShellMenuCreateIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4.75"
        y="4.75"
        width="14.5"
        height="14.5"
        rx="4.75"
        stroke="currentColor"
        strokeWidth={menuStroke}
      />
      <path
        d="M12 8.5v7M8.5 12h7"
        stroke="currentColor"
        strokeWidth={menuStroke}
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Your listings — three rounded rows (no bullets). */
export function ShellMenuListingsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="6" width="14" height="3.25" rx="1.625" fill="currentColor" fillOpacity="0.92" />
      <rect x="5" y="10.875" width="14" height="3.25" rx="1.625" fill="currentColor" fillOpacity="0.55" />
      <rect x="5" y="15.75" width="10" height="3.25" rx="1.625" fill="currentColor" fillOpacity="0.35" />
    </svg>
  )
}

/** Payout — super-rounded card + one band. */
export function ShellMenuPayoutIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="6.75"
        width="17"
        height="10.5"
        rx="3.5"
        stroke="currentColor"
        strokeWidth={menuStroke}
      />
      <rect x="3.5" y="9.75" width="17" height="2.25" rx="1.125" fill="currentColor" fillOpacity="0.22" />
      <circle cx="8.25" cy="15.35" r="1.35" fill="currentColor" fillOpacity="0.35" />
    </svg>
  )
}

/** Earnings — three soft vertical pills. */
export function ShellMenuEarningsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5.25" y="12" width="3.5" height="6.5" rx="1.75" fill="currentColor" fillOpacity="0.38" />
      <rect x="10.25" y="9" width="3.5" height="9.5" rx="1.75" fill="currentColor" fillOpacity="0.58" />
      <rect x="15.25" y="6.5" width="3.5" height="12" rx="1.75" fill="currentColor" fillOpacity="0.85" />
    </svg>
  )
}

/** Close — short X with round caps. */
export function ShellMenuCloseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8.75 8.75l6.5 6.5M15.25 8.75l-6.5 6.5"
        stroke="currentColor"
        strokeWidth={menuStroke}
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Listing tile — white circle + dark plus (quick buy / checkout). */
export function ListingQuickAddPlusCircleIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#ffffff" />
      <path d="M12 7.35v9.3M7.35 12h9.3" stroke="#18181b" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  )
}
