import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  ChevronRight,
  Factory,
  FileText,
  Inbox,
  MessageSquare,
  Moon,
  PenTool,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { actionItems, activities, departmentDetails, departments, type Department } from './data/dashboard'
import { getDashboardOverview, type ApiActionItem, type ApiActivityItem, type ApiSnapshot } from './data/dashboardApi'

const navigate = (path: string) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const ranges = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: 'month', label: 'This month', days: null },
]

const icons: Record<string, LucideIcon> = {
  enquiries: Inbox,
  designs: PenTool,
  quotations: FileText,
  production: Factory,
  feedback: MessageSquare,
  labour: Users,
}

// Names used in "New …" buttons, so labels read correctly ("New enquiry", not "New Enquirie").
const singular: Record<string, string> = {
  enquiries: 'enquiry',
  designs: 'design',
  quotations: 'quotation',
  production: 'work order',
  feedback: 'feedback request',
  labour: 'labour request',
}

// The real job flow, left to right. Labour supports production and sits outside the flow.
const pipelineOrder = ['enquiries', 'designs', 'quotations', 'production', 'feedback']

const user = { name: 'Shiva Kumar', role: 'Administrator', initials: 'SK' }

const THEME_KEY = 'avora-theme'

function dates(id: string) {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const range = ranges.find((item) => item.id === id)!
  const start =
    range.days === null
      ? new Date(end.getFullYear(), end.getMonth(), 1)
      : new Date(end.getFullYear(), end.getMonth(), end.getDate() - range.days + 1)
  const format = (value: Date) => value.toISOString().slice(0, 10)
  return { dateFrom: format(start), dateTo: format(end) }
}

type OverviewState = {
  departments: Department[]
  source: string
  loading: boolean
  error: boolean
  snapshot?: ApiSnapshot
  actionItems?: ApiActionItem[]
  recentActivities?: ApiActivityItem[]
}

type Crumb = { label: string; to?: string }

export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [rangeId, setRangeId] = useState('30d')
  // index.html applies a saved dark choice before first paint; read it back here.
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [overview, setOverview] = useState<OverviewState>({
    departments,
    source: 'mock',
    loading: true,
    error: false,
  })
  const departmentId = path.match(/^\/departments\/([^/]+)/)?.[1]
  const details = departmentId ? departmentDetails[departmentId] : undefined
  const activeDepartment =
    details && departmentId
      ? (overview.departments.find((item) => item.id === departmentId) ?? departments.find((item) => item.id === departmentId))
      : undefined

  const refresh = () => {
    setOverview((current) => ({ ...current, loading: true, error: false }))
    // The short wait keeps the spinner visible; mock data otherwise resolves instantly and the click looks like a no-op.
    Promise.all([getDashboardOverview(dates(rangeId)), new Promise((resolve) => setTimeout(resolve, 600))])
      .then(([data]) =>
        setOverview({
          departments: data.departments,
          source: data.source,
          loading: false,
          error: false,
          snapshot: data.snapshot,
          actionItems: data.actionItems,
          recentActivities: data.recentActivities,
        })
      )
      .catch(() =>
        setOverview({
          departments,
          source: 'mock',
          loading: false,
          error: true,
        })
      )
  }

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(refresh, [rangeId])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [path])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this session.
    }
  }

  const crumbs: Crumb[] = activeDepartment
    ? [{ label: 'Overview', to: '/' }, { label: activeDepartment.name }]
    : [{ label: 'Workspace' }, { label: 'Overview' }]

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <main className="min-h-screen">
        <Topbar crumbs={crumbs} dark={dark} onToggleTheme={toggleTheme} />
        {details && activeDepartment ? (
          <DepartmentPage
            details={details}
            item={activeDepartment}
            rangeId={rangeId}
            onRangeChange={setRangeId}
            onRefresh={refresh}
            loading={overview.loading}
          />
        ) : (
          <Overview overview={overview} rangeId={rangeId} onRangeChange={setRangeId} onRefresh={refresh} />
        )}
      </main>
    </div>
  )
}

