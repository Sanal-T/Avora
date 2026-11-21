import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  FileEdit,
  CheckCircle2,
  Factory,
  Loader2,
  Layers,
} from 'lucide-react'
import { PageContainer } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Tabs, type TabItem } from '../../../components/ui/Tabs'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { WorkflowStepper } from '../../../components/shared/WorkflowStepper'
import { ActivityTimeline } from '../../../components/shared/ActivityTimeline'
import type { MockQuotation } from '../../../data/mockData'
import { quotationApi, type Quotation } from '../../../lib/api'
import { toast } from '../../../lib/toast'

function toUiQuotation(q: Quotation): MockQuotation {
  const st = (q.status || '').toLowerCase()
  let status: MockQuotation['status'] = 'pending'
  if (st.includes('approv')) status = 'approved'
  else if (st.includes('convert')) status = 'converted'
  else if (st.includes('reject')) status = 'rejected'

  const items =
    q.items && q.items.length > 0
      ? q.items.map((it, idx) => ({
          id: it.id || `item-${idx}`,
          description: it.description,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unit_price),
          discountPct: Number(q.discount_rate || 0),
          taxPct: Number(q.tax_rate || 18),
        }))
      : []

  return {
    id: q.id,
    code: q.quotation_number,
    enquiryCode: q.enquiry_number || (q.enquiry_id ? 'Linked' : 'Direct'),
    client: q.customer_company || q.customer_name || 'Client',
    title: `Commercial Quotation for ${q.customer_company || q.customer_name || 'Client'}`,
    status,
    version: q.revision_number || 1,
    subtotal: Number(q.subtotal || 0),
    discountTotal: Number(q.discount_amount || 0),
    taxTotal: Number(q.tax_amount || 0),
    grandTotal: Number(q.total_amount || 0),
    dueDate: q.valid_until || '30 days',
    author: 'Estimator',
    items,
  }
}

const steps = [
  { id: 'pending', label: 'Draft Estimate' },
  { id: 'approved', label: 'Client Accepted' },
  { id: 'converted', label: 'Work Order Dispatched' },
]

