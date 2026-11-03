import { useState } from 'react'
import { Dialog } from '../../../components/ui/Dialog'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { Button } from '../../../components/ui/Button'
import { toast } from '../../../lib/toast'
import type { MockEnquiry } from '../../../data/mockData'

export function EnquiryFormModal({
  open,
  onClose,
  onCreateSuccess,
}: {
  open: boolean
  onClose: () => void
  onCreateSuccess: (enq: MockEnquiry) => void
}) {
  const [company, setCompany] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [requirement, setRequirement] = useState('')
  const [budget, setBudget] = useState('')
  const [source, setSource] = useState('Website')
  const [assignedTo, setAssignedTo] = useState('Vikram Patel')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!company.trim()) errs.company = 'Company name is required'
    if (!customerName.trim()) errs.customerName = 'Contact person name is required'
    if (!email.trim() || !email.includes('@')) errs.email = 'Valid email is required'
    if (!phone.trim()) errs.phone = 'Phone number is required'
    if (!requirement.trim()) errs.requirement = 'Please describe the project scope'
    if (!budget.trim()) errs.budget = 'Estimated budget is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setTimeout(() => {
      const newEnquiry: MockEnquiry = {
        id: `enq-${Date.now()}`,
        code: `ENQ-${Math.floor(1050 + Math.random() * 50)}`,
        company,
        customerName,
        email,
        phone,
        requirement,
        budget: budget.startsWith('₹') ? budget : `₹${budget}`,
        source,
        assignedTo,
        status: 'pending',
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      }

      setLoading(false)
      onCreateSuccess(newEnquiry)
      toast.success('Enquiry registered', `Enquiry ${newEnquiry.code} added to queue.`)
      onClose()
      // reset
      setCompany('')
      setCustomerName('')
      setEmail('')
      setPhone('')
      setRequirement('')
      setBudget('')
    }, 400)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create New Enquiry"
      description="Record a new customer project requirement and initiate sales engineering."
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Company Name"
            placeholder="e.g. Acme Spaces"
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            error={errors.company}
          />
          <Input
            label="Primary Contact Person"
            placeholder="e.g. Rohit Mehta"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            error={errors.customerName}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Email Address"
            type="email"
            placeholder="rohit@acmespaces.in"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <Input
            label="Phone Number"
            placeholder="+91 98201 44521"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
          />
        </div>

        <Textarea
          label="Requirement & Project Scope"
          rows={3}
          placeholder="Describe room dimensions, workstation counts, materials, joinery or finish expectations…"
          required
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          error={errors.requirement}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Estimated Budget"
            placeholder="e.g. ₹12,00,000"
            required
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            error={errors.budget}
          />
          <Select
            label="Lead Source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            options={[
              { value: 'Website', label: 'Website' },
              { value: 'Referral', label: 'Referral' },
              { value: 'Direct', label: 'Direct' },
              { value: 'Social', label: 'Social Media' },
            ]}
          />
          <Select
            label="Assignee"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            options={[
              { value: 'Vikram Patel', label: 'Vikram Patel' },
              { value: 'Priya Sundaram', label: 'Priya Sundaram' },
              { value: 'Maya Krishnan', label: 'Maya Krishnan' },
            ]}
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create Enquiry'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
