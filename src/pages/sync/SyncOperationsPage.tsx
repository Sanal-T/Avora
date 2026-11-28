import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { PageContainer, PageHeader } from '../../components/shared/PageHeader'

interface SyncSourceStatus {
  source_system: string
  display_name: string
  status: string
  last_poll_at: string | null
  last_success_at: string | null
  last_backfill_at: string | null
  last_reconcile_at: string | null
  last_acked_seq: number
  pending_count: number
  failed_count: number
  last_error: string | null
}

interface SyncStatusResponse {
  read_only: boolean
  last_successful_sync: string | null
  total_pending: number
  total_failed: number
  mappings_needing_review: number
  counts: Record<string, number>
  sources: SyncSourceStatus[]
}

type MirrorTab =
  | 'quotations'
  | 'enquiries'
  | 'designs'
  | 'work-confirmed'
  | 'complaints'
  | 'review'

export function SyncOperationsPage() {
  const [activeTab, setActiveTab] = useState<MirrorTab>('quotations')
  const [statusData, setStatusData] = useState<SyncStatusResponse | null>(null)
  const [rows, setRows] = useState<any[]>([])
  const [failedEvents, setFailedEvents] = useState<any[]>([])
  const [mappings, setMappings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const statusRes = await apiFetch<SyncStatusResponse>('/api/sync/status')
      setStatusData(statusRes)

      if (activeTab === 'review') {
        const [failRes, mapRes] = await Promise.all([
          apiFetch<{ items: any[] }>('/api/sync/failed-events?status_filter=failed'),
          apiFetch<{ items: any[] }>('/api/sync/mappings?limit=200'),
        ])
        setFailedEvents(failRes.items || [])
        setMappings(mapRes.items || [])
      } else {
        const res = await apiFetch<{ items: any[] }>(`/api/sync/${activeTab}?limit=200`)
        setRows(res.items || [])
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load read-only sync mirror data.')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRetryFailed = async () => {
    setRetrying(true)
    try {
      await apiFetch('/api/sync/failed-events/retry', { method: 'POST' })
      await loadData()
    } catch (err: any) {
      setError(err?.message || 'Retry failed')
    } finally {
      setRetrying(false)
    }
  }

  const fmtTime = (iso: string | null) => {
    if (!iso) return 'Never'
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
  }

  const fmtCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Cross-App Read-Only Sync Mirrors"
        description="One-way mirrored visibility from Designer Task Scheduler and Quotation Management. Source apps retain sole write ownership."
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-500">
              <Lock className="size-3.5" />
              Read-Only Mirror
            </span>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Health & Freshness Telemetry Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Last Successful Sync</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="text-sm font-semibold text-foreground">
            {fmtTime(statusData?.last_successful_sync ?? null)}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Pending Outbox Events</span>
            <Database className="size-4 text-sky-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {statusData?.total_pending ?? 0}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Failed Events (Quarantined)</span>
            <AlertTriangle
              className={`size-4 ${
                (statusData?.total_failed ?? 0) > 0 ? 'text-rose-500' : 'text-emerald-500'
              }`}
            />
          </div>
          <div className="text-xl font-bold text-foreground">
            {statusData?.total_failed ?? 0}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Mappings Needing Review</span>
            <ShieldCheck className="size-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {statusData?.mappings_needing_review ?? 0}
          </div>
        </div>
      </div>

      {/* Per-Source Status Strip */}
      {statusData?.sources && statusData.sources.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 mb-6">
          {statusData.sources.map((src) => (
            <div
              key={src.source_system}
              className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-4"
            >
              <div>
                <div className="text-xs font-semibold text-foreground">{src.display_name}</div>
                <div className="text-[11px] text-muted-foreground">
                  Last success: {fmtTime(src.last_success_at)} · Acked Seq #{src.last_acked_seq}
                </div>
                {src.last_error && (
                  <div className="mt-1 text-[11px] text-rose-500 truncate max-w-md">
                    {src.last_error}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 text-[11px]">
                <span className="rounded-md bg-muted px-2 py-0.5 font-medium">
                  Pending: {src.pending_count}
                </span>
                <span className="rounded-md bg-muted px-2 py-0.5 font-medium">
                  Failed: {src.failed_count}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-semibold uppercase ${
                    src.status === 'healthy'
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : src.status === 'offline' || src.status === 'degraded'
                      ? 'bg-rose-500/15 text-rose-500'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {src.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mirror Section Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3 mb-4">
        {(
          [
            ['quotations', 'Quotations (Commercial Truth)'],
            ['enquiries', 'Enquiries Register'],
            ['designs', 'Design Tasks'],
            ['work-confirmed', 'Work Confirmed'],
            ['complaints', 'Complaints Register'],
            ['review', 'Failures & Mapping Review'],
          ] as [MirrorTab, string][]
        ).map(([tabKey, label]) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setActiveTab(tabKey)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === tabKey
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Data Display */}
      {activeTab === 'review' ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                Failed Events ({failedEvents.length})
              </h3>
              <button
                type="button"
                onClick={handleRetryFailed}
                disabled={retrying || failedEvents.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className={`size-3.5 ${retrying ? 'animate-spin' : ''}`} />
                Retry Failed
              </button>
            </div>
            {failedEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No failed sync events.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Source</th>
                      <th className="py-2 pr-4">Table / PK</th>
                      <th className="py-2 pr-4">Ver</th>
                      <th className="py-2 pr-4">Retries</th>
                      <th className="py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedEvents.map((ev) => (
                      <tr key={ev.id} className="border-b border-border/50">
                        <td className="py-2 pr-4">{ev.source_system}</td>
                        <td className="py-2 pr-4 font-mono">
                          {ev.source_table}#{ev.source_pk}
                        </td>
                        <td className="py-2 pr-4">{ev.record_version}</td>
                        <td className="py-2 pr-4">{ev.retry_count}</td>
                        <td className="py-2 text-rose-500">{ev.error_message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              External ID Mapping Review ({mappings.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Source Key</th>
                    <th className="py-2 pr-4">Source Label</th>
                    <th className="py-2 pr-4">Target Type</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m) => (
                    <tr key={m.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono">
                        {m.source_system}.{m.source_table}#{m.source_pk}
                      </td>
                      <td className="py-2 pr-4">{m.source_label || '—'}</td>
                      <td className="py-2 pr-4">{m.avora_entity_type || '—'}</td>
                      <td className="py-2 pr-4">
                        <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium">
                          {m.match_status}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">{m.match_reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              {activeTab === 'quotations' && (
                <tr>
                  <th className="p-3">Quote No</th>
                  <th className="p-3">Project / Client</th>
                  <th className="p-3">Option</th>
                  <th className="p-3">Rounded Total</th>
                  <th className="p-3">GST Amount</th>
                  <th className="p-3">Grand Total</th>
                  <th className="p-3">Status</th>
                </tr>
              )}
              {activeTab === 'enquiries' && (
                <tr>
                  <th className="p-3">SL No</th>
                  <th className="p-3">Project / Client</th>
                  <th className="p-3">Designer</th>
                  <th className="p-3">Linked Task</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Customer Match</th>
                </tr>
              )}
              {activeTab === 'designs' && (
                <tr>
                  <th className="p-3">Task ID</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Assignee</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                </tr>
              )}
              {activeTab === 'work-confirmed' && (
                <tr>
                  <th className="p-3">Job Card</th>
                  <th className="p-3">Project / Client</th>
                  <th className="p-3">Confirmed Quote</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Production Status</th>
                </tr>
              )}
              {activeTab === 'complaints' && (
                <tr>
                  <th className="p-3">SL No</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">Rectified By</th>
                  <th className="p-3">Status</th>
                </tr>
              )}
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    {loading ? 'Loading mirrored rows…' : 'No mirrored rows synchronized yet.'}
                  </td>
                </tr>
              )}
              {activeTab === 'quotations' &&
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="p-3 font-mono font-semibold">
                      {r.quote_no || r.quote_id} (v{r.quote_version ?? 1})
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-foreground">{r.project_name || '—'}</div>
                      <div className="text-muted-foreground">{r.client_name || '—'}</div>
                    </td>
                    <td className="p-3">
                      {r.selected_option_label || `Option ${r.active_option_index + 1}`}
                    </td>
                    <td className="p-3 font-mono">{fmtCurrency(r.source_rounded_total)}</td>
                    <td className="p-3 font-mono">
                      {r.include_tax === false ? 'Excluded' : fmtCurrency(r.source_tax_amount)}
                    </td>
                    <td className="p-3 font-mono font-semibold">
                      {fmtCurrency(r.source_grand_total)}
                    </td>
                    <td className="p-3">
                      {r.source_status} {r.approval_status ? `· ${r.approval_status}` : ''}
                    </td>
                  </tr>
                ))}
              {activeTab === 'enquiries' &&
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="p-3 font-mono">#{r.sl_no ?? r.source_pk}</td>
                    <td className="p-3">
                      <div className="font-medium text-foreground">{r.project_name || '—'}</div>
                      <div className="text-muted-foreground">{r.client_name || '—'}</div>
                    </td>
                    <td className="p-3">{r.designer_name || '—'}</td>
                    <td className="p-3 font-mono">
                      {r.linked_task_source_pk ? `Task #${r.linked_task_source_pk}` : '—'}
                    </td>
                    <td className="p-3">{r.source_status || '—'}</td>
                    <td className="p-3">{r.customer_match_status}</td>
                  </tr>
                ))}
              {activeTab === 'designs' &&
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="p-3 font-mono">#{r.source_pk}</td>
                    <td className="p-3 font-medium text-foreground">{r.title || '—'}</td>
                    <td className="p-3">{r.assignee_name || r.assignee_source_pk || '—'}</td>
                    <td className="p-3">{r.task_date || '—'}</td>
                    <td className="p-3">{r.priority || '—'}</td>
                    <td className="p-3">{r.source_status || '—'}</td>
                  </tr>
                ))}
              {activeTab === 'work-confirmed' &&
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="p-3 font-mono">{r.job_card_no || `#${r.source_pk}`}</td>
                    <td className="p-3">
                      <div className="font-medium text-foreground">{r.project_name || '—'}</div>
                      <div className="text-muted-foreground">{r.client_name || '—'}</div>
                    </td>
                    <td className="p-3 font-mono">{r.confirmed_quotation_no || '—'}</td>
                    <td className="p-3 font-mono">{fmtCurrency(r.quotation_amount)}</td>
                    <td className="p-3">{r.production_status || '—'}</td>
                  </tr>
                ))}
              {activeTab === 'complaints' &&
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="p-3 font-mono">#{r.sl_no ?? r.source_pk}</td>
                    <td className="p-3">{r.client_name || '—'}</td>
                    <td className="p-3 max-w-md truncate">{r.complaint_details || '—'}</td>
                    <td className="p-3">{r.rectified_by || '—'}</td>
                    <td className="p-3">{r.source_status || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  )
}
