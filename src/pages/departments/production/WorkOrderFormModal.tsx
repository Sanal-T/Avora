import { useState } from 'react'
import {
  Calendar,
  Clock,
  Factory,
  User,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Button } from '../../../components/ui/Button'
import { Textarea } from '../../../components/ui/Textarea'
import { Checkbox } from '../../../components/ui/Checkbox'
import { toast } from '../../../lib/toast'
import { mockWorkOrders, mockWorkers, type MockWorkOrder } from '../../../data/mockData'
import {
  saveProductionSlot,
  type MockProductionSlot,
  type ProductionBay,
  PRODUCTION_BAYS,
} from '../../../data/productionSlots'

export type WorkOrderFormModalProps = {
  open: boolean
  onClose: () => void
  onCreateSuccess?: (wo: MockWorkOrder) => void
}

export function WorkOrderFormModal({
  open,
  onClose,
  onCreateSuccess,
}: WorkOrderFormModalProps) {
  // Work Order basic state
  const [title, setTitle] = useState('')
  const [client, setClient] = useState('')
  const [quotationCode, setQuotationCode] = useState('Q-2055')
  const [stage, setStage] = useState<MockWorkOrder['stage']>('Cutting')
  const [priority, setPriority] = useState<MockWorkOrder['priority']>('medium')
  const [leadWorker, setLeadWorker] = useState('Ramesh Gowda')
  const [startDate, setStartDate] = useState('2026-11-20')
  const [deliveryDate, setDeliveryDate] = useState('2026-11-28')

  // Production Slot Allocation Option Toggle
  const [allocateSlot, setAllocateSlot] = useState(true)

  // Production Slot specific fields
  const [slotBay, setSlotBay] = useState<ProductionBay>('CNC Bay 1')
  const [slotStartDate, setSlotStartDate] = useState('2026-11-20')
  const [slotEndDate, setSlotEndDate] = useState('2026-11-25')
  const [slotStartTime, setSlotStartTime] = useState('08:00')
  const [slotEndTime, setSlotEndTime] = useState('17:00')
  const [slotCapacityHours, setSlotCapacityHours] = useState(32)
  const [slotNotes, setSlotNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Day calculations for slot
  const sStart = new Date(slotStartDate)
  const sEnd = new Date(slotEndDate)
  const slotDays =
    !isNaN(sStart.getTime()) && !isNaN(sEnd.getTime())
      ? Math.max(1, Math.round((sEnd.getTime() - sStart.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : 1

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = 'Job title is required'
    if (!client.trim()) errs.client = 'Client name is required'
    if (!startDate) errs.startDate = 'Start date is required'
    if (!deliveryDate) errs.deliveryDate = 'Target delivery date is required'
    if (deliveryDate < startDate) {
      errs.deliveryDate = 'Target delivery date cannot be earlier than start date'
    }

    if (allocateSlot) {
      if (!slotStartDate) errs.slotStartDate = 'Slot start date is required'
      if (!slotEndDate) errs.slotEndDate = 'Slot end date is required'
      if (slotEndDate < slotStartDate) {
        errs.slotEndDate = 'Slot end date cannot be earlier than start date'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleStartDateChange = (val: string) => {
    setStartDate(val)
    if (allocateSlot) {
      setSlotStartDate(val)
    }
  }

  const handleDeliveryDateChange = (val: string) => {
    setDeliveryDate(val)
    if (allocateSlot && val >= slotStartDate) {
      setSlotEndDate(val)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)

    setTimeout(() => {
      const generatedCode = `WO-0${Math.floor(845 + Math.random() * 50)}`
      const newWorkOrder: MockWorkOrder = {
        id: `wo-${Date.now()}`,
        code: generatedCode,
        quotationCode: quotationCode.trim() || 'DIRECT',
        client: client.trim(),
        title: title.trim(),
        status: 'active',
        priority,
        stage,
        completionRate: 0,
        leadWorker,
        startDate,
        deliveryDate,
        tasks: [
          { id: 't1', title: 'Raw timber / board calibration & cut list issue', completed: false },
          { id: 't2', title: 'Component profiling & precision joint fabrication', completed: false },
          { id: 't3', title: 'Assembly & acoustic/hardware integration', completed: false },
          { id: 't4', title: 'Final shop QC and packaging inspection', completed: false },
        ],
      }

      // Prepend to mock work orders list
      mockWorkOrders.unshift(newWorkOrder)

      // If user enabled the Option for creating Production Slot
      if (allocateSlot) {
        const generatedSlotCode = `SLOT-${Math.floor(110 + Math.random() * 880)}`
        const newSlot: MockProductionSlot = {
          id: `slot-${Date.now()}`,
          code: generatedSlotCode,
          workOrderId: newWorkOrder.id,
          workOrderCode: newWorkOrder.code,
          client: newWorkOrder.client,
          title: `${newWorkOrder.title} - Floor Run`,
          bay: slotBay,
          stage: newWorkOrder.stage,
          startDate: slotStartDate,
          endDate: slotEndDate,
          startTime: slotStartTime,
          endTime: slotEndTime,
          leadWorker: newWorkOrder.leadWorker,
          status: 'allocated',
          capacityHours: Number(slotCapacityHours) || slotDays * 8,
          priority: newWorkOrder.priority,
          notes: slotNotes.trim() || 'Allocated during work order registration.',
        }

        saveProductionSlot(newSlot)
        toast.success(
          'Work Order & Slot Created',
          `${newWorkOrder.code} created with Production Slot ${newSlot.code} (${slotStartDate} → ${slotEndDate}) at ${slotBay}.`,
        )
      } else {
        toast.success(
          'Work Order Created',
          `${newWorkOrder.code} registered. Production slot can be scheduled later.`,
        )
      }

      setLoading(false)
      onCreateSuccess?.(newWorkOrder)
      onClose()

      // Reset fields
      setTitle('')
      setClient('')
      setQuotationCode('Q-2055')
      setStage('Cutting')
      setPriority('medium')
      setLeadWorker('Ramesh Gowda')
      setStartDate('2026-11-20')
      setDeliveryDate('2026-11-28')
      setSlotNotes('')
      setErrors({})
    }, 300)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="max-w-2xl"
      title="Create New Work Order"
      description="Initiate manufacturing fabrication on the shop floor with optional production slot allocation."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 max-h-[80vh] overflow-y-auto pr-1">
        {/* Work Order Primary Details */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Job / Project Title"
            placeholder="e.g. Executive Boardroom Millwork & Paneling"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
          />
          <Input
            label="Client Name"
            placeholder="e.g. Aster Interiors"
            required
            value={client}
            onChange={(e) => setClient(e.target.value)}
            error={errors.client}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="Quotation Ref (Optional)"
            placeholder="e.g. Q-2052"
            value={quotationCode}
            onChange={(e) => setQuotationCode(e.target.value)}
          />

          <Select
            label="Initial Manufacturing Stage"
            value={stage}
            onChange={(e) => setStage(e.target.value as MockWorkOrder['stage'])}
          >
            <option value="Cutting">Cutting & Sizing</option>
            <option value="Assembly">Framework Assembly</option>
            <option value="Finishing">Finishing & Polish</option>
            <option value="Quality Check">Quality Check</option>
            <option value="Installation">Site Installation</option>
          </Select>

          <Select
            label="Priority Level"
            value={priority}
            onChange={(e) => setPriority(e.target.value as MockWorkOrder['priority'])}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            label="Lead Supervisor / Worker"
            value={leadWorker}
            onChange={(e) => setLeadWorker(e.target.value)}
          >
            {mockWorkers.map((w) => (
              <option key={w.id} value={w.name}>
                {w.name} ({w.trade})
              </option>
            ))}
          </Select>

          <Input
            type="date"
            label="Fabrication Start Date"
            required
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            error={errors.startDate}
          />

          <Input
            type="date"
            label="Target Handover Date"
            required
            value={deliveryDate}
            onChange={(e) => handleDeliveryDateChange(e.target.value)}
            error={errors.deliveryDate}
          />
        </div>

        {/* ──────────────── OPTION FOR CREATING PRODUCTION SLOT ──────────────── */}
        <div className="rounded-xl border border-primary/30 bg-primary-soft/20 p-4 space-y-3 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="allocateSlotCheckbox"
                checked={allocateSlot}
                onChange={(e) => setAllocateSlot(e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <label
                htmlFor="allocateSlotCheckbox"
                className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5"
              >
                <Calendar className="size-4 text-primary" />
                <span>Allocate Production Slot Now (Reserve Machine Bay & Calendar)</span>
              </label>
            </div>
            {allocateSlot && (
              <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                {slotDays} {slotDays === 1 ? 'Day' : 'Days'} Window
              </span>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed pl-6.5">
            Automatically reserves a shop floor workstation and schedules start and end dates directly onto the Production Calendar.
          </p>

          {allocateSlot && (
            <div className="space-y-3 border-t border-primary/20 pt-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  label="Shop Floor Bay / Machine"
                  value={slotBay}
                  onChange={(e) => setSlotBay(e.target.value as ProductionBay)}
                >
                  {PRODUCTION_BAYS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>

                <Input
                  type="number"
                  label="Allocated Machine Hours"
                  value={slotCapacityHours}
                  onChange={(e) => setSlotCapacityHours(Number(e.target.value))}
                  min={1}
                  max={300}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Slot Start Date <span className="text-danger">*</span>
                  </label>
                  <Input
                    type="date"
                    required={allocateSlot}
                    value={slotStartDate}
                    onChange={(e) => setSlotStartDate(e.target.value)}
                    error={errors.slotStartDate}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Slot End Date <span className="text-danger">*</span>
                  </label>
                  <Input
                    type="date"
                    required={allocateSlot}
                    value={slotEndDate}
                    onChange={(e) => setSlotEndDate(e.target.value)}
                    error={errors.slotEndDate}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="time"
                  label="Daily Shift Start"
                  value={slotStartTime}
                  onChange={(e) => setSlotStartTime(e.target.value)}
                />
                <Input
                  type="time"
                  label="Daily Shift End"
                  value={slotEndTime}
                  onChange={(e) => setSlotEndTime(e.target.value)}
                />
              </div>

              <Textarea
                label="Machine Setup & Tooling Notes"
                rows={2}
                placeholder="e.g. Pre-check CNC router bit #12 and confirm board moisture level."
                value={slotNotes}
                onChange={(e) => setSlotNotes(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="size-3.5" />
            <span>Adds work order to manufacturing queue and synchronizes schedule.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={loading}>
              <CheckCircle2 className="size-3.5 mr-1" />
              {loading ? 'Creating…' : 'Create Work Order'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
