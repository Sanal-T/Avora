import { cn } from '../../lib/cn'

export type TimelineEvent = {
  id: string
  title: string
  description?: string
  timeAgo: string
  actor?: string
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
}

export function ActivityTimeline({
  events,
  className,
}: {
  events: TimelineEvent[]
  className?: string
}) {
  return (
    <ol
      className={cn(
        'relative space-y-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-border before:content-[\'\']',
        className,
      )}
    >
      {events.map((event, index) => (
        <li key={event.id || index} className="relative flex items-start gap-3 pl-6">
          <span
            className={cn(
              'absolute left-0 top-1.5 size-3.5 rounded-full ring-4 ring-card',
              event.tone === 'success' && 'bg-success',
              event.tone === 'warning' && 'bg-warning',
              event.tone === 'danger' && 'bg-danger',
              event.tone === 'info' && 'bg-info',
              (!event.tone || event.tone === 'primary') && (index === 0 ? 'bg-primary' : 'bg-muted-foreground'),
            )}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-foreground">{event.title}</p>
              <time className="text-[11px] text-muted-foreground whitespace-nowrap">{event.timeAgo}</time>
            </div>
            {event.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{event.description}</p>
            )}
            {event.actor && (
              <p className="mt-1 text-[11px] text-muted-foreground font-medium">By {event.actor}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
