import type { RangeKey } from '../data/dashboard'

/** Order shown in the date range control. */
export const RANGES: { id: RangeKey; label: string }[] = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'month', label: 'This month' },
]

const pad = (value: number) => String(value).padStart(2, '0')

/** Local calendar date as YYYY-MM-DD. (toISOString() is UTC and shifts the day in timezones ahead of UTC, such as IST.) */
export const toISO = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export function rangeDates(id: RangeKey, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start =
    id === 'month'
      ? new Date(end.getFullYear(), end.getMonth(), 1)
      : new Date(end.getFullYear(), end.getMonth(), end.getDate() - (id === '7d' ? 6 : 29))
  return { dateFrom: toISO(start), dateTo: toISO(end) }
}

/** Number of calendar days the range covers, today included. */
export const daysInRange = (id: RangeKey, now = new Date()) => (id === '7d' ? 7 : id === '30d' ? 30 : now.getDate())
