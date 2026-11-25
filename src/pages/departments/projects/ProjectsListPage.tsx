import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, RefreshCw } from 'lucide-react'
import { PageContainer, PageHeader } from '../../../components/shared/PageHeader'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { projectApi, type Project } from '../../../lib/api'

export function ProjectsListPage() {
  const [items, setItems] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    try {
      const res = await projectApi.list({ page_size: 50, status: statusFilter, search: search || undefined })
      setItems(res.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [statusFilter])

  return (
    <PageContainer>
      <PageHeader
        title="Projects"
        description="Centralized lifecycle tracking from client approval through production and accounts."
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
        }
      />

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by project number, name, or site..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border rounded-md bg-background"
          >
            <option value="all">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Waiting for Production">Waiting for Production</option>
            <option value="In Production">In Production</option>
            <option value="Sent to Accounts">Sent to Accounts</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading projects...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No projects found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Project #</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/projects/${p.id}`} className="text-primary hover:underline">
                        {p.project_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3">{p.customer_name || '-'}</td>
                    <td className="px-4 py-3">₹{Number(p.project_value || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">{p.priority}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageContainer>
  )
}
