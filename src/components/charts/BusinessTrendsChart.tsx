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
import { DEPARTMENT_META, type DepartmentId } from '../../lib/departments'

export type TrendPoint = {
  date: string
  enquiries: number
  production: number
  quotations: number
}

export const defaultBusinessTrends: TrendPoint[] = []

// Axis ticks kept exactly as originally displayed
const AXIS_TICKS: string[] = []

const GRAPH_DEPARTMENTS: DepartmentId[] = ['enquiries', 'production', 'quotations']

export function BusinessTrendsChart({ data = defaultBusinessTrends }: { data?: TrendPoint[] }) {
  const [activeSeries, setActiveSeries] = useState<Record<string, boolean>>({
    enquiries: true,
    production: true,
    quotations: true,
  })

  const toggleSeries = (id: string) => {
    setActiveSeries((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 p-6 text-center">
        <p className="text-sm font-semibold text-foreground">No Historical Trends Recorded Yet</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Continuous trends will populate automatically as enquiries, quotations, and work orders are created and processed in PostgreSQL.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {GRAPH_DEPARTMENTS.map((id) => {
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
              {GRAPH_DEPARTMENTS.map((id) => (
                <linearGradient key={id} id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DEPARTMENT_META[id].color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={DEPARTMENT_META[id].color} stopOpacity={0.0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="date"
              ticks={AXIS_TICKS}
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
              cursor={{ stroke: 'var(--foreground)', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.4 }}
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
            {GRAPH_DEPARTMENTS.map((id) =>
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
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
                />
              ) : null,
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
