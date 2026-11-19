import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, ArrowUpRight, Calendar, AlertTriangle } from 'lucide-react'
import { PageContainer, PageHeader } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { DataTable, type ColumnDef, type QuickFilterTab } from '../../../components/shared/DataTable'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { mockWorkOrders, type MockWorkOrder } from '../../../data/mockData'
import { WorkOrderFormModal } from './WorkOrderFormModal'

export function ProductionListPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<MockWorkOrder[]>(() => [...mockWorkOrders])
  const [activeTab, setActiveTab] = useState<string>('all')
  const [workOrderModalOpen, setWorkOrderModalOpen] = useState(false)

  const filterTabs: QuickFilterTab[] = [
    { id: 'all', label: 'All Work Orders', count: data.length },
    { id: 'active', label: 'Active Shop Floor', count: data.filter((w) => w.status === 'active').length },
    { id: 'delayed', label: 'Delayed / Attention', count: data.filter((w) => w.status === 'delayed').length },
    { id: 'completed', label: 'Completed', count: data.filter((w) => w.status === 'completed').length },
  ]

  const filteredData =
    activeTab === 'all' ? data : data.filter((w) => w.status === activeTab)

  const columns: ColumnDef<MockWorkOrder>[] = [
    {
      key: 'code',
      header: 'Work Order',
      sortable: true,
      cell: (row) => (
        <button
          type="button"
          onClick={() => navigate(`/production/${row.id}`)}
          className="font-mono font-bold text-primary hover:underline cursor-pointer"
        >
          {row.code}
        </button>
      ),
    },
    {
      key: 'title',
      header: 'Job Title & Client',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-semibold text-foreground">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.client} · Quote: {row.quotationCode}</p>
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Current Stage',
      sortable: true,
      cell: (row) => (
        <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
          {row.stage}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <StatusBadge department="production" status={row.status} showIcon />,
    },
    {
      key: 'completionRate',
      header: 'Fabrication Progress',
      sortable: true,
      cell: (row) => (
        <div className="w-28 space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Done</span>
            <span className="font-bold tabular-nums text-foreground">{row.completionRate}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all ${row.status === 'delayed' ? 'bg-danger' : 'bg-dept-production'}`}
              style={{ width: `${row.completionRate}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'leadWorker',
      header: 'Supervisor / Lead',
      sortable: true,
      cell: (row) => <span className="text-xs font-medium text-foreground">{row.leadWorker}</span>,
    },
    {
      key: 'deliveryDate',
      header: 'Target Handover',
      sortable: true,
      cell: (row) => (
        <span className={`text-xs ${row.status === 'delayed' ? 'font-bold text-danger' : 'text-muted-foreground'}`}>
          {row.deliveryDate}
        </span>
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
          onClick={() => navigate(`/production/${row.id}`)}
        >
          View Job
          <ArrowUpRight className="size-3.5 ml-1" />
        </Button>
      ),
    },
  ]

  return (
    <PageContainer>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/production')}>
          <ArrowLeft className="size-3.5 mr-1" />
          Production Dashboard
        </Button>
      </div>

      <PageHeader
        title="Production Work Orders"
        description="Shop floor manufacturing jobs, stage progress, assembly checklist and field installation."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/production/calendar')}>
              <Calendar className="size-3.5 mr-1" />
              <span>Production Calendar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/production/schedule')}>
              <Calendar className="size-3.5 mr-1" />
              <span>Timeline Schedule</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setWorkOrderModalOpen(true)}>
              <Plus className="size-3.5 mr-1" />
              <span>New Work Order</span>
            </Button>
          </div>
        }
      />

      <DataTable
        data={filteredData}
        columns={columns}
        keyExtractor={(row) => row.id}
        searchPlaceholder="Search work orders by title, client or code…"
        filterTabs={filterTabs}
        activeFilterTab={activeTab}
        onFilterTabChange={setActiveTab}
        exportFilename="avora_work_orders.csv"
      />

      <WorkOrderFormModal
        open={workOrderModalOpen}
        onClose={() => setWorkOrderModalOpen(false)}
        onCreateSuccess={(newWo) => {
          setData([newWo, ...data])
        }}
      />
    </PageContainer>
  )
}
