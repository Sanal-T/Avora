import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Calendar,
  User,
  FileText,
  PenTool,
  CheckCircle2,
  Share2,
  FilePlus,
  Paperclip,
} from 'lucide-react'
import { PageContainer } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Tabs, type TabItem } from '../../../components/ui/Tabs'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { WorkflowStepper } from '../../../components/shared/WorkflowStepper'
import { ActivityTimeline } from '../../../components/shared/ActivityTimeline'
import type { MockEnquiry } from '../../../data/mockData'
import { enquiryApi, type Enquiry } from '../../../lib/api'
import { toast } from '../../../lib/toast'

function toUiEnquiry(e: Enquiry): MockEnquiry {
  let uiStatus: 'pending' | 'qualified' | 'converted' = 'pending'
  const s = (e.status || '').toLowerCase()
  if (s.includes('qualif')) uiStatus = 'qualified'
  else if (s.includes('convert')) uiStatus = 'converted'

  return {
    id: e.id,
    code: e.enquiry_number,
    customerName: e.customer_name || 'Direct Customer',
    company: e.customer_company || e.customer_name || 'Individual',
    email: '',
    phone: '',
    requirement: e.requirement_summary,
    source: e.source || 'Direct',
    status: uiStatus,
    budget: e.estimated_budget ? `₹${Number(e.estimated_budget).toLocaleString('en-IN')}` : '₹0',
    assignedTo: e.assigned_employee_name || 'Unassigned',
    createdAt: (e.created_at || '').slice(0, 16).replace('T', ' '),
    updatedAt: (e.updated_at || '').slice(0, 16).replace('T', ' '),
  }
}

const steps = [
  { id: 'pending', label: 'Pending Review' },
  { id: 'qualified', label: 'Qualified Spec' },
  { id: 'converted', label: 'Converted to Quote' },
]

