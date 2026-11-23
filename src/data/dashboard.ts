export type Accent = 'blue' | 'violet' | 'orange' | 'teal' | 'rose' | 'gold'

export type Department = {
  id: string
  name: string
  icon: string
  accent: Accent
  primary: string
  primaryLabel: string
  metrics: [string, string][]
  description: string
  trend: string
}

export type RangeKey = '7d' | '30d' | 'month' | 'all'

const baseDepartments: Department[] = [
  { id: 'enquiries', name: 'Enquiries', icon: '◌', accent: 'blue', primary: '0', primaryLabel: 'Total enquiries', metrics: [], description: 'Track new customer opportunities and conversion progress.', trend: '' },
  { id: 'designs', name: 'Designs', icon: '✦', accent: 'violet', primary: '0', primaryLabel: 'Total designs', metrics: [], description: 'Follow design proposals, assignments, and completion.', trend: '' },
  { id: 'quotations', name: 'Quotations', icon: '▤', accent: 'orange', primary: '₹0', primaryLabel: 'Quotation value', metrics: [], description: 'Manage follow-ups, approvals, and production handover.', trend: '' },
  { id: 'production', name: 'Production', icon: '▧', accent: 'teal', primary: '0', primaryLabel: 'Work orders', metrics: [], description: 'Monitor schedules, production progress, and installation.', trend: '' },
  { id: 'feedback', name: 'Feedback', icon: '♡', accent: 'rose', primary: '0', primaryLabel: 'Feedback records', metrics: [], description: 'Review customer sentiment and close feedback requests.', trend: '' },
  { id: 'labour', name: 'Labour', icon: '◒', accent: 'gold', primary: '0', primaryLabel: 'Total workers', metrics: [], description: 'Coordinate workers, requests, and field allocation.', trend: '' },
]

export const departmentsByRange: Record<RangeKey, Department[]> = {
  '7d': baseDepartments,
  '30d': baseDepartments,
  month: baseDepartments,
  all: baseDepartments,
}

export const departments: Department[] = baseDepartments

export const activitiesByRange: Record<RangeKey, [string, string, string][]> = {
  '7d': [],
  '30d': [],
  month: [],
  all: [],
}

export const activities = activitiesByRange['30d']

export const actionItemsByRange: Record<RangeKey, [string, string, string][]> = {
  '7d': [],
  '30d': [],
  month: [],
  all: [],
}

export const actionItems = actionItemsByRange['30d']

export type DepartmentDetail = {
  title: string
  subtitle: string
  stats: [string, string, string][]
  queue: string[]
}

export const departmentDetailsByRange: Record<
  RangeKey,
  Record<string, DepartmentDetail>
> = {
  '7d': {},
  '30d': {},
  month: {},
  all: {},
}

export const departmentDetails: Record<string, DepartmentDetail> = departmentDetailsByRange['30d']
