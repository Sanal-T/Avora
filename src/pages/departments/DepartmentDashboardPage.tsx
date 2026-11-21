import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { PageContainer, PageHeader } from '../../components/shared/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { DEPARTMENT_META, type DepartmentId } from '../../lib/departments'
import type { RangeKey } from '../../data/dashboard'
import { cn } from '../../lib/cn'
import {
  mockEnquiries,
  mockDesigns,
  mockQuotations,
  mockWorkOrders,
  mockFeedback,
  mockWorkers,
} from '../../data/mockData'
import {
  enquiryApi,
  designApi,
  quotationApi,
  productionApi,
  feedbackApi,
  labourApi,
} from '../../lib/api'

interface DashboardRecord {
  id: string
  code: string
  title: string
  subtitle?: string
  status: string
  date?: string
  budget?: string
  assignedTo?: string
  link: string
}

function normalizeFilterKey(label: string): string {
  const l = label.toLowerCase()
  if (l.includes('total') || l.includes('all')) return 'all'
  if (l.includes('qualif')) return 'qualified'
  if (l.includes('pend')) return 'pending'
  if (l.includes('convert')) return 'converted'
  if (l.includes('approv')) return 'approved'
  if (l.includes('complet')) return 'completed'
  if (l.includes('progress')) return 'in_progress'
  if (l.includes('active')) return 'active'
  if (l.includes('delay')) return 'delayed'
  if (l.includes('await')) return 'awaiting'
  if (l.includes('receiv')) return 'received'
  if (l.includes('avail')) return 'available'
  if (l.includes('assign')) return 'assigned'
  return l.replace(/\s+/g, '_')
}

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

  const [records, setRecords] = useState<DashboardRecord[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Load summary KPIs
  useEffect(() => {
    fetch(`/api/dashboard/${departmentId}/summary`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setLiveSummary(data)
      })
      .catch(() => {})
  }, [departmentId, rangeId, refreshTrigger])

  // Load actual department data
  useEffect(() => {
    let isMounted = true
    setLoadingRecords(true)
    setLoadError(null)

    const fetchRecords = async () => {
      try {
        if (departmentId === 'enquiries') {
          const res = await enquiryApi.list({ page_size: 100 })
          if (res.items && res.items.length > 0) {
            return res.items.map((e) => {
              let uiStatus = 'pending'
              const s = (e.status || '').toLowerCase()
              if (s.includes('qualif')) uiStatus = 'qualified'
              else if (s.includes('convert')) uiStatus = 'converted'

              return {
                id: e.id,
                code: e.enquiry_number,
                title: e.customer_company || e.customer_name || 'Direct Customer',
                subtitle: e.requirement_summary || e.customer_name || 'Commercial Enquiry',
                status: uiStatus,
                date: (e.created_at || '').slice(0, 10),
                budget: e.estimated_budget
                  ? `₹${Number(e.estimated_budget).toLocaleString('en-IN')}`
                  : undefined,
                assignedTo: e.assigned_employee_name || 'Unassigned',
                link: `/enquiries/${e.id}`,
              }
            })
          }
          return mockEnquiries.map((m) => ({
            id: m.id,
            code: m.code,
            title: m.company,
            subtitle: m.requirement,
            status: m.status,
            date: m.createdAt.slice(0, 10),
            budget: m.budget,
            assignedTo: m.assignedTo,
            link: `/enquiries/${m.id}`,
          }))
        } else if (departmentId === 'designs') {
          const res = await designApi.listDesigns({ page_size: 100 })
          if (res.items && res.items.length > 0) {
            return res.items.map((d) => {
              const st = (d.status || '').toLowerCase().replaceAll('_', ' ')
              let status = 'in_progress'
              if (st.includes('complet') || st.includes('approve')) status = 'completed'
              else if (st.includes('pend') || st.includes('not started')) status = 'pending'

              return {
                id: d.id,
                code: d.design_number,
                title: d.title,
                subtitle: d.enquiry_number ? `Ref: ${d.enquiry_number}` : 'Internal Project',
                status,
                date: d.expected_completion_date || (d.created_at || '').slice(0, 10),
                assignedTo: d.assigned_designer_name || 'Design Team',
                link: `/designs/${d.id}`,
              }
            })
          }
          return mockDesigns.map((m) => ({
            id: m.id,
            code: m.code,
            title: m.title,
            subtitle: m.client,
            status: m.status,
            date: m.dueDate,
            assignedTo: m.designer,
            link: `/designs/${m.id}`,
          }))
        } else if (departmentId === 'quotations') {
          const res = await quotationApi.listQuotations({ page_size: 100 })
          if (res.items && res.items.length > 0) {
            return res.items.map((q) => {
              const st = (q.status || '').toLowerCase()
              let status = 'pending'
              if (st.includes('approv')) status = 'approved'
              else if (st.includes('convert')) status = 'converted'
              else if (st.includes('reject')) status = 'rejected'

              return {
                id: q.id,
                code: q.quotation_number,
                title: q.customer_company || q.customer_name || 'Client',
                subtitle: q.enquiry_number ? `Ref: ${q.enquiry_number}` : 'Estimate',
                status,
                budget: q.total_amount
                  ? `₹${Number(q.total_amount).toLocaleString('en-IN')}`
                  : undefined,
                date: (q.created_at || '').slice(0, 10),
                link: `/quotations/${q.id}`,
              }
            })
          }
          return mockQuotations.map((m) => ({
            id: m.id,
            code: m.code,
            title: m.client,
            subtitle: m.title,
            status: m.status,
            budget: `₹${m.grandTotal.toLocaleString('en-IN')}`,
            date: m.dueDate,
            link: `/quotations/${m.id}`,
          }))
        } else if (departmentId === 'production') {
          const res = await productionApi.listWorkOrders({ page_size: 100 })
          if (res.items && res.items.length > 0) {
            return res.items.map((wo) => {
              const st = (wo.status || '').toLowerCase()
              let status = 'active'
              if (st.includes('complet')) status = 'completed'
              else if (st.includes('delay')) status = 'delayed'

              return {
                id: wo.id,
                code: wo.work_order_number,
                title: wo.title,
                subtitle: wo.customer_company || wo.customer_name || 'Production Order',
                status,
                date: wo.planned_end_date || wo.planned_start_date || 'In Progress',
                assignedTo: 'Production Lead',
                link: `/production/${wo.id}`,
              }
            })
          }
          return mockWorkOrders.map((m) => ({
            id: m.id,
            code: m.code,
            title: m.title,
            subtitle: m.client,
            status: m.status,
            date: m.deliveryDate,
            assignedTo: m.leadWorker,
            link: `/production/${m.id}`,
          }))
        } else if (departmentId === 'feedback') {
          const res = await feedbackApi.listFeedback({ page_size: 100 })
          if (res.items && res.items.length > 0) {
            return res.items.map((f) => ({
              id: f.id,
              code: `FB-${f.id.slice(0, 4).toUpperCase()}`,
              title: f.customer_company || f.customer_name || 'Client',
              subtitle: f.comments || 'Feedback entry',
              status: (f.status || '').toLowerCase().includes('await') ? 'awaiting' : 'received',
              date: (f.received_at || f.created_at || '').slice(0, 10),
              link: `/feedback`,
            }))
          }
          return mockFeedback.map((m) => ({
            id: m.id,
            code: m.code,
            title: m.client,
            subtitle: m.comments,
            status: m.status,
            date: m.date,
            link: `/feedback`,
          }))
        } else if (departmentId === 'labour') {
          const res = await labourApi.listWorkers({ page_size: 100 })
          if (res.items && res.items.length > 0) {
            return res.items.map((w) => ({
              id: w.id,
              code: w.worker_code,
              title: `${w.first_name} ${w.last_name}`,
              subtitle: w.skill_category || 'Worker',
              status: (w.status || '').toLowerCase() === 'assigned' ? 'assigned' : 'available',
              assignedTo: w.phone || undefined,
              link: `/labour`,
            }))
          }
          return mockWorkers.map((m) => ({
            id: m.id,
            code: m.code,
            title: m.name,
            subtitle: m.trade,
            status: m.status,
            assignedTo: m.phone,
            link: `/labour`,
          }))
        }
        return []
      } catch (err: any) {
        console.warn(`Could not load records for ${departmentId}:`, err)
        if (isMounted) {
          setLoadError(err?.message || 'Failed to load records from database')
        }
        return []
      }
    }

    fetchRecords()
      .then((items) => {
        if (isMounted) setRecords(items)
      })
      .finally(() => {
        if (isMounted) setLoadingRecords(false)
      })

    return () => {
      isMounted = false
    }
  }, [departmentId, rangeId, refreshTrigger])

  // Build KPI Options
  const kpis: {
    label: string
    value: string
    note: string
    filterKey: string
    alert?: boolean
  }[] = useMemo(() => {
    if (liveSummary) {
      return [
        {
          label: liveSummary.primary_label,
          value: liveSummary.primary_value,
          note: liveSummary.trend || 'From live database',
          filterKey: 'all',
        },
        ...liveSummary.metrics.map((m) => ({
          label: m.label,
          value: m.value,
          note: 'Current status count',
          filterKey: normalizeFilterKey(m.label),
        })),
      ]
    }

    // Fallback if summary not loaded yet
    const totalCount = records.length
    if (departmentId === 'enquiries') {
      const qCount = records.filter((r) => r.status === 'qualified').length
      const pCount = records.filter((r) => r.status === 'pending').length
      const cCount = records.filter((r) => r.status === 'converted').length
      return [
        { label: 'Total enquiries', value: String(totalCount), note: 'All registered', filterKey: 'all' },
        { label: 'Qualified', value: String(qCount), note: 'Current status count', filterKey: 'qualified' },
        { label: 'Pending', value: String(pCount), note: 'Current status count', filterKey: 'pending' },
        { label: 'Converted', value: String(cCount), note: 'Current status count', filterKey: 'converted' },
      ]
    }

    return [
      { label: `Total ${meta.label}`, value: String(totalCount), note: 'All records', filterKey: 'all' },
    ]
  }, [liveSummary, records, departmentId, meta.label])

  // Attention Items
  const attentionItems = useMemo(() => {
    const pendingItems = records.filter((r) => r.status === 'pending')
    if (pendingItems.length > 0) {
      return pendingItems.slice(0, 4).map((r) => ({
        code: r.code,
        title: r.title,
        subtitle: r.subtitle || 'Pending review & qualification',
        link: r.link,
      }))
    }
    return []
  }, [records])

  // Filtered & Searched records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // 1. Status Filter
      if (selectedFilter !== 'all') {
        const recStatus = (rec.status || '').toLowerCase().replace(/\s+/g, '_')
        const target = selectedFilter.toLowerCase()
        if (recStatus !== target && !recStatus.includes(target)) {
          return false
        }
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchCode = rec.code.toLowerCase().includes(q)
        const matchTitle = rec.title.toLowerCase().includes(q)
        const matchSubtitle = (rec.subtitle || '').toLowerCase().includes(q)
        const matchStatus = (rec.status || '').toLowerCase().includes(q)
        if (!matchCode && !matchTitle && !matchSubtitle && !matchStatus) {
          return false
        }
      }

      return true
    })
  }, [records, selectedFilter, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRecords.slice(start, start + pageSize)
  }, [filteredRecords, page, pageSize])

  const activeKpi = kpis.find((k) => k.filterKey === selectedFilter)

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
              onClick={() => setRefreshTrigger((prev) => prev + 1)}
              disabled={loadingRecords}
              title="Refresh database records"
            >
              <RefreshCw className={cn('size-3.5', loadingRecords && 'animate-spin')} />
              <span>Refresh</span>
            </Button>
            <Button variant="primary" size="sm" onClick={onOpenCreate}>
              <Plus className="size-3.5" />
              <span>New {meta.noun}</span>
            </Button>
          </div>
        }
      />

      {/* 4 Interactive Option Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const isSelected = selectedFilter === kpi.filterKey
          return (
            <button
              type="button"
              key={kpi.label}
              onClick={() => {
                setSelectedFilter(kpi.filterKey)
                setPage(1)
              }}
              className={cn(
                'group relative flex flex-col items-start p-5 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none',
                isSelected
                  ? 'bg-card border-primary ring-2 ring-primary/40 shadow-lg shadow-primary/5'
                  : 'bg-card border-border hover:border-primary/50 hover:bg-muted/20'
              )}
            >
              <div className="flex w-full items-center justify-between">
                <p
                  className={cn(
                    'text-xs font-semibold transition-colors',
                    isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                >
                  {kpi.label}
                </p>
                {isSelected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    <Check className="size-3" />
                    Selected
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to filter
                  </span>
                )}
              </div>

              <p
                className={cn(
                  'mt-2 font-display text-3xl font-extrabold tracking-tight tabular-nums',
                  kpi.alert ? 'text-danger' : 'text-foreground'
                )}
              >
                {kpi.value}
              </p>

              <div className="mt-1 flex w-full items-center justify-between">
                <p className="text-xs text-muted-foreground">{kpi.note}</p>
                <span className="text-[11px] font-medium text-primary">
                  {isSelected ? 'Viewing data ↓' : 'Click to view'}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Two-Column Bottom: Needs Attention & Actual Records Table */}
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
            {attentionItems.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No pending blocker alerts for this department.
              </p>
            ) : (
              attentionItems.map((item, idx) => (
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
              ))
            )}
          </div>
        </Card>

        {/* Actual Records Table */}
        <Card className="p-5 lg:col-span-2">
          {/* Header with Title, Count, Search & Filter State */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {selectedFilter === 'all'
                    ? `All ${meta.label}`
                    : `${activeKpi?.label || selectedFilter} ${meta.label}`}
                </h3>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary tabular-nums">
                  {filteredRecords.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedFilter === 'all'
                  ? `Showing all records. Click any card above to filter.`
                  : `Filtered by ${activeKpi?.label || selectedFilter}. Click any card to switch.`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                  placeholder={`Search ${meta.label.toLowerCase()}...`}
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-md bg-muted/40 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>
              {selectedFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFilter('all')
                    setPage(1)
                  }}
                  className="text-xs h-8 px-2"
                >
                  Show all
                </Button>
              )}
            </div>
          </div>

          {/* Table Data */}
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2.5 font-semibold">Identifier</th>
                  <th className="py-2.5 font-semibold">Details / Entity</th>
                  <th className="py-2.5 font-semibold">Requirement / Notes</th>
                  {departmentId === 'enquiries' && (
                    <th className="py-2.5 font-semibold">Est. Budget</th>
                  )}
                  <th className="py-2.5 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingRecords ? (
                  <tr>
                    <td
                      colSpan={departmentId === 'enquiries' ? 6 : 5}
                      className="py-8 text-center text-xs text-muted-foreground"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="size-4 animate-spin text-primary" />
                        <span>Loading records...</span>
                      </div>
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td
                      colSpan={departmentId === 'enquiries' ? 6 : 5}
                      className="py-8 text-center text-xs"
                    >
                      <div className="flex flex-col items-center gap-2 text-danger">
                        <span>Could not fetch records: {loadError}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRefreshTrigger((prev) => prev + 1)}
                        >
                          <RefreshCw className="size-3.5 mr-1.5" />
                          Retry
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : paginatedRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={departmentId === 'enquiries' ? 6 : 5}
                      className="py-8 text-center text-xs text-muted-foreground"
                    >
                      No records found
                      {selectedFilter !== 'all' ? ` matching "${activeKpi?.label || selectedFilter}"` : ''}
                      {searchQuery ? ` and query "${searchQuery}"` : ''}.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 font-mono font-bold">
                        <button
                          type="button"
                          onClick={() => navigate(rec.link)}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          {rec.code}
                        </button>
                      </td>
                      <td className="py-2.5">
                        <p className="font-semibold text-foreground">{rec.title}</p>
                        {rec.assignedTo && (
                          <p className="text-[11px] text-muted-foreground">{rec.assignedTo}</p>
                        )}
                      </td>
                      <td className="py-2.5 text-muted-foreground max-w-xs truncate" title={rec.subtitle}>
                        {rec.subtitle || '—'}
                      </td>
                      {departmentId === 'enquiries' && (
                        <td className="py-2.5 font-mono font-medium text-foreground">
                          {rec.budget || '—'}
                        </td>
                      )}
                      <td className="py-2.5">
                        <StatusBadge department={departmentId} status={rec.status} />
                      </td>
                      <td className="py-2.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(rec.link)}
                          className="h-7 text-xs"
                        >
                          <span>Open</span>
                          <ArrowUpRight className="size-3 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-3 mt-3 text-xs text-muted-foreground">
              <span>
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, filteredRecords.length)} of {filteredRecords.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="h-7 px-2 text-xs"
                >
                  <ChevronLeft className="size-3.5" />
                  <span className="hidden sm:inline ml-1">Prev</span>
                </Button>
                <span className="px-2 font-medium text-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="h-7 px-2 text-xs"
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  )
}
