import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Star,
  MessageSquare,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  FileText,
  Lightbulb,
  AlertTriangle,
  ClipboardCheck,
  Image as ImageIcon,
  Download,
  ExternalLink,
} from 'lucide-react'
import { PageContainer } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Textarea } from '../../../components/ui/Textarea'
import { Dialog } from '../../../components/ui/Dialog'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { apiFetch, feedbackApi, getToken, type Feedback } from '../../../lib/api'
import { toast } from '../../../lib/toast'

interface FeedbackAttachment {
  id: string
  file_name: string
  file_size: number
  mime_type: string
  created_at: string
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageAttachment(att: FeedbackAttachment): boolean {
  if ((att.mime_type || '').toLowerCase().startsWith('image/')) return true
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(att.file_name || '')
}

export function FeedbackDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [attachments, setAttachments] = useState<FeedbackAttachment[]>([])
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState<FeedbackAttachment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const blobUrlsRef = useRef<string[]>([])

  // Actions state
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [receiveModalOpen, setReceiveModalOpen] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [receiveRating, setReceiveRating] = useState<number>(5)
  const [receiveComments, setReceiveComments] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const revokeBlobUrls = useCallback(() => {
    for (const url of blobUrlsRef.current) {
      URL.revokeObjectURL(url)
    }
    blobUrlsRef.current = []
  }, [])

  useEffect(() => {
    return () => {
      revokeBlobUrls()
    }
  }, [revokeBlobUrls])

  const loadAttachments = useCallback(
    async (feedbackId: string) => {
      setAttachmentsLoading(true)
      revokeBlobUrls()
      setAttachmentUrls({})
      try {
        const files = await apiFetch<FeedbackAttachment[]>(
          `/api/files?entity_type=feedback&entity_id=${feedbackId}`,
        )
        const list = Array.isArray(files) ? files : []
        setAttachments(list)

        const token = getToken()
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
        const urlEntries = await Promise.all(
          list.map(async (att) => {
            try {
              const res = await fetch(`/api/files/${att.id}/download`, { headers })
              if (!res.ok) return null
              const blob = await res.blob()
              const objectUrl = URL.createObjectURL(blob)
              blobUrlsRef.current.push(objectUrl)
              return [att.id, objectUrl] as const
            } catch {
              return null
            }
          }),
        )
        const mapped: Record<string, string> = {}
        for (const entry of urlEntries) {
          if (entry) mapped[entry[0]] = entry[1]
        }
        setAttachmentUrls(mapped)
      } catch {
        setAttachments([])
      } finally {
        setAttachmentsLoading(false)
      }
    },
    [revokeBlobUrls],
  )

