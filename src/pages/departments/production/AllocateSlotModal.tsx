import { useState, useEffect } from 'react'
import { Calendar, Clock, AlertTriangle, CheckCircle2, Factory, User, Hash, Info } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { toast } from '../../../lib/toast'
import {
  type MockProductionSlot,
  type ProductionBay,
  type ProductionStage,
  type ProductionSlotStatus,
  PRODUCTION_BAYS,
  PRODUCTION_STAGES,
  saveProductionSlot,
} from '../../../data/productionSlots'
import { mockWorkOrders, mockWorkers } from '../../../data/mockData'

export type AllocateSlotModalProps = {
  open: boolean
  onClose: () => void
  existingSlot?: MockProductionSlot | null
  preselectedWorkOrderId?: string
  preselectedDate?: string
  onSaveSuccess: (slot: MockProductionSlot) => void
}

export function AllocateSlotModal({
  open,
  onClose,
  existingSlot,
  preselectedWorkOrderId,
  preselectedDate,
  onSaveSuccess,
}: AllocateSlotModalProps) {
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [client, setClient] = useState('')
  const [bay, setBay] = useState<ProductionBay>('CNC Bay 1')
  const [stage, setStage] = useState<ProductionStage>('Cutting')
  const [startDate, setStartDate] = useState(preselectedDate || '2026-11-20')
  const [endDate, setEndDate] = useState(preselectedDate || '2026-11-23')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [leadWorker, setLeadWorker] = useState('Ramesh Gowda')
  const [status, setStatus] = useState<ProductionSlotStatus>('allocated')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [capacityHours, setCapacityHours] = useState(24)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset or fill values when modal opens
  useEffect(() => {
    if (!open) return

    if (existingSlot) {
      setSelectedWorkOrderId(existingSlot.workOrderId || 'custom')
      setTitle(existingSlot.title)
      setClient(existingSlot.client)
      setBay(existingSlot.bay as ProductionBay)
      setStage(existingSlot.stage)
      setStartDate(existingSlot.startDate)
      setEndDate(existingSlot.endDate)
      setStartTime(existingSlot.startTime || '08:00')
      setEndTime(existingSlot.endTime || '17:00')
      setLeadWorker(existingSlot.leadWorker)
      setStatus(existingSlot.status)
      setPriority(existingSlot.priority || 'medium')
      setCapacityHours(existingSlot.capacityHours || 24)
      setNotes(existingSlot.notes || '')
      setError(null)
    } else {
      const defaultWoId = preselectedWorkOrderId || (mockWorkOrders[0]?.id ?? 'custom')
      const targetWo = mockWorkOrders.find((w) => w.id === defaultWoId)

      const initialStart = preselectedDate || '2026-11-20'
      const initialEnd = preselectedDate ? preselectedDate : '2026-11-24'

      setSelectedWorkOrderId(defaultWoId)
      if (targetWo) {
        setTitle(`${targetWo.title} - Production Window`)
        setClient(targetWo.client)
        setStage(targetWo.stage)
        setLeadWorker(targetWo.leadWorker)
        setPriority(targetWo.priority)
      } else {
        setTitle('Custom Shop Floor Production Run')
        setClient('Internal / Custom')
        setStage('Cutting')
        setLeadWorker('Ramesh Gowda')
        setPriority('medium')
      }
      setBay('CNC Bay 1')
      setStartDate(initialStart)
      setEndDate(initialEnd)
      setStartTime('08:00')
      setEndTime('17:00')
      setStatus('allocated')
      setCapacityHours(28)
      setNotes('')
      setError(null)
    }
  }, [open, existingSlot, preselectedWorkOrderId, preselectedDate])

  // When work order selection changes
  const handleWorkOrderChange = (woId: string) => {
    setSelectedWorkOrderId(woId)
    if (woId === 'custom') {
      setTitle('')
      setClient('')
      return
    }
    const wo = mockWorkOrders.find((w) => w.id === woId)
    if (wo) {
      setTitle(`${wo.title} - Floor Run`)
      setClient(wo.client)
      setStage(wo.stage)
      setLeadWorker(wo.leadWorker)
      setPriority(wo.priority)
      if (wo.startDate) setStartDate(wo.startDate)
      if (wo.deliveryDate) setEndDate(wo.deliveryDate)
    }
  }

  // Calculate day duration
  const startD = new Date(startDate)
  const endD = new Date(endDate)
  const daysDiff =
    !isNaN(startD.getTime()) && !isNaN(endD.getTime())
      ? Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : 1

  // Handle auto-update of estimated capacity hours when dates change
  const handleStartDateChange = (val: string) => {
    setStartDate(val)
    if (endDate && val > endDate) {
      setEndDate(val)
    }
    setError(null)
  }

  const handleEndDateChange = (val: string) => {
    setEndDate(val)
    if (startDate && val < startDate) {
      setError('End date cannot be earlier than start date')
    } else {
      setError(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!startDate || !endDate) {
      setError('Both start date and end date are required.')
      return
    }

    if (endDate < startDate) {
      setError('End date cannot be earlier than start date.')
      return
    }

    if (!title.trim()) {
      setError('Production slot title is required.')
      return
    }

    const matchedWo = mockWorkOrders.find((w) => w.id === selectedWorkOrderId)

    const slotPayload: MockProductionSlot = {
      id: existingSlot ? existingSlot.id : `slot-${Date.now()}`,
      code: existingSlot ? existingSlot.code : `SLOT-${Math.floor(100 + Math.random() * 900)}`,
      workOrderId: selectedWorkOrderId !== 'custom' ? selectedWorkOrderId : undefined,
      workOrderCode: matchedWo ? matchedWo.code : 'CUSTOM',
      client: client.trim() || (matchedWo ? matchedWo.client : 'Factory Floor'),
      title: title.trim(),
      bay,
      stage,
      startDate,
      endDate,
      startTime,
      endTime,
      leadWorker,
      status,
      priority,
      capacityHours: Number(capacityHours) || daysDiff * 8,
      notes: notes.trim(),
    }

    saveProductionSlot(slotPayload)
    toast.success(
      existingSlot ? 'Production Slot Updated' : 'Production Slot Allocated',
      `${slotPayload.code} (${startDate} → ${endDate}) allocated at ${bay}`,
    )
    onSaveSuccess(slotPayload)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="max-w-2xl"
      title={existingSlot ? `Edit Production Slot · ${existingSlot.code}` : 'Allocate Production Slot'}
      description="Reserve machine bays, assign floor supervisors, and allocate manufacturing start and end dates."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-danger-soft p-3 text-xs font-medium text-danger">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Work Order Association */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Associate Work Order"
            value={selectedWorkOrderId}
            onChange={(e) => handleWorkOrderChange(e.target.value)}
          >
            {mockWorkOrders.map((wo) => (
              <option key={wo.id} value={wo.id}>
                {wo.code} · {wo.client} ({wo.title.slice(0, 30)}…)
              </option>
            ))}
            <option value="custom">+ Manual / Internal Job / Maintenance</option>
          </Select>

          <Input
            label="Client / Project Tag"
            required
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="e.g. Aster Interiors"
          />
        </div>

        {/* Slot Title */}
        <Input
          label="Production Job / Task Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Conference Pods Frame Milling & Edge Banding"
        />

        {/* Date Allocation Section (Start Date & End Date) */}
        <div className="rounded-lg border border-primary/20 bg-primary-soft/30 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Calendar className="size-4 text-primary" />
              <span>Production Schedule Allocation (Start & End Dates)</span>
            </div>
            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
              {daysDiff} {daysDiff === 1 ? 'Day' : 'Days'} Duration
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Start Date <span className="text-danger">*</span>
              </label>
              <Input
                type="date"
                required
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                End Date <span className="text-danger">*</span>
              </label>
              <Input
                type="date"
                required
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Input
              type="time"
              label="Daily Shift Start"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <Input
              type="time"
              label="Daily Shift End"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        {/* Bay & Stage */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Shop Floor Bay / Machine"
            value={bay}
            onChange={(e) => setBay(e.target.value as ProductionBay)}
          >
            {PRODUCTION_BAYS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>

          <Select
            label="Production Stage"
            value={stage}
            onChange={(e) => setStage(e.target.value as ProductionStage)}
          >
            {PRODUCTION_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        {/* Worker, Status & Hours */}
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
            <option value="Unassigned">Unassigned Pool</option>
          </Select>

          <Select
            label="Slot Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductionSlotStatus)}
          >
            <option value="allocated">Allocated / Scheduled</option>
            <option value="in_progress">In Progress (Floor)</option>
            <option value="delayed">Delayed / Critical</option>
            <option value="completed">Completed / Inspected</option>
            <option value="maintenance">Maintenance Hold</option>
          </Select>

          <Input
            type="number"
            label="Allocated Work Hours"
            value={capacityHours}
            onChange={(e) => setCapacityHours(Number(e.target.value))}
            min={1}
            max={300}
          />
        </div>

        {/* Notes */}
        <Textarea
          label="Manufacturing Notes & Tooling Specs"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Ensure natural oak veneer batch #402 is inspected prior to cutting."
        />

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="size-3.5" />
            <span>Dates lock the scheduled slot on the production calendar.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              <CheckCircle2 className="size-3.5 mr-1" />
              {existingSlot ? 'Save Changes' : 'Confirm Allocation'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
