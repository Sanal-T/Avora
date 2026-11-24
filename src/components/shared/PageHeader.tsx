import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Consistent page padding. Wide enough to use big monitors, capped so ultrawide screens stay readable. */
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[1760px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 animate-in fade-in duration-200', className)}>
      {children}
    </div>
  )
}

/** Every page starts the same way: title, short description, primary action. */
export function PageHeader({
  title,
  description,
  icon,
  actions,
}: {
  title: string
  description?: string
  icon?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between select-none cursor-default">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h1 className="text-page-title font-bold tracking-tight text-foreground select-none cursor-default">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground select-none cursor-default">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

const SOURCES: Record<string, { label: string; dot: string }> = {
  database: { label: 'Live PostgreSQL', dot: 'bg-success ring-success/30' },
  prototype: { label: 'API Prototype', dot: 'bg-warning ring-warning/30' },
  mock: { label: 'Local Fallback', dot: 'bg-warning ring-warning/30' },
}

/** Small, unobtrusive indicator of where the numbers come from. */
export function DataSourceBadge({ source }: { source?: string }) {
  if (!source) return null
  const entry = SOURCES[source] ?? SOURCES.mock
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 text-caption font-medium text-muted-foreground shadow-2xs">
      <span aria-hidden className={cn('size-1.5 rounded-full ring-2', entry.dot)} />
      {entry.label}
    </span>
  )
}
