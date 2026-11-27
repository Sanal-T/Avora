import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Star,
  MessageSquare,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react'
import { PageContainer, PageHeader } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui/Textarea'
import { Dialog } from '../../../components/ui/Dialog'
import { DataTable, type ColumnDef, type QuickFilterTab } from '../../../components/shared/DataTable'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import type { MockFeedback } from '../../../data/mockData'
import {
  feedbackApi,
  customerApi,
  productionApi,
  type Feedback,
  type Customer,
  type WorkOrder,
} from '../../../lib/api'
import { getCachedData, invalidateCache, setCachedData } from '../../../lib/cache'
import { toast } from '../../../lib/toast'

function toUiFeedback(f: Feedback): MockFeedback {
  const st = (f.status || '').toLowerCase()
  let status: MockFeedback['status'] = 'received'
  if (st.includes('await')) {
    status = 'awaiting'
  }

  const rating = f.rating ?? 5
  let sentiment: MockFeedback['sentiment'] = 'positive'
  if (rating < 3) sentiment = 'negative'
  else if (rating === 3) sentiment = 'neutral'

  return {
    id: f.id,
    code: `FB-${f.id.slice(0, 4).toUpperCase()}`,
    workOrderCode: f.work_order_number || (f.work_order_id ? 'WO-Linked' : 'Direct Service'),
    client: f.customer_company || f.customer_name || 'Client',
    category: (f.category as any) || 'General',
    rating,
    status,
    sentiment,
    comments: f.comments || (st === 'awaiting' ? 'Survey link issued, awaiting customer response' : 'No comments provided'),
    date: (f.received_at || f.created_at || '').slice(0, 10),
  }
}