export function EnquiryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [enquiry, setEnquiry] = useState<MockEnquiry | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    enquiryApi
      .get(id)
      .then((res) => {
        setEnquiry(toUiEnquiry(res))
      })
      .catch(() => {
        // Fallback search in list
        enquiryApi.list({ search: id }).then((res) => {
          const found = res.items.find((item) => item.id === id || item.enquiry_number === id)
          if (found) setEnquiry(toUiEnquiry(found))
        }).catch(() => {})
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <PageContainer>
        <div className="py-16 text-center text-muted-foreground text-sm">
          Loading enquiry details from database…
        </div>
      </PageContainer>
    )
  }

  if (!enquiry) {
    return (
      <PageContainer>
        <div className="py-12 text-center">
          <p className="text-base font-semibold">Enquiry not found</p>
          <Button className="mt-4" onClick={() => navigate('/enquiries/list')}>
            Back to Registry
          </Button>
        </div>
      </PageContainer>
    )
  }

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'related', label: 'Related Records', count: 2 },
    { id: 'documents', label: 'Documents', count: 3 },
    { id: 'history', label: 'History & Timeline' },
    { id: 'notes', label: 'Internal Notes' },
  ]

  const handleStatusTransition = (nextStatus: 'pending' | 'qualified' | 'converted') => {
    setEnquiry({ ...enquiry, status: nextStatus })
    toast.success('Status updated', `Enquiry ${enquiry.code} moved to ${nextStatus.toUpperCase()}`)
  }

  return (
    <PageContainer>
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/enquiries/list"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Enquiries Registry</span>
        </Link>
        <div className="flex items-center gap-2">
          {enquiry.status === 'pending' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusTransition('qualified')}
            >
              Qualify Enquiry
            </Button>
          )}
          {enquiry.status !== 'converted' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                handleStatusTransition('converted')
                navigate('/quotations/builder')
              }}
            >
              <FilePlus className="size-3.5" />
              <span>Convert to Quotation</span>
            </Button>
          )}
        </div>
      </div>

      {/* Record Header */}
      <div className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-bold text-foreground">{enquiry.code}</span>
            <StatusBadge department="enquiries" status={enquiry.status} showIcon />
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
            {enquiry.company} · {enquiry.customerName}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Created {enquiry.createdAt} by {enquiry.assignedTo}
          </p>
        </div>
      </div>

      {/* Stepper Workflow Progress Bar */}
      <Card className="p-4">
        <WorkflowStepper
          steps={steps}
          currentStep={enquiry.status}
          onStepClick={(s) => handleStatusTransition(s as any)}
        />
      </Card>

      {/* Main Grid: Tabs Content (Left 2/3) + Summary Panel (Right 1/3) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Tabs Content */}
        <div className="space-y-4 lg:col-span-2">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === 'overview' && (
            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-2">Scope of Work</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {enquiry.requirement}
                </p>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Customer Specifications</h3>
                <dl className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Estimated Budget</dt>
                    <dd className="font-semibold text-foreground text-sm font-mono mt-0.5">{enquiry.budget}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Acquisition Channel</dt>
                    <dd className="font-semibold text-foreground mt-0.5">{enquiry.source}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Assigned Sales Engineer</dt>
                    <dd className="font-semibold text-foreground mt-0.5">{enquiry.assignedTo}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Last Updated</dt>
                    <dd className="font-semibold text-foreground mt-0.5">{enquiry.updatedAt}</dd>
                  </div>
                </dl>
              </Card>
            </div>
          )}

          {activeTab === 'related' && (
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Downstream Department Records</h3>
              <div className="divide-y divide-border">
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <PenTool className="size-4 text-dept-designs" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">D-619 · Conference Pods CAD Draft</p>
                      <p className="text-[11px] text-muted-foreground">Design Department · Maya Krishnan</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/designs/des-1')}>
                    View Design
                  </Button>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="size-4 text-dept-quotations" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Q-2052 · Quotation (₹8.07L)</p>
                      <p className="text-[11px] text-muted-foreground">Quotation Department · Approved</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/quotations/q-1')}>
                    View Quote
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'documents' && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Attached Files</h3>
                <Button variant="outline" size="sm" onClick={() => toast.info('File upload', 'Simulating drag-and-drop…')}>
                  <Paperclip className="size-3.5" />
                  <span>Upload File</span>
                </Button>
              </div>
              <div className="divide-y divide-border text-xs">
                <div className="flex items-center justify-between py-2.5">
                  <span className="font-medium text-foreground">Architectural_Floorplan_4500sqft.pdf</span>
                  <span className="text-muted-foreground">4.2 MB</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="font-medium text-foreground">Material_Specification_Brief.docx</span>
                  <span className="text-muted-foreground">1.1 MB</span>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'history' && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Lifecycle Audit Events</h3>
              <ActivityTimeline
                events={[
                  { id: '1', title: 'Requirement Qualified', description: 'Budget and technical feasibility confirmed by Priya', timeAgo: '2 hrs ago', tone: 'success' },
                  { id: '2', title: 'Site Inspection Completed', description: 'Field measurements logged in portal', timeAgo: '1 day ago', tone: 'info' },
                  { id: '3', title: 'Enquiry Received', description: 'Logged via Web lead portal', timeAgo: '3 days ago', tone: 'primary' },
                ]}
              />
            </Card>
          )}

          {activeTab === 'notes' && (
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Internal Collaboration Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-28 rounded-md border border-input bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button size="sm" variant="primary" onClick={() => toast.success('Notes saved')}>
                Save Notes
              </Button>
            </Card>
          )}
        </div>

        {/* Right 1 Col: Summary Panel */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Customer Profile
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 text-foreground">
                <Building className="size-4 text-muted-foreground" />
                <span className="font-semibold">{enquiry.company}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <User className="size-4 text-muted-foreground" />
                <span>{enquiry.customerName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4" />
                <a href={`mailto:${enquiry.email}`} className="hover:underline">{enquiry.email}</a>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-4" />
                <span>{enquiry.phone}</span>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Commercial Summary
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Budget:</span>
                  <span className="font-mono font-bold text-foreground">{enquiry.budget}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lead Source:</span>
                  <span className="text-foreground">{enquiry.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned Officer:</span>
                  <span className="text-foreground">{enquiry.assignedTo}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
