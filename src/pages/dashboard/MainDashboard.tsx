import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  RefreshCw,
  Plus,
  ArrowRight,
  Inbox,
  PenTool,
  FileText,
  Factory,
  MessageSquare,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { PageContainer, PageHeader, DataSourceBadge } from '../../components/shared/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Alert } from '../../components/ui/Feedback'
import { ActivityTimeline } from '../../components/shared/ActivityTimeline'
import { DEPARTMENT_META, type DepartmentId } from '../../lib/departments'
import type { Department, RangeKey } from '../../data/dashboard'
import type { DashboardOverviewResponse } from '../../data/dashboardApi'

const icons: Record<string, LucideIcon> = {
  enquiries: Inbox,
  designs: PenTool,
  quotations: FileText,
  production: Factory,
  feedback: MessageSquare,
  labour: Users,
}

export function MainDashboard({
  overview,
  rangeId,
  onRefresh,
}: {
  overview: DashboardOverviewResponse & { loading?: boolean; error?: boolean }
  rangeId: RangeKey
  onRefresh: () => void
}) {
  const navigate = useNavigate()

  const snapshot = overview.snapshot || {
    active_pipeline_value: '₹0',
    open_work_count: 0,
    needs_attention_count: 0,
  }

  // Summary Strip KPIs (Strictly derived from live PostgreSQL database)
  const quotationDept = overview.departments?.find((d) => d.id === 'quotations')
  const companyKpis = [
    { label: 'Active Pipeline', value: snapshot.active_pipeline_value || '₹0', sub: 'Open commercial quotes', highlight: true },
    { label: 'Open Work Items', value: String(snapshot.open_work_count ?? 0), sub: 'Active manufacturing tasks' },
    { label: 'Needs Attention', value: String(snapshot.needs_attention_count ?? 0), sub: 'Delayed or pending actions', alert: Boolean(snapshot.needs_attention_count) },
    { label: 'Quotation Volume', value: quotationDept?.primary || '₹0', sub: 'Live from database' },
  ]

  const actions = overview.actionItems || []

  const activities = (overview.recentActivities || []).map((act, index) => ({
    id: `act-${index}`,
    title: act.title,
    description: act.category,
    timeAgo: act.time_ago,
    tone: (act.category === 'Quotation' ? 'success' : act.category === 'Production' ? 'warning' : 'primary') as any,
  }))

  return (
    <PageContainer>
      {/* Page Header */}
      <PageHeader
        title="Company Overview"
        description="A unified operational cockpit across all commercial and factory departments."
        actions={
          <div className="flex items-center gap-2">
            <DataSourceBadge source={overview.source} />
            <Button
              variant="outline"
              size="sm"
              disabled={overview.loading}
              onClick={onRefresh}
            >
              <RefreshCw className={`size-3.5 ${overview.loading ? 'animate-spin' : ''}`} />
              <span>{overview.loading ? 'Refreshing…' : 'Refresh'}</span>
            </Button>
          </div>
        }
      />

      {/* Fallback Banner if API error */}
      {overview.error && (
        <Alert tone="warning" action={<Button size="sm" variant="outline" onClick={onRefresh}>Retry</Button>}>
          Live ERP API is currently unreachable. Displaying cached operational snapshot.
        </Alert>
      )}

      {/* Top Summary Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {companyKpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
            <p
              className={`mt-2 font-display text-3xl font-extrabold tracking-tight tabular-nums ${
                kpi.alert ? 'text-danger' : kpi.highlight ? 'text-primary' : 'text-foreground'
              }`}
            >
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
          </Card>
        ))}
      </div>

      {/* Department Cards Grid (Responsive 3 / 2 / 1) */}
      <section aria-labelledby="dept-cards-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="dept-cards-heading" className="text-section font-semibold text-foreground">
            Department Performance
          </h2>
          <span className="text-xs text-muted-foreground">Select any department to view queue</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {overview.departments.map((dept) => {
            const Icon = icons[dept.id] || Inbox
            const meta = DEPARTMENT_META[dept.id as DepartmentId] || DEPARTMENT_META.enquiries

            return (
              <Card
                key={dept.id}
                className="group relative flex flex-col p-5 transition-all hover:border-foreground/40 hover:shadow-sm cursor-pointer"
                onClick={() => navigate(`/${dept.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid size-9 place-items-center rounded-lg transition-transform group-hover:scale-105 ${meta.chip}`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{dept.name}</h3>
                      <p className="text-[11px] text-muted-foreground">{dept.primaryLabel}</p>
                    </div>
                  </div>
                  {dept.trend && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {dept.trend}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <span className="font-display text-3xl font-extrabold tracking-tight tabular-nums text-foreground">
                    {dept.primary}
                  </span>
                </div>

                {/* Compact Supporting Metrics */}
                <div className="mt-4 grid grid-cols-3 divide-x divide-border border-t border-border pt-3">
                  {dept.metrics.map(([label, val]) => (
                    <div key={label} className="px-2 first:pl-0 last:pr-0">
                      <p className="text-[10px] text-muted-foreground truncate">{label}</p>
                      <p className="font-semibold text-xs text-foreground tabular-nums">{val}</p>
                    </div>
                  ))}
                </div>

                {/* View Details Affordance */}
                <div className="mt-4 flex items-center justify-between pt-2 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                  <span>Open workspace</span>
                  <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Bottom Row: Pending Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Actions */}
        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Pending Urgencies</h3>
              <p className="text-xs text-muted-foreground">Operational blockers and customer follow-ups</p>
            </div>
            <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">
              {actions.length} items
            </span>
          </div>

          <div className="divide-y divide-border mt-1">
            {actions.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-3.5 group cursor-pointer hover:bg-muted/40 -mx-5 px-5 transition-colors"
                onClick={() => navigate(`/${item.department_id}`)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid size-7 place-items-center rounded-md bg-warning-soft text-warning">
                    <AlertTriangle className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity Timeline */}
        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Live Activity Feed</h3>
              <p className="text-xs text-muted-foreground">Chronological audit stream of changes</p>
            </div>
            <span className="text-xs text-muted-foreground">Recent events</span>
          </div>

          <div className="mt-4">
            <ActivityTimeline events={activities} />
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}
