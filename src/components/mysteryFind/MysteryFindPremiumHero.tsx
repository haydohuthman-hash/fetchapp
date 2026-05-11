import { memo, useMemo } from 'react'
import { MYSTERY_CATEGORY_LABEL } from '../../lib/mysteryFind/constants'
import { MYSTERY_MOCK_INVENTORY } from '../../lib/mysteryFind/mockInventory'

/** Horizontally scrolling premium product cards — emotional anchor for Mystery Find. */
export const MysteryFindPremiumHero = memo(function MysteryFindPremiumHero() {
  const items = useMemo(() => {
    const seen = new Set<string>()
    const out: { src: string; key: string; label: string }[] = []
    for (const row of MYSTERY_MOCK_INVENTORY) {
      if (!row.imageUrl || seen.has(row.id)) continue
      seen.add(row.id)
      out.push({
        src: row.imageUrl,
        key: row.id,
        label: MYSTERY_CATEGORY_LABEL[row.category],
      })
      if (out.length >= 14) break
    }
    if (out.length < 6) {
      MYSTERY_MOCK_INVENTORY.forEach((row) => {
        if (out.length >= 14) return
        if (!row.imageUrl) return
        out.push({
          src: row.imageUrl,
          key: row.id,
          label: MYSTERY_CATEGORY_LABEL[row.category],
        })
      })
    }
    return out
  }, [])

  const loop = useMemo(() => [...items, ...items], [items])

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-x-6 -inset-y-8 left-1/2 top-[42%] z-0 h-[min(22rem,55vw)] w-[min(28rem,120%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-violet-400/25 via-fuchsia-400/15 to-transparent blur-3xl"
        aria-hidden
      />
      <div className="relative overflow-hidden py-2">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-[4.5rem] bg-gradient-to-r from-[var(--fetch-app-bg,#f8f6fd)] via-[var(--fetch-app-bg,#f8f6fd)]/88 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-[4.5rem] bg-gradient-to-l from-[var(--fetch-app-bg,#f8f6fd)] via-[var(--fetch-app-bg,#f8f6fd)]/88 to-transparent" />
        <div className="fetch-mystery-hero-scroll-premium pr-3 pl-0.5">
          {loop.map((it, i) => (
            <div
              key={`${it.key}-${i}`}
              className="group relative h-[16.25rem] w-[11.75rem] shrink-0 overflow-hidden rounded-[1.45rem] border border-white/80 bg-white shadow-[0_24px_56px_rgba(28,21,40,0.09),0_0_0_1px_rgba(124,58,237,0.06)] ring-1 ring-violet-500/10 transition-shadow duration-300 hover:shadow-[0_28px_64px_rgba(91,33,182,0.12)]"
            >
              <img
                src={it.src}
                alt=""
                className="h-full w-full object-cover blur-[0.6px] brightness-[1.03] saturate-[1.08] transition-[filter] duration-300 motion-safe:group-hover:blur-0"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-900/60 via-zinc-900/10 to-violet-400/5" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent opacity-90" />
              <span className="absolute bottom-3.5 left-3.5 right-3.5 z-[1] truncate text-[11px] font-semibold tracking-tight text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]">
                {it.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})
