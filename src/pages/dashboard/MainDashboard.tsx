import { useEffect, useMemo, useRef, useState, memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../../lib/hooks'
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
import BorderGlow from '../../components/ui/BorderGlow'
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

const DEPARTMENT_GLOW: Record<DepartmentId, { glowColor: string; colors: string[] }> = {
  enquiries: {
    glowColor: '213 94 68',
    colors: ['#60a5fa', '#3b82f6', '#93c5fd'],
  },
  designs: {
    glowColor: '258 90 76',
    colors: ['#a78bfa', '#8b5cf6', '#c4b5fd'],
  },
  quotations: {
    glowColor: '187 92 53',
    colors: ['#22d3ee', '#06b6d4', '#67e8f9'],
  },
  production: {
    glowColor: '43 96 56',
    colors: ['#fbbf24', '#f59e0b', '#fde68a'],
  },
  projects: {
    glowColor: '217 91 60',
    colors: ['#60a5fa', '#2563eb', '#93c5fd'],
  },
  accounts: {
    glowColor: '38 92 50',
    colors: ['#fbbf24', '#d97706', '#fde68a'],
  },
  feedback: {
    glowColor: '352 95 71',
    colors: ['#fb7185', '#f43f5e', '#fda4af'],
  },
  labour: {
    glowColor: '158 64 52',
    colors: ['#34d399', '#10b981', '#6ee7b7'],
  },
  communications: {
    glowColor: '263 85 68',
    colors: ['#a78bfa', '#7c3aed', '#c4b5fd'],
  },
}

export const MainDashboard = memo(function MainDashboard({
  overview,
  rangeId,
  onRefresh,
}: {
  overview: DashboardOverviewResponse & { loading?: boolean; error?: boolean }
  rangeId: RangeKey
  onRefresh: (force?: boolean) => void
}) {
  const navigate = useNavigate()
  const [urgentModalOpen, setUrgentModalOpen] = useState(false)
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      onRefresh(false)
    }
  }, [onRefresh])
  const { theme } = useTheme()
  const cardBgDark = '#0f0f13'
  const cardBgDarkAlt = '#0d0d12'
  const cardBgLight = '#ffffff'
  const cardBg = theme === 'dark' ? cardBgDark : cardBgLight
  const cardBgAlt = theme === 'dark' ? cardBgDarkAlt : cardBgLight

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
      glowColor: '24 95 53',
      glowColors: ['#f97316', '#ea580c', '#fb923c'],
      icon: TrendingUp,
      to: '/quotations',
    },
    {
      label: 'In Progress',
      value: String(snapshot.open_work_count ?? 0),
      sub: 'Designs, quotations & production',
      variant: 'info' as const,
      glowColor: '217 91 60',
      glowColors: ['#3b82f6', '#1d4ed8', '#60a5fa'],
      icon: Factory,
      to: '/in-progress',
    },
    {
      label: 'Urgent Attention Items',
      value: String(snapshot.needs_attention_count ?? 0),
      sub: 'Delayed milestones & approvals',
      variant: 'danger' as const,
      glowColor: '0 84 60',
      glowColors: ['#ef4444', '#dc2626', '#f87171'],
      icon: AlertTriangle,
      to: `/${overview.actionItems?.[0]?.department_id || 'quotations'}`,
    },
  ], [snapshot.active_pipeline_value, snapshot.open_work_count, snapshot.needs_attention_count])

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
              onClick={() => onRefresh(true)}
            >
              <RefreshCw className={`size-3.5 ${overview.loading ? 'animate-spin' : ''}`} />
              <span>{overview.loading ? 'Syncing…' : 'Sync Live Data'}</span>
            </Button>
          </div>
        }
      />

      {/* Fallback Banner if API error */}
      {overview.error && (
        <Alert tone="warning" action={<Button size="sm" variant="outline" onClick={() => onRefresh(true)}>Retry</Button>}>
          Live ERP API is currently unreachable. Displaying cached operational snapshot.
        </Alert>
      )}

      {/* Top Executive KPI Ribbon */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {companyKpis.map((kpi) => {
          const Icon = kpi.icon
          const isPrimary = kpi.variant === 'primary'
          const isInfo = kpi.variant === 'info'
          const isDanger = kpi.variant === 'danger'

          return (
            <BorderGlow
              key={kpi.label}
              borderRadius={14}
              backgroundColor={cardBg}
              glowColor={kpi.glowColor}
              colors={kpi.glowColors}
              glowRadius={36}
              glowIntensity={1.2}
              edgeSensitivity={22}
              coneSpread={26}
              fillOpacity={0.25}
              onClick={() => {
                if (kpi.label === 'Urgent Attention Items') {
                  setUrgentModalOpen(true)
                } else {
                  navigate(kpi.to)
                }
              }}
              className={cn(
                'relative p-5 transition-card cursor-pointer hover:scale-[1.01]',
                isPrimary && 'border-primary/40 bg-gradient-to-br from-card to-primary-soft/30',
                isInfo && 'border-info/40 bg-gradient-to-br from-card to-info-soft/30',
                isDanger && 'border-danger/30 bg-gradient-to-br from-card to-danger-soft/20',
                '[&>.border-glow-inner]:overflow-visible [&>.border-glow-inner]:h-full [&>.border-glow-inner]:justify-between',
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <span
                  className={cn(
                    'grid size-8 place-items-center rounded-lg',
                    isPrimary && 'bg-primary-soft text-primary',
                    isInfo && 'bg-info-soft text-info',
                    isDanger && 'bg-danger-soft text-danger',
                  )}
                >
                  <Icon className="size-4" />
                </span>
              </div>

              <p
                className={cn(
                  'mt-3 font-display text-3xl font-extrabold tracking-tight tabular-nums',
                  isPrimary && 'text-primary',
                  isInfo && 'text-info',
                  isDanger && 'text-danger',
                )}
              >
                {kpi.value}
              </p>

              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{kpi.sub}</span>
                <span className="font-mono text-[10px] text-muted-foreground/70">PGSQL</span>
              </div>
            </BorderGlow>
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
            const deptId = dept.id as DepartmentId
            const Icon = icons[dept.id] || Inbox
            const meta = DEPARTMENT_META[deptId] || DEPARTMENT_META.enquiries
            const glow = DEPARTMENT_GLOW[deptId] || { glowColor: '213 94 68', colors: ['#60a5fa', '#3b82f6', '#93c5fd'] }

            return (
              <BorderGlow
                key={dept.id}
                borderRadius={14}
                backgroundColor={cardBgAlt}
                glowColor={glow.glowColor}
                colors={glow.colors}
                glowRadius={36}
                glowIntensity={1.15}
                edgeSensitivity={22}
                coneSpread={26}
                fillOpacity={0.2}
                className={cn(
                  'group relative flex flex-col p-5 transition-card cursor-pointer',
                  'hover:border-foreground/30 hover:shadow-card-hover',
                  '[&>.border-glow-inner]:overflow-visible [&>.border-glow-inner]:h-full [&>.border-glow-inner]:flex [&>.border-glow-inner]:flex-col [&>.border-glow-inner]:justify-between',
                )}
                onClick={() => navigate(`/${dept.id}`)}
              >
                <div>
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
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                  <span className="flex items-center gap-1">
                    Open {meta.label} hub
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </BorderGlow>
            )
          })}
        </div>
      </section>

      {/* Operational Feeds: Pending Urgencies & Recent Activity Stream */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Urgencies */}
        <BorderGlow
          borderRadius={14}
          backgroundColor={cardBgAlt}
          glowColor="38 92 50"
          colors={['#f59e0b', '#d97706', '#fbbf24']}
          glowRadius={36}
          glowIntensity={1.05}
          edgeSensitivity={22}
          coneSpread={26}
          fillOpacity={0.15}
          className="p-5 shadow-card [&>.border-glow-inner]:overflow-visible"
        >
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
        </BorderGlow>

        {/* Live Activity Stream */}
        <BorderGlow
          borderRadius={14}
          backgroundColor={cardBgAlt}
          glowColor="24 95 53"
          colors={['#f97316', '#ea580c', '#fb923c']}
          glowRadius={36}
          glowIntensity={1.05}
          edgeSensitivity={22}
          coneSpread={26}
          fillOpacity={0.15}
          className="p-5 shadow-card [&>.border-glow-inner]:overflow-visible"
        >
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
        </BorderGlow>
      </div>

      {urgentModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setUrgentModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-float space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-danger" />
                <h3 className="text-sm font-semibold text-foreground">
                  Urgent Attention Items ({actions.length})
                </h3>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setUrgentModalOpen(false)}>
                Close
              </Button>
            </div>
            <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
              {actions.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No urgent attention items.</p>
              ) : (
                actions.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      <span className="inline-block mt-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {item.department_id}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs shrink-0"
                      onClick={() => {
                        setUrgentModalOpen(false)
                        navigate(`/${item.department_id}`)
                      }}
                    >
                      Open
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
})
