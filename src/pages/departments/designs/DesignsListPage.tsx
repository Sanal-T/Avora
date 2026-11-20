import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, ArrowUpRight, PenTool } from 'lucide-react'
import { PageContainer, PageHeader } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { DataTable, type ColumnDef, type QuickFilterTab } from '../../../components/shared/DataTable'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { mockDesigns, type MockDesign } from '../../../data/mockData'
import { designApi, type DesignItem } from '../../../lib/api'
import { DesignFormModal } from './DesignFormModal'

function toUiDesign(d: DesignItem): MockDesign {
  let uiStatus: 'pending' | 'in_progress' | 'completed' = 'in_progress'
  const s = (d.status || '').toLowerCase()
  if (s.includes('complete') || s.includes('approve')) uiStatus = 'completed'
  else if (s.includes('not started') || s.includes('pending')) uiStatus = 'pending'

  return {
    id: d.id,
    code: d.design_number,
    enquiryCode: d.enquiry_number || 'Direct',
    title: d.title,
    client: d.enquiry_number ? `Ref: ${d.enquiry_number}` : 'Internal Project',
    designer: d.assigned_designer_name || 'Design Team',
    version: 'v1.0',
    status: uiStatus,
    dueDate: d.expected_completion_date || (d.created_at || '').slice(0, 10),
    completionRate: uiStatus === 'completed' ? 100 : d.actual_hours ? Math.min(Math.round((Number(d.actual_hours) / 8) * 100), 95) : 25,
    filesCount: 1,
  }
}

export function DesignsListPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<MockDesign[]>(mockDesigns)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadDesigns = () => {
    setLoading(true)
    designApi
      .list({ page_size: 100 })
      .then((res) => {
        if (res.items && res.items.length > 0) {
          setData(res.items.map(toUiDesign))
        }
      })
      .catch((err) => {
        console.warn('Could not load live designs from PostgreSQL, fallback to mock:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadDesigns()
  }, [])

  const filterTabs: QuickFilterTab[] = [
    { id: 'all', label: 'All Designs', count: data.length },
    { id: 'in_progress', label: 'In Progress', count: data.filter((d) => d.status === 'in_progress').length },
    { id: 'completed', label: 'Completed', count: data.filter((d) => d.status === 'completed').length },
  ]

  const filteredData =
    activeTab === 'all' ? data : data.filter((d) => d.status === activeTab)

  const columns: ColumnDef<MockDesign>[] = [
    {
      key: 'code',
      header: 'Design Code',
      sortable: true,
      cell: (row) => (
        <button
          type="button"
          onClick={() => navigate(`/designs/${row.id}`)}
          className="font-mono font-bold text-primary hover:underline cursor-pointer"
        >
          {row.code}
        </button>
      ),
    },
    {
      key: 'title',
      header: 'Project Title & Client',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-semibold text-foreground">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.client} · Ref: {row.enquiryCode}</p>
        </div>
      ),
    },
    {
      key: 'designer',
      header: 'Lead Designer',
      sortable: true,
      cell: (row) => <span className="text-xs font-medium text-foreground">{row.designer}</span>,
    },
    {
      key: 'version',
      header: 'Version',
      cell: (row) => (
        <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-semibold">{row.version}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <StatusBadge department="designs" status={row.status} showIcon />,
    },
    {
      key: 'completionRate',
      header: 'Drafting Progress',
      sortable: true,
      cell: (row) => (
        <div className="w-28 space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-bold tabular-nums text-foreground">{row.completionRate}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-dept-designs transition-all"
              style={{ width: `${row.completionRate}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'dueDate',
      header: 'Target Date',
      sortable: true,
      cell: (row) => <span className="text-xs text-muted-foreground">{row.dueDate}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/designs/${row.id}`)}
        >
          Open
          <ArrowUpRight className="size-3.5 ml-1" />
        </Button>
      ),
    },
  ]

  const handleCreateSuccess = (newDesign: MockDesign) => {
    setData([newDesign, ...data])
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/designs')}>
          <ArrowLeft className="size-3.5 mr-1" />
          Designs Dashboard
        </Button>
      </div>

      <PageHeader
        title="Designs Registry"
        description="CAD drawings, 3D renderings, material finishes, and technical drafting packets."
        actions={
          <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="size-3.5" />
            <span>New Design</span>
          </Button>
        }
      />

      <DataTable
        data={filteredData}
        columns={columns}
        keyExtractor={(row) => row.id}
        searchPlaceholder="Search designs by title, code or designer…"
        filterTabs={filterTabs}
        activeFilterTab={activeTab}
        onFilterTabChange={setActiveTab}
        exportFilename="avora_designs_registry.csv"
      />

      <DesignFormModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreateSuccess={handleCreateSuccess}
      />
    </PageContainer>
  )
}
