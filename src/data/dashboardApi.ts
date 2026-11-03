import { departments, type Department } from './dashboard'

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

export async function getDashboardOverview({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string } = {}): Promise<DashboardOverviewResponse> {
  if (!apiBaseUrl) {
    return { source: 'mock', departments }
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
