import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ListFilter,
  FileSpreadsheet,
} from 'lucide-react'
import { PageContainer, PageHeader } from '../../components/shared/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { DEPARTMENT_META, type DepartmentId } from '../../lib/departments'
import type { RangeKey } from '../../data/dashboard'
import {
  mockEnquiries,
  mockDesigns,
  mockQuotations,
  mockWorkOrders,
  mockFeedback,
  mockWorkers,
} from '../../data/mockData'

export function DepartmentDashboardPage({
  departmentId,
  rangeId,
  onOpenCreate,
}: {
  departmentId: DepartmentId
  rangeId: RangeKey
  onOpenCreate: () => void
}) {
  const navigate = useNavigate()
  const meta = DEPARTMENT_META[departmentId]
  const Icon = meta.icon

  const [liveSummary, setLiveSummary] = useState<{
    id: string
    name: string
    primary_value: string
    primary_label: string
    metrics: { label: string; value: string }[]
    trend: string
  } | null>(null)

  useEffect(() => {
    fetch(`/api/dashboard/${departmentId}/summary`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setLiveSummary(data)
      })
      .catch(() => {})
  }, [departmentId, rangeId])

  const kpis: { label: string; value: string; note: string; alert?: boolean }[] = liveSummary
    ? [
        { label: liveSummary.primary_label, value: liveSummary.primary_value, note: liveSummary.trend || 'From live database' },
        ...liveSummary.metrics.map((m) => ({ label: m.label, value: m.value, note: 'Current status count' })),
      ]
    : [
        { label: 'Total Records', value: '0', note: 'No data recorded yet' },
      ]

  const config = {
    kpis,
    trendData: [] as { label: string; value: number }[],
    distributionData: [] as { name: string; value: number; color: string }[],
    distributionTitle: `${meta.label} Breakdown`,
    attentionItems: [] as { title: string; subtitle: string; code: string; link: string }[],
    recentRecords: [] as { id: string; code: string; title: string; status: string; date: string; link: string }[],
  }

  return (
    <PageContainer>
      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        <span>Back to Overview</span>
      </Link>

      {/* Header */}
      <PageHeader
        title={`${meta.label} Management`}
        description={`Operational control, dispatch queues, and metrics for ${meta.label.toLowerCase()}.`}
        icon={
          <span className={`grid size-10 place-items-center rounded-lg ${meta.chip}`}>
            <Icon className="size-5" />
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/${departmentId}/list`)}
            >
              <ListFilter className="size-3.5" />
              <span>View Full List</span>
            </Button>
            <Button variant="primary" size="sm" onClick={onOpenCreate}>
              <Plus className="size-3.5" />
              <span>New {meta.noun}</span>
            </Button>
          </div>
        }
      />

      {/* KPI Cards Row (4 Cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {config.kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
            <p
              className={`mt-2 font-display text-3xl font-extrabold tracking-tight tabular-nums ${
                kpi.alert ? 'text-danger' : 'text-foreground'
              }`}
            >
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{kpi.note}</p>
          </Card>
        ))}
      </div>

      {/* Two-Column Bottom: Needs Attention & Recent Records Table */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Needs Attention Panel */}
        <Card className="p-5 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Needs Attention</h3>
              <p className="text-xs text-muted-foreground">Priority actions and blocker alerts</p>
            </div>
            <AlertTriangle className="size-4 text-warning" />
          </div>

          <div className="divide-y divide-border mt-1">
            {config.attentionItems.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No pending blocker alerts for this department.</p>
            ) : config.attentionItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => navigate(item.link)}
                className="py-3 group cursor-pointer hover:bg-muted/40 -mx-5 px-5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary">{item.code}</span>
                  <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-foreground" />
                </div>
                <p className="mt-1 text-xs font-semibold text-foreground">{item.title}</p>
                <p className="text-[11px] text-muted-foreground">{item.subtitle}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Records Table */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recent Records</h3>
              <p className="text-xs text-muted-foreground">Most recently updated entries in queue</p>
            </div>
            <Link
              to={`/${departmentId}/list`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>Explore all records</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2.5 font-semibold">Identifier</th>
                  <th className="py-2.5 font-semibold">Details / Entity</th>
                  <th className="py-2.5 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {config.recentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                      No records logged yet.
                    </td>
                  </tr>
                ) : config.recentRecords.slice(0, 5).map((rec) => (
                  <tr key={rec.id} className="hover:bg-muted/30">
                    <td className="py-2.5 font-mono font-bold text-foreground">{rec.code}</td>
                    <td className="py-2.5 text-muted-foreground truncate max-w-xs">{rec.title}</td>
                    <td className="py-2.5">
                      <StatusBadge department={departmentId} status={rec.status} />
                    </td>
                    <td className="py-2.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(rec.link)}
                      >
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}