  const fetchFeedback = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await feedbackApi.getFeedback(id)
      setFeedback(data)
      void loadAttachments(data.id)
    } catch (err: any) {
      console.warn('Could not fetch feedback directly, checking list:', err)
      try {
        const listRes = await feedbackApi.listFeedback({ page_size: 2000 })
        const found = listRes.items.find((item) => item.id === id || item.id.startsWith(id))
        if (found) {
          setFeedback(found)
          void loadAttachments(found.id)
        } else {
          setError('Feedback record not found in database.')
        }
      } catch {
        setError('Failed to connect to feedback service.')
      }
    } finally {
      setLoading(false)
    }
  }, [id, loadAttachments])

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
          <Button onClick={() => navigate('/feedback')}>
            Back to Feedback
          </Button>
        </div>
      </PageContainer>
    )
  }

  const refCode = `FB-${feedback.id.slice(0, 4).toUpperCase()}`
  const isAwaiting = (feedback.status || '').toLowerCase().includes('await')
  const isClosed = (feedback.status || '').toLowerCase().includes('clos')
  const imageAttachments = attachments.filter(isImageAttachment)
  const documentAttachments = attachments.filter((att) => !isImageAttachment(att))

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <Link
          to="/feedback"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Feedback</span>
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
                <span className="font-mono text-foreground font-semibold">
                  {feedback.work_order_number}
                </span>
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
              Description &amp; Customer Comments
            </h3>
            {feedback.comments ? (
              <blockquote className="rounded-lg border-l-4 border-primary bg-muted/40 p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {feedback.comments}
              </blockquote>
            ) : (
              <p className="text-xs text-muted-foreground italic">No comments entered yet.</p>
            )}
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2.5 flex items-center gap-2">
                <Lightbulb className="size-4 text-amber-500" />
                Suggestions
              </h3>
              {feedback.suggestions ? (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {feedback.suggestions}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">No suggestions recorded.</p>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2.5 flex items-center gap-2">
                <AlertTriangle className="size-4 text-rose-500" />
                Complaints
              </h3>
              {feedback.complaints ? (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {feedback.complaints}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">No complaints recorded.</p>
              )}
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-2.5 flex items-center gap-2">
              <ClipboardCheck className="size-4 text-primary" />
              Internal Review
            </h3>
            {feedback.internal_review ? (
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {feedback.internal_review}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">No internal review notes added.</p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" />
                Added Pictures &amp; Attachments
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {attachments.length}
                </span>
              </h3>
            </div>

            {attachmentsLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span>Loading attached pictures and files…</span>
              </div>
            ) : attachments.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No pictures or files attached to this feedback.
              </p>
            ) : (
              <div className="space-y-4">
                {imageAttachments.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {imageAttachments.map((att) => {
                      const previewUrl = attachmentUrls[att.id]
                      return (
                        <div
                          key={att.id}
                          className="overflow-hidden rounded-xl border border-border bg-muted/20"
                        >
                          {previewUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(att)}
                              className="block w-full aspect-video bg-muted/40 overflow-hidden cursor-pointer group"
                              title={`View ${att.file_name}`}
                            >
                              <img
                                src={previewUrl}
                                alt={att.file_name}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                              />
                            </button>
                          ) : (
                            <div className="aspect-video flex flex-col items-center justify-center gap-1.5 bg-muted/40 text-xs text-muted-foreground">
                              <ImageIcon className="size-6 opacity-50" />
                              <span>Preview unavailable</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs border-t border-border/60">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{att.file_name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {formatFileSize(att.file_size)}
                              </p>
                            </div>
                            {previewUrl && (
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setPreviewAttachment(att)}
                                  className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer"
                                >
                                  <ExternalLink className="size-3.5" />
                                  <span>View</span>
                                </button>
                                <a
                                  href={previewUrl}
                                  download={att.file_name}
                                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                >
                                  <Download className="size-3.5" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {documentAttachments.length > 0 && (
                  <div className="divide-y divide-border rounded-xl border border-border">
                    {documentAttachments.map((att) => {
                      const fileUrl = attachmentUrls[att.id]
                      return (
                        <div
                          key={att.id}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="size-4 text-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{att.file_name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {att.mime_type} · {formatFileSize(att.file_size)}
                              </p>
                            </div>
                          </div>
                          {fileUrl && (
                            <a
                              href={fileUrl}
                              download={att.file_name}
                              className="inline-flex items-center gap-1 text-primary font-medium hover:underline shrink-0"
                            >
                              <Download className="size-3.5" />
                              <span>Download</span>
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </Card>

          {feedback.resolution_notes && (
            <Card className="p-6 border-emerald-500/20 bg-emerald-500/5">
              <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                Resolution Summary &amp; Actions Taken
              </h3>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
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
              Feedback Details
            </h3>
            <div className="flex justify-between gap-3 border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Reference:</span>
              <span className="font-mono font-semibold text-foreground text-right">{refCode}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Company / Client:</span>
              <span className="font-semibold text-foreground text-right">
                {feedback.customer_company || feedback.customer_name || 'Direct'}
              </span>
            </div>
            {feedback.customer_name && feedback.customer_company && (
              <div className="flex justify-between gap-3 border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Contact Person:</span>
                <span className="font-medium text-foreground text-right">
                  {feedback.customer_name}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-3 border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Work Order:</span>
              <span className="font-mono text-primary text-right">
                {feedback.work_order_number || 'Direct Service'}
              </span>
            </div>
            {feedback.project_id && (
              <div className="flex justify-between gap-3 border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Project:</span>
                <Link
                  to={`/projects/${feedback.project_id}`}
                  className="font-mono text-primary font-medium hover:underline text-right"
                >
                  View Project
                </Link>
              </div>
            )}
            <div className="flex justify-between gap-3 border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Category:</span>
              <span className="font-medium text-foreground text-right">{feedback.category}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Rating:</span>
              <span className="font-semibold text-foreground text-right">
                {feedback.rating != null ? `${feedback.rating} / 5` : 'Pending'}
              </span>
            </div>
            <div className="flex justify-between gap-3 border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Survey Status:</span>
              <span className="font-semibold text-foreground capitalize text-right">
                {feedback.status}
              </span>
            </div>
            {feedback.received_at && (
              <div className="flex justify-between gap-3 border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Received At:</span>
                <span className="text-foreground text-right">
                  {new Date(feedback.received_at).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-3 border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Logged At:</span>
              <span className="text-foreground text-right">
                {feedback.created_at ? new Date(feedback.created_at).toLocaleString() : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-3 border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Last Updated:</span>
              <span className="text-foreground text-right">
                {feedback.updated_at ? new Date(feedback.updated_at).toLocaleString() : '—'}
              </span>
            </div>
            {feedback.resolved_at && (
              <div className="flex justify-between gap-3 pb-1">
                <span className="text-muted-foreground">Closed At:</span>
                <span className="text-foreground text-right">
                  {new Date(feedback.resolved_at).toLocaleString()}
                </span>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Image Preview Lightbox Dialog */}
      <Dialog
        open={Boolean(previewAttachment)}
        onClose={() => setPreviewAttachment(null)}
        title={previewAttachment?.file_name || 'Attachment Preview'}
        description={
          previewAttachment
            ? `${previewAttachment.mime_type} · ${formatFileSize(previewAttachment.file_size)}`
            : undefined
        }
      >
        {previewAttachment && attachmentUrls[previewAttachment.id] && (
          <div className="space-y-3 pt-2">
            <img
              src={attachmentUrls[previewAttachment.id]}
              alt={previewAttachment.file_name}
              className="max-h-[70vh] w-full rounded-lg object-contain bg-muted/40"
            />
            <div className="flex justify-end gap-2">
              <a
                href={attachmentUrls[previewAttachment.id]}
                download={previewAttachment.file_name}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <Download className="size-3.5" />
                <span>Download Original</span>
              </a>
            </div>
          </div>
        )}
      </Dialog>

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