/* ───────────────────────── Shell ───────────────────────── */

function Topbar({ crumbs, dark, onToggleTheme }: { crumbs: Crumb[]; dark: boolean; onToggleTheme: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-canvas px-5 lg:px-10">
      <div className="flex min-w-0 items-center gap-5">
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault()
            navigate('/')
          }}
          className="flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-signal text-base font-extrabold text-ink">A</span>
          Avora
        </a>
        <nav aria-label="Breadcrumb" className="hidden items-center gap-2 border-l border-line pl-5 text-sm text-mute sm:flex">
          {crumbs.map((crumb, index) => (
            <span key={crumb.label} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="size-3.5" aria-hidden />}
              {crumb.to ? (
                <button onClick={() => navigate(crumb.to!)} className="hover:text-fg hover:underline cursor-pointer">
                  {crumb.label}
                </button>
              ) : (
                <span className={index === crumbs.length - 1 ? 'font-semibold text-fg' : ''}>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-1">
        <button aria-label="Search" className="grid size-10 place-items-center rounded-lg hover:bg-paper cursor-pointer">
          <Search className="size-[18px]" />
        </button>
        <button aria-label="Notifications" className="relative grid size-10 place-items-center rounded-lg hover:bg-paper cursor-pointer">
          <Bell className="size-[18px]" />
          <i className="absolute right-2.5 top-2.5 size-2 rounded-full bg-signal ring-2 ring-canvas" />
        </button>
        <AccountMenu dark={dark} onToggleTheme={onToggleTheme} />
      </div>
    </header>
  )
}

function AccountMenu({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapper} className="relative ml-2 border-l border-line pl-3">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label="Account menu"
        aria-haspopup="true"
        aria-expanded={open}
        className="grid size-10 place-items-center rounded-full bg-fg text-xs font-bold text-canvas transition hover:ring-2 hover:ring-signal cursor-pointer"
      >
        {user.initials}
      </button>

      {open && (
        <div
          role="group"
          aria-label="Account"
          className="absolute right-0 top-14 z-30 w-64 rounded-xl border border-line bg-canvas p-2 shadow-xl"
        >
          <div className="flex items-center gap-3 px-3 py-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fg text-xs font-bold text-canvas">{user.initials}</span>
            <span className="text-sm leading-tight">
              <b className="block font-semibold">{user.name}</b>
              <small className="text-mute">{user.role}</small>
            </span>
          </div>
          <div className="my-1 border-t border-line" />
          <button
            role="switch"
            aria-checked={dark}
            onClick={onToggleTheme}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-paper cursor-pointer"
          >
            <span className="flex items-center gap-3">
              {dark ? <Moon className="size-[18px]" aria-hidden /> : <Sun className="size-[18px]" aria-hidden />}
              Dark mode
            </span>
            <span className={`relative h-6 w-11 rounded-full transition ${dark ? 'bg-signal' : 'bg-mute'}`}>
              <span className={`absolute top-1 size-4 rounded-full bg-white transition-all ${dark ? 'left-6' : 'left-1'}`} />
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── Overview ───────────────────────── */

function Overview({
  overview,
  rangeId,
  onRangeChange,
  onRefresh,
}: {
  overview: OverviewState
  rangeId: string
  onRangeChange: (value: string) => void
  onRefresh: () => void
}) {
  const actionsToDisplay: string[][] =
    overview.actionItems && overview.actionItems.length > 0
      ? overview.actionItems.map((item) => [item.title, item.description, item.department_id])
      : actionItems

  const activitiesToDisplay: string[][] =
    overview.recentActivities && overview.recentActivities.length > 0
      ? overview.recentActivities.map((item) => [item.title, item.category, item.time_ago])
      : activities

  const badge =
    overview.source === 'database'
      ? { dot: 'bg-fg', text: 'Live database' }
      : overview.source === 'prototype'
        ? { dot: 'bg-signal', text: 'API prototype data' }
        : { dot: 'bg-signal', text: 'Mock prototype data' }

  const stages = pipelineOrder
    .map((id) => overview.departments.find((item) => item.id === id))
    .filter((item): item is Department => Boolean(item))

  return (
    <Page>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <Heading title="Company overview" text="A single view of work across every department." />
        <FilterBar rangeId={rangeId} onRangeChange={onRangeChange} onRefresh={onRefresh} loading={overview.loading} />
      </div>

      {overview.error && <Notice tone="alert">Live API is currently unavailable. Showing fallback data.</Notice>}

      <div className={`mt-8 ${overview.loading ? 'opacity-70' : ''}`}>
        <PipelineBand stages={stages} snapshot={overview.snapshot} />
      </div>

      <section className="mt-10" aria-labelledby="departments-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="departments-heading" className="font-display text-2xl font-bold tracking-tight">
            Departments
          </h2>
          <p className="flex items-center gap-2 text-sm text-mute">
            <i className={`size-2 rounded-full ${badge.dot}`} />
            {overview.loading ? 'Refreshing dashboard data…' : `${badge.text} · ${ranges.find((item) => item.id === rangeId)?.label}`}
          </p>
        </div>
        <div className={`grid gap-5 md:grid-cols-2 xl:grid-cols-3 ${overview.loading ? 'pointer-events-none opacity-60' : ''}`}>
          {overview.departments.map((item) => (
            <DepartmentCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <div className="mt-10 grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl bg-panel p-6 text-white dark:border dark:border-line">
          <header className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold tracking-tight">Pending actions</h3>
            <button className="text-sm font-medium text-white/70 hover:text-white cursor-pointer">View all</button>
          </header>
          <div className="mt-3">
            {actionsToDisplay.map(([title, description, id]) => (
              <button
                key={title}
                onClick={() => navigate(`/departments/${id}`)}
                className="-mx-3 flex w-[calc(100%+1.5rem)] items-center gap-4 rounded-lg border-t border-white/15 px-3 py-4 text-left transition first:border-t-0 hover:bg-white/10 cursor-pointer"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-signal text-ink">
                  <AlertTriangle className="size-4" aria-hidden />
                </span>
                <span className="flex-1">
                  <b className="block text-sm font-semibold">{title}</b>
                  <small className="text-xs text-white/60">{description}</small>
                </span>
                <ChevronRight className="size-4 text-white/50" aria-hidden />
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line p-6">
          <header className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold tracking-tight">Recent activity</h3>
            <button className="text-sm font-medium text-mute hover:text-fg cursor-pointer">View history</button>
          </header>
          <ol className="relative mt-5 space-y-5 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-line before:content-['']">
            {activitiesToDisplay.map(([title, type, time], index) => (
              <li key={title} className="relative flex items-start gap-4 pl-6">
                <span className={`absolute left-0 top-1.5 size-[11px] rounded-full ring-4 ring-canvas ${index === 0 ? 'bg-signal' : 'bg-fg'}`} />
                <span className="flex-1">
                  <b className="block text-sm font-semibold">{title}</b>
                  <small className="text-xs text-mute">{type}</small>
                </span>
                <time className="whitespace-nowrap text-xs text-mute">{time}</time>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Page>
  )
}

function PipelineBand({ stages, snapshot }: { stages: Department[]; snapshot?: ApiSnapshot }) {
  const figures = snapshot
    ? [
        ['Active pipeline', snapshot.active_pipeline_value],
        ['Open work', String(snapshot.open_work_count)],
        ['Needs attention', String(snapshot.needs_attention_count)],
      ]
    : []

  return (
    <section aria-labelledby="pipeline-heading" className="rounded-2xl bg-panel p-6 text-white md:p-8 dark:border dark:border-line">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="pipeline-heading" className="font-display text-2xl font-bold tracking-tight md:text-3xl">
            From enquiry to feedback
          </h2>
          <p className="mt-1 max-w-md text-sm text-white/60">Every job moves through these five stages. Select a stage to open its workspace.</p>
        </div>
        {figures.length > 0 && (
          <dl className="flex gap-8">
            {figures.map(([label, value], index) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="text-xs text-white/60">{label}</dt>
                <dd className={`font-display text-2xl font-bold tabular-nums ${index === 2 ? 'text-signal' : ''}`}>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <ol className="relative mt-10 grid gap-8 md:grid-cols-5 md:gap-4">
        <span
          aria-hidden
          className="thread absolute left-0 top-[7px] hidden h-0.5 bg-signal md:block"
          style={{ right: 'calc((100% - 4rem) / 5)' }}
        />
        {stages.map((stage) => {
          const Icon = icons[stage.id] ?? Inbox
          return (
            <li key={stage.id}>
              <button onClick={() => navigate(`/departments/${stage.id}`)} className="group block w-full text-left cursor-pointer">
                <span className="relative z-10 block size-4 rounded-full border-2 border-signal bg-panel transition group-hover:bg-signal" />
                <span className="mt-5 flex items-center gap-2 text-sm text-white/70">
                  <Icon className="size-4" aria-hidden />
                  {stage.name}
                </span>
                <span className="mt-1 block font-display text-4xl font-extrabold tracking-tight tabular-nums">{stage.primary}</span>
                <span className="mt-1 block text-xs text-white/60">{stage.primaryLabel}</span>
                <span className="mt-3 block text-xs font-medium text-signal">{stage.trend}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function DepartmentCard({ item }: { item: Department }) {
  const Icon = icons[item.id] ?? Inbox
  return (
    <article className="group relative flex flex-col rounded-2xl border border-line bg-canvas p-5 transition hover:border-fg">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-fg text-canvas">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium">{item.trend}</span>
      </div>
      <h3 className="mt-5 text-sm font-semibold text-mute">{item.name}</h3>
      <p className="font-display text-4xl font-extrabold tracking-tight tabular-nums">{item.primary}</p>
      <p className="text-xs text-mute">{item.primaryLabel}</p>
      <dl className="mt-5 flex divide-x divide-line border-t border-line pt-4">
        {item.metrics.map(([label, value]) => (
          <div key={label} className="flex flex-1 flex-col-reverse px-3 first:pl-0 last:pr-0">
            <dt className="text-xs text-mute">{label}</dt>
            <dd className="font-display text-lg font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <button
        onClick={() => navigate(`/departments/${item.id}`)}
        className="mt-5 flex items-center justify-between text-sm font-semibold after:absolute after:inset-0 after:content-[''] cursor-pointer"
      >
        View details
        <span className="grid size-8 place-items-center rounded-full border border-line transition group-hover:border-signal group-hover:bg-signal group-hover:text-ink">
          <ArrowUpRight className="size-4" aria-hidden />
        </span>
      </button>
    </article>
  )
}

/* ───────────────────────── Department page ───────────────────────── */

function DepartmentPage({
  details,
  item,
  rangeId,
  onRangeChange,
  onRefresh,
  loading,
}: {
  details: (typeof departmentDetails)[string]
  item: Department
  rangeId: string
  onRangeChange: (value: string) => void
  onRefresh: () => void
  loading: boolean
}) {
  const Icon = icons[item.id] ?? Inbox
  const noun = singular[item.id] ?? 'record'

  return (
    <Page>
      <button onClick={() => navigate('/')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold hover:text-signal-deep cursor-pointer">
        <ArrowLeft className="size-4" aria-hidden />
        Back to overview
      </button>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <Heading title={details.title} text={details.subtitle} />
        <FilterBar rangeId={rangeId} onRangeChange={onRangeChange} onRefresh={onRefresh} loading={loading} />
      </div>

      <section className="mt-8 flex flex-col gap-6 rounded-2xl bg-panel p-6 text-white md:flex-row md:items-center md:justify-between md:p-8 dark:border dark:border-line">
        <div className="flex items-center gap-5">
          <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-signal text-ink">
            <Icon className="size-7" aria-hidden />
          </span>
          <div>
            <p className="text-sm text-white/60">{item.name} overview</p>
            <p className="font-display text-5xl font-extrabold tracking-tight tabular-nums">{item.primary}</p>
            <p className="text-sm text-white/60">{item.primaryLabel}</p>
          </div>
        </div>
        <button
          onClick={() => alert(`Create new ${noun} modal dialog`)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-signal px-5 py-3 text-sm font-bold text-ink transition hover:bg-white cursor-pointer"
        >
          <Plus className="size-4" aria-hidden />
          New {noun}
        </button>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {details.stats.map(([label, value, note]) => (
          <article key={label} className="rounded-2xl border border-line p-5">
            <p className="text-sm text-mute">{label}</p>
            <b className="mt-1 block font-display text-4xl font-extrabold tracking-tight tabular-nums">{value}</b>
            <small className="mt-3 inline-block rounded-full bg-paper px-2.5 py-1 text-xs font-medium">{note}</small>
          </article>
        ))}
      </div>

      <section className="mt-4 rounded-2xl border border-line p-6">
        <header className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight">Priority queue</h2>
          <button className="text-sm font-medium text-mute hover:text-fg cursor-pointer">View all</button>
        </header>
        <ul className="mt-2 divide-y divide-line">
          {details.queue.map((record) => {
            const [code, name] = record.split(' · ')
            return (
              <li key={record} className="flex items-center gap-4 py-4">
                <span className="w-24 font-display text-base font-bold tabular-nums">{code}</span>
                <span className="flex-1 text-sm text-mute">{name}</span>
                <button
                  onClick={() => alert(`Opening details for ${record}`)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold transition hover:border-fg cursor-pointer"
                >
                  Open
                  <ArrowUpRight className="size-4" aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <Notice>Module workspace connected to live database APIs and workflow controllers.</Notice>
    </Page>
  )
}

/* ───────────────────────── Shared pieces ───────────────────────── */

function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1320px] px-5 py-8 lg:px-10 lg:py-10">{children}</div>
}

function Heading({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">{title}</h1>
      <p className="mt-2 text-base text-mute">{text}</p>
    </div>
  )
}

function FilterBar({
  rangeId,
  onRangeChange,
  onRefresh,
  loading,
}: {
  rangeId: string
  onRangeChange: (value: string) => void
  onRefresh: () => void
  loading: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Date range" className="flex rounded-lg bg-paper p-1">
        {ranges.map((range) => {
          const active = range.id === rangeId
          return (
            <button
              key={range.id}
              aria-pressed={active}
              onClick={() => onRangeChange(range.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition cursor-pointer ${
                active ? 'bg-fg text-canvas' : 'text-mute hover:text-fg'
              }`}
            >
              {range.label}
            </button>
          )
        })}
      </div>
      <button
        disabled={loading}
        onClick={onRefresh}
        className="inline-flex items-center gap-2 rounded-lg border border-fg px-3.5 py-2 text-sm font-semibold transition hover:bg-fg hover:text-canvas disabled:opacity-50 cursor-pointer"
      >
        <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
        {loading ? 'Refreshing' : 'Refresh'}
      </button>
    </div>
  )
}

function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'alert' }) {
  return (
    <div
      role={tone === 'alert' ? 'alert' : undefined}
      className={`mt-5 flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${
        tone === 'alert' ? 'border border-signal bg-canvas font-medium' : 'bg-paper text-mute'
      }`}
    >
      {tone === 'alert' && <AlertTriangle className="size-4 shrink-0 text-signal-deep" aria-hidden />}
      {children}
    </div>
  )
}
