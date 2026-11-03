import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, ArrowUpRight, Phone, Mail, Building } from 'lucide-react'
import { PageContainer, PageHeader } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { DataTable, type ColumnDef, type QuickFilterTab } from '../../../components/shared/DataTable'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { mockEnquiries, type MockEnquiry } from '../../../data/mockData'
import { EnquiryFormModal } from './EnquiryFormModal'

export function EnquiriesListPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<MockEnquiry[]>(mockEnquiries)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const filterTabs: QuickFilterTab[] = [
    { id: 'all', label: 'All Enquiries', count: data.length },
    { id: 'pending', label: 'Pending Review', count: data.filter((e) => e.status === 'pending').length },
    { id: 'qualified', label: 'Qualified', count: data.filter((e) => e.status === 'qualified').length },
    { id: 'converted', label: 'Converted', count: data.filter((e) => e.status === 'converted').length },
  ]

  const filteredData =
    activeTab === 'all' ? data : data.filter((e) => e.status === activeTab)

  const columns: ColumnDef<MockEnquiry>[] = [
    {
      key: 'code',
      header: 'Enquiry Code',
      sortable: true,
      cell: (row) => (
        <button
          type="button"
          onClick={() => navigate(`/enquiries/${row.id}`)}
          className="font-mono font-bold text-primary hover:underline cursor-pointer"
        >
          {row.code}
        </button>
      ),
    },
    {
      key: 'company',
      header: 'Company & Contact',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-semibold text-foreground">{row.company}</p>
          <p className="text-xs text-muted-foreground">{row.customerName}</p>
        </div>
      ),
    },
    {
      key: 'requirement',
      header: 'Requirement Summary',
      cell: (row) => (
        <p className="truncate max-w-xs text-xs text-muted-foreground" title={row.requirement}>
          {row.requirement}
        </p>
      ),
    },
    {
      key: 'budget',
      header: 'Est. Budget',
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-medium tabular-nums">{row.budget}</span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      sortable: true,
      cell: (row) => (
        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{row.source}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <StatusBadge department="enquiries" status={row.status} showIcon />,
    },
    {
      key: 'assignedTo',
      header: 'Assignee',
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-foreground font-medium">{row.assignedTo}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/enquiries/${row.id}`)}
        >
          View
          <ArrowUpRight className="size-3.5 ml-1" />
        </Button>
      ),
    },
  ]

  const handleCreateSuccess = (newEnq: MockEnquiry) => {
    setData([newEnq, ...data])
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/enquiries')}>
          <ArrowLeft className="size-3.5 mr-1" />
          Enquiries Dashboard
        </Button>
      </div>

      <PageHeader
        title="Enquiries Registry"
        description="Track incoming customer commercial specifications, qualifications, and hand-offs."
        actions={
          <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="size-3.5" />
            <span>New Enquiry</span>
          </Button>
        }
      />

      <DataTable
        data={filteredData}
        columns={columns}
        keyExtractor={(row) => row.id}
        searchPlaceholder="Search enquiries by code, customer or company…"
        filterTabs={filterTabs}
        activeFilterTab={activeTab}
        onFilterTabChange={setActiveTab}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        exportFilename="avora_enquiries_registry.csv"
      />

      <EnquiryFormModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreateSuccess={handleCreateSuccess}
      />
    </PageContainer>
  )
}
