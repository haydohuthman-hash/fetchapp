/**
 * Incoming wallet credits aggregated for a simple earnings-style bar chart.
 */
import { useId, useMemo, useState } from 'react'
import type { WalletTransaction } from '../../lib/data'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Period = 'week' | 'month'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function dateKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function ymKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

function formatAudRough(nAud: number): string {
  if (!Number.isFinite(nAud)) return '$0'
  if (nAud >= 10_000) return `$${(nAud / 1000).toFixed(1)}k`
  if (Math.abs(nAud) < 0.005 && nAud !== 0) return '<$0.01'
  return `$${nAud.toFixed(0)}`
}

function tooltipAud(cents: number): string {
  const n = cents / 100
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function aggregateWeek(txns: WalletTransaction[]): Array<{ name: string; cents: number }> {
  const today0 = startOfDay(new Date()).getTime()
  const keys: string[] = []
  for (let i = 6; i >= 0; i--) {
    const day = startOfDay(new Date(today0 - i * 86_400_000))
    keys.push(dateKey(day.getTime()))
  }
  const sums = new Map<string, number>()
  for (const k of keys) sums.set(k, 0)

  for (const t of txns) {
    if (t.amountCents <= 0) continue
    const k = dateKey(t.createdAt)
    if (sums.has(k)) sums.set(k, (sums.get(k) ?? 0) + t.amountCents)
  }

  return keys.map((k) => ({
    name: new Date(k + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'short' }),
    cents: sums.get(k) ?? 0,
  }))
}

function aggregateMonth(txns: WalletTransaction[]): Array<{ name: string; cents: number }> {
  const now = new Date()
  const months: Date[] = []
  for (let i = 5; i >= 0; i--) {
    months.push(new Date(now.getFullYear(), now.getMonth() - i, 1))
  }
  const sums = new Map<string, number>()
  for (const d of months) sums.set(ymKey(d), 0)

  for (const t of txns) {
    if (t.amountCents <= 0) continue
    const d = new Date(t.createdAt)
    const mk = ymKey(d)
    if (sums.has(mk)) sums.set(mk, (sums.get(mk) ?? 0) + t.amountCents)
  }

  const thisYear = now.getFullYear()
  return months.map((d) => {
    const mk = ymKey(d)
    const name = d.toLocaleDateString('en-AU', {
      month: 'short',
      year: d.getFullYear() !== thisYear ? '2-digit' : undefined,
    })
    return { name, cents: sums.get(mk) ?? 0 }
  })
}

type Props = {
  txns: WalletTransaction[]
}

export function WalletEarningsChart({ txns }: Props) {
  const gradId = useId().replace(/:/g, '')
  const [period, setPeriod] = useState<Period>('week')

  const data = useMemo(() => {
    const rows = period === 'week' ? aggregateWeek(txns) : aggregateMonth(txns)
    return rows.map((r) => ({ ...r, aud: Number((r.cents / 100).toFixed(2)) }))
  }, [period, txns])

  const periodTotalAud = useMemo(
    () => data.reduce((s, r) => s + r.cents, 0) / 100,
    [data],
  )

  return (
    <section className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-zinc-200">
      <div className="flex flex-wrap items-start justify-between gap-2 px-1 pb-1 pt-0.5">
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.12em] text-zinc-500">
            Earnings
          </p>
          <p className="mt-0.5 text-[22px] font-black tabular-nums tracking-tight text-zinc-900">
            {formatAudRough(periodTotalAud)}
          </p>
          <p className="text-[10px] font-semibold leading-snug text-zinc-400">
            Incoming credits ({period === 'week' ? 'last 7 days' : 'last 6 months'})
          </p>
        </div>
        <div
          className="flex shrink-0 rounded-full bg-zinc-100 p-0.5 ring-1 ring-zinc-200/80"
          role="group"
          aria-label="Chart period"
        >
          <button
            type="button"
            onClick={() => setPeriod('week')}
            className={[
              'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em]',
              period === 'week'
                ? 'bg-white text-[#291050] shadow-sm ring-1 ring-zinc-200/70'
                : 'text-zinc-500 transition-colors hover:text-zinc-700',
            ].join(' ')}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setPeriod('month')}
            className={[
              'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em]',
              period === 'month'
                ? 'bg-white text-[#291050] shadow-sm ring-1 ring-zinc-200/70'
                : 'text-zinc-500 transition-colors hover:text-zinc-700',
            ].join(' ')}
          >
            Monthly
          </button>
        </div>
      </div>
      <div className="h-[168px] w-full pb-1 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -22 }}>
            <CartesianGrid strokeDasharray="3 6" stroke="#e4e4e7" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#71717b', fontWeight: 600 }}
              axisLine={{ stroke: '#e4e4e7' }}
              tickLine={false}
            />
            <YAxis
              width={42}
              tickFormatter={(v: number) => formatAudRough(v)}
              tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(124, 58, 237, 0.06)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const row = payload[0]?.payload as { name: string; cents: number }
                return (
                  <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-lg shadow-zinc-900/10">
                    <p className="text-[11px] font-bold text-zinc-500">{row.name}</p>
                    <p className="text-[13px] font-black tabular-nums text-zinc-900">
                      {tooltipAud(row.cents)}
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="aud" fill={`url(#${gradId})`} radius={[6, 6, 0, 0]} maxBarSize={36} />
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#5b21b6" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
