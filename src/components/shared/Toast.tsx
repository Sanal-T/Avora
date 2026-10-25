import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { useToasts, toast, type ToastTone } from '../../lib/toast'
import { cn } from '../../lib/cn'

const icons: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  danger: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const toneStyles: Record<ToastTone, { border: string; bg: string; iconColor: string }> = {
  success: {
    border: 'border-success/30',
    bg: 'bg-card',
    iconColor: 'text-success',
  },
  danger: {
    border: 'border-danger/30',
    bg: 'bg-card',
    iconColor: 'text-danger',
  },
  warning: {
    border: 'border-warning/30',
    bg: 'bg-card',
    iconColor: 'text-warning',
  },
  info: {
    border: 'border-info/30',
    bg: 'bg-card',
    iconColor: 'text-info',
  },
}

export function ToastContainer() {
  const toasts = useToasts()

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((item) => {
        const Icon = icons[item.tone || 'info']
        const style = toneStyles[item.tone || 'info']

        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-float transition-all animate-in slide-in-from-bottom-3',
              style.bg,
              style.border,
            )}
          >
            <Icon className={cn('size-5 shrink-0 mt-0.5', style.iconColor)} aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => toast.dismiss(item.id)}
              className="text-muted-foreground hover:text-foreground cursor-pointer rounded-sm p-0.5"
              aria-label="Close notification"
            >
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
