import { useState } from 'react'
import { PageContainer, PageHeader } from '../../components/shared/PageHeader'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { Save, Building, ShieldCheck } from 'lucide-react'
import { toast } from '../../lib/toast'

export function SettingsPage() {
  const [orgName, setOrgName] = useState('Avora Manufacturing & Interiors Pvt Ltd')
  const [gstin, setGstin] = useState('29AABCU9603R1ZM')
  const [currency, setCurrency] = useState('INR')
  const [taxRate, setTaxRate] = useState('18')
  const [autoQuoteNumbering, setAutoQuoteNumbering] = useState(true)
  const [auditLogRetention, setAuditLogRetention] = useState('365')

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success('System Settings Saved', 'Global enterprise preferences updated successfully.')
  }

  return (
    <PageContainer>
      <PageHeader
        title="System & Enterprise Settings"
        description="Configure organization details, default taxation policies, numbering sequences, and security controls."
      />

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Building className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Organization & Fiscal Profile</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Legal Entity Name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />
            <Input
              label="Statutory GSTIN / Tax ID"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Functional Base Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { value: 'INR', label: 'INR (₹ - Indian Rupee)' },
                { value: 'USD', label: 'USD ($ - US Dollar)' },
                { value: 'EUR', label: 'EUR (€ - Euro)' },
              ]}
            />
            <Input
              label="Default GST Tax Slab (%)"
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              required
            />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <ShieldCheck className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Operational Rules & Compliance</h3>
          </div>

          <Checkbox
            label="Automatic Sequential Code Generation"
            description="Automatically generate unique sequence identifiers for Enquiries (ENQ-xxxx), Quotations (Q-xxxx), and Work Orders (WO-xxxx)."
            checked={autoQuoteNumbering}
            onChange={(e) => setAutoQuoteNumbering(e.target.checked)}
          />

          <div className="w-64 pt-2">
            <Select
              label="Audit Log Retention Horizon"
              value={auditLogRetention}
              onChange={(e) => setAuditLogRetention(e.target.value)}
              options={[
                { value: '90', label: '90 Days' },
                { value: '180', label: '180 Days' },
                { value: '365', label: '1 Year (Statutory Minimum)' },
                { value: '1825', label: '5 Years' },
              ]}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button variant="primary" size="md" type="submit">
            <Save className="size-4 mr-1.5" />
            <span>Save System Preferences</span>
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}
