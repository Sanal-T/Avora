import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

export const toneClasses: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground border-border/80',
  primary: 'bg-primary-soft text-primary-text border-primary/20',
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-warning border-warning/20',
  danger: 'bg-danger-soft text-danger border-danger/20',
  info: 'bg-info-soft text-info border-info/20',
}

export function Badge({
  tone = 'neutral',
  dot = false,
  className,
  children,
}: {
  tone?: Tone
  dot?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption font-semibold whitespace-nowrap shadow-2xs',
        toneClasses[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            'size-1.5 rounded-full',
            tone === 'success' && 'bg-success',
            tone === 'warning' && 'bg-warning',
            tone === 'danger' && 'bg-danger',
            tone === 'info' && 'bg-info',
            tone === 'primary' && 'bg-primary',
            tone === 'neutral' && 'bg-muted-foreground',
          )}
        />
      )}
      {children}
    </span>
  )
}
