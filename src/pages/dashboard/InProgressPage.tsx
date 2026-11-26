import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { PageContainer, PageHeader } from '../../components/shared/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { designApi, quotationApi, productionApi, type Design, type Quotation, type WorkOrder } from '../../lib/api'
import { rangeDates } from '../../lib/dates'
import type { RangeKey } from '../../data/dashboard'
import { cn } from '../../lib/cn'

export function InProgressPage({ rangeId }: { rangeId: RangeKey }) {
  const [tab, setTab] = useState<'designs' | 'quotations' | 'productions'>('designs')
  const [loading, setLoading] = useState(true)
  const [designs, setDesigns] = useState<Design[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [productions, setProductions] = useState<WorkOrder[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const { dateFrom, dateTo } = rangeDates(rangeId)
    try {
      const [dRes, qRes, pRes] = await Promise.all([
        designApi.listDesigns({ page_size: 2000, date_from: dateFrom, date_to: dateTo }),
        quotationApi.listQuotations({ page_size: 2000, date_from: dateFrom, date_to: dateTo }),
        productionApi.listWorkOrders({ page_size: 2000, date_from: dateFrom, date_to: dateTo }),
      ])
      setDesigns(
        (dRes.items || []).filter((d) => (d.status || '').toLowerCase() === 'in progress'),
      )
      setQuotations(
        (qRes.items || []).filter((q) => {
          const s = (q.status || '').toLowerCase()
          return s.includes('draft') || s.includes('sent') || s.includes('await') || s.includes('pend') || s.includes('revis')
        }),
      )
      setProductions(
        (pRes.items || []).filter((w) => {
          const s = (w.status || '').toLowerCase()
          return !s.includes('complet') && !s.includes('cancel')
        }),
      )
    } finally {
      setLoading(false)
    }
  }, [rangeId])

  useEffect(() => {
    load()
  }, [load])

  return (
    <PageContainer>
      <div className="mb-2">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to Overview
        </Link>
      </div>

      <PageHeader
        title="In Progress"
        description="Live operational view of in-progress designs, pending quotations, and active productions."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('size-3.5 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {[
          { id: 'designs', label: `Designs (${designs.length})` },
          { id: 'quotations', label: `Quotations (${quotations.length})` },
          { id: 'productions', label: `Productions (${productions.length})` },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as any)}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
              tab === item.id
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Card className="p-5 mt-4">
        {loading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Loading live records...</div>
        ) : tab === 'designs' ? (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2.5 pr-3 font-semibold w-28">Identifier</th>
                  <th className="py-2.5 px-3 font-semibold w-[30%]">Proposal / Designer</th>
                  <th className="py-2.5 px-3 font-semibold w-[18%]">Site / Location</th>
                  <th className="py-2.5 px-3 font-semibold w-24">Priority</th>
                  <th className="py-2.5 px-3 font-semibold w-28">Due Date</th>
                  <th className="py-2.5 pl-3 font-semibold w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {designs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">No in-progress designs.</td>
                  </tr>
                ) : (
                  designs.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/30">
                      <td className="py-2.5 pr-3 font-mono font-bold text-primary whitespace-nowrap">{d.design_number}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-foreground">{d.title}</p>
                        <p className="text-[11px] text-muted-foreground">{d.assigned_designer_name || 'Design Team'}</p>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{d.site_location || '—'}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{d.priority}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground whitespace-nowrap">{d.expected_completion_date || '—'}</td>
                      <td className="py-2.5 pl-3 whitespace-nowrap">
                        <StatusBadge department="designs" status="in_progress" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : tab === 'quotations' ? (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2.5 pr-3 font-semibold w-32">Quotation #</th>
                  <th className="py-2.5 px-3 font-semibold w-[32%]">Customer</th>
                  <th className="py-2.5 px-3 font-semibold w-28">Value</th>
                  <th className="py-2.5 px-3 font-semibold w-28">Valid Until</th>
                  <th className="py-2.5 pl-3 font-semibold w-32">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">No pending quotations.</td>
                  </tr>
                ) : (
                  quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-muted/30">
                      <td className="py-2.5 pr-3 font-mono font-bold text-primary whitespace-nowrap">{q.quotation_number}</td>
                      <td className="py-2.5 px-3 font-semibold">{q.customer_company || q.customer_name || 'Client'}</td>
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap">₹{Number(q.total_amount || 0).toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground whitespace-nowrap">{q.valid_until || '—'}</td>
                      <td className="py-2.5 pl-3 whitespace-nowrap">
                        <StatusBadge department="quotations" status="pending" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2.5 pr-3 font-semibold w-32">Work Order #</th>
                  <th className="py-2.5 px-3 font-semibold w-[32%]">Title / Customer</th>
                  <th className="py-2.5 px-3 font-semibold w-24">Progress</th>
                  <th className="py-2.5 px-3 font-semibold w-28">Planned End</th>
                  <th className="py-2.5 pl-3 font-semibold w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">No active productions.</td>
                  </tr>
                ) : (
                  productions.map((w) => (
                    <tr key={w.id} className="hover:bg-muted/30">
                      <td className="py-2.5 pr-3 font-mono font-bold text-primary whitespace-nowrap">{w.work_order_number}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-foreground">{w.title}</p>
                        <p className="text-[11px] text-muted-foreground">{w.customer_company || w.customer_name || 'Production'}</p>
                      </td>
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap">{(w as any).progress_percentage ?? 0}%</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground whitespace-nowrap">{w.planned_end_date || '—'}</td>
                      <td className="py-2.5 pl-3 whitespace-nowrap">
                        <StatusBadge department="production" status="active" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageContainer>
  )
}
