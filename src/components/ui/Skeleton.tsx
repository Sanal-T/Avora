import { cn } from '../../lib/cn'

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted/80', className)}
      {...props}
    />
  )
}

export function SkeletonKpiCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-32" />
      <Skeleton className="mt-2 h-3 w-40" />
    </div>
  )
}

export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-border/60">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={cn('h-4', i === 0 ? 'w-24' : i === 1 ? 'w-48' : 'w-20')} />
        </td>
      ))}
    </tr>
  )
}
