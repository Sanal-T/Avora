import { Briefcase, Factory, FileText, Inbox, IndianRupee, MessageSquare, MessagesSquare, PenTool, Users, type LucideIcon } from 'lucide-react'

export type DepartmentId = 'enquiries' | 'designs' | 'quotations' | 'projects' | 'production' | 'accounts' | 'feedback' | 'labour' | 'communications'

type DepartmentMeta = {
  label: string
  /** Fixed icon: the same one everywhere the department appears. */
  icon: LucideIcon
  /** CSS variable for charts and SVG strokes. */
  color: string
  /** Tailwind classes for an icon chip (static strings so Tailwind can see them). */
  chip: string
  /** Text used in "New …" actions. */
  noun: string
  /** What one data point in the trend chart represents. */
  seriesLabel: string
}

export const DEPARTMENT_META: Record<DepartmentId, DepartmentMeta> = {
  enquiries: { label: 'Enquiries', icon: Inbox, color: 'var(--dept-enquiries)', chip: 'bg-dept-enquiries/10 text-dept-enquiries', noun: 'enquiry', seriesLabel: 'Enquiries' },
  designs: { label: 'Designs', icon: PenTool, color: 'var(--dept-designs)', chip: 'bg-dept-designs/10 text-dept-designs', noun: 'design', seriesLabel: 'Designs' },
  quotations: { label: 'Quotations', icon: FileText, color: 'var(--dept-quotations)', chip: 'bg-dept-quotations/10 text-dept-quotations', noun: 'quotation', seriesLabel: 'Quotations' },
  projects: { label: 'Projects', icon: Briefcase, color: 'var(--dept-enquiries)', chip: 'bg-blue-500/10 text-blue-600', noun: 'project', seriesLabel: 'Projects' },
  production: { label: 'Production', icon: Factory, color: 'var(--dept-production)', chip: 'bg-dept-production/10 text-dept-production', noun: 'work order', seriesLabel: 'Work orders' },
  accounts: { label: 'Accounts', icon: IndianRupee, color: 'var(--dept-labour)', chip: 'bg-amber-500/10 text-amber-600', noun: 'accounts record', seriesLabel: 'Invoices' },
  feedback: { label: 'Feedback', icon: MessageSquare, color: 'var(--dept-feedback)', chip: 'bg-dept-feedback/10 text-dept-feedback', noun: 'feedback request', seriesLabel: 'Feedback' },
  labour: { label: 'Labour', icon: Users, color: 'var(--dept-labour)', chip: 'bg-dept-labour/10 text-dept-labour', noun: 'labour request', seriesLabel: 'Workers assigned' },
  communications: { label: 'Communications', icon: MessagesSquare, color: 'var(--dept-designs)', chip: 'bg-violet-500/10 text-violet-600', noun: 'request', seriesLabel: 'Messages' },
}

export const DEPARTMENT_ORDER: DepartmentId[] = ['enquiries', 'designs', 'quotations', 'production', 'accounts', 'feedback', 'communications']

export const isDepartmentId = (value: string | undefined): value is DepartmentId =>
  value !== undefined && value in DEPARTMENT_META

/** Activity categories from the API, mapped to the department that owns them. */
export const CATEGORY_TO_DEPARTMENT: Record<string, DepartmentId> = {
  Enquiry: 'enquiries',
  Design: 'designs',
  Quotation: 'quotations',
  Production: 'production',
  Feedback: 'feedback',
  Labour: 'labour',
}
