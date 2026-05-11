import { memo } from 'react'

type DemoFind = {
  img: string
  title: string
  line: string
  badge: string
}

const FINDS: DemoFind[] = [
  {
    img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&q=80',
    title: 'Jordan 4 Retro',
    line: 'Paid $100',
    badge: 'Great Find',
  },
  {
    img: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=400&h=400&fit=crop&q=80',
    title: 'Charizard PSA 10',
    line: 'Rare pull',
    badge: 'Rare Find',
  },
  {
    img: 'https://images.unsplash.com/photo-1618361741207-5490e87a9857?w=400&h=400&fit=crop&q=80',
    title: 'AirPods Max',
    line: 'Paid $110',
    badge: 'Great Find',
  },
  {
    img: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=400&fit=crop&q=80',
    title: 'GMT Pepsi',
    line: 'Luxury lane',
    badge: 'Luxury reveal',
  },
]

export const MysteryCommunityFindsRail = memo(function MysteryCommunityFindsRail() {
  return (
    <section className="space-y-3.5">
      <div className="flex items-baseline justify-between px-0.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Recent community finds</h2>
        <span className="text-[10px] font-semibold text-violet-600/90">Updated live</span>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-4 scroll-pr-4 pb-1 pt-0.5">
        {FINDS.map((f) => (
          <article
            key={f.title}
            className="w-[10rem] shrink-0 snap-center overflow-hidden rounded-[22px] border border-zinc-200/90 bg-white shadow-[0_14px_44px_rgba(28,21,40,0.07)] ring-1 ring-zinc-100/80 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(91,33,182,0.1)]"
          >
            <div className="relative aspect-square bg-[var(--fetch-soft-gray,#f4f2fa)]">
              <img src={f.img} alt="" className="h-full w-full object-cover" loading="lazy" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/5" />
              <div className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[12px] font-bold text-violet-800 shadow-md ring-1 ring-white/60">
                {f.title.slice(0, 1)}
              </div>
              <span className="absolute bottom-2.5 left-2 right-2 rounded-full bg-violet-600 px-2 py-1 text-center text-[9px] font-bold uppercase tracking-wide text-white shadow-md">
                {f.badge}
              </span>
            </div>
            <div className="space-y-0.5 px-3 py-3">
              <p className="line-clamp-2 min-h-[2.25rem] text-[12px] font-bold leading-snug text-[var(--color-fetch-charcoal,#1c1528)]">
                {f.title}
              </p>
              <p className="text-[10px] font-semibold text-emerald-700">{f.line}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
})
