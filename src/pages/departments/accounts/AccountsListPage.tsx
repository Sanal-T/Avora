import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, RefreshCw } from 'lucide-react'
import { PageContainer, PageHeader } from '../../../components/shared/PageHeader'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { accountsApi, apiFetch, type AccountsRecord } from '../../../lib/api'
import { getCachedData, invalidateCache, setCachedData } from '../../../lib/cache'

interface AccountsSummary {
  total_accounts_records: number
  invoices_pending: number
  invoices_generated: number
  payments_pending: number
  partially_paid: number
  fully_paid: number
  closed_records: number
  overdue_payments: number
  total_invoiced: number | string
  total_received: number | string
  outstanding_balance: number | string
  collection_rate: number
}

export function AccountsListPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const cacheKey = `list:accounts:${statusFilter}`
  const [items, setItems] = useState<AccountsRecord[]>(() => getCachedData<AccountsRecord[]>(cacheKey) || [])
  const [summary, setSummary] = useState<AccountsSummary | null>(() => getCachedData<AccountsSummary>('summary:accounts'))
  const [loading, setLoading] = useState(() => !getCachedData(cacheKey))

  const load = async (force = false) => {
    if (force) {
      invalidateCache('list:accounts:')
      invalidateCache('summary:accounts')
    }
    const cached = !force && !search ? getCachedData<AccountsRecord[]>(cacheKey) : null
    if (cached) {
      setItems(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }
    try {
      const [res, sumRes] = await Promise.all([
        accountsApi.list({ page_size: 2000, status: statusFilter, search: search || undefined, compact: true }),
        apiFetch<AccountsSummary>('/api/accounts/summary').catch(() => null),
      ])
      setItems(res.items)
      if (!search) setCachedData(cacheKey, res.items)
      if (sumRes) {
        setSummary(sumRes)
        setCachedData('summary:accounts', sumRes)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(false)
  }, [statusFilter])

  return (
    <PageContainer>
      <PageHeader
        title="Accounts & Financial Tracking"
        description="Track projects transferred from Production, invoices, partial payments, and financial closure."
        actions={
          <Button variant="outline" size="sm" onClick={() => load(true)}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Total Invoiced</p>
          <p className="mt-1.5 font-display text-2xl font-extrabold tabular-nums">
            ₹{Number(summary?.total_invoiced || 0).toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {summary?.total_accounts_records ?? 0} accounts records
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Total Received</p>
          <p className="mt-1.5 font-display text-2xl font-extrabold text-emerald-500 tabular-nums">
            ₹{Number(summary?.total_received || 0).toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {summary?.collection_rate ?? 0}% collection rate
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Outstanding Balance</p>
          <p className="mt-1.5 font-display text-2xl font-extrabold text-amber-500 tabular-nums">
            ₹{Number(summary?.outstanding_balance || 0).toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {(summary?.payments_pending ?? 0) + (summary?.partially_paid ?? 0)} pending / partial
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Overdue Payments</p>
          <p className="mt-1.5 font-display text-2xl font-extrabold text-rose-500 tabular-nums">
            {summary?.overdue_payments ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {summary?.closed_records ?? 0} closed records
          </p>
        </Card>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by accounts # or project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border rounded-md bg-background"
          >
            <option value="all">All Statuses</option>
            <option value="Sent to Accounts">Sent to Accounts</option>
            <option value="Invoice Generated">Invoice Generated</option>
            <option value="Payment Pending">Payment Pending</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Fully Paid">Fully Paid</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading accounts records...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No accounts records found. Records appear here once completed production work orders are transferred to Accounts.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Accounts #</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Invoiced</th>
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3">Outstanding</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/accounts/${a.id}`} className="text-primary hover:underline">
                        {a.accounts_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{a.project_number} — {a.project_name}</td>
                    <td className="px-4 py-3">{a.customer_name || '-'}</td>
                    <td className="px-4 py-3">₹{Number(a.total_invoiced || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">₹{Number(a.total_received || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium">₹{Number(a.outstanding_amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageContainer>
  )
}
