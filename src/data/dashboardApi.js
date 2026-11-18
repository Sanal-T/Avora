import { departments } from './dashboard.js'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

const toDepartment = (summary) => {
  const local = departments.find((department) => department.id === summary.id)
  return {
    ...local,
    primary: summary.primary_value,
    primaryLabel: summary.primary_label,
    metrics: summary.metrics.map((metric) => [metric.label, metric.value]),
    trend: summary.trend,
  }
}

export async function getDashboardOverview() {
  if (!apiBaseUrl) return { source: 'mock', departments }

  const response = await fetch(`${apiBaseUrl}/api/dashboard/overview`)
  if (!response.ok) throw new Error('Dashboard information is unavailable.')
  const overview = await response.json()
  return { source: overview.source, departments: overview.departments.map(toDepartment) }
}