export function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [rawQuotation, setRawQuotation] = useState<Quotation | null>(null)
  const [quotation, setQuotation] = useState<MockQuotation | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('items')
  const [approving, setApproving] = useState(false)
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    quotationApi
      .getQuotation(id)
      .then((res) => {
        setRawQuotation(res)
        setQuotation(toUiQuotation(res))
      })
      .catch(() => {
        quotationApi
          .listQuotations({ search: id })
          .then((res) => {
            const found = res.items.find((item) => item.id === id || item.quotation_number === id)
            if (found) {
              setRawQuotation(found)
              setQuotation(toUiQuotation(found))
            } else {
              setQuotation(undefined)
            }
          })
          .catch(() => {
            setQuotation(undefined)
          })
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleApproveQuotation = async () => {
    if (!quotation) return
    setApproving(true)
    try {
      const updated = await quotationApi.updateQuotationStatus(quotation.id, {
        status: 'Approved',
        notes: 'Approved via quotation detail screen',
      })
      setRawQuotation(updated)
      setQuotation(toUiQuotation(updated))
      toast.success(
        'Quotation Approved',
        `${updated.quotation_number} status updated to Approved in PostgreSQL!`,
      )
    } catch (err: any) {
      toast.error('Approval Failed', err.message || 'Could not approve quotation')
    } finally {
      setApproving(false)
    }
  }

  const handleConvertToWorkOrder = async () => {
    if (!quotation) return
    setConverting(true)
    try {
      const res = await quotationApi.convertToWorkOrder(quotation.id)
      toast.success(
        'Production Work Order Initialized',
        `Work order ${res.work_order_number} created and dispatched to shop floor.`,
      )
      navigate(`/production/${res.work_order_id}`)
    } catch (err: any) {
      toast.error('Work Order Generation Failed', err.message || 'Could not convert quotation')
    } finally {
      setConverting(false)
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span>Loading quotation details from database…</span>
        </div>
      </PageContainer>
    )
  }

  if (!quotation) {
    return (
      <PageContainer>
        <div className="py-12 text-center">
          <p className="text-base font-semibold">Quotation record not found</p>
          <Button className="mt-4" onClick={() => navigate('/quotations/list')}>
            Back to Registry
          </Button>
        </div>
      </PageContainer>
    )
  }

  const tabs: TabItem[] = [
    { id: 'items', label: 'Costing Line Items', count: quotation.items.length },
    { id: 'terms', label: 'Commercial Terms' },
    { id: 'revisions', label: 'Revisions & Versions', count: rawQuotation?.revisions?.length || 0 },
    { id: 'timeline', label: 'Approval Audit History' },
  ]

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <Link
          to="/quotations/list"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Quotations Registry</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/quotations/builder?id=${quotation.id}`)}
          >
            <FileEdit className="size-3.5 mr-1" />
            Open in Builder
          </Button>

          {quotation.status !== 'approved' && quotation.status !== 'converted' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleApproveQuotation}
              disabled={approving}
              className="text-success border-success/30 hover:bg-success-soft"
            >
              {approving ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <CheckCircle2 className="size-3.5 mr-1" />}
              <span>Approve Quotation</span>
            </Button>
          )}

          {quotation.status === 'approved' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleConvertToWorkOrder}
              disabled={converting}
            >
              {converting ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Factory className="size-3.5 mr-1" />}
              <span>Generate Work Order</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-bold text-foreground">{quotation.code}</span>
            <span className="font-mono text-xs font-semibold rounded bg-muted px-2 py-0.5">Rev v{quotation.version}</span>
            <StatusBadge department="quotations" status={quotation.status} showIcon />
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
            {quotation.title}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Client: <span className="font-semibold text-foreground">{quotation.client}</span> · Ref: {quotation.enquiryCode}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Quoted Value</p>
          <p className="font-display text-3xl font-extrabold text-primary tabular-nums">
            ₹{Math.round(quotation.grandTotal).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      <Card className="p-4">
        <WorkflowStepper
          steps={steps}
          currentStep={quotation.status}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === 'items' && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Specification & Line Items</h3>
              {quotation.items.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No line items attached. Click "Open in Builder" to add specifications.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="py-2.5 px-2 font-semibold">Description</th>
                        <th className="py-2.5 px-2 font-semibold text-center w-12">Qty</th>
                        <th className="py-2.5 px-2 font-semibold text-right w-24">Rate (₹)</th>
                        <th className="py-2.5 px-2 font-semibold text-right w-28">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {quotation.items.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/20">
                          <td className="py-2.5 px-2 text-foreground font-medium">{item.description}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{item.quantity}</td>
                          <td className="py-2.5 px-2 text-right font-mono">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-foreground">
                            ₹{(item.quantity * item.unitPrice).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {activeTab === 'terms' && (
            <Card className="p-5 space-y-3 text-xs leading-relaxed text-muted-foreground">
              <h3 className="text-sm font-semibold text-foreground">Commercial & Legal Terms</h3>
              <p>1. Payment terms: 50% mobilization advance, 40% on dispatch readiness, 10% on handover.</p>
              <p>2. Delivery timeline: 3-4 weeks from approval of production drawings and receipt of advance.</p>
              <p>3. Tax terms: All taxes (GST 18%) charged as per Government of India statutory notifications.</p>
            </Card>
          )}

          {activeTab === 'revisions' && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Version History</h3>
              {rawQuotation?.revisions && rawQuotation.revisions.length > 0 ? (
                <div className="space-y-3">
                  {rawQuotation.revisions.map((rev) => (
                    <div key={rev.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <Layers className="size-3.5 text-primary" />
                          <span className="font-mono font-bold text-foreground">Rev v{rev.revision_number}</span>
                          <span className="text-muted-foreground">({new Date(rev.created_at).toLocaleDateString()})</span>
                        </div>
                        <p className="text-muted-foreground mt-1">{rev.change_summary || 'Standard revision'}</p>
                      </div>
                      <span className="font-mono font-bold text-foreground">₹{Number(rev.total_amount).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">This is the original base revision (v1.0). No previous revisions archived.</p>
              )}
            </Card>
          )}

          {activeTab === 'timeline' && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Lifecycle Events</h3>
              <ActivityTimeline
                events={[
                  {
                    id: '1',
                    title: `Quotation Status: ${quotation.status}`,
                    description: `Current workflow state recorded in PostgreSQL`,
                    timeAgo: quotation.dueDate,
                    tone: quotation.status === 'converted' ? 'primary' : quotation.status === 'approved' ? 'success' : 'info',
                  },
                  {
                    id: '2',
                    title: `Revision v${quotation.version} Active`,
                    description: `Commercial value locked at ₹${Math.round(quotation.grandTotal).toLocaleString('en-IN')}`,
                    timeAgo: 'Latest',
                    tone: 'info',
                  },
                ]}
              />
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5 space-y-3 text-xs">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Summary Details
            </h3>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prepared By:</span>
              <span className="font-semibold text-foreground">{quotation.author}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target Expiry:</span>
              <span className="text-foreground">{quotation.dueDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-mono">₹{Math.round(quotation.subtotal).toLocaleString('en-IN')}</span>
            </div>
            {quotation.discountTotal > 0 && (
              <div className="flex justify-between text-success">
                <span>Discount:</span>
                <span className="font-mono">-₹{Math.round(quotation.discountTotal).toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxes (GST):</span>
              <span className="font-mono">₹{Math.round(quotation.taxTotal).toLocaleString('en-IN')}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-bold text-sm">
              <span>Grand Total:</span>
              <span className="font-mono text-primary">₹{Math.round(quotation.grandTotal).toLocaleString('en-IN')}</span>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
