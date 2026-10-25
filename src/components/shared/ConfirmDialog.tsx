import { AlertTriangle } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  tone = 'danger',
  loading = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  tone?: 'danger' | 'warning' | 'primary'
  loading?: boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-start gap-4">
        <div
          className={`grid size-10 shrink-0 place-items-center rounded-full ${
            tone === 'danger'
              ? 'bg-danger-soft text-danger'
              : tone === 'warning'
                ? 'bg-warning-soft text-warning'
                : 'bg-primary-soft text-primary-text'
          }`}
        >
          <AlertTriangle className="size-5" aria-hidden />
        </div>
        <div className="flex-1">
          <h3 className="text-section font-semibold text-foreground">{title}</h3>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2.5">
        <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant={tone === 'danger' ? 'primary' : 'primary'}
          size="sm"
          className={tone === 'danger' ? 'bg-danger text-white hover:bg-danger/90' : undefined}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Processing…' : confirmText}
        </Button>
      </div>
    </Dialog>
  )
}
