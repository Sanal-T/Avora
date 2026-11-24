import { useMemo, memo } from 'react'
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
  CheckCircle2,
  TrendingUp,
  Clock,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { PageContainer, PageHeader, DataSourceBadge } from '../../components/shared/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Alert } from '../../components/ui/Feedback'
import { ActivityTimeline } from '../../components/shared/ActivityTimeline'
import { DEPARTMENT_META, DEPARTMENT_ORDER, type DepartmentId } from '../../lib/departments'
import type { Department, RangeKey } from '../../data/dashboard'
import type { DashboardOverviewResponse } from '../../data/dashboardApi'
import { cn } from '../../lib/cn'

const icons: Record<string, LucideIcon> = {
  enquiries: Inbox,
  designs: PenTool,
  quotations: FileText,
  production: Factory,
  feedback: MessageSquare,
  labour: Users,
}

export const MainDashboard = memo(function MainDashboard({
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

  // Summary Strip KPIs derived from live PostgreSQL database
  const quotationDept = overview.departments?.find((d) => d.id === 'quotations')
  const companyKpis = useMemo(() => [
    {
      label: 'Active Pipeline Value',
      value: snapshot.active_pipeline_value || '₹0',
      sub: 'Open commercial proposals',
      variant: 'primary' as const,
      icon: TrendingUp,
    },
    {
      label: 'Open Work Orders',
      value: String(snapshot.open_work_count ?? 0),
      sub: 'Active shop-floor tasks',
      variant: 'info' as const,
      icon: Factory,
    },
    {
      label: 'Urgent Attention Items',
      value: String(snapshot.needs_attention_count ?? 0),
      sub: 'Delayed milestones & approvals',
      variant: 'danger' as const,
      icon: AlertTriangle,
    },
    {
      label: 'Quotation Volume',
      value: quotationDept?.primary || '₹0',
      sub: 'Estimated turnover in range',
      variant: 'success' as const,
      icon: FileText,
    },
  ], [snapshot.active_pipeline_value, snapshot.open_work_count, snapshot.needs_attention_count, quotationDept?.primary])

  const actions = overview.actionItems || []

  const activities = useMemo(() => (overview.recentActivities || []).map((act, index) => ({
    id: `act-${index}`,
    title: act.title,
    description: act.category,
    timeAgo: act.time_ago,
    tone: (act.category === 'Quotation' ? 'success' : act.category === 'Production' ? 'warning' : 'primary') as any,
  })), [overview.recentActivities])

  return (
    <PageContainer>
      {/* Cockpit Page Header */}
      <PageHeader
        title="Company Operational Cockpit"
        description="Real-time multi-department monitoring across architectural sales, engineering, and execution."
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
              <span>{overview.loading ? 'Syncing…' : 'Sync Live Data'}</span>
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

      {/* Top Executive KPI Ribbon */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {companyKpis.map((kpi) => {
          const Icon = kpi.icon
          const isHighlight = kpi.variant === 'primary'
          const isAlert = kpi.variant === 'danger'

          return (
            <Card
              key={kpi.label}
              className={cn(
                'relative overflow-hidden p-5 transition-card',
                isHighlight && 'border-primary/40 bg-gradient-to-br from-card to-primary-soft/30',
                isAlert && 'border-danger/30 bg-gradient-to-br from-card to-danger-soft/20',
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <span
                  className={cn(
                    'grid size-8 place-items-center rounded-lg',
                    isAlert
                      ? 'bg-danger-soft text-danger'
                      : isHighlight
                      ? 'bg-primary-soft text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="size-4" />
                </span>
              </div>

              <p
                className={cn(
                  'mt-3 font-display text-3xl font-extrabold tracking-tight tabular-nums',
                  isAlert ? 'text-danger' : isHighlight ? 'text-primary' : 'text-foreground',
                )}
              >
                {kpi.value}
              </p>

              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{kpi.sub}</span>
                <span className="font-mono text-[10px] text-muted-foreground/70">PGSQL</span>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Department Cards Grid */}
      <section aria-labelledby="dept-cards-heading">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 id="dept-cards-heading" className="text-section font-semibold text-foreground">
              Department Performance & Workspaces
            </h2>
            <p className="text-xs text-muted-foreground">Live volume and operational throughput</p>
          </div>
          <span className="text-xs text-muted-foreground">Updated in real-time</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {overview.departments.map((dept) => {
            const Icon = icons[dept.id] || Inbox
            const meta = DEPARTMENT_META[dept.id as DepartmentId] || DEPARTMENT_META.enquiries

            return (
              <Card
                key={dept.id}
                className="group relative flex flex-col p-5 transition-card cursor-pointer hover:border-foreground/30 hover:shadow-card-hover"
                onClick={() => navigate(`/${dept.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'grid size-10 place-items-center rounded-xl transition-transform group-hover:scale-105 shadow-xs',
                        meta.chip,
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {dept.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">{dept.primaryLabel}</p>
                    </div>
                  </div>

                  {dept.trend && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {dept.trend}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <span className="font-display text-3xl font-extrabold tracking-tight tabular-nums text-foreground">
                    {dept.primary}
                  </span>
                </div>

                {/* Supporting Metrics */}
                <div className="mt-4 grid grid-cols-3 divide-x divide-border border-t border-border pt-3">
                  {dept.metrics.map(([label, val]) => (
                    <div key={label} className="px-2 first:pl-0 last:pr-0">
                      <p className="text-[11px] text-muted-foreground truncate">{label}</p>
                      <p className="font-semibold text-sm text-foreground tabular-nums truncate">{val}</p>
                    </div>
                  ))}
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                  <span className="flex items-center gap-1">
                    Open {meta.label} hub
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Operational Feeds: Pending Urgencies & Recent Activity Stream */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Urgencies */}
        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Operational Attention Required</h3>
              <p className="text-xs text-muted-foreground">Follow-ups, approvals, and bottleneck tasks</p>
            </div>
            <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-bold text-danger">
              {actions.length} items
            </span>
          </div>

          <div className="divide-y divide-border/60 mt-1">
            {actions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="size-8 text-success" />
                <p className="mt-2 text-sm font-semibold text-foreground">All clear</p>
                <p className="text-xs text-muted-foreground">No critical bottlenecks pending at this moment.</p>
              </div>
            ) : (
              actions.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-3.5 group cursor-pointer hover:bg-muted/40 -mx-5 px-5 transition-colors"
                  onClick={() => navigate(`/${item.department_id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid size-7 place-items-center rounded-lg bg-warning-soft text-warning shrink-0">
                      <AlertTriangle className="size-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5 shrink-0" />
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Live Activity Stream */}
        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Live Activity Stream</h3>
              <p className="text-xs text-muted-foreground">Chronological audit stream across all departments</p>
            </div>
            <span className="text-xs text-muted-foreground">Real-time</span>
          </div>

          <div className="mt-4">
            <ActivityTimeline events={activities} />
          </div>
        </Card>
      </div>
    </PageContainer>
  )
})