export function FeedbackListPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<MockFeedback[]>(() => getCachedData<MockFeedback[]>('list:feedback') || [])
  const [loading, setLoading] = useState(() => !getCachedData('list:feedback'))
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')

  // Log Feedback Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState('')
  const [category, setCategory] = useState('Quality')
  const [rating, setRating] = useState<number>(5)
  const [comments, setComments] = useState('')
  const [initialStatus, setInitialStatus] = useState<'Received' | 'Awaiting'>('Received')
  const [submitting, setSubmitting] = useState(false)

  const loadFeedback = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      invalidateCache('list:feedback')
      setRefreshing(true)
    } else if (!getCachedData('list:feedback')) {
      setLoading(true)
    }

    try {
      const res = await feedbackApi.listFeedback({ page_size: 2000 })
      const mapped = res.items && res.items.length > 0 ? res.items.map(toUiFeedback) : []
      setCachedData('list:feedback', mapped)
      setData(mapped)
      if (isManualRefresh) {
        toast.success('Feedback records refreshed from database')
      }
    } catch (err) {
      console.warn('Could not load live feedback from PostgreSQL:', err)
      if (!getCachedData('list:feedback')) setData([])
      if (isManualRefresh) {
        toast.error('Unable to refresh from database')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadFeedback()
  }, [loadFeedback])

  // Load customers and work orders when opening modal
  const handleOpenModal = async () => {
    setModalOpen(true)
    try {
      const [cRes, woRes] = await Promise.all([
        customerApi.list({ page_size: 2000 }).catch(() => ({ items: [] })),
        productionApi.listWorkOrders({ page_size: 2000, compact: true }).catch(() => ({ items: [] })),
      ])
      setCustomers(cRes.items || [])
      setWorkOrders(woRes.items || [])
      if (cRes.items && cRes.items.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(cRes.items[0].id)
      }
    } catch {
      // Non-critical
    }
  }

  const handleCreateFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomerId) {
      toast.error('Please select a customer')
      return
    }

    setSubmitting(true)
    try {
      await feedbackApi.createFeedback({
        customer_id: selectedCustomerId,
        work_order_id: selectedWorkOrderId || null,
        category,
        rating: initialStatus === 'Received' ? rating : null,
        comments: comments.trim() || (initialStatus === 'Awaiting' ? 'Survey sent to customer' : 'Customer satisfied'),
      })

      toast.success('Feedback entry recorded in database')
      setModalOpen(false)
      setComments('')
      setSelectedWorkOrderId('')
      await loadFeedback(false)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record feedback')
    } finally {
      setSubmitting(false)
    }
  }

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
        row.status === 'awaiting' ? (
          <span className="text-xs text-muted-foreground italic flex items-center gap-1">
            <Clock className="size-3" /> Awaiting reply
          </span>
        ) : (
          <div className="flex items-center gap-1 font-mono font-bold text-xs text-foreground">
            <Star className="size-3.5 fill-warning text-warning" />
            <span>{row.rating} / 5</span>
          </div>
        )
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
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/feedback')}>
          <ArrowLeft className="size-3.5 mr-1" />
          Feedback Dashboard
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadFeedback(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenModal}>
            <Plus className="size-3.5 mr-1.5" />
            Log Customer Feedback
          </Button>
        </div>
      </div>

      <PageHeader
        title="Customer Feedback & CSAT"
        description="Post-installation quality reviews, customer satisfaction surveys, and service sentiment."
      />

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span>Loading feedback records from PostgreSQL…</span>
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center space-y-3">
          <MessageSquare className="size-10 text-muted-foreground mx-auto opacity-50" />
          <h3 className="text-base font-semibold text-foreground">No Customer Feedback Recorded</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Log your first customer survey or post-installation review against an active client and work order.
          </p>
          <Button variant="primary" size="sm" onClick={handleOpenModal}>
            <Plus className="size-3.5 mr-1.5" />
            Log First Feedback
          </Button>
        </div>
      ) : (
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
      )}

      {/* Log Feedback Dialog */}
      <Dialog
        open={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title="Log Customer Feedback & Quality Survey"
        description="Record client feedback or issue an open survey request against an active customer and work order."
      >
        <form onSubmit={handleCreateFeedback} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Customer Client *
            </label>
            {customers.length > 0 ? (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company_name ? `(${c.company_name})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                placeholder="Customer UUID"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                required
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Associated Work Order (Optional)
            </label>
            {workOrders.length > 0 ? (
              <select
                value={selectedWorkOrderId}
                onChange={(e) => setSelectedWorkOrderId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- No Direct Work Order (General Fit-Out) --</option>
                {workOrders.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.work_order_number} - {wo.title || 'Work Order'}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                placeholder="Work Order UUID (Optional)"
                value={selectedWorkOrderId}
                onChange={(e) => setSelectedWorkOrderId(e.target.value)}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Quality">Quality & Craftsmanship</option>
                <option value="Installation">Site Installation</option>
                <option value="Service">Customer Service</option>
                <option value="Delivery">Timeline & Delivery</option>
                <option value="General">General Experience</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Initial Status
              </label>
              <select
                value={initialStatus}
                onChange={(e) => setInitialStatus(e.target.value as any)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Received">Received (Client Provided Review)</option>
                <option value="Awaiting">Awaiting Survey Response</option>
              </select>
            </div>
          </div>

          {initialStatus === 'Received' && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Customer Rating (1 to 5 Stars)
              </label>
              <div className="flex items-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`size-6 ${
                        star <= rating ? 'fill-warning text-warning' : 'text-muted-foreground opacity-30'
                      }`}
                    />
                  </button>
                ))}
                <span className="font-mono text-sm font-bold text-foreground ml-2">
                  {rating} of 5 Stars
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Customer Feedback / Notes
            </label>
            <Textarea
              rows={3}
              placeholder={
                initialStatus === 'Received'
                  ? 'Enter direct quote or observations from customer walk-through…'
                  : 'Survey distribution link or invitation notes…'
              }
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Recording…
                </>
              ) : (
                'Save Feedback Entry'
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </PageContainer>
  )
}
