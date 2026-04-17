import type { ReactNode } from 'react'
import type { MarketplacePeerBrowseFilter } from './ExploreBrowseBanner'
import type { ExploreCategoryRowPromoDef } from '../lib/exploreCategoryRowPromos'

export type { ExploreCategoryRowPromoDef } from '../lib/exploreCategoryRowPromos'

type RowProps = {
  def: ExploreCategoryRowPromoDef
  onOpen: (handoff: MarketplacePeerBrowseFilter) => void
}

function ExploreCategoryPromoIcon({ id, className = '' }: { id: ExploreCategoryRowPromoDef['id']; className?: string }) {
  const svg = (children: ReactNode) => (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <ellipse cx="24" cy="41.5" rx="12.5" ry="2.8" fill="#0F172A" opacity="0.12" />
      {children}
    </svg>
  )
  switch (id) {
    case 'explore-all':
      return svg(
        <>
          <rect x="7" y="7" width="14" height="14" rx="3" fill="#60A5FA" />
          <rect x="7" y="7" width="14" height="4" rx="2" fill="#DBEAFE" opacity="0.9" />
          <rect x="27" y="7" width="14" height="14" rx="3" fill="#00ff6a" />
          <rect x="27" y="7" width="14" height="4" rx="2" fill="#D1FAE5" opacity="0.9" />
          <rect x="7" y="27" width="14" height="14" rx="3" fill="#FBBF24" />
          <rect x="7" y="27" width="14" height="4" rx="2" fill="#FEF3C7" opacity="0.95" />
          <rect x="27" y="27" width="14" height="14" rx="3" fill="#F87171" />
          <rect x="27" y="27" width="14" height="4" rx="2" fill="#FEE2E2" opacity="0.9" />
        </>,
      )
    case 'sofa':
      return svg(
        <>
          <rect x="9" y="21" width="30" height="14" rx="5" fill="#B45309" />
          <rect x="12" y="15" width="24" height="10" rx="4" fill="#FCD34D" />
          <rect x="13" y="17" width="22" height="3" rx="1.5" fill="#FEF3C7" opacity="0.9" />
          <rect x="10" y="30" width="28" height="4" rx="2" fill="#92400E" opacity="0.6" />
          <rect x="9" y="34" width="30" height="3" rx="1.5" fill="#78350F" />
        </>,
      )
    case 'fridge':
      return svg(
        <>
          <rect x="14" y="6" width="20" height="36" rx="4" fill="#94A3B8" />
          <rect x="16" y="9" width="16" height="13" rx="2" fill="#E2E8F0" />
          <rect x="16" y="24" width="16" height="15" rx="2" fill="#F8FAFC" />
          <rect x="15" y="8" width="4" height="32" rx="2" fill="#FFFFFF" opacity="0.52" />
          <rect x="29" y="15" width="2" height="4" rx="1" fill="#64748B" />
          <rect x="29" y="28" width="2" height="5" rx="1" fill="#64748B" />
        </>,
      )
    case 'washer':
      return svg(
        <>
          <rect x="10" y="8" width="28" height="32" rx="5" fill="#64748B" />
          <rect x="10" y="8" width="28" height="7" rx="5" fill="#CBD5E1" />
          <circle cx="24" cy="25" r="10" fill="#E2E8F0" />
          <circle cx="24" cy="25" r="6.4" fill="#60A5FA" />
          <circle cx="22.3" cy="22.8" r="2.8" fill="#BFDBFE" opacity="0.8" />
          <circle cx="16" cy="14" r="1.5" fill="#F8FAFC" />
          <circle cx="21" cy="14" r="1.5" fill="#F8FAFC" />
        </>,
      )
    case 'bedframe':
      return svg(
        <>
          <rect x="8" y="23" width="32" height="13" rx="3" fill="#7C3AED" />
          <rect x="10" y="18" width="28" height="8" rx="3" fill="#C4B5FD" />
          <rect x="10" y="18" width="28" height="2.8" rx="1.4" fill="#EDE9FE" />
          <rect x="11" y="16" width="7" height="5" rx="2" fill="#F5F3FF" />
          <rect x="30" y="16" width="7" height="5" rx="2" fill="#F5F3FF" />
          <rect x="9" y="31" width="30" height="3" rx="1.5" fill="#4C1D95" opacity="0.45" />
        </>,
      )
    case 'mattress':
      return svg(
        <>
          <rect x="8" y="16" width="32" height="17" rx="4" fill="#FB7185" />
          <rect x="9" y="17" width="30" height="3.5" rx="1.75" fill="#FFE4E6" opacity="0.95" />
          <path d="M10 19h28M10 23h28M10 27h28" stroke="#DC2626" strokeWidth="1.2" strokeLinecap="round" />
          <rect x="8" y="33" width="32" height="4" rx="2" fill="#7C2D12" />
        </>,
      )
    case 'dining':
      return svg(
        <>
          <ellipse cx="24" cy="17" rx="13" ry="5.5" fill="#B45309" />
          <ellipse cx="24" cy="15.8" rx="11.5" ry="3.5" fill="#FDE68A" opacity="0.7" />
          <rect x="22.5" y="22" width="3" height="13" rx="1.5" fill="#92400E" />
          <rect x="11" y="30" width="4" height="10" rx="2" fill="#B45309" />
          <rect x="33" y="30" width="4" height="10" rx="2" fill="#B45309" />
        </>,
      )
    case 'tech':
      return svg(
        <>
          <rect x="9" y="11" width="30" height="20" rx="3" fill="#1E40AF" />
          <rect x="12" y="14" width="24" height="14" rx="2" fill="#38BDF8" />
          <rect x="13" y="15" width="22" height="3.5" rx="1.75" fill="#BAE6FD" opacity="0.85" />
          <path d="M7 34h34l-3-4H10l-3 4z" fill="#334155" />
        </>,
      )
    case 'sports':
      return svg(
        <>
          <circle cx="24" cy="24" r="13" fill="#EA580C" />
          <circle cx="20.5" cy="20.5" r="4.5" fill="#FDBA74" opacity="0.72" />
          <path d="M11 24h26M24 11v26" stroke="#7C2D12" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M14 16c3 3 5 13 10 16M34 16c-3 3-5 13-10 16" stroke="#7C2D12" strokeWidth="1.2" strokeLinecap="round" />
        </>,
      )
    case 'outdoor':
      return svg(
        <>
          <path d="M24 8c6 3 8 10 0 18-8-8-6-15 0-18z" fill="#00ff6a" />
          <path d="M24 15c5 2 7 7 0 13-7-6-5-11 0-13z" fill="#4ADE80" />
          <path d="M22 16c2-1 4-1 6 1" stroke="#BBF7D0" strokeWidth="1.4" strokeLinecap="round" />
          <rect x="22.5" y="28" width="3" height="10" rx="1.5" fill="#92400E" />
          <rect x="16" y="36" width="16" height="5" rx="2.5" fill="#A16207" />
        </>,
      )
    case 'fashion':
      return svg(
        <>
          <path d="M17 10h14l6 8-4 4v16H15V22l-4-4 6-8z" fill="#DB2777" />
          <path d="M18 12h12l4 6-3 3v15H17V21l-3-3 4-6z" fill="#F472B6" opacity="0.6" />
          <path d="M20 13h8" stroke="#9D174D" strokeWidth="1.4" strokeLinecap="round" />
        </>,
      )
    case 'freebies':
      return svg(
        <>
          <rect x="12" y="18" width="24" height="18" rx="3" fill="#DC2626" />
          <rect x="12" y="18" width="24" height="4" rx="2" fill="#FCA5A5" opacity="0.9" />
          <rect x="22" y="18" width="4" height="18" fill="#FDE68A" />
          <rect x="12" y="24" width="24" height="3" fill="#FDE68A" />
          <path d="M24 18v-6c-2.6 0-4.4 1.2-4.4 3.7S21.4 19 24 19s4.4-1.3 4.4-3.3S26.6 12 24 12z" fill="#F59E0B" />
        </>,
      )
    default:
      return svg(<circle cx="24" cy="24" r="11" fill="#94A3B8" />)
  }
}

