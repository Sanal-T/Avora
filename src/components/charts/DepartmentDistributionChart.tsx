import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'

export type DistributionItem = {
  name: string
  value: number
  color: string
}

export function DepartmentDistributionChart({ data }: { data: DistributionItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/30 p-4 text-center">
        <p className="text-xs font-medium text-foreground">No Distribution Categories Yet</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Category proportions will render as records are assigned.</p>
      </div>
    )
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={45}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
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
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
