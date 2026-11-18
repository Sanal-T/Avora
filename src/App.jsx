import { useEffect, useState } from 'react'
import { actionItems, activities, departmentDetails, departments } from './data/dashboard.js'
import { getDashboardOverview } from './data/dashboardApi.js'

const navigate = (path) => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')) }

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [menuOpen, setMenuOpen] = useState(false)
  const [overview, setOverview] = useState({ departments, error: false })
  useEffect(() => { const listener = () => setPath(window.location.pathname); window.addEventListener('popstate', listener); return () => window.removeEventListener('popstate', listener) }, [])
  useEffect(() => { getDashboardOverview().then((data) => setOverview({ departments: data.departments, error: false })).catch(() => setOverview({ departments, error: true })) }, [])
  const departmentId = path.match(/^\/departments\/([^/]+)/)?.[1]
  const department = departmentId && departmentDetails[departmentId]

  return <div className="app-shell">
    <Sidebar active={departmentId || 'overview'} expanded={menuOpen} onNavigate={(to) => { setMenuOpen(false); navigate(to) }} />
    <main className="content">
      <Topbar onMenu={() => setMenuOpen(!menuOpen)} />
      {department ? <DepartmentView id={departmentId} data={department} /> : <Overview overview={overview} />}
    </main>
  </div>
}

function Sidebar({ active, expanded, onNavigate }) {
  return <aside className={`sidebar ${expanded ? 'expanded' : ''}`}>
    <button className="brand" onClick={() => onNavigate('/')}><span className="brand-mark">A</span><span>Avora</span></button>
    <nav><p className="nav-label">WORKSPACE</p><NavItem icon="⌂" label="Overview" active={active === 'overview'} onClick={() => onNavigate('/')} />
      <p className="nav-label module-label">MODULES</p>
      {departments.map((item) => <NavItem key={item.id} icon={item.icon} label={item.name} active={active === item.id} onClick={() => onNavigate(`/departments/${item.id}`)} />)}
    </nav>
    <div className="sidebar-footer"><div className="help-icon">?</div><div><strong>Need help?</strong><small>View support guide</small></div></div>
  </aside>
}

function NavItem({ icon, label, active, onClick }) { return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}><span>{icon}</span>{label}</button> }

function Topbar({ onMenu }) { return <header className="topbar"><button className="mobile-menu" onClick={onMenu}>☰</button><div className="crumb"><span>Workspace</span><b>/</b><strong>Dashboard</strong></div><div className="top-actions"><button className="icon-button">⌕</button><button className="notification"><span>♧</span><i /></button><div className="profile"><div className="avatar">SK</div><div><strong>Shiva Kumar</strong><small>Administrator</small></div><span className="chevron">⌄</span></div></div></header> }

function Overview({ overview }) { return <section className="page"><PageHeading title="Company overview" text="A single view of work across every department." /><FilterBar />
  <section className="business-summary"><div><p className="eyebrow">OVERALL BUSINESS SNAPSHOT</p><h2>Good morning, Shiva <span>✦</span></h2><p className="summary-copy">Here’s what needs your attention across Avora today.</p></div><div className="summary-kpis"><SummaryKpi label="Active pipeline" value="₹18.7L" note="Proposed metric" /><SummaryKpi label="Open work" value="88" note="Across departments" /><SummaryKpi label="Needs attention" value="17" note="Proposed metric" alert /></div></section>
  <section><SectionTitle eyebrow="DEPARTMENT OVERVIEW" title="Business at a glance" text="Select any department to explore its activity and work queues." />{overview.error && <div className="inline-notice">Live data is unavailable. Showing prototype data.</div>}<div className="department-grid">{overview.departments.map((item) => <DepartmentCard key={item.id} item={item} />)}</div></section>
  <section className="lower-grid"><Panel title="Pending actions" action="View all">{actionItems.map(([title, detail, id]) => <button className="action-row" key={title} onClick={() => navigate(`/departments/${id}`)}><span className={`mini-icon ${id}`}>!</span><span><strong>{title}</strong><small>{detail}</small></span><b>›</b></button>)}</Panel><Panel title="Recent activity" action="View history">{activities.map(([title, type, time, accent]) => <div className="activity-row" key={title}><span className={`activity-dot ${accent}`} /><span><strong>{title}</strong><small>{type}</small></span><time>{time}</time></div>)}</Panel></section>
  <section className="trend-panel"><div><p className="eyebrow">BUSINESS TRENDS</p><h3>Activity over the last 7 days</h3></div><div className="legend"><span><i className="legend-blue" /> Enquiries</span><span><i className="legend-orange" /> Quotations</span><span><i className="legend-teal" /> Work orders</span></div><TrendChart /></section>
</section> }