function ExploreCategoryRowPromoRow({ def, onOpen }: RowProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(def.handoff)}
      className="fetch-explore-category-promos__row group flex min-w-0 flex-col items-center gap-1 rounded-xl bg-white px-1 py-1 text-center transition-transform active:scale-[0.98]"
      aria-label={def.ariaLabel}
    >
      <div className="fetch-explore-category-promos__thumb relative isolate h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-50">
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 p-0.5">
          <ExploreCategoryPromoIcon id={def.id} className="h-full w-full" />
        </div>
      </div>
      <p className="line-clamp-2 min-h-[2rem] w-full text-center text-[10px] font-semibold leading-snug tracking-tight text-zinc-900">
        {def.title}
      </p>
    </button>
  )
}

export type ExploreCategoryRowPromoSectionProps = {
  items: ExploreCategoryRowPromoDef[]
  onOpen: (handoff: MarketplacePeerBrowseFilter) => void
  className?: string
}

/** One card: category rows separated by hairline dividers. */
export function ExploreCategoryRowPromoSection({ items, onOpen, className = '' }: ExploreCategoryRowPromoSectionProps) {
  return (
    <section
      className={['min-w-0', className].filter(Boolean).join(' ')}
      aria-labelledby="fetch-explore-category-promos-heading"
    >
      <h2 id="fetch-explore-category-promos-heading" className="sr-only">
        Shop by category
      </h2>
      <div className="fetch-explore-category-promos__card overflow-hidden rounded-2xl bg-white px-1 py-1.5">
        <div className="fetch-explore-category-promos__rows grid auto-cols-[4.8rem] grid-flow-col grid-rows-2 gap-x-0.5 gap-y-0.5 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
          {items.map((def) => (
            <ExploreCategoryRowPromoRow key={def.id} def={def} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </section>
  )
}

