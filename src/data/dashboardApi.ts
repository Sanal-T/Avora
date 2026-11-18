import {
  actionItemsByRange,
  activitiesByRange,
  departments,
  departmentsByRange,
  type Department,
  type RangeKey,
} from './dashboard'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

type ApiMetric = { label: string; value: string }

type ApiSummary = {
  id: string
  name: string
  primary_value: string
  primary_label: string
  metrics: ApiMetric[]
  trend: string
}

export type ApiSnapshot = {
  active_pipeline_value: string
  open_work_count: number
  needs_attention_count: number
}

export type ApiActionItem = {
  title: string
  description: string
  department_id: string
}

export type ApiActivityItem = {
  title: string
  category: string
  time_ago: string
}

export type DashboardOverviewResponse = {
  source: string
  departments: Department[]
  snapshot?: ApiSnapshot
  actionItems?: ApiActionItem[]
  recentActivities?: ApiActivityItem[]
}

const toDepartment = (summary: ApiSummary): Department => {
  const local = departments.find((d) => d.id === summary.id)
  return {
    id: summary.id,
    name: summary.name || local?.name || summary.id,
    icon: local?.icon || '◌',
    accent: local?.accent || 'blue',
    primary: summary.primary_value,
    primaryLabel: summary.primary_label,
    metrics: summary.metrics.map((m) => [m.label, m.value]),
    description: local?.description || '',
    trend: summary.trend,
  }
}

export function inferRange(dateFrom?: string, dateTo?: string, rangeId?: string): RangeKey {
  if (rangeId === '7d' || rangeId === '30d' || rangeId === 'month') {
    return rangeId
  }
  if (!dateFrom || !dateTo) return '30d'
  const from = new Date(dateFrom).getTime()
  const to = new Date(dateTo).getTime()
  const diffDays = Math.round(Math.abs(to - from) / (1000 * 60 * 60 * 24))
  if (diffDays <= 8) return '7d'
  if (diffDays <= 22) return 'month'
  return '30d'
}

const mockSnapshots: Record<RangeKey, ApiSnapshot> = {
  '7d': {
    active_pipeline_value: '₹3.4L',
    open_work_count: 14,
    needs_attention_count: 4,
  },
  'month': {
    active_pipeline_value: '₹7.8L',
    open_work_count: 29,
    needs_attention_count: 11,
  },
  '30d': {
    active_pipeline_value: '₹12.4L',
    open_work_count: 47,
    needs_attention_count: 17,
  },
}

export async function getDashboardOverview({
  dateFrom,
  dateTo,
  rangeId,
}: { dateFrom?: string; dateTo?: string; rangeId?: string } = {}): Promise<DashboardOverviewResponse> {
  const selectedRange = inferRange(dateFrom, dateTo, rangeId)

  if (!apiBaseUrl) {
    const rawActions = actionItemsByRange[selectedRange] || actionItemsByRange['30d']
    const rawActivities = activitiesByRange[selectedRange] || activitiesByRange['30d']
    return {
      source: 'mock',
      departments: departmentsByRange[selectedRange] || departmentsByRange['30d'],
      snapshot: mockSnapshots[selectedRange],
      actionItems: rawActions.map(([title, description, department_id]) => ({
        title,
        description,
        department_id,
      })),
      recentActivities: rawActivities.map(([title, category, time_ago]) => ({
        title,
        category,
        time_ago,
      })),
    }
  }

  const parameters = new URLSearchParams()
  if (dateFrom) parameters.set('date_from', dateFrom)
  if (dateTo) parameters.set('date_to', dateTo)

  const url = `${apiBaseUrl}/api/dashboard/overview${parameters.size ? `?${parameters.toString()}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Dashboard information is unavailable.')
  }

  const overview = await response.json()
  return {
    source: overview.source || 'database',
    departments: overview.departments.map(toDepartment),
    snapshot: overview.snapshot,
    actionItems: overview.action_items,
    recentActivities: overview.recent_activities,
  }
}
