import { useState } from 'react'
import { Dialog } from '../../../components/ui/Dialog'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Button } from '../../../components/ui/Button'
import { toast } from '../../../lib/toast'
import type { MockDesign } from '../../../data/mockData'
import { designApi, enquiryApi } from '../../../lib/api'

export function DesignFormModal({
  open,
  onClose,
  onCreateSuccess,
}: {
  open: boolean
  onClose: () => void
  onCreateSuccess: (design: MockDesign) => void
}) {
  const [title, setTitle] = useState('')
  const [client, setClient] = useState('Aster Interiors')
  const [enquiryCode, setEnquiryCode] = useState('ENQ-1048')
  const [designer, setDesigner] = useState('Maya Krishnan')
  const [dueDate, setDueDate] = useState('2026-11-28')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Design project title is required')
      return
    }

    setLoading(true)
    try {
      // 1. Resolve linked enquiry if available
      let enquiryId: string | null = null
      if (enquiryCode && enquiryCode.trim()) {
        try {
          const enqRes = await enquiryApi.list({ search: enquiryCode.trim() })
          if (enqRes.items && enqRes.items.length > 0) {
            enquiryId = enqRes.items[0].id
          }
        } catch {}
      }

      // 2. Create design in PostgreSQL
      const created = await designApi.createDesign({
        title: title.trim(),
        description: `Client: ${client.trim()}. Assigned Lead: ${designer}`,
        priority: 'Medium',
        enquiry_id: enquiryId,
        expected_completion_date: dueDate || null,
      })

      const newDesign: MockDesign = {
        id: created.id,
        code: created.design_number,
        title: created.title,
        client,
        enquiryCode: created.enquiry_number || enquiryCode,
        designer,
        version: 'v1.0',
        status: 'pending',
        dueDate: created.expected_completion_date || dueDate,
        completionRate: 0,
        filesCount: 1,
      }

      onCreateSuccess(newDesign)
      toast.success('Design Assigned', `${newDesign.code} saved to database and assigned to ${designer}`)
      onClose()
      setTitle('')
    } catch (err: any) {
      toast.error('Failed to create design', err?.message || 'Server error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create Design Assignment"
      description="Initialize drafting work order, CAD models and client aesthetic proposals."
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Project / CAD Title"
          placeholder="e.g. Executive Lounge Custom Millwork & 3D Renderings"
          required
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setError('')
          }}
          error={error}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Client Name"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            required
          />
          <Input
            label="Enquiry Reference Code"
            value={enquiryCode}
            onChange={(e) => setEnquiryCode(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Lead Designer"
            value={designer}
            onChange={(e) => setDesigner(e.target.value)}
            options={[
              { value: 'Maya Krishnan', label: 'Maya Krishnan (Senior Architect)' },
              { value: 'Arjun Sen', label: 'Arjun Sen (CAD Specialist)' },
              { value: 'Neha Varma', label: 'Neha Varma (3D Visualizer)' },
            ]}
          />
          <Input
            label="Target Delivery Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={loading}>
            {loading ? 'Assigning…' : 'Create Assignment'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
