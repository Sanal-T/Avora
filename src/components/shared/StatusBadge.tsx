import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock,
  Hourglass,
  Loader,
  MailCheck,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
  UserMinus,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { Badge, type Tone } from '../ui/Badge'
import type { DepartmentId } from '../../lib/departments'

type StatusEntry = { label: string; tone: Tone; icon: LucideIcon }

/**
 * The single source of truth for status presentation.
 * Every status has a text label, so meaning never depends on colour alone.
 */
export const STATUS_MAP: Record<DepartmentId, Record<string, StatusEntry>> = {
  enquiries: {
    pending: { label: 'Pending', tone: 'warning', icon: Clock },
    qualified: { label: 'Qualified', tone: 'info', icon: UserCheck },
    converted: { label: 'Converted', tone: 'success', icon: CheckCircle2 },
  },
  designs: {
    pending: { label: 'Pending', tone: 'warning', icon: Clock },
    in_progress: { label: 'In progress', tone: 'info', icon: Loader },
    completed: { label: 'Completed', tone: 'success', icon: CheckCircle2 },
  },
  quotations: {
    pending: { label: 'Pending', tone: 'warning', icon: Hourglass },
    approved: { label: 'Approved', tone: 'success', icon: ThumbsUp },
    converted: { label: 'Converted', tone: 'info', icon: CheckCircle2 },
    rejected: { label: 'Rejected', tone: 'danger', icon: ThumbsDown },
  },
  production: {
    active: { label: 'Active', tone: 'info', icon: Wrench },
    completed: { label: 'Completed', tone: 'success', icon: CheckCircle2 },
    delayed: { label: 'Delayed', tone: 'danger', icon: AlertTriangle },
  },
  feedback: {
    received: { label: 'Received', tone: 'success', icon: MailCheck },
    awaiting: { label: 'Awaiting', tone: 'warning', icon: Hourglass },
  },
  labour: {
    pending: { label: 'Pending', tone: 'warning', icon: Clock },
    approved: { label: 'Approved', tone: 'success', icon: ThumbsUp },
    rejected: { label: 'Rejected', tone: 'danger', icon: ThumbsDown },
    available: { label: 'Available', tone: 'success', icon: UserCheck },
    assigned: { label: 'Assigned', tone: 'info', icon: Wrench },
    unavailable: { label: 'Unavailable', tone: 'neutral', icon: UserMinus },
  },
}

const humanise = (status: string) => status.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

export function StatusBadge({
  department,
  status,
  showIcon = false,
}: {
  department: DepartmentId
  status: string
  /** Show the status icon in place of the dot. */
  showIcon?: boolean
}) {
  const entry = STATUS_MAP[department][status] ?? { label: humanise(status), tone: 'neutral' as Tone, icon: CircleDashed }
  const Icon = entry.icon
  return (
    <Badge tone={entry.tone}>
      {showIcon ? <Icon className="size-3" aria-hidden /> : <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {entry.label}
    </Badge>
  )
}
