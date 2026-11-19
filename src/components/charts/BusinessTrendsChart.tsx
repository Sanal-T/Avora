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

// Daily continuous trend dataset from Nov 01 through Nov 19
export const defaultBusinessTrends: TrendPoint[] = [
  { date: 'Nov 01', enquiries: 4, production: 1, quotations: 3 },
  { date: 'Nov 02', enquiries: 5, production: 1, quotations: 4 },
  { date: 'Nov 03', enquiries: 6, production: 2, quotations: 4 },
  { date: 'Nov 04', enquiries: 7, production: 2, quotations: 5 },
  { date: 'Nov 05', enquiries: 7, production: 2, quotations: 5 },
  { date: 'Nov 06', enquiries: 6, production: 3, quotations: 4 },
  { date: 'Nov 07', enquiries: 6, production: 3, quotations: 4 },
  { date: 'Nov 08', enquiries: 8, production: 3, quotations: 6 },
  { date: 'Nov 09', enquiries: 10, production: 4, quotations: 7 },
  { date: 'Nov 10', enquiries: 12, production: 4, quotations: 8 },
  { date: 'Nov 11', enquiries: 11, production: 3, quotations: 7 },
  { date: 'Nov 12', enquiries: 10, production: 3, quotations: 7 },
  { date: 'Nov 13', enquiries: 9, production: 3, quotations: 7 },
  { date: 'Nov 14', enquiries: 11, production: 4, quotations: 8 },
  { date: 'Nov 15', enquiries: 13, production: 4, quotations: 8 },
  { date: 'Nov 16', enquiries: 14, production: 5, quotations: 9 },
  { date: 'Nov 17', enquiries: 13, production: 5, quotations: 9 },
  { date: 'Nov 18', enquiries: 12, production: 4, quotations: 8 },
  { date: 'Nov 19', enquiries: 11, production: 4, quotations: 8 },
]

// Axis ticks kept exactly as originally displayed
const AXIS_TICKS = ['Nov 01', 'Nov 04', 'Nov 07', 'Nov 10', 'Nov 13', 'Nov 16', 'Nov 19']

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
