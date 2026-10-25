import { useState, useMemo, type ReactNode } from 'react'
import {
  Search,
  SlidersHorizontal,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Eye,
  Check,
  Inbox,
  type LucideIcon,
} from 'lucide-react'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Skeleton, EmptyState } from '../ui/Feedback'
import { Drawer } from '../ui/Drawer'
import { Checkbox } from '../ui/Checkbox'
import { cn } from '../../lib/cn'

export type ColumnDef<T> = {
  key: string
  header: string
  cell?: (row: T) => ReactNode
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
}

export type QuickFilterTab = {
  id: string
  label: string
  count?: number
}

export type FilterField = {
  key: string
  label: string
  options: { label: string; value: string }[]
}

export type DataTableProps<T> = {
  data: T[]
  columns: ColumnDef<T>[]
  keyExtractor: (row: T) => string
  searchPlaceholder?: string
  searchQuery?: string
  onSearchChange?: (query: string) => void
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: LucideIcon
  // Filter tabs
  filterTabs?: QuickFilterTab[]
  activeFilterTab?: string
  onFilterTabChange?: (tabId: string) => void
  // Filters drawer
  filterFields?: FilterField[]
  activeFilters?: Record<string, string>
  onFilterChange?: (key: string, value: string) => void
  onClearFilters?: () => void
  // Selection
  selectable?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  // Pagination
  pageSize?: number
  // Export
  exportFilename?: string
  // Header Actions
  action?: ReactNode
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  searchPlaceholder = 'Search records…',
  searchQuery: controlledSearch,
  onSearchChange,
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no records matching your current criteria.',
  emptyIcon: EmptyIcon = Inbox,
  filterTabs,
  activeFilterTab,
  onFilterTabChange,
  filterFields,
  activeFilters,
  onFilterChange,
  onClearFilters,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  pageSize = 10,
  exportFilename = 'export.csv',
  action,
}: DataTableProps<T>) {
  // Local state for internal search & sorting if not controlled
  const [internalSearch, setInternalSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
    columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}),
  )
  const [columnMenuOpen, setColumnMenuOpen] = useState(false)

  const activeSearch = controlledSearch !== undefined ? controlledSearch : internalSearch

  const handleSearchChange = (query: string) => {
    if (onSearchChange) {
      onSearchChange(query)
    } else {
      setInternalSearch(query)
    }
    setCurrentPage(1)
  }

  // Handle sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') setSortOrder('desc')
      else {
        setSortKey(null)
        setSortOrder('asc')
      }
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  // Filter and sort items locally
  const processedData = useMemo(() => {
    let result = [...data]

    // Text search
    if (activeSearch.trim()) {
      const q = activeSearch.toLowerCase()
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          typeof val === 'string' || typeof val === 'number'
            ? String(val).toLowerCase().includes(q)
            : false,
        ),
      )
    }

    // Filter fields from drawer
    if (activeFilters) {
      Object.entries(activeFilters).forEach(([key, val]) => {
        if (val && val !== 'all') {
          result = result.filter((row) => String(row[key]) === String(val))
        }
      })
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const aVal = a[sortKey]
        const bVal = b[sortKey]
        if (aVal === bVal) return 0
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
        }
        return sortOrder === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal))
      })
    }

    return result
  }, [data, activeSearch, activeFilters, sortKey, sortOrder])

  // Pagination calculation
  const totalPages = Math.ceil(processedData.length / pageSize) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return processedData.slice(start, start + pageSize)
  }, [processedData, currentPage, pageSize])

  // Select all handler
  const allCurrentPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((row) => selectedIds.includes(keyExtractor(row)))

  const handleSelectAll = () => {
    if (!onSelectionChange) return
    if (allCurrentPageSelected) {
      const pageKeys = new Set(paginatedData.map(keyExtractor))
      onSelectionChange(selectedIds.filter((id) => !pageKeys.has(id)))
    } else {
      const newSelected = new Set(selectedIds)
      paginatedData.forEach((row) => newSelected.add(keyExtractor(row)))
      onSelectionChange(Array.from(newSelected))
    }
  }

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange) return
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((item) => item !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  // Export to CSV
  const handleExportCSV = () => {
    const activeCols = columns.filter((col) => visibleColumns[col.key] !== false)
    const headers = activeCols.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',')
    const rows = processedData.map((row) =>
      activeCols
        .map((c) => {
          const val = row[c.key]
          return `"${String(val ?? '').replace(/"/g, '""')}"`
        })
        .join(','),
    )
    const csvContent = [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', exportFilename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const activeCols = columns.filter((col) => visibleColumns[col.key] !== false)
  const activeFiltersCount = activeFilters
    ? Object.values(activeFilters).filter((v) => v && v !== 'all').length
    : 0

  return (
    <div className="w-full space-y-3">
      {/* Quick Filter Tabs */}
      {filterTabs && filterTabs.length > 0 && (
        <div className="flex border-b border-border pb-1">
          <div className="flex space-x-2">
            {filterTabs.map((tab) => {
              const active = tab.id === activeFilterTab
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    onFilterTabChange?.(tab.id)
                    setCurrentPage(1)
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer',
                    active
                      ? 'bg-primary-soft text-primary-text font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.2 text-[10px]',
                        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="w-full max-w-xs">
            <Input
              value={activeSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              leftIcon={<Search className="size-4" />}
            />
          </div>

          {filterFields && filterFields.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterDrawerOpen(true)}
              className="relative shrink-0"
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          )}

          {/* Active Filter Chips */}
          {activeFilters &&
            Object.entries(activeFilters).map(([k, v]) => {
              if (!v || v === 'all') return null
              const field = filterFields?.find((f) => f.key === k)
              const opt = field?.options.find((o) => o.value === v)
              return (
                <Badge key={k} tone="primary" className="cursor-pointer">
                  <span>
                    {field?.label}: {opt?.label || v}
                  </span>
                  <button
                    type="button"
                    onClick={() => onFilterChange?.(k, 'all')}
                    className="ml-1 hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )
            })}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Column Visibility Toggle */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setColumnMenuOpen((v) => !v)}
              aria-label="Toggle columns"
            >
              <Eye className="size-3.5" />
              <span className="hidden md:inline">Columns</span>
            </Button>

            {columnMenuOpen && (
              <div className="absolute right-0 top-10 z-30 w-48 rounded-lg border border-border bg-card p-2 shadow-float">
                <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Visible columns</p>
                <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                  {columns.map((col) => (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() =>
                        setVisibleColumns((prev) => ({ ...prev, [col.key]: !prev[col.key] }))
                      }
                      className="flex w-full items-center justify-between rounded px-2 py-1 text-xs text-foreground hover:bg-muted cursor-pointer"
                    >
                      <span>{col.header}</span>
                      {visibleColumns[col.key] !== false && <Check className="size-3 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Density Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDensity((d) => (d === 'comfortable' ? 'compact' : 'comfortable'))}
            title={`Density: ${density}`}
          >
            <span className="text-xs font-mono">{density === 'comfortable' ? 'Dense' : 'Cozy'}</span>
          </Button>

          {/* CSV Export */}
          <Button variant="outline" size="sm" onClick={handleExportCSV} title="Export CSV">
            <Download className="size-3.5" />
            <span className="hidden md:inline">Export</span>
          </Button>

          {action}
        </div>
      </div>

      {/* Selected Records Alert */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-md bg-primary-soft px-3 py-2 text-xs text-primary-text">
          <span>{selectedIds.length} item(s) selected</span>
          <button
            type="button"
            onClick={() => onSelectionChange?.([])}
            className="font-semibold underline hover:text-foreground cursor-pointer"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table Surface */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground">
                {selectable && (
                  <th className="w-10 px-3 py-3">
                    <Checkbox
                      checked={allCurrentPageSelected}
                      onChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                )}
                {activeCols.map((col) => {
                  const isSorted = sortKey === col.key
                  return (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      className={cn(
                        'px-4 py-3 font-medium select-none',
                        col.sortable && 'cursor-pointer hover:text-foreground',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                      )}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <div
                        className={cn(
                          'inline-flex items-center gap-1.5',
                          col.align === 'right' && 'flex-row-reverse',
                        )}
                      >
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span className="text-muted-foreground">
                            {isSorted ? (
                              sortOrder === 'asc' ? (
                                <ChevronUp className="size-3 text-primary" />
                              ) : (
                                <ChevronDown className="size-3 text-primary" />
                              )
                            ) : (
                              <ChevronsUpDown className="size-3 opacity-40" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={i}>
                    {selectable && (
                      <td className="px-3 py-3">
                        <Skeleton className="size-4 rounded" />
                      </td>
                    )}
                    {activeCols.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <Skeleton className="h-4 w-3/4 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={activeCols.length + (selectable ? 1 : 0)} className="py-12">
                    <EmptyState
                      icon={EmptyIcon}
                      title={emptyTitle}
                      description={emptyDescription}
                    />
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => {
                  const id = keyExtractor(row)
                  const isSelected = selectedIds.includes(id)

                  return (
                    <tr
                      key={id}
                      className={cn(
                        'transition-colors hover:bg-muted/40',
                        isSelected && 'bg-primary-soft/40',
                      )}
                    >
                      {selectable && (
                        <td className="w-10 px-3 py-3">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelectRow(id)}
                            aria-label={`Select row ${id}`}
                          />
                        </td>
                      )}
                      {activeCols.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            'px-4 text-foreground',
                            density === 'compact' ? 'py-2 text-xs' : 'py-3 text-sm',
                            col.align === 'right' && 'text-right',
                            col.align === 'center' && 'text-center',
                          )}
                        >
                          {col.cell ? col.cell(row) : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Showing{' '}
            <span className="font-semibold text-foreground">
              {processedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-foreground">
              {Math.min(currentPage * pageSize, processedData.length)}
            </span>{' '}
            of <span className="font-semibold text-foreground">{processedData.length}</span> entries
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-xs font-medium text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Drawer */}
      {filterFields && (
        <Drawer
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          title="Filter Records"
          description="Narrow down records by specific department criteria."
        >
          <div className="space-y-4">
            {filterFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">{field.label}</label>
                <div className="flex flex-wrap gap-1.5">
                  {field.options.map((opt) => {
                    const isSelected = activeFilters?.[field.key] === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onFilterChange?.(field.key, opt.value)}
                        className={cn(
                          'rounded-md border px-2.5 py-1 text-xs transition cursor-pointer',
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground font-semibold'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <div className="mt-8 flex gap-2 border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  onClearFilters?.()
                  setFilterDrawerOpen(false)
                }}
              >
                Reset All
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => setFilterDrawerOpen(false)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  )
}
