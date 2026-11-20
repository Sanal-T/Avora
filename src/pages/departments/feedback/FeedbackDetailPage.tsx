import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Star, MessageSquare, Building, CheckCircle2 } from 'lucide-react'
import { PageContainer } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { mockFeedback, type MockFeedback } from '../../../data/mockData'
import { feedbackApi, type Feedback } from '../../../lib/api'
import { toast } from '../../../lib/toast'

function toUiFeedback(f: Feedback): MockFeedback {
  const st = (f.status || '').toLowerCase()
  const status: MockFeedback['status'] = st.includes('await') ? 'awaiting' : 'received'
  const rating = f.rating ?? 5
  let sentiment: MockFeedback['sentiment'] = 'positive'
  if (rating < 3) sentiment = 'negative'
  else if (rating === 3) sentiment = 'neutral'

  return {
    id: f.id,
    code: `FB-${f.id.slice(0, 4).toUpperCase()}`,
    workOrderCode: f.work_order_number || 'Direct',
    client: f.customer_company || f.customer_name || 'Client',
    category: (f.category as any) || 'Quality',
    rating,
    status,
    sentiment,
    comments: f.comments || 'No remarks provided',
    date: (f.received_at || f.created_at || '').slice(0, 10),
  }
}

export function FeedbackDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [feedback, setFeedback] = useState<MockFeedback | undefined>(() =>
    mockFeedback.find((f) => f.id === id || f.code === id) || mockFeedback[0],
  )
  const [loading, setLoading] = useState(!feedback)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    feedbackApi
      .listFeedback({ page_size: 100 })
      .then((res) => {
        const found = res.items.find((item) => item.id === id || item.id.startsWith(id))
        if (found) {
          setFeedback(toUiFeedback(found))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <PageContainer>
        <div className="py-16 text-center text-muted-foreground text-sm">
          Loading feedback review from database…
        </div>
      </PageContainer>
    )
  }

  if (!feedback) {
    return (
      <PageContainer>
        <div className="py-12 text-center">
          <p className="text-base font-semibold">Feedback record not found</p>
          <Button className="mt-4" onClick={() => navigate('/feedback/list')}>
            Back to Registry
          </Button>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <Link
          to="/feedback/list"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Feedback Registry</span>
        </Link>
        {feedback.status === 'awaiting' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setFeedback({ ...feedback, status: 'received' })
              toast.success('Survey Marked Received')
            }}
          >
            Mark Survey Received
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-bold text-foreground">{feedback.code}</span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold">{feedback.category}</span>
            <StatusBadge department="feedback" status={feedback.status} showIcon />
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
            Customer Review · {feedback.client}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Work Order: <span className="font-mono text-foreground font-semibold">{feedback.workOrderCode}</span> · Logged on {feedback.date}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-warning">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`size-5 ${i < feedback.rating ? 'fill-warning text-warning' : 'text-muted-foreground opacity-30'}`}
              />
            ))}
          </div>
          <span className="font-display text-2xl font-extrabold text-foreground tabular-nums">
            {feedback.rating}.0
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Customer Written Comments</h3>
            <blockquote className="rounded-lg border-l-4 border-primary bg-muted/40 p-4 text-sm text-foreground italic leading-relaxed">
              &ldquo;{feedback.comments}&rdquo;
            </blockquote>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5 space-y-3 text-xs">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Survey Context
            </h3>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-semibold text-foreground">{feedback.client}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Work Order:</span>
              <span className="font-mono text-primary">{feedback.workOrderCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sentiment Classification:</span>
              <span className="capitalize font-semibold text-foreground">{feedback.sentiment}</span>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
