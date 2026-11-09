import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, ArrowUpRight, FileText, CheckCircle2, FileEdit } from 'lucide-react'
import { PageContainer, PageHeader } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { DataTable, type ColumnDef, type QuickFilterTab } from '../../../components/shared/DataTable'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { mockQuotations, type MockQuotation } from '../../../data/mockData'

export function QuotationsListPage() {
  const navigate = useNavigate()
  const [data] = useState<MockQuotation[]>(mockQuotations)
  const [activeTab, setActiveTab] = useState<string>('all')

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
          <Button variant="primary" size="sm" onClick={() => navigate('/quotations/builder')}>
            <Plus className="size-3.5" />
            <span>Open Quotation Builder</span>
          </Button>
        }
      />

      <DataTable
        data={filteredData}
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
