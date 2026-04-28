/**
 * Browse — category grid using real photo art. Selecting a tile navigates to
 * CategoryDetailView with auctions for that category.
 */

import { useMemo, useState } from 'react'
import { AppHeader, CategoryCard } from '../../components/bidwars'
import { useCategories } from '../../lib/data'
import type { Category } from '../../lib/data'

type Props = {
  onBack: () => void
  onOpenCategory: (category: Category) => void
}

export default function BrowseView({ onBack, onOpenCategory }: Props) {
  const categories = useCategories()
  const [query, setQuery] = useState('')
  const filtered = useMemo(
    () =>
      query.trim()
        ? categories.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()))
        : categories,
    [categories, query],
  )
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[min(100%,430px)] flex-col bg-[#f8f6fd]">
      <AppHeader title="Browse" subtitle="Categories on Fetchit Bid Wars" showBack onBack={onBack} />
      <main className="flex flex-1 flex-col gap-3 px-3 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-3">
        <label className="flex h-12 w-full items-center gap-2 rounded-2xl bg-white px-3 ring-1 ring-zinc-200 shadow-sm focus-within:ring-2 focus-within:ring-[#c4b5fd]">
          <svg className="h-5 w-5 shrink-0 text-zinc-400" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM16.5 16.5L21 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-zinc-900 outline-none placeholder:text-zinc-400"
            aria-label="Search categories"
          />
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {filtered.map((c) => (
            <CategoryCard key={c.id} category={c} onPress={onOpenCategory} />
          ))}
        </div>
      </main>
    </div>
  )
}
