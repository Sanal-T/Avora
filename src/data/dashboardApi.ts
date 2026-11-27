import {
  departments,
  departmentsByRange,
  type Department,
  type RangeKey,
  type DepartmentDetail,
} from './dashboard'
import { apiFetch } from '../lib/api'
import { onDataMutation } from '../lib/cache'
import { rangeDates } from '../lib/dates'

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
  /** Per-department detail stats. The live API does not provide these yet, so callers fall back to mock details. */
  details?: Record<string, DepartmentDetail>
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
  if (rangeId === '7d' || rangeId === '30d' || rangeId === 'month' || rangeId === 'all') {
    return rangeId
  }
  if (!dateFrom && !dateTo) return 'all'
  if (!dateFrom || !dateTo) return '30d'
  const from = new Date(dateFrom).getTime()
  const to = new Date(dateTo).getTime()
  const diffDays = Math.round(Math.abs(to - from) / (1000 * 60 * 60 * 24))
  if (diffDays <= 8) return '7d'
  if (diffDays <= 22) return 'month'
  return '30d'
}

/** Empty overview fallback when the live API is unreachable. */
export function getEmptyOverview(range: RangeKey): DashboardOverviewResponse {
  return {
    source: 'database',
    departments: departmentsByRange[range],
    snapshot: {
      active_pipeline_value: '₹0',
      open_work_count: 0,
      needs_attention_count: 0,
    },
    actionItems: [],
    recentActivities: [],
    details: {},
  }
}
export const getMockOverview = getEmptyOverview

interface CachedOverview {
  data: DashboardOverviewResponse
  timestamp: number
}

const overviewCache = new Map<string, CachedOverview>()
const inFlightOverviewRequests = new Map<string, Promise<DashboardOverviewResponse>>()
const CACHE_TTL_MS = 60_000 // 60 seconds TTL

onDataMutation(() => {
  overviewCache.clear()
})

export function clearOverviewCache(): void {
  overviewCache.clear()
}

export function getCachedOverview(rangeId: RangeKey): DashboardOverviewResponse | null {
  const cached = overviewCache.get(`${rangeId}::`)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }
  return null
}

export async function getDashboardOverview({
  dateFrom,
  dateTo,
  rangeId,
  forceRefresh = false,
}: { dateFrom?: string; dateTo?: string; rangeId?: string; forceRefresh?: boolean } = {}): Promise<DashboardOverviewResponse> {
  const selectedRange = inferRange(dateFrom, dateTo, rangeId)
  const cacheKey = `${selectedRange}:${dateFrom || ''}:${dateTo || ''}`

  // Return cached result immediately if valid and not forcing a refresh
  if (!forceRefresh) {
    const cached = overviewCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data
    }
  }

  // Deduplicate concurrent in-flight requests for the same range
  const existingPromise = inFlightOverviewRequests.get(cacheKey)
  if (existingPromise && !forceRefresh) {
    return existingPromise
  }

  let effectiveFrom = dateFrom
  let effectiveTo = dateTo
  if (!effectiveFrom && !effectiveTo && rangeId) {
    const dates = rangeDates(selectedRange)
    effectiveFrom = dates.dateFrom
    effectiveTo = dates.dateTo
  }

  const parameters = new URLSearchParams()
  if (effectiveFrom) parameters.set('date_from', effectiveFrom)
  if (effectiveTo) parameters.set('date_to', effectiveTo)

  const url = `/api/dashboard/overview${parameters.size ? `?${parameters.toString()}` : ''}`
  
  const fetchPromise = (async () => {
    try {
      const overview = await apiFetch<any>(url)
      if (overview && overview.departments) {
        const result: DashboardOverviewResponse = {
          source: overview.source || 'database',
          departments: overview.departments.map(toDepartment),
          snapshot: overview.snapshot,
          actionItems: overview.action_items,
          recentActivities: overview.recent_activities,
        }
        overviewCache.set(cacheKey, { data: result, timestamp: Date.now() })
        return result
      }
    } catch (err) {
      console.warn('Backend overview endpoint unreachable or unauthorized:', err)
    }

    return getMockOverview(selectedRange)
  })()

  inFlightOverviewRequests.set(cacheKey, fetchPromise)
  fetchPromise.finally(() => {
    inFlightOverviewRequests.delete(cacheKey)
  })

  return fetchPromise
}
