import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { DEPARTMENT_META, type DepartmentId } from '../../lib/departments'

export type DeptTrendPoint = {
  label: string
  value: number
}

export function DepartmentTrendChart({
  departmentId,
  data,
}: {
  departmentId: DepartmentId
  data: DeptTrendPoint[]
}) {
  const meta = DEPARTMENT_META[departmentId]

  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/30 p-4 text-center">
        <p className="text-xs font-medium text-foreground">No Periodic Breakdown Available</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Trends will plot dynamically as records are logged in PostgreSQL.</p>
      </div>
    )
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
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
          <Bar
            dataKey="value"
            name={meta.seriesLabel}
            fill={meta.color}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
