import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, ArrowUpRight, FileEdit, RefreshCw } from 'lucide-react'
import { PageContainer, PageHeader } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { DataTable, type ColumnDef, type QuickFilterTab } from '../../../components/shared/DataTable'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { mockQuotations, type MockQuotation } from '../../../data/mockData'
import { quotationApi, type Quotation } from '../../../lib/api'

function toUiQuotation(q: Quotation): MockQuotation {
  const st = (q.status || '').toLowerCase()
  let status: MockQuotation['status'] = 'pending'
  if (st.includes('approv')) status = 'approved'
  else if (st.includes('convert')) status = 'converted'
  else if (st.includes('reject')) status = 'rejected'

  const client = q.customer_company || q.customer_name
  const total = Number(q.total_amount ?? q.subtotal ?? 0)

  return {
    id: q.id,
    code: q.quotation_number,
    enquiryCode: q.enquiry_number || (q.enquiry_id ? 'Linked' : 'Direct'),
    client: client || 'Client',
    title: `Estimate for ${client || 'Project'}`,
    status,
    version: q.revision_number || 1,
    subtotal: Number(q.subtotal ?? total),
    discountTotal: Number(q.discount_amount || 0),
    taxTotal: Number(q.tax_amount || 0),
    grandTotal: total,
    dueDate: q.valid_until || (q.created_at || '').slice(0, 10),
    author: 'Sales Team',
    items: [],
  }
}

export function QuotationsListPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<MockQuotation[]>([])
  const [activeTab, setActiveTab] = useState<string>('all')
  const [loading, setLoading] = useState(false)

  const fetchQuotations = () => {
    setLoading(true)
    quotationApi
      .listQuotations({ page_size: 100 })
      .then((res) => {
        if (res.items && res.items.length > 0) {
          setData(res.items.map(toUiQuotation))
        } else if (res.items) {
          setData([])
        }
      })
      .catch((err) => {
        console.warn('Could not load live quotations from PostgreSQL, fallback to mock:', err)
        setData(mockQuotations)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchQuotations()
  }, [])

  const filterTabs: QuickFilterTab[] = [
    { id: 'all', label: 'All Quotations', count: data.length },
    { id: 'pending', label: 'Pending Approval', count: data.filter((q) => q.status === 'pending').length },
    { id: 'approved', label: 'Approved', count: data.filter((q) => q.status === 'approved').length },
    { id: 'converted', label: 'Converted', count: data.filter((q) => q.status === 'converted').length },
  ]

  const filteredData =
    activeTab === 'all' ? data : data.filter((q) => q.status === activeTab)

  const columns: ColumnDef<MockQuotation>[] = [
    {
      key: 'code',
      header: 'Quote Ref',
      sortable: true,
      cell: (row) => (
        <button
          type="button"
          onClick={() => navigate(`/quotations/${row.id}`)}
          className="font-mono font-bold text-primary hover:underline cursor-pointer"
        >
          {row.code}
        </button>
      ),
    },
    {
      key: 'title',
      header: 'Quotation Title & Client',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-semibold text-foreground">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.client} · Enq: {row.enquiryCode}</p>
        </div>
      ),
    },
    {
      key: 'version',
      header: 'Rev',
      cell: (row) => <span className="font-mono text-xs font-semibold">v{row.version}</span>,
    },
    {
      key: 'grandTotal',
      header: 'Total Value (INR)',
      sortable: true,
      align: 'right',
      cell: (row) => (
        <span className="font-mono font-bold text-foreground tabular-nums">
          ₹{(row.grandTotal).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <StatusBadge department="quotations" status={row.status} showIcon />,
    },
    {
      key: 'dueDate',
      header: 'Expiry / Target',
      sortable: true,
      cell: (row) => <span className="text-xs text-muted-foreground">{row.dueDate}</span>,
    },
    {
      key: 'author',
      header: 'Prepared By',
      sortable: true,
      cell: (row) => <span className="text-xs text-foreground font-medium">{row.author}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/quotations/builder?id=${row.id}`)}
            title="Edit in Quotation Builder"
          >
            <FileEdit className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/quotations/${row.id}`)}
          >
            View
            <ArrowUpRight className="size-3.5 ml-1" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/quotations')}>
          <ArrowLeft className="size-3.5 mr-1" />
          Quotations Dashboard
        </Button>
      </div>

      <PageHeader
        title="Quotations Registry"
        description="Formal estimates, line item pricing, customer approvals, and commercial hand-offs."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchQuotations} disabled={loading}>
              <RefreshCw className={`size-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/quotations/builder')}>
              <Plus className="size-3.5 mr-1" />
              <span>Open Quotation Builder</span>
            </Button>
          </div>
        }
      />

      <DataTable
        data={filteredData}
        loading={loading}
        columns={columns}
        keyExtractor={(row) => row.id}
        searchPlaceholder="Search quotations by title, client or reference…"
        filterTabs={filterTabs}
        activeFilterTab={activeTab}
        onFilterTabChange={setActiveTab}
        exportFilename="avora_quotations_registry.csv"
      />
    </PageContainer>
  )
}
