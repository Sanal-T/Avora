import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Printer,
  Download,
  Save,
  CheckCircle2,
  XCircle,
  Calendar,
  Layers,
  FileCheck,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { PageContainer } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Card } from '../../../components/ui/Card'
import { Dialog } from '../../../components/ui/Dialog'
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { mockQuotations, type MockLineItem, type MockQuotation } from '../../../data/mockData'
import { toast } from '../../../lib/toast'

export function QuotationBuilderPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')

  const initialQuotation = useMemo(() => {
    return mockQuotations.find((q) => q.id === editId) || {
      id: `q-${Date.now()}`,
      code: 'Q-2055',
      enquiryCode: 'ENQ-1048',
      client: 'Acme Spaces',
      title: 'Commercial Office Joinery & Fit-out',
      status: 'pending' as const,
      version: 1,
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      grandTotal: 0,
      dueDate: '2026-12-05',
      author: 'Vikram Patel',
      items: [
        { id: 'item-101', description: 'Modular Partition Wall Panel System (45mm)', quantity: 20, unitPrice: 14500, discountPct: 5, taxPct: 18 },
        { id: 'item-102', description: 'Executive Veneer Desk with Modesty Panel', quantity: 4, unitPrice: 85000, discountPct: 5, taxPct: 18 },
        { id: 'item-103', description: 'Dual Wire Management Tray with Grommet Caps', quantity: 20, unitPrice: 1850, discountPct: 0, taxPct: 18 },
      ],
    }
  }, [editId])

  const [quotation, setQuotation] = useState<MockQuotation>(initialQuotation)
  const [items, setItems] = useState<MockLineItem[]>(initialQuotation.items)
  const [selectedVersion, setSelectedVersion] = useState<number>(initialQuotation.version)
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false)
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false)
  const [reasonAction, setReasonAction] = useState<'approved' | 'rejected'>('approved')
  const [actionReason, setActionReason] = useState('')
  const [followUpDate, setFollowUpDate] = useState('2026-11-25')

  // Live Calculations
  const calculatedTotals = useMemo(() => {
    let subtotal = 0
    let discountTotal = 0
    let taxTotal = 0

    items.forEach((item) => {
      const lineRaw = item.quantity * item.unitPrice
      const lineDiscount = lineRaw * (item.discountPct / 100)
      const lineTaxable = lineRaw - lineDiscount
      const lineTax = lineTaxable * (item.taxPct / 100)

      subtotal += lineRaw
      discountTotal += lineDiscount
      taxTotal += lineTax
    })

    const grandTotal = subtotal - discountTotal + taxTotal
    return { subtotal, discountTotal, taxTotal, grandTotal }
  }, [items])

  const updateItem = (id: string, field: keyof MockLineItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    )
  }

  const addItem = () => {
    const newItem: MockLineItem = {
      id: `item-${Date.now()}`,
      description: 'New Joinery Item / Workstation',
      quantity: 1,
      unitPrice: 5000,
      discountPct: 0,
      taxPct: 18,
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

  const handleSave = () => {
    toast.success('Quotation Saved', `Revision v${selectedVersion} saved with ₹${(calculatedTotals.grandTotal / 100000).toFixed(2)}L`)
  }

  const handleApplyActionWithReason = () => {
    if (!actionReason.trim()) {
      toast.warning('Reason is mandatory', 'Please enter a justification for compliance log.')
      return
    }
    setQuotation({ ...quotation, status: reasonAction })
    setReasonDialogOpen(false)
    toast.success(
      `Quotation ${reasonAction.toUpperCase()}`,
      `Logged action reason: "${actionReason}"`,
    )
    setActionReason('')
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
              <span className="font-mono text-base font-bold text-foreground">{quotation.code}</span>
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-semibold">
                Rev v{selectedVersion}
              </span>
              <StatusBadge department="quotations" status={quotation.status} showIcon />
            </div>
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
              {quotation.title}
            </h1>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Version Selector */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-xs">
            <Layers className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Version:</span>
            <select
              value={selectedVersion}
              onChange={(e) => {
                const nextV = Number(e.target.value)
                setSelectedVersion(nextV)
                toast.info(`Switched to Revision v${nextV}`)
              }}
              className="bg-transparent font-mono font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value={1}>v1.0 (Initial Draft)</option>
              <option value={2}>v2.0 (Material Revision)</option>
              <option value={3}>v3.0 (Client Negotiation)</option>
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={() => setPrintPreviewOpen(true)}>
            <Printer className="size-3.5" />
            <span className="hidden md:inline">Print Preview</span>
          </Button>

          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="size-3.5" />
            <span>Save Draft</span>
          </Button>

          {quotation.status !== 'approved' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setReasonAction('approved')
                setReasonDialogOpen(true)
              }}
            >
              <CheckCircle2 className="size-3.5" />
              <span>Approve Quotation</span>
            </Button>
          )}

          {quotation.status !== 'rejected' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReasonAction('rejected')
                setReasonDialogOpen(true)
              }}
              className="text-danger hover:bg-danger-soft"
            >
              <XCircle className="size-3.5" />
              <span>Reject</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Quotation Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Line Items Editor */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Line Items & Costing Table</h3>
                <p className="text-xs text-muted-foreground">
                  Add components, hardware kits, linear meterage and applicable taxes.
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
                    <th className="py-2.5 px-2 font-semibold w-24 text-right">Unit Rate (₹)</th>
                    <th className="py-2.5 px-2 font-semibold w-16 text-center">Disc %</th>
                    <th className="py-2.5 px-2 font-semibold w-16 text-center">GST %</th>
                    <th className="py-2.5 px-3 font-semibold w-24 text-right">Net (₹)</th>
                    <th className="py-2.5 px-1 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => {
                    const lineRaw = item.quantity * item.unitPrice
                    const lineDiscount = lineRaw * (item.discountPct / 100)
                    const lineTaxable = lineRaw - lineDiscount
                    const lineTax = lineTaxable * (item.taxPct / 100)
                    const lineTotal = lineTaxable + lineTax

                    return (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-xs text-foreground focus:border-border focus:bg-background focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                            className="w-14 rounded border border-transparent bg-transparent px-1 py-1 text-center font-mono text-xs text-foreground focus:border-border focus:bg-background focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            step="100"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                            className="w-20 rounded border border-transparent bg-transparent px-1 py-1 text-right font-mono text-xs text-foreground focus:border-border focus:bg-background focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPct}
                            onChange={(e) => updateItem(item.id, 'discountPct', Number(e.target.value))}
                            className="w-12 rounded border border-transparent bg-transparent px-1 py-1 text-center font-mono text-xs text-foreground focus:border-border focus:bg-background focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <select
                            value={item.taxPct}
                            onChange={(e) => updateItem(item.id, 'taxPct', Number(e.target.value))}
                            className="rounded border border-transparent bg-transparent px-1 py-1 font-mono text-xs text-foreground focus:border-border focus:bg-background focus:outline-none"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
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

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items Subtotal:</span>
                <span className="font-mono text-foreground tabular-nums">
                  ₹{Math.round(calculatedTotals.subtotal).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-success">
                <span>Discount Total:</span>
                <span className="font-mono tabular-nums">
                  -₹{Math.round(calculatedTotals.discountTotal).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST Tax Total:</span>
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
                Inclusive of all taxes & fabrication transport.
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
              onClick={() => toast.success('Follow-up Scheduled', `Reminder set for ${followUpDate}`)}
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
          {/* Company Letterhead */}
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
              <p className="font-mono text-base font-bold text-orange-600">{quotation.code}</p>
              <p className="text-xs text-zinc-500">Date: {new Date().toLocaleDateString()}</p>
              <p className="text-xs text-zinc-500">Revision: v{selectedVersion}</p>
            </div>
          </div>

          {/* Customer & Project Details */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold text-zinc-400 uppercase text-[10px] tracking-wider">Quotation Prepared For:</p>
              <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-1">{quotation.client}</p>
              <p className="text-zinc-600 dark:text-zinc-400">Ref Enquiry: {quotation.enquiryCode}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-zinc-400 uppercase text-[10px] tracking-wider">Commercial Terms:</p>
              <p className="text-zinc-800 dark:text-zinc-200 mt-1">Payment: 50% Advance, 50% on Handover</p>
              <p className="text-zinc-800 dark:text-zinc-200">Validity: 30 days from issuance</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-zinc-200 dark:border-zinc-800">
              <thead className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="p-2 font-semibold">Item Specification</th>
                  <th className="p-2 font-semibold text-center w-12">Qty</th>
                  <th className="p-2 font-semibold text-right w-24">Rate (₹)</th>
                  <th className="p-2 font-semibold text-right w-24">Net (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {items.map((it) => {
                  const net = it.quantity * it.unitPrice * (1 - it.discountPct / 100) * (1 + it.taxPct / 100)
                  return (
                    <tr key={it.id}>
                      <td className="p-2">{it.description}</td>
                      <td className="p-2 text-center font-mono">{it.quantity}</td>
                      <td className="p-2 text-right font-mono">₹{it.unitPrice.toLocaleString('en-IN')}</td>
                      <td className="p-2 text-right font-mono font-semibold">₹{Math.round(net).toLocaleString('en-IN')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Box */}
          <div className="flex justify-end text-xs">
            <div className="w-64 space-y-1.5 border-t border-zinc-200 dark:border-zinc-800 pt-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono">₹{Math.round(calculatedTotals.subtotal).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Tax (GST):</span>
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
                ? 'e.g. Client accepted formal PO-8841 via email with 50% advance'
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
              variant={reasonAction === 'approved' ? 'primary' : 'primary'}
              size="sm"
              className={reasonAction === 'rejected' ? 'bg-danger text-white hover:bg-danger/90' : undefined}
              onClick={handleApplyActionWithReason}
            >
              Confirm {reasonAction === 'approved' ? 'Approval' : 'Rejection'}
            </Button>
          </div>
        </div>
      </Dialog>
    </PageContainer>
  )
}
