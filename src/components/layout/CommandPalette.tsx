import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Inbox,
  PenTool,
  FileText,
  Factory,
  MessageSquare,
  Users,
  BarChart3,
  Calendar,
  X,
  ArrowRight,
  Plus,
  Building2,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react'
import { Dialog } from '../ui/Dialog'

type SearchItem = {
  id: string
  title: string
  subtitle: string
  category: string
  path: string
  icon: typeof Search
}

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const defaultNavigationItems: SearchItem[] = [
    { id: 'nav-overview', title: 'Company Overview', subtitle: 'Global ERP executive dashboard and department KPIs', category: 'Navigation', path: '/', icon: BarChart3 },
    { id: 'nav-enquiries', title: 'Enquiries Workspace', subtitle: 'Sales leads, prospect requirements, and qualification', category: 'Enquiries', path: '/enquiries', icon: Inbox },
    { id: 'nav-enquiries-list', title: 'Enquiries Full List', subtitle: 'Search and filter all incoming customer enquiries', category: 'Enquiries', path: '/enquiries/list', icon: Inbox },
    { id: 'nav-designs', title: 'Design Studio', subtitle: 'CAD drawings, revisions, 3D renderings and approvals', category: 'Designs', path: '/designs', icon: PenTool },
    { id: 'nav-designs-list', title: 'Designs Full List', subtitle: 'All design project records and specification drawings', category: 'Designs', path: '/designs/list', icon: PenTool },
    { id: 'nav-quotations', title: 'Quotations Management', subtitle: 'Commercial pricing, estimates, and revision tracking', category: 'Quotations', path: '/quotations', icon: FileText },
    { id: 'nav-quotations-list', title: 'Quotations Full List', subtitle: 'Search all commercial quotes and approved proposals', category: 'Quotations', path: '/quotations/list', icon: FileText },
    { id: 'nav-quotations-builder', title: 'New Quotation Builder', subtitle: 'Create commercial quotation with item lines & taxes', category: 'Quotations', path: '/quotations/builder', icon: Plus },
    { id: 'nav-production', title: 'Production Overview', subtitle: 'Shop floor status, active work orders and stages', category: 'Production', path: '/production', icon: Factory },
    { id: 'nav-production-list', title: 'Work Orders List', subtitle: 'Active fabrication orders, job progress and milestones', category: 'Production', path: '/production/list', icon: Factory },
    { id: 'nav-production-calendar', title: 'Production Calendar & Bays', subtitle: 'Factory shop bays schedule & daily slot allocations', category: 'Production', path: '/production/calendar', icon: Calendar },
    { id: 'nav-production-schedule', title: 'Production Weekly Schedule', subtitle: 'Timeline calendar across all bays and jobs', category: 'Production', path: '/production/schedule', icon: Calendar },
    { id: 'nav-labour', title: 'Labour & Workforce', subtitle: 'Department workforce overview and fulfillment metrics', category: 'Labour', path: '/labour', icon: Users },
    { id: 'nav-labour-list', title: 'Worker Roster & Allocation', subtitle: 'Carpenter, welder, electrician assignments & daily rates', category: 'Labour', path: '/labour/list', icon: Users },
    { id: 'nav-feedback', title: 'Customer Feedback', subtitle: 'Post-delivery reviews, star ratings and client NPS', category: 'Feedback', path: '/feedback', icon: MessageSquare },
    { id: 'nav-feedback-list', title: 'Feedback Survey List', subtitle: 'Browse all customer satisfaction records & remarks', category: 'Feedback', path: '/feedback/list', icon: MessageSquare },
    { id: 'nav-customers', title: 'Customer Directory', subtitle: 'Corporate accounts, contact persons and tax identifiers', category: 'Customers', path: '/customers', icon: Building2 },
    { id: 'nav-reports', title: 'System Reports & Exports', subtitle: 'Generate and export CSV reports across departments', category: 'Reports', path: '/reports', icon: FileSpreadsheet },
    { id: 'nav-audit-logs', title: 'Audit Trail Logs', subtitle: 'Immutable administrative audit history of all system changes', category: 'Admin', path: '/audit-logs', icon: ShieldCheck },
  ]

  const itemsToShow = query.trim()
    ? defaultNavigationItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase()),
      )
    : defaultNavigationItems

  const handleSelect = (path: string) => {
    navigate(path)
    onClose()
    setQuery('')
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="max-w-xl">
      <div className="-m-6 flex flex-col">
        {/* Search Input Box */}
        <div className="flex items-center border-b border-border px-4 py-3">
          <Search className="size-5 text-muted-foreground mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search records, departments, work orders… (e.g. ENQ-1048, Aster, Pods)"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
            >
              <X className="size-4" />
            </button>
          )}
          <span className="hidden sm:inline-block rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground ml-2">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2">
          {itemsToShow.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="space-y-1">
              {itemsToShow.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.path)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-muted cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid size-8 shrink-0 place-items-center rounded-md bg-muted group-hover:bg-card text-muted-foreground group-hover:text-primary transition-colors">
                        <Icon className="size-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {item.category}
                      </span>
                      <ArrowRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
          <span>Tip: Press <kbd className="font-mono">Ctrl+K</kbd> anywhere to open</span>
          <span>Avora ERP Command Center</span>
        </div>
      </div>
    </Dialog>
  )
}
