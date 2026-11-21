import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Printer,
  Save,
  CheckCircle2,
  XCircle,
  Layers,
  Clock,
  Factory,
  Loader2,
  Building,
} from 'lucide-react'
import { PageContainer } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Card } from '../../../components/ui/Card'
import { Dialog } from '../../../components/ui/Dialog'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import {
  quotationApi,
  customerApi,
  enquiryApi,
  type Quotation,
  type Customer,
  type Enquiry,
  type QuotationItemCreateInput,
} from '../../../lib/api'
import { toast } from '../../../lib/toast'

interface BuilderLineItem {
  id: string
  itemCode?: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  discountPct: number
  taxPct: number
}

export function QuotationBuilderPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const editId = searchParams.get('id')
  const initialEnquiryId = searchParams.get('enquiry_id')

  // Data states
  const [loading, setLoading] = useState<boolean>(Boolean(editId))
  const [saving, setSaving] = useState<boolean>(false)
  const [converting, setConverting] = useState<boolean>(false)
  const [existingQuotation, setExistingQuotation] = useState<Quotation | null>(null)

  // Form states
  const [customers, setCustomers] = useState<Customer[]>([])
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string>(initialEnquiryId || '')
  const [quotationCode, setQuotationCode] = useState<string>('Q-NEW')
  const [status, setStatus] = useState<string>('Draft')
  const [version, setVersion] = useState<number>(1)
  const [validUntil, setValidUntil] = useState<string>('2026-12-15')
  const [followUpDate, setFollowUpDate] = useState<string>('2026-11-30')
  const [overallDiscountRate, setOverallDiscountRate] = useState<number>(0)
  const [overallTaxRate, setOverallTaxRate] = useState<number>(18)

  const [items, setItems] = useState<BuilderLineItem[]>([
    {
      id: 'item-1',
      itemCode: 'ITM-01',
      description: 'Modular Partition Wall Panel System (45mm)',
      quantity: 20,
      unit: 'panels',
      unitPrice: 14500,
      discountPct: 0,
      taxPct: 18,
    },
    {
      id: 'item-2',
      itemCode: 'ITM-02',
      description: 'Executive Veneer Desk with Modesty Panel',
      quantity: 4,
      unit: 'units',
      unitPrice: 85000,
      discountPct: 0,
      taxPct: 18,
    },
    {
      id: 'item-3',
      itemCode: 'ITM-03',
      description: 'Dual Wire Management Tray with Grommet Caps',
      quantity: 20,
      unit: 'sets',
      unitPrice: 1850,
      discountPct: 0,
      taxPct: 18,
    },
  ])

  // Modals
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false)
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false)
  const [reasonAction, setReasonAction] = useState<'approved' | 'rejected'>('approved')
  const [actionReason, setActionReason] = useState('')
  const [convertModalOpen, setConvertModalOpen] = useState(false)

  // Load customer and enquiry dropdowns
  useEffect(() => {
    customerApi
      .list({ page_size: 100 })
      .then((res) => {
        if (res.items) {
          setCustomers(res.items)
          if (!selectedCustomerId && res.items.length > 0 && !editId) {
            setSelectedCustomerId(res.items[0].id)
          }
        }
      })
      .catch((err) => console.warn('Could not load customers for quotation builder:', err))

    enquiryApi
      .list({ page_size: 100 })
      .then((res) => {
        if (res.items) {
          setEnquiries(res.items)
          if (initialEnquiryId) {
            const found = res.items.find((e) => e.id === initialEnquiryId)
            if (found) {
              setSelectedCustomerId(found.customer_id)
            }
          }
        }
      })
      .catch((err) => console.warn('Could not load enquiries for quotation builder:', err))
  }, [initialEnquiryId])

  // Load existing quotation if editId is provided
  useEffect(() => {
    if (!editId) {
      setLoading(false)
      return
    }
    setLoading(true)
    quotationApi
      .getQuotation(editId)
      .then((q) => {
        setExistingQuotation(q)
        setSelectedCustomerId(q.customer_id)
        if (q.enquiry_id) setSelectedEnquiryId(q.enquiry_id)
        setQuotationCode(q.quotation_number)
        setStatus(q.status)
        setVersion(q.revision_number || 1)
        if (q.valid_until) setValidUntil(q.valid_until)
        setOverallDiscountRate(Number(q.discount_rate || 0))
        setOverallTaxRate(Number(q.tax_rate || 18))

        if (q.items && q.items.length > 0) {
          setItems(
            q.items.map((it, idx) => ({
              id: it.id || `item-${idx}`,
              itemCode: it.item_code || `ITM-${idx + 1}`,
              description: it.description,
              quantity: Number(it.quantity),
              unit: it.unit || 'unit',
              unitPrice: Number(it.unit_price),
              discountPct: Number(q.discount_rate || 0),
              taxPct: Number(q.tax_rate || 18),
            })),
          )
        }
      })
      .catch((err) => {
        toast.error('Failed to load quotation', String(err.message || err))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [editId])

  // Live Calculations matching backend service
  const calculatedTotals = useMemo(() => {
    let subtotal = 0
    items.forEach((item) => {
      subtotal += item.quantity * item.unitPrice
    })
    const discountTotal = (subtotal * overallDiscountRate) / 100
    const taxable = subtotal - discountTotal
    const taxTotal = (taxable * overallTaxRate) / 100
    const grandTotal = taxable + taxTotal

    return { subtotal, discountTotal, taxTotal, grandTotal }
  }, [items, overallDiscountRate, overallTaxRate])

  const updateItem = (id: string, field: keyof BuilderLineItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    )
  }

  const addItem = () => {
    const nextIdx = items.length + 1
    const newItem: BuilderLineItem = {
      id: `item-${Date.now()}`,
      itemCode: `ITM-${nextIdx < 10 ? `0${nextIdx}` : nextIdx}`,
      description: 'Custom Fit-out / Joinery Element',
      quantity: 1,
      unit: 'unit',
      unitPrice: 10000,
      discountPct: overallDiscountRate,
      taxPct: overallTaxRate,
    }
    setItems([...items, newItem])
  }

  const removeItem = (id: string) => {
    if (items.length <= 1) {
      toast.warning('Minimum one line item is required')
      return
    }
    setItems(items.filter((item) => item.id !== id))
  }

  // Handle Save to PostgreSQL
  const handleSave = async () => {
    if (!selectedCustomerId) {
      toast.warning('Customer Required', 'Please select a Customer for this quotation.')
      return
    }
    if (items.length === 0) {
      toast.warning('Line Items Required', 'Please add at least one line item.')
      return
    }

    setSaving(true)
    const itemsPayload: QuotationItemCreateInput[] = items.map((it, idx) => ({
      item_code: it.itemCode || `ITM-${idx + 1}`,
      description: it.description,
      quantity: Number(it.quantity),
      unit: it.unit || 'unit',
      unit_price: Number(it.unitPrice),
      sort_order: idx + 1,
    }))

    try {
      if (editId && existingQuotation) {
        // If already approved, create revision
        if (existingQuotation.status === 'Approved' || existingQuotation.status === 'Converted') {
          const rev = await quotationApi.createRevision(editId, {
            change_summary: `Revision update: items re-calculated to ₹${Math.round(calculatedTotals.grandTotal)}`,
            items: itemsPayload,
            discount_rate: overallDiscountRate,
            tax_rate: overallTaxRate,
          })
          setExistingQuotation(rev)
          setVersion(rev.revision_number)
          setStatus(rev.status)
          toast.success(
            'New Revision Created',
            `Quotation ${rev.quotation_number} advanced to Rev v${rev.revision_number}.`,
          )
        } else {
          // Update draft
          const updated = await quotationApi.updateQuotation(editId, {
            discount_rate: overallDiscountRate,
            tax_rate: overallTaxRate,
            valid_until: validUntil || null,
            items: itemsPayload,
          })
          setExistingQuotation(updated)
          toast.success(
            'Quotation Updated',
            `${updated.quotation_number} Rev v${updated.revision_number} saved to PostgreSQL (₹${Math.round(Number(updated.total_amount)).toLocaleString('en-IN')}).`,
          )
        }
      } else {
        // Create new quotation
        const created = await quotationApi.createQuotation({
          customer_id: selectedCustomerId,
          enquiry_id: selectedEnquiryId || null,
          discount_rate: overallDiscountRate,
          tax_rate: overallTaxRate,
          valid_until: validUntil || null,
          currency: 'INR',
          items: itemsPayload,
        })
        setExistingQuotation(created)
        setQuotationCode(created.quotation_number)
        setStatus(created.status)
        setVersion(created.revision_number)
        setSearchParams({ id: created.id })
        toast.success(
          'Quotation Created',
          `${created.quotation_number} successfully registered and persisted to PostgreSQL!`,
        )
      }
    } catch (err: any) {
      toast.error('Failed to save quotation', err.message || 'Database error occurred')
    } finally {
      setSaving(false)
    }
  }

  // Handle Approve or Reject
  const handleApplyActionWithReason = async () => {
    if (!actionReason.trim()) {
      toast.warning('Reason is mandatory', 'Please enter a justification for audit log.')
      return
    }

    const targetQuotationId = editId || existingQuotation?.id
    if (!targetQuotationId) {
      toast.warning('Save Quotation First', 'Please save the quotation before recording formal approvals.')
      return
    }

    try {
      const backendStatus = reasonAction === 'approved' ? 'Approved' : 'Rejected'
      const updated = await quotationApi.updateQuotationStatus(targetQuotationId, {
        status: backendStatus,
        notes: reasonAction === 'approved' ? actionReason : undefined,
        rejection_reason: reasonAction === 'rejected' ? actionReason : undefined,
      })
      setStatus(updated.status)
      setReasonDialogOpen(false)
      setActionReason('')

      if (backendStatus === 'Approved') {
        toast.success(
          'Quotation Approved',
          `Quotation ${updated.quotation_number} approved and recorded in audit log.`,
        )
        setConvertModalOpen(true)
      } else {
        toast.info(
          'Quotation Rejected',
          `Quotation ${updated.quotation_number} marked as rejected.`,
        )
      }
    } catch (err: any) {
      toast.error('Approval failed', err.message || 'Could not update quotation status')
    }
  }

  // Handle Convert to Work Order
  const handleConvertToWorkOrder = async () => {
    const targetQuotationId = editId || existingQuotation?.id
    if (!targetQuotationId) return

    setConverting(true)
    try {
      const res = await quotationApi.convertToWorkOrder(targetQuotationId)
      setStatus('Converted')
      setConvertModalOpen(false)
      toast.success(
        'Work Order Generated!',
        `${res.work_order_number} successfully dispatched to Production department!`,
      )
      navigate(`/production/${res.work_order_id}`)
    } catch (err: any) {
      toast.error('Conversion Failed', err.message || 'Could not generate work order')
    } finally {
      setConverting(false)
    }
  }

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId)
  const clientDisplayName = selectedCustomerObj
    ? selectedCustomerObj.company_name
      ? `${selectedCustomerObj.company_name} (${selectedCustomerObj.name})`
      : selectedCustomerObj.name
    : 'Select Customer'

  if (loading) {
    return (
      <PageContainer>
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span>Loading quotation details from database...</span>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* Top Bar Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/quotations/list"
            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-foreground">{quotationCode}</span>
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-semibold">
                Rev v{version}
              </span>
              <StatusBadge department="quotations" status={status.toLowerCase()} showIcon />
            </div>
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
              {clientDisplayName} — Commercial Fit-out Estimate
            </h1>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPrintPreviewOpen(true)}>
            <Printer className="size-3.5" />
            <span className="hidden md:inline">Print Preview</span>
          </Button>

          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Save className="size-3.5 mr-1" />}
            <span>{saving ? 'Saving...' : editId ? 'Save Changes' : 'Save & Persist'}</span>
          </Button>

          {status !== 'Approved' && status !== 'Converted' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReasonAction('approved')
                setReasonDialogOpen(true)
              }}
              className="text-success border-success/30 hover:bg-success-soft"
            >
              <CheckCircle2 className="size-3.5 mr-1" />
              <span>Approve Quotation</span>
            </Button>
          )}

          {status === 'Approved' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setConvertModalOpen(true)}
              className="bg-primary text-white"
            >
              <Factory className="size-3.5 mr-1" />
              <span>Generate Work Order</span>
            </Button>
          )}

          {status !== 'Rejected' && status !== 'Converted' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReasonAction('rejected')
                setReasonDialogOpen(true)
              }}
              className="text-danger border-danger/30 hover:bg-danger-soft"
            >
              <XCircle className="size-3.5 mr-1" />
              <span>Reject</span>
            </Button>
          )}
        </div>
      </div>

      {/* Customer & Quotation Settings Bar */}
      <Card className="p-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4 bg-muted/20 border-border">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Customer *
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            disabled={Boolean(editId)}
            className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">-- Select Customer --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name ? `${c.company_name} (${c.name})` : c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Linked Enquiry (Optional)
          </label>
          <select
            value={selectedEnquiryId}
            onChange={(e) => setSelectedEnquiryId(e.target.value)}
            disabled={Boolean(editId)}
            className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">-- Direct Quotation (No Enquiry) --</option>
            {enquiries.map((e) => (
              <option key={e.id} value={e.id}>
                {e.enquiry_number} - {e.requirement_summary || 'Enquiry'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Valid Until
          </label>
          <Input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Tax Rate (GST %)
          </label>
          <select
            value={overallTaxRate}
            onChange={(e) => setOverallTaxRate(Number(e.target.value))}
            className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value={0}>0% (Tax Exempt)</option>
            <option value={5}>5% GST</option>
            <option value={12}>12% GST</option>
            <option value={18}>18% GST (Standard)</option>
            <option value={28}>28% Luxury GST</option>
          </select>
        </div>
      </Card>

      {/* Main Quotation Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Line Items Editor */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Line Items & Costing Table</h3>
                <p className="text-xs text-muted-foreground">
                  Specify fabricated components, linear dimensions, and quantity rates. Values persist as exact numeric amounts in PostgreSQL.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="size-3.5 mr-1" />
                Add Item
              </Button>
            </div>

            {/* Editable Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                    <th className="py-2.5 px-3 font-semibold">Description</th>
                    <th className="py-2.5 px-2 font-semibold w-16 text-center">Qty</th>
                    <th className="py-2.5 px-2 font-semibold w-16 text-center">Unit</th>
                    <th className="py-2.5 px-2 font-semibold w-24 text-right">Unit Rate (₹)</th>
                    <th className="py-2.5 px-3 font-semibold w-28 text-right">Line Total (₹)</th>
                    <th className="py-2.5 px-1 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => {
                    const lineTotal = item.quantity * item.unitPrice
                    return (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            placeholder="Component specification..."
                            className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-xs text-foreground focus:border-border focus:bg-background focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', Math.max(1, Number(e.target.value)))}
                            className="w-14 rounded border border-transparent bg-transparent px-1 py-1 text-center font-mono text-xs text-foreground focus:border-border focus:bg-background focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                            className="w-14 rounded border border-transparent bg-transparent px-1 py-1 text-center font-mono text-xs text-foreground focus:border-border focus:bg-background focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            step="100"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', Math.max(0, Number(e.target.value)))}
                            className="w-24 rounded border border-transparent bg-transparent px-1 py-1 text-right font-mono text-xs text-foreground focus:border-border focus:bg-background focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-foreground tabular-nums">
                          ₹{Math.round(lineTotal).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="rounded p-1 text-muted-foreground hover:bg-danger-soft hover:text-danger cursor-pointer transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <Button variant="outline" size="sm" onClick={addItem} className="w-full border-dashed">
              <Plus className="size-3.5 mr-1" />
              Add Another Line Item
            </Button>
          </Card>
        </div>

        {/* Right 1 Col: Live Totals & Follow-up Scheduler */}
        <div className="space-y-4">
          {/* Live Totals Card */}
          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Commercial Summary (INR)
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items Subtotal:</span>
                <span className="font-mono text-foreground tabular-nums">
                  ₹{Math.round(calculatedTotals.subtotal).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Discount Rate:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={overallDiscountRate}
                    onChange={(e) => setOverallDiscountRate(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-12 text-right rounded border border-border bg-card px-1 py-0.5 font-mono text-xs text-foreground"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>

              {overallDiscountRate > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount Amount:</span>
                  <span className="font-mono tabular-nums">
                    -₹{Math.round(calculatedTotals.discountTotal).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground">
                <span>GST Tax ({overallTaxRate}%):</span>
                <span className="font-mono text-foreground tabular-nums">
                  +₹{Math.round(calculatedTotals.taxTotal).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-foreground">Grand Total:</span>
                <span className="font-display text-2xl font-extrabold text-primary tabular-nums">
                  ₹{Math.round(calculatedTotals.grandTotal).toLocaleString('en-IN')}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Inclusive of fabrication, quality inspections, and taxes.
              </p>
            </div>
          </Card>

          {/* Follow-up Scheduler */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Customer Follow-up</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Schedule notification reminder to follow up on quotation acceptance.
            </p>
            <Input
              type="date"
              label="Next Follow-up Date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={async () => {
                if (editId) {
                  try {
                    await quotationApi.addFollowUp(editId, {
                      scheduled_date: followUpDate,
                      notes: 'Scheduled call for commercial quotation review',
                    })
                    toast.success('Follow-up Logged', `Reminder set in PostgreSQL for ${followUpDate}`)
                  } catch (e: any) {
                    toast.error('Failed to log follow-up', e.message)
                  }
                } else {
                  toast.success('Follow-up Scheduled', `Reminder set for ${followUpDate}`)
                }
              }}
            >
              Set Calendar Reminder
            </Button>
          </Card>
        </div>
      </div>

      {/* Print-Ready Quotation Preview Modal (A4 Layout) */}
      <Dialog
        open={printPreviewOpen}
        onClose={() => setPrintPreviewOpen(false)}
        maxWidth="max-w-3xl"
        title="Print-Ready Quotation Preview"
        description="Formal corporate quotation document formatted for A4 printing and customer PDF dispatch."
      >
        <div className="mt-2 space-y-6 rounded-lg border border-border bg-white p-8 text-black shadow-inner dark:bg-zinc-950 dark:text-zinc-100">
          <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded bg-orange-600 font-extrabold text-white text-base">
                  A
                </span>
                <span className="font-display text-xl font-bold tracking-tight">AVORA MANUFACTURING</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Industrial Estate Phase II, Bangalore, KA 560058 · GSTIN: 29AABCU9603R1ZM
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-base font-bold text-orange-600">{quotationCode}</p>
              <p className="text-xs text-zinc-500">Date: {new Date().toLocaleDateString()}</p>
              <p className="text-xs text-zinc-500">Revision: v{version}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold text-zinc-400 uppercase text-[10px] tracking-wider">Quotation Prepared For:</p>
              <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-1">{clientDisplayName}</p>
              {selectedEnquiryId && <p className="text-zinc-600 dark:text-zinc-400">Ref Enquiry: {selectedEnquiryId}</p>}
            </div>
            <div className="text-right">
              <p className="font-semibold text-zinc-400 uppercase text-[10px] tracking-wider">Commercial Terms:</p>
              <p className="text-zinc-800 dark:text-zinc-200 mt-1">Payment: 50% Advance, 50% on Handover</p>
              <p className="text-zinc-800 dark:text-zinc-200">Validity: {validUntil || '30 days'}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-zinc-200 dark:border-zinc-800">
              <thead className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="p-2 font-semibold">Item Specification</th>
                  <th className="p-2 font-semibold text-center w-12">Qty</th>
                  <th className="p-2 font-semibold text-center w-12">Unit</th>
                  <th className="p-2 font-semibold text-right w-24">Rate (₹)</th>
                  <th className="p-2 font-semibold text-right w-24">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {items.map((it) => {
                  const net = it.quantity * it.unitPrice
                  return (
                    <tr key={it.id}>
                      <td className="p-2">{it.description}</td>
                      <td className="p-2 text-center font-mono">{it.quantity}</td>
                      <td className="p-2 text-center font-mono text-muted-foreground">{it.unit}</td>
                      <td className="p-2 text-right font-mono">₹{it.unitPrice.toLocaleString('en-IN')}</td>
                      <td className="p-2 text-right font-mono font-semibold">₹{Math.round(net).toLocaleString('en-IN')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end text-xs">
            <div className="w-64 space-y-1.5 border-t border-zinc-200 dark:border-zinc-800 pt-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono">₹{Math.round(calculatedTotals.subtotal).toLocaleString('en-IN')}</span>
              </div>
              {overallDiscountRate > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount ({overallDiscountRate}%):</span>
                  <span className="font-mono">-₹{Math.round(calculatedTotals.discountTotal).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GST ({overallTaxRate}%):</span>
                <span className="font-mono">₹{Math.round(calculatedTotals.taxTotal).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t border-zinc-300 dark:border-zinc-700 pt-2">
                <span>Grand Total:</span>
                <span className="font-mono text-orange-600">₹{Math.round(calculatedTotals.grandTotal).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" onClick={() => setPrintPreviewOpen(false)}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              window.print()
              toast.success('Print Dialog Opened', 'Document sent to printer spooler.')
            }}
          >
            <Printer className="size-3.5 mr-1" />
            Print / Save as PDF
          </Button>
        </div>
      </Dialog>

      {/* Reason Dialog for Approval or Rejection */}
      <Dialog
        open={reasonDialogOpen}
        onClose={() => setReasonDialogOpen(false)}
        title={reasonAction === 'approved' ? 'Approve Quotation' : 'Reject Quotation'}
        description="Provide a formal justification for compliance and audit trail records."
      >
        <div className="space-y-4">
          <Input
            label="Compliance / Decision Justification"
            placeholder={
              reasonAction === 'approved'
                ? 'e.g. Client accepted formal PO via email with 50% advance'
                : 'e.g. Budget variance exceeded customer threshold'
            }
            required
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
          />

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={() => setReasonDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className={reasonAction === 'rejected' ? 'bg-danger text-white hover:bg-danger/90' : undefined}
              onClick={handleApplyActionWithReason}
            >
              Confirm {reasonAction === 'approved' ? 'Approval' : 'Rejection'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Work Order Conversion Dialog (Day 7 Handover) */}
      <Dialog
        open={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
        title="Quotation Approved: Hand Over to Production"
        description="The commercial estimate is client-approved. Generate an official Work Order to begin shop-floor scheduling and material procurement."
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quotation Ref:</span>
              <span className="font-mono font-bold text-foreground">{quotationCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Approved Amount:</span>
              <span className="font-mono font-bold text-foreground">₹{Math.round(calculatedTotals.grandTotal).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-semibold text-foreground">{clientDisplayName}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            This will create a dedicated Work Order record in PostgreSQL linked to this Quotation, transition its status to Converted, and unlock production scheduling.
          </p>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={() => setConvertModalOpen(false)}>
              Stay in Builder
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConvertToWorkOrder}
              disabled={converting}
            >
              {converting ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Factory className="size-3.5 mr-1" />}
              <span>{converting ? 'Converting...' : 'Generate Work Order'}</span>
            </Button>
          </div>
        </div>
      </Dialog>
    </PageContainer>
  )
}
