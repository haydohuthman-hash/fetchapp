import type { ReactNode } from 'react'

const SHADOW = <ellipse cx="24" cy="41.5" rx="12.5" ry="2.8" fill="#0F172A" opacity="0.12" />

function wrap(children: ReactNode, className = '') {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      {SHADOW}
      {children}
    </svg>
  )
}

/** Inline art for Discover “Shop by category” tiles (matches promo-row icon posture). */
export function DiscoverShopCategoryIcon({ id, className }: { id: string; className?: string }) {
  switch (id) {
    case 'events':
      return wrap(
        <>
          <rect x="13" y="10" width="22" height="28" rx="3" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1.2" />
          <path d="M17 17h14M17 21h11" stroke="#7C3AED" strokeWidth="1.4" strokeLinecap="round" />
          <path
            d="M31 29l-3 3-2-2-3 4"
            stroke="#6D28D9"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="19" cy="13" r="2" fill="#FBBF24" />
          <circle cx="29" cy="13" r="2" fill="#F97316" />
        </>,
        className,
      )
    case 'mens-fashion':
      return wrap(
        <>
          <path
            d="M22 11h4l5 8-2 1v21H19V20l-2-1 5-8z"
            fill="#CBD5F5"
            stroke="#6366F1"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path d="M24 13v10" stroke="#4F46E5" strokeWidth="1.2" strokeLinecap="round" />
          <rect x="20" y="22" width="8" height="14" rx="1.5" fill="#818CF8" opacity="0.35" />
        </>,
        className,
      )
    case 'trading-card-games':
      return wrap(
        <>
          <rect x="11" y="14" width="18" height="24" rx="2.5" fill="#FECDD3" transform="rotate(-8 20 26)" />
          <rect x="17" y="12" width="18" height="24" rx="2.5" fill="#EFF6FF" stroke="#60A5FA" strokeWidth="1.15" />
          <circle cx="26" cy="22" r="5" fill="#BFDBFE" />
          <path d="M24 21l2 1.8 4-5" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </>,
        className,
      )
    case 'jewellery-watches':
      return wrap(
        <>
          <ellipse cx="18" cy="24" rx="7" ry="9" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.2" />
          <ellipse cx="18.5" cy="24" rx="3.5" ry="4.5" fill="#FDE68A" />
          <rect x="31" y="17" width="10" height="14" rx="2.5" fill="#334155" />
          <rect x="33" y="19" width="6" height="10" rx="1" fill="#0EA5E9" />
          <path d="M36 31v6M33 37h6" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
        </>,
        className,
      )
    case 'sneakers-shoes':
      return wrap(
        <>
          <path
            d="M13 31c6-8 18-13 26-11l3 8c-7 5-21 9-29 9l-1-4"
            fill="#FACC15"
            stroke="#CA8A04"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path d="M15 31h26" stroke="#A16207" strokeWidth="1.4" strokeLinecap="round" />
          <ellipse cx="34" cy="29" rx="4" ry="2.2" fill="#FEF08A" />
        </>,
        className,
      )
    case 'electronics':
      return wrap(
        <>
          <rect x="10" y="12" width="28" height="20" rx="3" fill="#1E293B" />
          <rect x="13" y="15" width="22" height="14" rx="1.8" fill="#38BDF8" />
          <rect x="19" y="34" width="10" height="3" rx="1" fill="#64748B" />
          <path d="M18 42h12" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
        </>,
        className,
      )
    case 'womens-fashion':
      return wrap(
        <>
          <path
            d="M22 11c1.8 0 3.6.4 5 1.4l7 21H16l7-21c1.4-1 3.2-1.4 5-1.4z"
            fill="#FBCFE8"
            stroke="#DB2777"
            strokeWidth="1.15"
            strokeLinejoin="round"
          />
          <path d="M24 11v26" stroke="#BE185D" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
        </>,
        className,
      )
    case 'baby-kids':
      return wrap(
        <>
          <circle cx="24" cy="18" r="8" fill="#FEF9C3" stroke="#EAB308" strokeWidth="1.2" />
          <ellipse cx="24" cy="34" rx="11" ry="9" fill="#BFDBFE" stroke="#0284C7" strokeWidth="1.15" />
          <circle cx="20" cy="16" r="1.2" fill="#1F2937" />
          <circle cx="28" cy="16" r="1.2" fill="#1F2937" />
          <path d="M21 21c2 1 4 1 6 0" stroke="#92400E" strokeWidth="1.1" strokeLinecap="round" />
        </>,
        className,
      )
    case 'rocks-crystals':
      return wrap(
        <>
          <path d="M14 38L24 8l14 30H14z" fill="#DDD6FE" stroke="#7C3AED" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M19 38l8-23 8 23" stroke="#A78BFA" strokeWidth="1" opacity="0.75" />
          <path d="M24 23l6 15M18 38l11-26" stroke="#C4B5FD" strokeWidth="0.9" />
        </>,
        className,
      )
    case 'toys-hobbies':
      return wrap(
        <>
          <rect x="10" y="18" width="14" height="14" rx="2" fill="#FECACA" stroke="#DC2626" strokeWidth="1.1" />
          <rect x="14" y="14" width="14" height="14" rx="2" fill="#BBF7D0" stroke="#16A34A" strokeWidth="1.1" />
          <rect x="23" y="23" width="14" height="14" rx="2" fill="#FDE047" stroke="#CA8A04" strokeWidth="1.1" />
        </>,
        className,
      )
    case 'coins-money':
      return wrap(
        <>
          <ellipse cx="24" cy="38" rx="13" ry="3.8" fill="#92400E" opacity="0.2" />
          <circle cx="30" cy="27" r="9.8" fill="#FACC15" stroke="#B45309" strokeWidth="1.25" opacity="0.92" />
          <circle cx="18" cy="21" r="9.8" fill="#FDE047" stroke="#B45309" strokeWidth="1.35" />
          <circle cx="18" cy="21" r="6" fill="#FEF08A" />
          <circle cx="30" cy="27" r="6" fill="#EAB308" />
        </>,
        className,
      )
    case 'sports-cards':
      return wrap(
        <>
          <rect x="13" y="11" width="22" height="28" rx="2.8" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.15" />
          <rect x="17" y="15" width="14" height="18" rx="1.8" fill="#FFFFFF" stroke="#0369A1" strokeWidth="0.95" />
          <rect x="19" y="31" width="10" height="3" rx="0.8" fill="#0EA5E9" opacity="0.85" />
          <circle cx="24" cy="23" r="4.5" fill="#BAE6FD" />
          <path d="M21.8 21.5l1.9 6.2 6.3-4.9" stroke="#0369A1" strokeWidth="1.05" strokeLinecap="round" strokeLinejoin="round" />
        </>,
        className,
      )
    default:
      return wrap(
        <>
          <circle cx="24" cy="21" r="10" fill="#E9D5FF" stroke="#9333EA" strokeWidth="1.2" />
          <path
            d="M18 21l4 4 9-11"
            stroke="#6B21A8"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>,
        className,
      )
  }
}
