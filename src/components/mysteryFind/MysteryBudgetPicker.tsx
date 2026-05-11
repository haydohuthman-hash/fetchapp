import { memo, useState } from 'react'
import type { MysteryBudget, MysteryBudgetPresetId } from '../../lib/mysteryFind/types'
import { MYSTERY_BUDGET_PRESETS } from '../../lib/mysteryFind/constants'

export const MysteryBudgetPicker = memo(function MysteryBudgetPicker({
  value,
  onChange,
}: {
  value: MysteryBudget | null
  onChange: (b: MysteryBudget) => void
}) {
  const [customMax, setCustomMax] = useState('120')
  const [showCustom, setShowCustom] = useState(false)

  const applyPreset = (preset: MysteryBudgetPresetId) => {
    if (preset === 'custom') {
      setShowCustom(true)
      return
    }
    const hit = MYSTERY_BUDGET_PRESETS.find((p) => p.preset === preset)
    if (!hit) return
    onChange({
      preset: hit.preset as MysteryBudgetPresetId,
      minCents: hit.minCents,
      maxCents: hit.maxCents,
      labelAud: hit.label,
    })
    setShowCustom(false)
  }

  const applyCustom = () => {
    const n = Number.parseFloat(customMax.replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(n) || n < 15) return
    const maxCents = Math.round(Math.min(5000, Math.max(20, n)) * 100)
    const minCents = Math.max(500, Math.round(maxCents * 0.42))
    onChange({
      preset: 'custom',
      minCents,
      maxCents,
      labelAud: `Up to $${(maxCents / 100).toFixed(0)}`,
    })
    setShowCustom(false)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {MYSTERY_BUDGET_PRESETS.map((p) => {
          const presetId = p.preset as MysteryBudgetPresetId
          const selectedNonCustom = presetId !== 'custom' && value?.preset === presetId
          const selectedCustom = presetId === 'custom' && value?.preset === 'custom'
          return (
            <button
              key={String(p.preset)}
              type="button"
              onClick={() => applyPreset(presetId)}
              className={[
                'rounded-2xl border px-3 py-3 text-center text-[14px] font-bold transition-colors',
                presetId !== 'custom' && selectedNonCustom
                  ? 'border-2 border-violet-600 bg-violet-50 text-violet-950'
                  : presetId === 'custom' && selectedCustom
                    ? 'border-2 border-violet-600 bg-violet-50 text-violet-950'
                    : 'border-zinc-200/90 bg-white text-zinc-800 active:bg-zinc-50',
              ].join(' ')}
            >
              {p.label}
            </button>
          )
        })}
      </div>
      {showCustom || value?.preset === 'custom' ? (
        <div className="rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-3">
          <label className="text-[12px] font-semibold text-zinc-700" htmlFor="mystery-custom-budget">
            Max spend (AUD)
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="mystery-custom-budget"
              inputMode="decimal"
              value={customMax}
              onChange={(e) => setCustomMax(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[15px] font-semibold text-zinc-900 outline-none focus:border-violet-500 focus:outline-none"
              placeholder="e.g. 120"
            />
            <button
              type="button"
              onClick={applyCustom}
              className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-[13px] font-bold text-white"
            >
              Apply
            </button>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">Between $20 and $5,000 for this MVP demo.</p>
        </div>
      ) : null}
    </div>
  )
})
