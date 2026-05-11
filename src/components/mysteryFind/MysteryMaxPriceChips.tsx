import { memo, useState } from 'react'
import type { MysteryBudget, MysteryBudgetPresetId } from '../../lib/mysteryFind/types'
import { MYSTERY_BUDGET_PRESETS } from '../../lib/mysteryFind/constants'

export const MysteryMaxPriceChips = memo(function MysteryMaxPriceChips({
  value,
  onChange,
}: {
  value: MysteryBudget
  onChange: (b: MysteryBudget) => void
}) {
  const [customMax, setCustomMax] = useState('150')
  const [customOpen, setCustomOpen] = useState(false)

  const applyPreset = (preset: MysteryBudgetPresetId) => {
    if (preset === 'custom') {
      setCustomOpen(true)
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
    setCustomOpen(false)
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
    setCustomOpen(false)
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {MYSTERY_BUDGET_PRESETS.map((p) => {
          const presetId = p.preset as MysteryBudgetPresetId
          const selectedNonCustom = presetId !== 'custom' && value.preset === presetId
          const selectedCustom = presetId === 'custom' && value.preset === 'custom'
          const on = selectedNonCustom || selectedCustom
          return (
            <button
              key={String(p.preset)}
              type="button"
              onClick={() => applyPreset(presetId)}
              className={[
                'rounded-xl border px-2 py-2.5 text-center text-[13px] font-extrabold transition-all active:scale-[0.98]',
                on
                  ? 'border-2 border-violet-600 bg-violet-50 text-violet-950'
                  : 'border border-zinc-200/90 bg-white text-zinc-800 hover:border-violet-200',
              ].join(' ')}
            >
              {p.label}
            </button>
          )
        })}
      </div>
      {customOpen || value.preset === 'custom' ? (
        <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5">
          <label className="text-[11px] font-bold text-zinc-700" htmlFor="mf-custom-max">
            Max price (AUD)
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="mf-custom-max"
              inputMode="decimal"
              value={customMax}
              onChange={(e) => setCustomMax(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[15px] font-bold text-zinc-900 outline-none focus:border-violet-500 focus:outline-none"
              placeholder="e.g. 150"
            />
            <button
              type="button"
              onClick={applyCustom}
              className="shrink-0 rounded-lg bg-violet-600 px-3 py-2 text-[12px] font-bold text-white"
            >
              Apply
            </button>
          </div>
          <p className="mt-1.5 text-[10px] font-medium text-zinc-500">$20–$5,000 in this demo.</p>
        </div>
      ) : null}
    </div>
  )
})
