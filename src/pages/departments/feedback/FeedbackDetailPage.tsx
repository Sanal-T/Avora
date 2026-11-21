import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Star,
  MessageSquare,
  Building,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react'
import { PageContainer } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui/Textarea'
import { Dialog } from '../../../components/ui/Dialog'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { feedbackApi, type Feedback } from '../../../lib/api'
import { toast } from '../../../lib/toast'

export function FeedbackDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Actions state
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [receiveModalOpen, setReceiveModalOpen] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [receiveRating, setReceiveRating] = useState<number>(5)
  const [receiveComments, setReceiveComments] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchFeedback = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await feedbackApi.getFeedback(id)
      setFeedback(data)
    } catch (err: any) {
      console.warn('Could not fetch feedback directly, checking list:', err)
      try {
        const listRes = await feedbackApi.listFeedback({ page_size: 100 })
        const found = listRes.items.find((item) => item.id === id || item.id.startsWith(id))
        if (found) {
          setFeedback(found)
        } else {
          setError('Feedback record not found in database.')
        }
      } catch {
        setError('Failed to connect to feedback service.')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  const handleMarkReceived = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedback) return

    setActionLoading(true)
    try {
      const updated = await feedbackApi.updateFeedback(feedback.id, {
        status: 'Received',
        rating: receiveRating,
        comments: receiveComments.trim() || 'Client submitted survey response.',
      })
      setFeedback(updated)
      setReceiveModalOpen(false)
      toast.success('Survey marked as received with customer score')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update feedback status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResolveAndClose = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedback) return

    setActionLoading(true)
    try {
      const updated = await feedbackApi.updateFeedback(feedback.id, {
        status: 'Closed',
        resolution_notes: resolutionNotes.trim() || 'Reviewed by quality management and closed.',
      })
      setFeedback(updated)
      setResolveModalOpen(false)
      toast.success('Feedback ticket resolved and closed')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to close feedback ticket')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="py-24 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span>Loading feedback review from PostgreSQL…</span>
        </div>
      </PageContainer>
    )
  }

  if (error || !feedback) {
    return (
      <PageContainer>
        <div className="py-16 text-center space-y-4">
          <AlertCircle className="size-10 text-muted-foreground mx-auto opacity-50" />
          <h2 className="text-base font-semibold text-foreground">
            {error || 'Feedback record not found'}
          </h2>
          <Button onClick={() => navigate('/feedback/list')}>
            Back to Feedback Registry
          </Button>
        </div>
      </PageContainer>
    )
  }

  const refCode = `FB-${feedback.id.slice(0, 4).toUpperCase()}`
  const isAwaiting = (feedback.status || '').toLowerCase().includes('await')
  const isClosed = (feedback.status || '').toLowerCase().includes('clos')

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
        <div className="flex items-center gap-2">
          {isAwaiting && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setReceiveComments(feedback.comments || '')
                setReceiveRating(feedback.rating || 5)
                setReceiveModalOpen(true)
              }}
            >
              <CheckCircle2 className="size-3.5 mr-1.5" />
              Mark Survey Received
            </Button>
          )}
          {!isClosed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setResolutionNotes(feedback.resolution_notes || '')
                setResolveModalOpen(true)
              }}
            >
              <ShieldCheck className="size-3.5 mr-1.5" />
              Resolve & Close Ticket
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-bold text-foreground">{refCode}</span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold">{feedback.category}</span>
            <StatusBadge department="feedback" status={feedback.status} showIcon />
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
            Customer Review · {feedback.customer_company || feedback.customer_name || 'Client'}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {feedback.work_order_number ? (
              <>
                Work Order:{' '}
                <Link
                  to={`/production/${feedback.work_order_id}`}
                  className="font-mono text-primary font-semibold hover:underline"
                >
                  {feedback.work_order_number}
                </Link>
              </>
            ) : (
              <span>Direct Customer Engagement</span>
            )}{' '}
            · Logged on {(feedback.received_at || feedback.created_at || '').slice(0, 10)}
          </p>
        </div>

        {feedback.rating ? (
          <div className="flex items-center gap-3 bg-muted/30 px-4 py-2.5 rounded-xl border border-border">
            <div className="flex items-center gap-1 text-warning">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`size-5 ${
                    i < (feedback.rating || 0)
                      ? 'fill-warning text-warning'
                      : 'text-muted-foreground opacity-30'
                  }`}
                />
              ))}
            </div>
            <span className="font-display text-2xl font-extrabold text-foreground tabular-nums">
              {feedback.rating}.0
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border">
            <Clock className="size-4" />
            <span>Survey pending completion</span>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              Customer Written Comments & Remarks
            </h3>
            {feedback.comments ? (
              <blockquote className="rounded-lg border-l-4 border-primary bg-muted/40 p-4 text-sm text-foreground italic leading-relaxed">
                &ldquo;{feedback.comments}&rdquo;
              </blockquote>
            ) : (
              <p className="text-xs text-muted-foreground italic">No comments entered yet.</p>
            )}
          </Card>

          {feedback.resolution_notes && (
            <Card className="p-6 border-emerald-500/20 bg-emerald-500/5">
              <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                Resolution Summary & Actions Taken
              </h3>
              <p className="text-sm text-foreground leading-relaxed">
                {feedback.resolution_notes}
              </p>
              {feedback.resolved_at && (
                <p className="text-xs text-muted-foreground mt-3">
                  Resolved on {new Date(feedback.resolved_at).toLocaleString()}
                </p>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5 space-y-3.5 text-xs">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Survey Context
            </h3>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-semibold text-foreground text-right">
                {feedback.customer_company || feedback.customer_name || 'Direct'}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Work Order:</span>
              <span className="font-mono text-primary text-right">
                {feedback.work_order_number || 'Direct Service'}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Category:</span>
              <span className="font-medium text-foreground">{feedback.category}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Survey Status:</span>
              <span className="font-semibold text-foreground capitalize">{feedback.status}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Logged At:</span>
              <span className="text-foreground">
                {feedback.created_at ? new Date(feedback.created_at).toLocaleDateString() : '—'}
              </span>
            </div>
            {feedback.resolved_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Closed At:</span>
                <span className="text-foreground">
                  {new Date(feedback.resolved_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Mark Survey Received Dialog */}
      <Dialog
        open={receiveModalOpen}
        onClose={() => !actionLoading && setReceiveModalOpen(false)}
        title="Record Completed Survey Response"
        description="Enter the customer's verified rating and remarks from the quality interview."
      >
        <form onSubmit={handleMarkReceived} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Customer Rating (1 to 5 Stars)
            </label>
            <div className="flex items-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReceiveRating(star)}
                  className="p-1 hover:scale-110 transition-transform cursor-pointer"
                >
                  <Star
                    className={`size-6 ${
                      star <= receiveRating
                        ? 'fill-warning text-warning'
                        : 'text-muted-foreground opacity-30'
                    }`}
                  />
                </button>
              ))}
              <span className="font-mono text-sm font-bold text-foreground ml-2">
                {receiveRating} / 5 Stars
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Customer Feedback Comments
            </label>
            <Textarea
              rows={3}
              placeholder="Enter customer feedback remarks…"
              value={receiveComments}
              onChange={(e) => setReceiveComments(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReceiveModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save Response'
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Resolve & Close Dialog */}
      <Dialog
        open={resolveModalOpen}
        onClose={() => !actionLoading && setResolveModalOpen(false)}
        title="Resolve & Close Feedback Ticket"
        description="Document actions taken to address client remarks and archive this review."
      >
        <form onSubmit={handleResolveAndClose} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Resolution Notes & Corrective Actions *
            </label>
            <Textarea
              rows={3}
              placeholder="Describe how the feedback was addressed (e.g. onsite touch-up scheduled, client sign-off secured)…"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResolveModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Closing…
                </>
              ) : (
                'Close Feedback Ticket'
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </PageContainer>
  )
}
