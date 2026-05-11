import { memo } from 'react'
import type { MysteryCategoryId } from '../../lib/mysteryFind/types'
import { MYSTERY_CATEGORY_LABEL, MYSTERY_CATEGORY_ORDER } from '../../lib/mysteryFind/constants'

export const MysteryCategoryPicker = memo(function MysteryCategoryPicker({
  value,
  onChange,
}: {
  value: MysteryCategoryId | null
  onChange: (c: MysteryCategoryId) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {MYSTERY_CATEGORY_ORDER.map((id) => {
        const active = value === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={[
              'rounded-2xl border px-3 py-3.5 text-left text-[14px] font-bold transition-colors',
              active
                ? 'border-2 border-violet-600 bg-violet-50 text-violet-950'
                : 'border-zinc-200/90 bg-white text-zinc-800 active:bg-zinc-50',
            ].join(' ')}
          >
            {MYSTERY_CATEGORY_LABEL[id]}
          </button>
        )
      })}
    </div>
  )
})
