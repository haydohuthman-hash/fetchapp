import { memo } from 'react'
import type { MysteryCategorySelectId } from '../../lib/mysteryFind/types'
import { FETCHIT_CATEGORY_CHIPS } from '../../lib/mysteryFind/constants'

export const FetchitCategoryChips = memo(function FetchitCategoryChips({
  value,
  onChange,
}: {
  value: MysteryCategorySelectId
  onChange: (id: MysteryCategorySelectId) => void
}) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-pb-1 scroll-pl-4 scroll-pr-4 scroll-pt-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {FETCHIT_CATEGORY_CHIPS.map((c) => {
        const on = value === c.id
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={[
              'snap-center shrink-0 rounded-full border px-4 py-2.5 text-[13px] font-semibold tracking-tight transition-all duration-200 active:scale-[0.98]',
              on
                ? 'border-violet-500 bg-gradient-to-b from-violet-50 to-violet-100/90 text-violet-950 shadow-[0_4px_24px_rgba(124,58,237,0.22)] ring-2 ring-violet-400/40'
                : 'border-zinc-200/95 bg-white text-zinc-700 shadow-sm ring-0 hover:border-violet-300 hover:bg-zinc-50/80 hover:text-zinc-900',
            ].join(' ')}
          >
            {c.label}
          </button>
        )
      })}
    </div>
  )
})
