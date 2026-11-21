import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  PenTool,
  CheckCircle2,
  FileText,
  FileCode,
  Download,
  Upload,
  User,
  Calendar,
  Layers,
} from 'lucide-react'
import { PageContainer } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Tabs, type TabItem } from '../../../components/ui/Tabs'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { WorkflowStepper } from '../../../components/shared/WorkflowStepper'
import { ActivityTimeline } from '../../../components/shared/ActivityTimeline'
import type { MockDesign } from '../../../data/mockData'
import { designApi, type Design } from '../../../lib/api'
import { toast } from '../../../lib/toast'

function toUiDesign(d: Design): MockDesign {
  const st = (d.status || '').toLowerCase()
  let status: MockDesign['status'] = 'in_progress'
  if (st.includes('complet')) status = 'completed'
  else if (st.includes('pend')) status = 'pending'

  const completionRate = status === 'completed' ? 100 : status === 'in_progress' ? 65 : 20
  const versionNum = d.versions && d.versions.length > 0 ? d.versions.length : 1

  return {
    id: d.id,
    code: d.design_number,
    enquiryCode: d.enquiry_number || 'Direct',
    title: d.title,
    client: 'Active Account',
    designer: d.assigned_designer_name || 'Design Studio',
    version: `v${versionNum}.0`,
    status,
    dueDate: d.expected_completion_date || 'TBD',
    completionRate,
    filesCount: d.versions?.length || 1,
  }
}

const steps = [
  { id: 'pending', label: 'Brief Assigned' },
  { id: 'in_progress', label: 'CAD Drafting' },
  { id: 'completed', label: 'Client Approved' },
]

export function DesignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [design, setDesign] = useState<MockDesign | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    designApi
      .getDesign(id)
      .then((res) => {
        setDesign(toUiDesign(res))
      })
      .catch(() => {
        designApi.listDesigns({ search: id }).then((res) => {
          const found = res.items.find((item) => item.id === id || item.design_number === id)
          if (found) setDesign(toUiDesign(found))
        }).catch(() => {})
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <PageContainer>
        <div className="py-16 text-center text-muted-foreground text-sm">
          Loading design specifications from database…
        </div>
      </PageContainer>
    )
  }

  if (!design) {
    return (
      <PageContainer>
        <div className="py-12 text-center">
          <p className="text-base font-semibold">Design record not found</p>
          <Button className="mt-4" onClick={() => navigate('/designs/list')}>
            Back to Registry
          </Button>
        </div>
      </PageContainer>
    )
  }

  const tabs: TabItem[] = [
    { id: 'overview', label: 'CAD Specifications' },
    { id: 'versions', label: 'Revisions & Versions', count: 3 },
    { id: 'files', label: 'Drawings & DWG Files', count: design.filesCount },
    { id: 'history', label: 'Audit Timeline' },
  ]

  const handleStatusChange = (status: 'pending' | 'in_progress' | 'completed') => {
    setDesign({
      ...design,
      status,
      completionRate: status === 'completed' ? 100 : status === 'in_progress' ? 70 : 20,
    })
    toast.success('Design Status Updated', `Moved to ${status.toUpperCase()}`)
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <Link
          to="/designs/list"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Designs Registry</span>
        </Link>
        <div className="flex items-center gap-2">
          {design.status !== 'completed' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleStatusChange('completed')}
            >
              <CheckCircle2 className="size-3.5 mr-1" />
              Mark Completed
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-bold text-foreground">{design.code}</span>
            <span className="font-mono text-xs font-semibold rounded bg-muted px-2 py-0.5">{design.version}</span>
            <StatusBadge department="designs" status={design.status} showIcon />
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
            {design.title}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Client: <span className="font-semibold text-foreground">{design.client}</span> · Enq: {design.enquiryCode}
          </p>
        </div>
      </div>

      <Card className="p-4">
        <WorkflowStepper
          steps={steps}
          currentStep={design.status}
          onStepClick={(s) => handleStatusChange(s as any)}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === 'overview' && (
            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Drafting Scope & Layout Details</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Design specifications developed to comply with acoustic absorption standards and joinery CNC tolerances.
                  Includes isometric 3D mockups, detailed cut lists, edge band specifications, and exploded hardware assemblies.
                </p>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Technical Progress</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-bold text-foreground tabular-nums">{design.completionRate}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-dept-designs transition-all"
                      style={{ width: `${design.completionRate}%` }}
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'versions' && (
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Revision History</h3>
              <div className="divide-y divide-border text-xs">
                <div className="py-2.5 flex justify-between items-center">
                  <div>
                    <span className="font-mono font-bold text-foreground">v2.1 (Current)</span>
                    <p className="text-muted-foreground mt-0.5">Updated glass thickness and seal profile to meet acoustic specs</p>
                  </div>
                  <span className="text-muted-foreground">Nov 18, 2026</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <div>
                    <span className="font-mono font-bold text-foreground">v2.0</span>
                    <p className="text-muted-foreground mt-0.5">Initial 3D render packet approved by client</p>
                  </div>
                  <span className="text-muted-foreground">Nov 14, 2026</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <div>
                    <span className="font-mono font-bold text-foreground">v1.0</span>
                    <p className="text-muted-foreground mt-0.5">Initial schematic CAD floorplan draft</p>
                  </div>
                  <span className="text-muted-foreground">Nov 10, 2026</span>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'files' && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Attached CAD & Renders</h3>
                <Button size="sm" variant="outline" onClick={() => toast.info('File upload', 'Simulating file selection…')}>
                  <Upload className="size-3.5 mr-1" />
                  Upload DWG / PDF
                </Button>
              </div>
              <div className="divide-y divide-border text-xs">
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <FileCode className="size-4 text-dept-designs" />
                    <span className="font-medium text-foreground">Conference_Pods_v2.1_Production.dwg</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => toast.success('Downloading DWG')}>
                    <Download className="size-3.5" />
                  </Button>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">Renderings_HighRes_Walkthrough.pdf</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => toast.success('Downloading PDF')}>
                    <Download className="size-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'history' && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Design Activity Log</h3>
              <ActivityTimeline
                events={[
                  { id: '1', title: 'Version v2.1 Uploaded', description: 'CAD drafting package finalized by Maya Krishnan', timeAgo: '1 day ago', tone: 'success' },
                  { id: '2', title: 'Internal Review Passed', description: 'Production engineer signed off cut list', timeAgo: '3 days ago', tone: 'info' },
                  { id: '3', title: 'Design Assignment Initiated', description: 'Created from enquiry ENQ-1046', timeAgo: '5 days ago', tone: 'primary' },
                ]}
              />
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Design Metadata
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lead Designer:</span>
                <span className="font-semibold text-foreground">{design.designer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client:</span>
                <span className="font-semibold text-foreground">{design.client}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Enquiry Ref:</span>
                <span className="font-mono text-primary">{design.enquiryCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Date:</span>
                <span className="text-foreground">{design.dueDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Version:</span>
                <span className="font-mono font-semibold text-foreground">{design.version}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
