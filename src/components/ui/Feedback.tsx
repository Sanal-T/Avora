import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { Tone } from './Badge'
import { toneClasses } from './Badge'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-muted motion-reduce:animate-none', className)} />
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-10 text-center', className)}>
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="mt-1 max-w-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

const alertIcons: Record<Exclude<Tone, 'neutral' | 'primary'>, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
}

export function Alert({
  tone = 'info',
  children,
  action,
}: {
  tone?: Exclude<Tone, 'neutral' | 'primary'>
  children: ReactNode
  action?: ReactNode
}) {
  const Icon = alertIcons[tone]
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={cn('flex items-center gap-3 rounded-lg px-4 py-3', toneClasses[tone])}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <p className="flex-1 font-medium">{children}</p>
      {action}
    </div>
  )
}
