import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  Plus,
  Search,
  Inbox,
  PenTool,
  Factory,
} from 'lucide-react'
import { currentUser, clearCurrentUser } from '../../lib/auth'
import { removeToken } from '../../lib/api'
import { useTheme } from '../../lib/hooks'
import { DateRangeControl } from '../shared/DateRangeControl'
import { NotificationsDropdown } from './NotificationsDropdown'
import type { RangeKey } from '../../data/dashboard'
import { DEPARTMENT_META, DEPARTMENT_ORDER, isDepartmentId } from '../../lib/departments'
import { cn } from '../../lib/cn'

interface TopbarProps {
  onOpenCommandPalette: () => void
  rangeId: RangeKey
  onRangeChange: (range: RangeKey) => void
  onOpenCreateModal?: (type: 'enquiry' | 'design' | 'workOrder') => void
}

export function Topbar({
  onOpenCommandPalette,
  rangeId,
  onRangeChange,
  onOpenCreateModal,
}: TopbarProps) {
  const { theme, toggle: toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)

  const accountRef = useRef<HTMLDivElement>(null)
  const createRef = useRef<HTMLDivElement>(null)

  // Close menus on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false)
      }
      if (createRef.current && !createRef.current.contains(e.target as Node)) {
        setCreateMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const showDateRange =
    location.pathname === '/' ||
    DEPARTMENT_ORDER.some((dept) => location.pathname === `/${dept}`)

  // Dynamic breadcrumbs
  const pathParts = location.pathname.split('/').filter(Boolean)
  const crumbs: { label: string; to?: string }[] = [
    { label: 'Overview', to: pathParts.length === 0 ? undefined : '/' },
  ]

  if (pathParts.length > 0) {
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
      } else if (part === 'schedule' || part === 'calendar') {
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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1760px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Identity + Clean Context Breadcrumbs */}
        <div className="flex items-center gap-4 min-w-0">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-display text-base font-bold tracking-tight text-foreground shrink-0 transition-opacity hover:opacity-90"
          >
            <div className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-hover text-xs font-extrabold text-primary-foreground shadow-xs">
              A
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-extrabold tracking-tight">AVORA</span>
              <span className="rounded bg-primary/20 px-1 py-0.2 text-[9px] font-extrabold tracking-wider text-primary uppercase">
                ERP
              </span>
            </div>
          </Link>

          {/* Breadcrumb path for easy navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground border-l border-border pl-4 overflow-hidden">
            {crumbs.map((crumb, idx) => (
              <span key={crumb.label + idx} className="flex items-center gap-1.5 truncate">
                {idx > 0 && <ChevronRight className="size-3.5 shrink-0 opacity-40" />}
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="hover:text-foreground transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-foreground truncate">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        </div>

        {/* Right: Date Range + Quick Action + Search + Theme + Account */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Date Range Control (on relevant views) */}
          {showDateRange && (
            <div className="hidden sm:block">
              <DateRangeControl value={rangeId} onChange={onRangeChange} />
            </div>
          )}

          {/* Search Trigger (Ctrl+K) */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="Search & commands (Ctrl+K)"
            aria-label="Search"
          >
            <Search className="size-3.5" />
          </button>

          {/* Notifications Dropdown */}
          <NotificationsDropdown />

          {/* User Account Menu */}
          <div ref={accountRef} className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((v) => !v)}
              aria-label="User account menu"
              aria-expanded={accountMenuOpen}
              className="grid size-8 place-items-center rounded-lg border border-border bg-muted/60 text-xs font-bold text-foreground transition hover:border-primary/50 hover:bg-muted cursor-pointer"
            >
              {currentUser.initials}
            </button>

            {accountMenuOpen && (
              <div className="absolute right-0 top-10 z-50 w-60 rounded-xl border border-border bg-popover p-1.5 shadow-float">
                <div className="flex items-center gap-2.5 px-3 py-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {currentUser.initials}
                  </span>
                  <div className="min-w-0 flex-1 truncate">
                    <p className="text-xs font-semibold text-foreground truncate">{currentUser.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{currentUser.role}</p>
                  </div>
                </div>

                <div className="my-1 border-t border-border" />

                <button
                  type="button"
                  onClick={() => toggleTheme()}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {theme === 'dark' ? <Moon className="size-3.5 text-primary" /> : <Sun className="size-3.5 text-primary" />}
                    <span>{theme === 'dark' ? 'Dark theme' : 'Light theme'}</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">Toggle</span>
                </button>

                <div className="my-1 border-t border-border" />

                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false)
                    removeToken()
                    clearCurrentUser()
                    navigate('/login')
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-danger hover:bg-danger-soft cursor-pointer transition-colors"
                >
                  <LogOut className="size-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
