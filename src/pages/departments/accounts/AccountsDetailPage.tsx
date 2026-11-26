import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { PageContainer, PageHeader } from '../../../components/shared/PageHeader'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { accountsApi, type AccountsRecord } from '../../../lib/api'
import { toast } from '../../../lib/toast'

export function AccountsDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [record, setRecord] = useState<AccountsRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [invAmount, setInvAmount] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payRef, setPayRef] = useState('')

  const load = () => {
    if (!id) return
    setLoading(true)
    accountsApi.get(id).then(setRecord).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [id])

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !invAmount) return
    try {
      const updated = await accountsApi.createInvoice(id, { invoice_amount: Number(invAmount) })
      setRecord(updated)
      setInvAmount('')
      toast.success('Invoice Generated', 'Invoice added to accounts record.')
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to create invoice.')
    }
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !payAmount) return
    try {
      const updated = await accountsApi.recordPayment(id, {
        amount: Number(payAmount),
        reference_number: payRef || undefined,
      })
      setRecord(updated)
      setPayAmount('')
      setPayRef('')
      toast.success('Payment Recorded', 'Partial/full payment recorded.')
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to record payment.')
    }
  }

  if (loading) return <PageContainer><div className="p-8 text-sm text-muted-foreground">Loading accounts record...</div></PageContainer>
  if (!record) return <PageContainer><div className="p-8 text-sm text-muted-foreground">Accounts record not found.</div></PageContainer>

  return (
    <PageContainer>
      <PageHeader
        title={`${record.accounts_number} — ${record.project_name || record.project_number}`}
        description={`Customer: ${record.customer_name || 'N/A'} • Transfer Date: ${record.accounts_transfer_date || '-'}`}
        actions={
          <Link to="/accounts/list">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Accounts
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Status</div><div className="mt-1"><StatusBadge status={record.status} /></div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total Invoiced</div><div className="text-lg font-semibold mt-1">₹{Number(record.total_invoiced).toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total Received</div><div className="text-lg font-semibold mt-1 text-emerald-600">₹{Number(record.total_received).toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Outstanding</div><div className="text-lg font-semibold mt-1 text-amber-600">₹{Number(record.outstanding_amount).toLocaleString()}</div></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-sm">Invoices ({record.invoices?.length || 0})</h3>
          <div className="divide-y text-sm">
            {(record.invoices || []).map((inv) => (
              <div key={inv.id} className="py-2 flex justify-between items-center">
                <div>
                  <div className="font-medium">{inv.invoice_number}</div>
                  <div className="text-xs text-muted-foreground">Date: {inv.invoice_date}</div>
                </div>
                <div className="text-right">
                  <div>₹{Number(inv.total_amount).toLocaleString()}</div>
                  <StatusBadge department="accounts" status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-sm">Payments ({record.payments?.length || 0})</h3>
          <div className="divide-y text-sm">
            {(record.payments || []).map((p) => (
              <div key={p.id} className="py-2 flex justify-between items-center">
                <div>
                  <div className="font-medium">₹{Number(p.amount).toLocaleString()} ({p.payment_method})</div>
                  <div className="text-xs text-muted-foreground">{p.payment_date} {p.reference_number ? `• ${p.reference_number}` : ''}</div>
                </div>
                <div className="text-xs text-muted-foreground">{p.recorded_by_name || ''}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}
