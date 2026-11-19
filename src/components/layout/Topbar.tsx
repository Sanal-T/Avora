import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Search,
  Moon,
  Sun,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { currentUser } from '../../lib/auth'
import { useTheme } from '../../lib/hooks'
import { DateRangeControl } from '../shared/DateRangeControl'
import { NotificationsDropdown } from './NotificationsDropdown'
import type { RangeKey } from '../../data/dashboard'
import { DEPARTMENT_META, DEPARTMENT_ORDER, isDepartmentId } from '../../lib/departments'

export function Topbar({
  onOpenCommandPalette,
  rangeId,
  onRangeChange,
}: {
  onOpenCommandPalette: () => void
  rangeId: RangeKey
  onRangeChange: (range: RangeKey) => void
}) {
  const { theme, toggle: toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!accountMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [accountMenuOpen])

  // Only show the date range filter on operational dashboards (Overview and Department dashboards)
  const showDateRange =
    location.pathname === '/' ||
    DEPARTMENT_ORDER.some((dept) => location.pathname === `/${dept}`)

  // Dynamic breadcrumbs from route path
  const pathParts = location.pathname.split('/').filter(Boolean)
  const crumbs: { label: string; to?: string }[] = [{ label: 'Workspace', to: '/' }]

  if (pathParts.length === 0) {
    crumbs.push({ label: 'Overview' })
  } else {
    let currentPath = ''
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`
      const isLast = index === pathParts.length - 1

      if (isDepartmentId(part)) {
        crumbs.push({
          label: DEPARTMENT_META[part].label,
          to: isLast ? undefined : currentPath,
        })
      } else if (part === 'list') {
        crumbs.push({ label: 'Registry' })
      } else if (part === 'builder') {
        crumbs.push({ label: 'Quotation Builder' })
      } else if (part === 'schedule') {
        crumbs.push({ label: 'Production Schedule' })
      } else {
        crumbs.push({
          label: part.toUpperCase(),
          to: isLast ? undefined : currentPath,
        })
      }
    })
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/95 px-5 lg:px-10 backdrop-blur-xs">
      {/* Left: Brand Identity & Breadcrumbs */}
      <div className="flex min-w-0 items-center gap-5">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight text-foreground shrink-0"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-base font-extrabold text-primary-foreground shadow-xs">
            A
          </span>
          AVORA ERP
        </Link>

        <nav aria-label="Breadcrumb" className="hidden items-center gap-2 border-l border-border pl-5 text-xs text-muted-foreground sm:flex overflow-hidden">
          {crumbs.map((crumb, idx) => (
            <span key={crumb.label + idx} className="flex items-center gap-1.5 truncate">
              {idx > 0 && <ChevronRight className="size-3.5 shrink-0 opacity-40" />}
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-foreground transition-colors truncate">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-semibold text-foreground truncate">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Command Palette Button */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-xs hover:border-foreground/30 hover:text-foreground cursor-pointer transition-colors"
        >
          <Search className="size-3.5" />
          <span className="hidden sm:inline">Search ERP…</span>
          <kbd className="hidden sm:inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            Ctrl K
          </kbd>
        </button>

        {/* Date Range Control (Shown only on dashboard views) */}
        {showDateRange && (
          <DateRangeControl value={rangeId} onChange={onRangeChange} />
        )}

        {/* Notifications Center */}
        <NotificationsDropdown />

        {/* Profile Avatar & Account Menu */}
        <div ref={accountRef} className="relative pl-2 border-l border-border">
          <button
            type="button"
            onClick={() => setAccountMenuOpen((v) => !v)}
            aria-label="User account menu"
            aria-expanded={accountMenuOpen}
            className="grid size-9 place-items-center rounded-full bg-foreground text-xs font-bold text-background transition hover:ring-2 hover:ring-primary cursor-pointer"
          >
            {currentUser.initials}
          </button>

          {accountMenuOpen && (
            <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-border bg-card p-1.5 shadow-float">
              {/* User Bio */}
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-xs font-bold text-background">
                  {currentUser.initials}
                </span>
                <div className="truncate">
                  <p className="text-xs font-semibold text-foreground truncate">{currentUser.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{currentUser.role}</p>
                </div>
              </div>

              <div className="my-1 border-t border-border" />

              {/* Dark & Light Mode Switcher inside Pop up */}
              <button
                type="button"
                role="switch"
                aria-checked={theme === 'dark'}
                onClick={() => toggleTheme()}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  {theme === 'dark' ? (
                    <Moon className="size-3.5 text-primary" aria-hidden />
                  ) : (
                    <Sun className="size-3.5 text-primary" aria-hidden />
                  )}
                  <span>Dark mode</span>
                </span>
                <span
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    theme === 'dark' ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-4 rounded-full bg-white transition-all shadow-xs ${
                      theme === 'dark' ? 'left-4.5' : 'left-0.5'
                    }`}
                  />
                </span>
              </button>

              <div className="my-1 border-t border-border" />

              {/* Sign Out */}
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false)
                  navigate('/login')
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-danger hover:bg-danger-soft cursor-pointer transition-colors"
              >
                <LogOut className="size-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
