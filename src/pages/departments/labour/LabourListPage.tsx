import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, UserCheck, Phone, Wrench } from 'lucide-react'
import { PageContainer, PageHeader } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { DataTable, type ColumnDef, type QuickFilterTab } from '../../../components/shared/DataTable'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { mockWorkers, type MockWorker } from '../../../data/mockData'
import { toast } from '../../../lib/toast'

export function LabourListPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<MockWorker[]>(mockWorkers)
  const [activeTab, setActiveTab] = useState<string>('all')

  const filterTabs: QuickFilterTab[] = [
    { id: 'all', label: 'All Workers', count: data.length },
    { id: 'available', label: 'Available Standby', count: data.filter((w) => w.status === 'available').length },
    { id: 'assigned', label: 'Currently Assigned', count: data.filter((w) => w.status === 'assigned').length },
  ]

  const filteredData =
    activeTab === 'all' ? data : data.filter((w) => w.status === activeTab)

  const columns: ColumnDef<MockWorker>[] = [
    {
      key: 'code',
      header: 'Worker ID',
      sortable: true,
      cell: (row) => <span className="font-mono font-bold text-foreground">{row.code}</span>,
    },
    {
      key: 'name',
      header: 'Full Name & Trade',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-semibold text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.trade}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Deployment Status',
      sortable: true,
      cell: (row) => <StatusBadge department="labour" status={row.status} showIcon />,
    },
    {
      key: 'currentAssignment',
      header: 'Current Assignment / Line',
      cell: (row) => (
        <span className="text-xs text-foreground font-medium">
          {row.currentAssignment || 'Standby for deployment'}
        </span>
      ),
    },
    {
      key: 'efficiencyRating',
      header: 'Efficiency Rating',
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
          {row.efficiencyRating}
        </span>
      ),
    },
    {
      key: 'totalHours',
      header: 'Hours Logged',
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {row.totalHours} hrs
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Contact',
      cell: (row) => <span className="text-xs text-muted-foreground font-mono">{row.phone}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (row.status === 'available') {
              setData((prev) =>
                prev.map((w) =>
                  w.id === row.id
                    ? { ...w, status: 'assigned', currentAssignment: 'WO-0842 (On-Site Team)' }
                    : w,
                ),
              )
              toast.success('Worker Allocated', `${row.name} assigned to WO-0842`)
            } else {
              setData((prev) =>
                prev.map((w) =>
                  w.id === row.id
                    ? { ...w, status: 'available', currentAssignment: undefined }
                    : w,
                ),
              )
              toast.info('Worker Released', `${row.name} returned to available pool`)
            }
          }}
        >
          {row.status === 'available' ? 'Allocate' : 'Release'}
        </Button>
      ),
    },
  ]

  return (
    <PageContainer>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/labour')}>
          <ArrowLeft className="size-3.5 mr-1" />
          Labour Dashboard
        </Button>
      </div>

      <PageHeader
        title="Workforce & Labour Roster"
        description="Craftsmen allocation, certified trades, field installation dispatches, and shift tracking."
      />

      <DataTable
        data={filteredData}
        columns={columns}
        keyExtractor={(row) => row.id}
        searchPlaceholder="Search workers by name, trade or assignment…"
        filterTabs={filterTabs}
        activeFilterTab={activeTab}
        onFilterTabChange={setActiveTab}
        exportFilename="avora_workforce_roster.csv"
      />
    </PageContainer>
  )
}
