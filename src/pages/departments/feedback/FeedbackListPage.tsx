import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Star, MessageSquare } from 'lucide-react'
import { PageContainer, PageHeader } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { DataTable, type ColumnDef, type QuickFilterTab } from '../../../components/shared/DataTable'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { mockFeedback, type MockFeedback } from '../../../data/mockData'

export function FeedbackListPage() {
  const navigate = useNavigate()
  const [data] = useState<MockFeedback[]>(mockFeedback)
  const [activeTab, setActiveTab] = useState<string>('all')

  const filterTabs: QuickFilterTab[] = [
    { id: 'all', label: 'All Responses', count: data.length },
    { id: 'received', label: 'Received Reviews', count: data.filter((f) => f.status === 'received').length },
    { id: 'awaiting', label: 'Awaiting Survey', count: data.filter((f) => f.status === 'awaiting').length },
  ]

  const filteredData =
    activeTab === 'all' ? data : data.filter((f) => f.status === activeTab)

  const columns: ColumnDef<MockFeedback>[] = [
    {
      key: 'code',
      header: 'Feedback Ref',
      sortable: true,
      cell: (row) => (
        <button
          type="button"
          onClick={() => navigate(`/feedback/${row.id}`)}
          className="font-mono font-bold text-primary hover:underline cursor-pointer"
        >
          {row.code}
        </button>
      ),
    },
    {
      key: 'client',
      header: 'Client & Work Order',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-semibold text-foreground">{row.client}</p>
          <p className="text-xs text-muted-foreground">WO: {row.workOrderCode}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      cell: (row) => (
        <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
          {row.category}
        </span>
      ),
    },
    {
      key: 'rating',
      header: 'CSAT Rating',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 font-mono font-bold text-xs text-foreground">
          <Star className="size-3.5 fill-warning text-warning" />
          <span>{row.rating} / 5</span>
        </div>
      ),
    },
    {
      key: 'comments',
      header: 'Customer Review',
      cell: (row) => (
        <p className="truncate max-w-xs text-xs text-muted-foreground" title={row.comments}>
          &ldquo;{row.comments}&rdquo;
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <StatusBadge department="feedback" status={row.status} showIcon />,
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      cell: (row) => <span className="text-xs text-muted-foreground">{row.date}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/feedback/${row.id}`)}
        >
          Inspect
          <ArrowUpRight className="size-3.5 ml-1" />
        </Button>
      ),
    },
  ]

  return (
    <PageContainer>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/feedback')}>
          <ArrowLeft className="size-3.5 mr-1" />
          Feedback Dashboard
        </Button>
      </div>

      <PageHeader
        title="Customer Feedback & CSAT"
        description="Post-installation quality reviews, customer satisfaction surveys, and service sentiment."
      />

      <DataTable
        data={filteredData}
        columns={columns}
        keyExtractor={(row) => row.id}
        searchPlaceholder="Search feedback by client or review keyword…"
        filterTabs={filterTabs}
        activeFilterTab={activeTab}
        onFilterTabChange={setActiveTab}
        exportFilename="avora_feedback_registry.csv"
      />
    </PageContainer>
  )
}
