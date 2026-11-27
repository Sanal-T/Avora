import { useEffect, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { PageContainer, PageHeader } from '../../../components/shared/PageHeader'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { communicationApi, type Communication } from '../../../lib/api'
import { getCachedData, invalidateCache, setCachedData } from '../../../lib/cache'
import { toast } from '../../../lib/toast'

export function CommunicationsListPage() {
  const [items, setItems] = useState<Communication[]>(() => getCachedData<Communication[]>('list:communications') || [])
  const [loading, setLoading] = useState(() => !getCachedData('list:communications'))
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('Request')

  const load = async (force = false) => {
    if (force) invalidateCache('list:communications')
    const cached = !force ? getCachedData<Communication[]>('list:communications') : null
    if (cached) {
      setItems(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }
    try {
      const res = await communicationApi.list({ page_size: 2000, compact: true })
      setCachedData('list:communications', res.items)
      setItems(res.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(false)
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject || !description) return
    try {
      await communicationApi.create({ type, subject, description })
      setSubject('')
      setDescription('')
      toast.success('Created', 'Interdepartmental request submitted.')
      load()
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to create communication.')
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Interdepartmental Communications"
        description="Structured requests, approvals, clarifications, and issue tracking across departments."
        actions={
          <Button variant="outline" size="sm" onClick={() => load(true)}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading communications...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No communications found.</div>
        ) : (
          <div className="divide-y">
            {items.map((c) => (
              <div key={c.id} className="p-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{c.communication_number}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted">{c.type}</span>
                    <span className="font-medium text-sm">{c.subject}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  )
}
