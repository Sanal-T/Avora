import { departments, type Department } from './dashboard'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

type ApiSummary = { id: string; primary_value: string; primary_label: string; metrics: { label: string; value: string }[]; trend: string }

const toDepartment = (summary: ApiSummary): Department => {
  const local = departments.find((department) => department.id === summary.id)
  if (!local) throw new Error(`Unknown dashboard department: ${summary.id}`)
  return { ...local, primary: summary.primary_value, primaryLabel: summary.primary_label, metrics: summary.metrics.map((metric) => [metric.label, metric.value]) }
}

export async function getDashboardOverview({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string } = {}) {
  if (!apiBaseUrl) return { source: 'mock', departments }
  const parameters = new URLSearchParams()
  if (dateFrom) parameters.set('date_from', dateFrom)
  if (dateTo) parameters.set('date_to', dateTo)
  const response = await fetch(`${apiBaseUrl}/api/dashboard/overview${parameters.size ? `?${parameters}` : ''}`)
  if (!response.ok) throw new Error('Dashboard information is unavailable.')
  const overview = await response.json() as { source: string; departments: ApiSummary[] }
  return { source: overview.source, departments: overview.departments.map(toDepartment) }
}