function DepartmentCard({ item }) { return <article className={`department-card ${item.accent}`}><div className="card-top"><span className="card-icon">{item.icon}</span><span className="trend">{item.trend}</span></div><p className="card-name">{item.name}</p><div className="primary-value">{item.primary}</div><p className="primary-label">{item.primaryLabel}</p><div className="metric-list">{item.metrics.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><button onClick={() => navigate(`/departments/${item.id}`)}>View details <span>→</span></button></article> }
function SummaryKpi({ label, value, note, alert }) { return <div className="summary-kpi"><p>{label}</p><strong className={alert ? 'attention' : ''}>{value}</strong><small>{note}</small></div> }
function PageHeading({ title, text }) { return <div className="heading"><div><h1>{title}</h1><p>{text}</p></div></div> }
function FilterBar() { return <div className="filter-bar"><button className="date-button">▣ <span>01–30 November 2026</span>⌄</button><button className="secondary-button">↻ Refresh</button></div> }
function SectionTitle({ eyebrow, title, text }) { return <div className="section-title"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{text}</p></div></div> }
function Panel({ title, action, children }) { return <section className="panel"><div className="panel-heading"><h3>{title}</h3><button>{action} →</button></div>{children}</section> }
function TrendChart() { const bars = [[42,54,39],[60,44,62],[47,72,48],[75,58,67],[59,68,54],[83,76,78],[68,88,70]]; return <div className="chart"><div className="chart-lines">{bars.map((values, index) => <div className="bar-group" key={index}>{values.map((height, i) => <i key={i} className={`bar b${i}`} style={{height: `${height}%`}} />)}<small>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][index]}</small></div>)}</div></div> }

function DepartmentView({ id, data }) { const item = departments.find((d) => d.id === id); return <section className="page department-page"><div className="breadcrumb"><button onClick={() => navigate('/')}>Overview</button><span>/</span><strong>{item.name}</strong></div><PageHeading title={data.title} text={data.subtitle} /><FilterBar /><div className="detail-hero"><div><span className={`detail-icon ${item.accent}`}>{item.icon}</span><div><p className="eyebrow">{item.name.toUpperCase()} OVERVIEW</p><h2>{item.primary} <small>{item.primaryLabel}</small></h2></div></div><button className="primary-button">+ New {item.name.slice(0, -1)}</button></div><div className="detail-stats">{data.stats.map(([label, value, note]) => <article key={label}><p>{label}</p><strong>{value}</strong><small>{note}</small></article>)}</div><section className="detail-grid"><Panel title="Weekly activity" action="View report"><TrendChart /></Panel><Panel title="Priority queue" action="View all">{data.queue.map((record, i) => <div className="queue-row" key={record}><span className={`status-dot s${i}`} /><strong>{record}</strong><button>Open →</button></div>)}</Panel></section><section className="placeholder"><span>⌁</span><div><h3>Module workspace is ready for integration</h3><p>Detailed records, filters, and actions will connect after workflow rules and backend APIs are confirmed.</p></div></section></section> }

export default App
