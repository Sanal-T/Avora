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
  X,
  ArrowRight,
} from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { mockEnquiries, mockQuotations, mockWorkOrders, mockDesigns } from '../../data/mockData'

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
    { id: 'nav-overview', title: 'Company Overview', subtitle: 'Global ERP dashboard and KPIs', category: 'Navigation', path: '/', icon: BarChart3 },
    { id: 'nav-enquiries', title: 'Enquiries', subtitle: 'Sales leads and customer requests', category: 'Departments', path: '/enquiries', icon: Inbox },
    { id: 'nav-designs', title: 'Designs', subtitle: 'CAD drawings, renderings and approvals', category: 'Departments', path: '/designs', icon: PenTool },
    { id: 'nav-quotations', title: 'Quotations', subtitle: 'Costing, estimates and quote builder', category: 'Departments', path: '/quotations', icon: FileText },
    { id: 'nav-production', title: 'Production', subtitle: 'Work orders, tasks and shop floor', category: 'Departments', path: '/production', icon: Factory },
    { id: 'nav-feedback', title: 'Feedback', subtitle: 'Customer reviews, ratings and NPS', category: 'Departments', path: '/feedback', icon: MessageSquare },
    { id: 'nav-labour', title: 'Labour & Workforce', subtitle: 'Worker availability and team allocation', category: 'Departments', path: '/labour', icon: Users },
  ]

  // Search records
  const matchingRecords: SearchItem[] = query.trim()
    ? [
        ...mockEnquiries
          .filter(
            (e) =>
              e.code.toLowerCase().includes(query.toLowerCase()) ||
              e.company.toLowerCase().includes(query.toLowerCase()) ||
              e.customerName.toLowerCase().includes(query.toLowerCase()),
          )
          .map((e) => ({
            id: e.id,
            title: `${e.code} · ${e.company}`,
            subtitle: `${e.customerName} - ${e.budget}`,
            category: 'Enquiries',
            path: `/enquiries/${e.id}`,
            icon: Inbox,
          })),
        ...mockQuotations
          .filter(
            (q) =>
              q.code.toLowerCase().includes(query.toLowerCase()) ||
              q.client.toLowerCase().includes(query.toLowerCase()),
          )
          .map((q) => ({
            id: q.id,
            title: `${q.code} · ${q.client}`,
            subtitle: `${q.title} - ₹${(q.grandTotal / 100000).toFixed(2)}L`,
            category: 'Quotations',
            path: `/quotations/${q.id}`,
            icon: FileText,
          })),
        ...mockWorkOrders
          .filter(
            (w) =>
              w.code.toLowerCase().includes(query.toLowerCase()) ||
              w.client.toLowerCase().includes(query.toLowerCase()),
          )
          .map((w) => ({
            id: w.id,
            title: `${w.code} · ${w.client}`,
            subtitle: `${w.stage} (${w.completionRate}%)`,
            category: 'Production',
            path: `/production/${w.id}`,
            icon: Factory,
          })),
        ...mockDesigns
          .filter(
            (d) =>
              d.code.toLowerCase().includes(query.toLowerCase()) ||
              d.client.toLowerCase().includes(query.toLowerCase()),
          )
          .map((d) => ({
            id: d.id,
            title: `${d.code} · ${d.client}`,
            subtitle: `${d.title} (${d.version})`,
            category: 'Designs',
            path: `/designs/${d.id}`,
            icon: PenTool,
          })),
      ]
    : []

  const matchingNavigation = defaultNavigationItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase()),
  )

  const itemsToShow = query.trim() ? [...matchingRecords, ...matchingNavigation] : defaultNavigationItems

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
