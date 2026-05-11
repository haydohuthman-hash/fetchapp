import { memo, useMemo } from 'react'
import { MYSTERY_CATEGORY_LABEL, MYSTERY_CATEGORY_ORDER } from '../../lib/mysteryFind/constants'
import { MYSTERY_MOCK_INVENTORY } from '../../lib/mysteryFind/mockInventory'

type Visual = 'default' | 'pack'

export const MysteryHeroSpinner = memo(function MysteryHeroSpinner({ visual = 'default' }: { visual?: Visual }) {
  const pack = visual === 'pack'
  const items = useMemo(() => {
    const out: { src: string; key: string; label: string }[] = []
    for (const cat of MYSTERY_CATEGORY_ORDER) {
      const row = MYSTERY_MOCK_INVENTORY.find((x) => x.category === cat)
      if (!row) continue
      out.push({ src: row.imageUrl, key: cat, label: MYSTERY_CATEGORY_LABEL[cat] })
    }
    return out
  }, [])

  const doubled = [...items, ...items]

  return (
    <div className="relative -mx-4 overflow-hidden py-1">
      <div
        className={[
          'pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 bg-gradient-to-r to-transparent',
          pack ? 'from-[#050508] via-[#050508]/95' : 'from-white via-white/90',
        ].join(' ')}
      />
      <div
        className={[
          'pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 bg-gradient-to-l to-transparent',
          pack ? 'from-[#050508] via-[#050508]/95' : 'from-white via-white/90',
        ].join(' ')}
      />
      <div className="fetch-mystery-hero-scroll pr-2">
        {doubled.map((it, i) => (
          <div
            key={`${it.key}-${i}`}
            className={[
              'relative h-[7.75rem] w-[8.75rem] shrink-0 overflow-hidden rounded-2xl',
              pack
                ? 'border border-cyan-400/30 bg-zinc-900/90 ring-1 ring-fuchsia-500/25 shadow-[0_0_24px_rgba(34,211,238,0.12)]'
                : 'border border-violet-200/90 bg-violet-100/80',
            ].join(' ')}
          >
            <img
              src={it.src}
              alt=""
              className={['h-full w-full object-cover', pack ? 'blur-[1px] brightness-90 saturate-110' : 'blur-[1.5px] brightness-[0.98]'].join(
                ' ',
              )}
            />
            <div
              className={[
                'pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent',
                pack ? 'from-black/60 to-cyan-500/5' : 'from-violet-950/35 to-violet-200/10',
              ].join(' ')}
            />
            <span className="absolute bottom-2 left-2.5 right-2 z-[1] truncate text-[11px] font-extrabold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {it.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})
