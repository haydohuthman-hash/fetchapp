import { memo } from 'react'

const LINES = [
  { initials: 'J', name: 'Jake shared a Great Find', detail: '— AirPods under retail', tone: 'text-emerald-800' },
  { initials: 'S', name: 'Sarah opened a Fair Find', detail: '— vintage camera', tone: 'text-zinc-800' },
  { initials: 'E', name: 'Ethan uncovered a Rare Find', detail: '— luxury watch lane', tone: 'text-violet-900' },
  { initials: 'M', name: 'Mia revealed a Lower Find', detail: '— Instant Relist + credit', tone: 'text-zinc-700' },
  { initials: 'L', name: 'Lily trending', detail: '— “$50 bag → $140 resale clip”', tone: 'text-violet-800' },
]

export const MysteryRecentFindsDemo = memo(function MysteryRecentFindsDemo() {
  return (
    <section className="rounded-2xl border border-zinc-200/90 bg-white px-3 py-3">
      <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-zinc-500">Recent community reveals</h2>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
        Demo feed · real UX shows live seller handles & photos
      </p>
      <ul className="mt-3 space-y-2.5">
        {LINES.map((row) => (
          <li key={row.initials + row.name} className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-violet-100 to-violet-50 text-[12px] font-black text-violet-800"
              aria-hidden
            >
              {row.initials}
            </span>
            <span className="min-w-0 text-[13px] font-semibold leading-snug text-zinc-900">
              <span className={row.tone}>{row.name}</span> <span className="font-normal text-zinc-600">{row.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
})
