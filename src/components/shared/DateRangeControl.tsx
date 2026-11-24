import { memo } from 'react'
import type { RangeKey } from '../../data/dashboard'
import { cn } from '../../lib/cn'
import { RANGES } from '../../lib/dates'

/** The one shared date range control: a segmented control on wide screens, a native select on phones. */
export const DateRangeControl = memo(function DateRangeControl({
  value,
  onChange,
}: {
  value: RangeKey
  onChange: (value: RangeKey) => void
}) {
  return (
    <>
      <div role="group" aria-label="Date range" className="hidden rounded-md bg-muted p-0.5 md:flex">
        {RANGES.map((range) => {
          const active = range.id === value
          return (
            <button
              key={range.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (range.id !== value) {
                  onChange(range.id)
                }
              }}
              className={cn(
                'h-8 cursor-pointer rounded-[5px] px-3 text-sm font-medium transition-colors duration-150',
                active ? 'bg-card text-foreground shadow-[0_0_0_1px_var(--border)]' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {range.label}
            </button>
          )
        })}
      </div>
      <label className="md:hidden">
        <span className="sr-only">Date range</span>
        <select
          value={value}
          onChange={(event) => {
            const next = event.target.value as RangeKey
            if (next !== value) {
              onChange(next)
            }
          }}
          className="h-10 rounded-md border border-input bg-background px-2 text-sm"
        >
          {RANGES.map((range) => (
            <option key={range.id} value={range.id}>
              {range.label}
            </option>
          ))}
        </select>
      </label>
    </>
  )
})
