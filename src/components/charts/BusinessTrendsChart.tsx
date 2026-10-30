import { useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { DEPARTMENT_ORDER, DEPARTMENT_META, type DepartmentId } from '../../lib/departments'

export type TrendPoint = {
  date: string
  enquiries: number
  designs: number
  quotations: number
  production: number
  feedback: number
  labour: number
}

// 7-day or 30-day mock trend series
export const defaultBusinessTrends: TrendPoint[] = [
  { date: 'Nov 01', enquiries: 4, designs: 2, quotations: 3, production: 1, feedback: 2, labour: 8 },
  { date: 'Nov 04', enquiries: 7, designs: 3, quotations: 5, production: 2, feedback: 4, labour: 9 },
  { date: 'Nov 07', enquiries: 6, designs: 4, quotations: 4, production: 3, feedback: 3, labour: 10 },
  { date: 'Nov 10', enquiries: 12, designs: 5, quotations: 8, production: 4, feedback: 5, labour: 12 },
  { date: 'Nov 13', enquiries: 9, designs: 6, quotations: 7, production: 3, feedback: 4, labour: 11 },
  { date: 'Nov 16', enquiries: 14, designs: 7, quotations: 9, production: 5, feedback: 6, labour: 14 },
  { date: 'Nov 19', enquiries: 11, designs: 5, quotations: 8, production: 4, feedback: 5, labour: 12 },
]

export function BusinessTrendsChart({ data = defaultBusinessTrends }: { data?: TrendPoint[] }) {
  const [activeSeries, setActiveSeries] = useState<Record<DepartmentId, boolean>>({
    enquiries: true,
    designs: true,
    quotations: true,
    production: true,
    feedback: true,
    labour: false,
  })

  const toggleSeries = (id: DepartmentId) => {
    setActiveSeries((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {DEPARTMENT_ORDER.map((id) => {
            const meta = DEPARTMENT_META[id]
            const active = activeSeries[id]
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleSeries(id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                  active
                    ? 'border-transparent bg-muted text-foreground'
                    : 'border-border text-muted-foreground opacity-60 hover:opacity-100'
                }`}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: meta.color }}
                  aria-hidden="true"
                />
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {DEPARTMENT_ORDER.map((id) => (
                <linearGradient key={id} id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DEPARTMENT_META[id].color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={DEPARTMENT_META[id].color} stopOpacity={0.0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--card-foreground)',
                boxShadow: 'var(--shadow-float)',
              }}
            />
            <Legend wrapperStyle={{ display: 'none' }} />
            {DEPARTMENT_ORDER.map((id) =>
              activeSeries[id] ? (
                <Area
                  key={id}
                  type="monotone"
                  dataKey={id}
                  name={DEPARTMENT_META[id].label}
                  stroke={DEPARTMENT_META[id].color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#grad-${id})`}
                />
              ) : null,
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
