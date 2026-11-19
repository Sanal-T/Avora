import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Clock,
  Factory,
  User,
  Trash2,
  Edit3,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import type { MockProductionSlot } from '../../../data/productionSlots'

export type SlotDetailDialogProps = {
  open: boolean
  onClose: () => void
  slot: MockProductionSlot | null
  onEdit: (slot: MockProductionSlot) => void
  onDelete: (slotId: string) => void
}

export function SlotDetailDialog({
  open,
  onClose,
  slot,
  onEdit,
  onDelete,
}: SlotDetailDialogProps) {
  const navigate = useNavigate()

  if (!slot) return null

  const getStatusColor = (status: MockProductionSlot['status']) => {
    switch (status) {
      case 'in_progress':
        return 'bg-dept-production text-white'
      case 'completed':
        return 'bg-success text-white'
      case 'delayed':
        return 'bg-danger text-white'
      case 'maintenance':
        return 'bg-muted-foreground text-background'
      default:
        return 'bg-primary text-white'
    }
  }

  // Calculate day duration
  const startD = new Date(slot.startDate)
  const endD = new Date(slot.endDate)
  const daysDiff =
    !isNaN(startD.getTime()) && !isNaN(endD.getTime())
      ? Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : 1

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="max-w-xl"
      title={`Production Slot Details · ${slot.code}`}
      description="Allocated timeframe, machine bay assignment, and supervisor accountability."
    >
      <div className="space-y-4 pt-1">
        {/* Header summary */}
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-foreground">{slot.code}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${getStatusColor(slot.status)}`}>
                {slot.status.replace('_', ' ')}
              </span>
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                Stage: {slot.stage}
              </span>
            </div>
            <h3 className="mt-1 text-base font-bold text-foreground">{slot.title}</h3>
            <p className="text-xs text-muted-foreground">
              Client: <span className="font-semibold text-foreground">{slot.client}</span>
              {slot.workOrderCode && (
                <> · Work Order: <span className="font-mono font-semibold text-primary">{slot.workOrderCode}</span></>
              )}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-muted-foreground">Allocated Duration</span>
            <p className="font-display text-xl font-extrabold text-foreground">{daysDiff} {daysDiff === 1 ? 'Day' : 'Days'}</p>
          </div>
        </div>

        {/* Date & Shift Grid */}
        <div className="rounded-xl border border-primary/20 bg-primary-soft/30 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4 text-primary" />
              <span>Allocated Date Range</span>
            </span>
            <span className="font-mono text-primary">{slot.capacityHours} Scheduled Hours</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-card p-3 border border-border">
              <span className="text-muted-foreground block text-[11px]">Production Start Date</span>
              <p className="font-bold text-foreground text-sm mt-0.5 font-mono">{slot.startDate}</p>
            </div>
            <div className="rounded-lg bg-card p-3 border border-border">
              <span className="text-muted-foreground block text-[11px]">Production End Date</span>
              <p className="font-bold text-foreground text-sm mt-0.5 font-mono">{slot.endDate}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-card px-3 py-2 border border-border text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-3.5 text-primary" />
              <span>Daily Shift Hours:</span>
            </span>
            <span className="font-mono font-semibold text-foreground">
              {slot.startTime || '08:00'} – {slot.endTime || '17:00'}
            </span>
          </div>
        </div>

        {/* Bay & Supervisor Info */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-border p-3 space-y-1">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Factory className="size-3.5" />
              <span>Shop Bay / Line</span>
            </span>
            <p className="font-bold text-foreground">{slot.bay}</p>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-1">
            <span className="flex items-center gap-1 text-muted-foreground">
              <User className="size-3.5" />
              <span>Lead Supervisor</span>
            </span>
            <p className="font-bold text-foreground">{slot.leadWorker}</p>
          </div>
        </div>

        {/* Notes */}
        {slot.notes && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1">
            <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
              Manufacturing & Tooling Notes
            </span>
            <p className="text-foreground leading-relaxed">{slot.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-danger hover:bg-danger-soft"
              onClick={() => {
                if (window.confirm(`Are you sure you want to de-allocate ${slot.code}?`)) {
                  onDelete(slot.id)
                  onClose()
                }
              }}
            >
              <Trash2 className="size-3.5 mr-1" />
              Remove Slot
            </Button>
            {slot.workOrderId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose()
                  navigate(`/production/${slot.workOrderId}`)
                }}
              >
                <ExternalLink className="size-3.5 mr-1" />
                Work Order
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose()
                onEdit(slot)
              }}
            >
              <Edit3 className="size-3.5 mr-1" />
              Edit Slot Dates & Bay
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
