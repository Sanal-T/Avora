import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Factory,
  AlertTriangle,
  Calendar,
  Truck,
  CheckCircle2,
  Plus,
  Edit3,
  Play,
  Loader2,
  CheckSquare,
} from 'lucide-react'
import { PageContainer } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Dialog } from '../../../components/ui/Dialog'
import { Input } from '../../../components/ui/Input'
import { Checkbox } from '../../../components/ui/Checkbox'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { ActivityTimeline } from '../../../components/shared/ActivityTimeline'
import type { MockWorkOrder } from '../../../data/mockData'
import { productionApi, type WorkOrder } from '../../../lib/api'
import {
  getProductionSlots,
  deleteProductionSlot,
  type MockProductionSlot,
} from '../../../data/productionSlots'
import { AllocateSlotModal } from './AllocateSlotModal'
import { SlotDetailDialog } from './SlotDetailDialog'
import { toast } from '../../../lib/toast'

function toUiWorkOrder(wo: WorkOrder): MockWorkOrder {
  const st = (wo.status || '').toLowerCase()
  let status: MockWorkOrder['status'] = 'active'
  if (st.includes('complet')) status = 'completed'
  else if (st.includes('delay')) status = 'delayed'

  let stage: MockWorkOrder['stage'] = 'Assembly'
  if (status === 'completed') stage = 'Installation'
  else if (st.includes('cutting')) stage = 'Cutting'
  else if (st.includes('finish')) stage = 'Finishing'

  let completionRate = 0
  if (status === 'completed') {
    completionRate = 100
  } else if (wo.tasks && wo.tasks.length > 0) {
    const done = wo.tasks.filter((t) => t.status === 'Completed').length
    completionRate = Math.round((done / wo.tasks.length) * 100)
  } else if (st.includes('progress')) {
    completionRate = 50
  }

  return {
    id: wo.id,
    code: wo.work_order_number,
    quotationCode: wo.quotation_id ? 'Linked' : 'Direct',
    client: wo.customer_company || wo.customer_name || 'Direct Customer',
    title: wo.title,
    status,
    priority: (wo.priority?.toLowerCase() as any) || 'medium',
    stage,
    completionRate,
    leadWorker: 'Production Lead',
    startDate: wo.planned_start_date || wo.actual_start_date || 'In Progress',
    deliveryDate: wo.planned_end_date || 'TBD',
    tasks: (wo.tasks || []).map((t) => ({
      id: t.id,
      title: t.task_name,
      completed: t.status === 'Completed',
    })),
  }
}

export function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [rawWorkOrder, setRawWorkOrder] = useState<WorkOrder | null>(null)
  const [workOrder, setWorkOrder] = useState<MockWorkOrder | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<{ id: string; title: string; completed: boolean }[]>([])

  // Action modals
  const [delayModalOpen, setDelayModalOpen] = useState(false)
  const [delayReason, setDelayReason] = useState('')
  const [newTargetDate, setNewTargetDate] = useState('2026-12-10')
  const [actionLoading, setActionLoading] = useState(false)

  // Task creation
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskHours, setNewTaskHours] = useState(8)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    productionApi
      .getWorkOrder(id)
      .then((res) => {
        setRawWorkOrder(res)
        const mapped = toUiWorkOrder(res)
        setWorkOrder(mapped)
        setTasks(mapped.tasks)
      })
      .catch(() => {
        productionApi
          .listWorkOrders({ search: id })
          .then((res) => {
            const found = res.items.find((item) => item.id === id || item.work_order_number === id)
            if (found) {
              setRawWorkOrder(found)
              const mapped = toUiWorkOrder(found)
              setWorkOrder(mapped)
              setTasks(mapped.tasks)
            } else {
              setWorkOrder(undefined)
              setTasks([])
            }
          })
          .catch(() => {
            setWorkOrder(undefined)
            setTasks([])
          })
      })
      .finally(() => setLoading(false))
  }, [id])

  // Production Slots State
  const [allSlots, setAllSlots] = useState<MockProductionSlot[]>(() => getProductionSlots())
  const [slotModalOpen, setSlotModalOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<MockProductionSlot | null>(null)
  const [inspectedSlot, setInspectedSlot] = useState<MockProductionSlot | null>(null)

  const workOrderSlots = useMemo(() => {
    if (!workOrder) return []
    return allSlots.filter(
      (s) => s.workOrderId === workOrder.id || s.workOrderCode === workOrder.code,
    )
  }, [allSlots, workOrder])

  const refreshSlots = () => {
    setAllSlots(getProductionSlots())
  }

  // Task toggle wired to PostgreSQL
  const toggleTask = async (taskId: string) => {
    const current = tasks.find((t) => t.id === taskId)
    if (!current) return

    const nextCompleted = !current.completed
    const nextStatus = nextCompleted ? 'Completed' : 'Pending'

    // Optimistic local update
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, completed: nextCompleted } : t))
    setTasks(updated)

    if (rawWorkOrder) {
      try {
        const res = await productionApi.updateTaskStatus(rawWorkOrder.id, taskId, {
          status: nextStatus,
        })
        setRawWorkOrder(res)
        const mapped = toUiWorkOrder(res)
        setWorkOrder(mapped)
        setTasks(mapped.tasks)
        toast.success(
          nextCompleted ? 'Task Completed' : 'Task Reopened',
          `Progress: ${mapped.completionRate}% (synced with PostgreSQL)`,
        )
      } catch (err: any) {
        toast.error('Task update failed', err.message || 'Could not update task')
      }
    } else {
      const completedCount = updated.filter((t) => t.completed).length
      const newProgress = Math.round((completedCount / updated.length) * 100)
      if (workOrder) setWorkOrder({ ...workOrder, completionRate: newProgress })
    }
  }

  // Add single task to PostgreSQL
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      toast.warning('Title Required', 'Please enter a task title.')
      return
    }
    if (!rawWorkOrder) {
      const newTask = { id: `t-${Date.now()}`, title: newTaskTitle.trim(), completed: false }
      setTasks([...tasks, newTask])
      setAddTaskModalOpen(false)
      setNewTaskTitle('')
      return
    }

    setActionLoading(true)
    try {
      const res = await productionApi.addProductionTask(rawWorkOrder.id, {
        task_name: newTaskTitle.trim(),
        planned_hours: newTaskHours,
        status: 'Pending',
      })
      setRawWorkOrder(res)
      const mapped = toUiWorkOrder(res)
      setWorkOrder(mapped)
      setTasks(mapped.tasks)
      setAddTaskModalOpen(false)
      setNewTaskTitle('')
      toast.success('Task Added', `Production task persisted to PostgreSQL.`)
    } catch (err: any) {
      toast.error('Failed to add task', err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Initialize standard checkpoints if empty
  const handleInitializeDefaultTasks = async () => {
    if (!rawWorkOrder) return
    setActionLoading(true)
    const defaultTasks = [
      'Raw timber / board calibration & cut list issue',
      'Component profiling & precision joint fabrication',
      'Assembly & acoustic/hardware integration',
      'Final shop QC and packaging inspection',
    ]

    try {
      let lastRes = rawWorkOrder
      for (const tName of defaultTasks) {
        lastRes = await productionApi.addProductionTask(rawWorkOrder.id, {
          task_name: tName,
          planned_hours: 8,
          status: 'Pending',
        })
      }
      setRawWorkOrder(lastRes)
      const mapped = toUiWorkOrder(lastRes)
      setWorkOrder(mapped)
      setTasks(mapped.tasks)
      toast.success('Checkpoints Initialized', 'Standard 4-stage shop checkpoints registered.')
    } catch (err: any) {
      toast.error('Initialization failed', err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Record Delay in PostgreSQL
  const handleRecordDelay = async () => {
    if (!delayReason.trim()) {
      toast.warning('Reason Required', 'Please provide cause of fabrication bottleneck.')
      return
    }

    if (rawWorkOrder) {
      setActionLoading(true)
      try {
        await productionApi.updateWorkOrderStatus(rawWorkOrder.id, {
          status: 'Delayed',
          notes: delayReason,
        })
        const updated = await productionApi.updateWorkOrder(rawWorkOrder.id, {
          planned_end_date: newTargetDate,
          notes: `Delay recorded: ${delayReason}`,
        })
        setRawWorkOrder(updated)
        setWorkOrder(toUiWorkOrder(updated))
        setDelayModalOpen(false)
        toast.error('Delay Recorded', `Work order marked Delayed; new target: ${newTargetDate}`)
      } catch (err: any) {
        toast.error('Failed to record delay', err.message)
      } finally {
        setActionLoading(false)
      }
    } else if (workOrder) {
      setWorkOrder({
        ...workOrder,
        status: 'delayed',
        deliveryDate: newTargetDate,
      })
      setDelayModalOpen(false)
      toast.error('Delay Recorded', `New target handover: ${newTargetDate}`)
    }
  }

  // Start Production Run
  const handleStartProduction = async () => {
    if (rawWorkOrder) {
      setActionLoading(true)
      try {
        const updated = await productionApi.updateWorkOrderStatus(rawWorkOrder.id, {
          status: 'In Progress',
          notes: 'Production started on shop floor.',
        })
        setRawWorkOrder(updated)
        setWorkOrder(toUiWorkOrder(updated))
        toast.success('Production Started', `${updated.work_order_number} is now In Progress.`)
      } catch (err: any) {
        toast.error('Failed to start production', err.message)
      } finally {
        setActionLoading(false)
      }
    } else if (workOrder) {
      setWorkOrder({ ...workOrder, status: 'active' })
      toast.success('Production Started', 'Work order is now active.')
    }
  }

  // Complete Work Order in PostgreSQL
  const handleCompleteWorkOrder = async () => {
    if (rawWorkOrder) {
      setActionLoading(true)
      try {
        const updated = await productionApi.updateWorkOrderStatus(rawWorkOrder.id, {
          status: 'Completed',
          notes: 'Completed by shop floor manager.',
        })
        setRawWorkOrder(updated)
        setWorkOrder(toUiWorkOrder(updated))
        toast.success(
          'Work Order Completed',
          `${updated.work_order_number} marked 100% Completed in PostgreSQL!`,
        )
      } catch (err: any) {
        toast.error('Failed to complete work order', err.message)
      } finally {
        setActionLoading(false)
      }
    } else if (workOrder) {
      setWorkOrder({ ...workOrder, status: 'completed', completionRate: 100 })
      toast.success('Work Order Completed', 'Dispatched to customer feedback loop!')
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span>Loading work order details from database…</span>
        </div>
      </PageContainer>
    )
  }

  if (!workOrder) {
    return (
      <PageContainer>
        <div className="py-12 text-center">
          <p className="text-base font-semibold">Work Order not found</p>
          <Button className="mt-4" onClick={() => navigate('/production/list')}>
            Back to Registry
          </Button>
        </div>
      </PageContainer>
    )
  }

  const rawStatus = rawWorkOrder?.status || workOrder.status

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <Link
          to="/production/list"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Work Orders</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/production/calendar')}
          >
            <Calendar className="size-3.5 mr-1" />
            Production Calendar
          </Button>

          {(rawStatus === 'Pending' || rawStatus === 'Scheduled') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartProduction}
              disabled={actionLoading}
              className="text-primary border-primary/30 hover:bg-primary-soft"
            >
              <Play className="size-3.5 mr-1" />
              <span>Start Production</span>
            </Button>
          )}

          {rawStatus !== 'Delayed' && rawStatus !== 'Completed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDelayModalOpen(true)}
              className="text-danger hover:bg-danger-soft border-danger/30"
            >
              <AlertTriangle className="size-3.5 mr-1" />
              <span>Record Delay</span>
            </Button>
          )}

          {rawStatus !== 'Completed' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleCompleteWorkOrder}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <CheckCircle2 className="size-3.5 mr-1" />}
              <span>Complete Work Order</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-bold text-foreground">{workOrder.code}</span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
              Stage: {workOrder.stage}
            </span>
            <StatusBadge department="production" status={workOrder.status} showIcon />
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
            {workOrder.title}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Client: <span className="font-semibold text-foreground">{workOrder.client}</span> · Quotation: {workOrder.quotationCode}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Fabrication Progress</p>
          <p className="font-display text-3xl font-extrabold text-dept-production tabular-nums">
            {workOrder.completionRate}%
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Production Slots & Task Checklist */}
        <div className="space-y-4 lg:col-span-2">
          {/* Allocated Production Slots Card */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Factory className="size-4 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Allocated Production Slots & Machine Bays
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Scheduled shop floor runs with allocated start and end dates.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingSlot(null)
                  setSlotModalOpen(true)
                }}
              >
                <Plus className="size-3.5 mr-1" />
                Allocate Slot
              </Button>
            </div>

            {workOrderSlots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-xs text-muted-foreground">
                  No production slots currently allocated to this work order.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setEditingSlot(null)
                    setSlotModalOpen(true)
                  }}
                >
                  <Plus className="size-3.5 mr-1" />
                  Allocate First Slot
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {workOrderSlots.map((slot) => {
                  const startD = new Date(slot.startDate)
                  const endD = new Date(slot.endDate)
                  const days =
                    !isNaN(startD.getTime()) && !isNaN(endD.getTime())
                      ? Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1)
                      : 1

                  return (
                    <div
                      key={slot.id}
                      className="rounded-lg border border-border bg-card p-3.5 shadow-2xs space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">{slot.code}</span>
                            <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                              {slot.bay}
                            </span>
                            <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              Stage: {slot.stage}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                slot.status === 'in_progress'
                                  ? 'bg-dept-production text-white'
                                  : slot.status === 'completed'
                                  ? 'bg-success text-white'
                                  : slot.status === 'delayed'
                                  ? 'bg-danger text-white'
                                  : 'bg-primary text-white'
                              }`}
                            >
                              {slot.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-foreground mt-1">{slot.title}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setEditingSlot(slot)
                              setSlotModalOpen(true)
                            }}
                          >
                            <Edit3 className="size-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setInspectedSlot(slot)}
                          >
                            Details
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded bg-muted/50 p-2 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Allocated Timeframe</span>
                          <span className="font-mono font-bold text-foreground">
                            {slot.startDate} → {slot.endDate}
                          </span>
                          <span className="text-[10px] text-primary ml-1 font-semibold">({days}d)</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Daily Shift Window</span>
                          <span className="font-mono text-foreground">
                            {slot.startTime || '08:00'} – {slot.endTime || '17:00'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Floor Supervisor</span>
                          <span className="text-foreground font-medium">{slot.leadWorker}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Manufacturing Task Checklist */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Manufacturing Task Checklist</h3>
                <p className="text-xs text-muted-foreground">
                  Shop floor production checkpoints verified in PostgreSQL database.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddTaskModalOpen(true)}
                  className="h-7 text-xs"
                >
                  <Plus className="size-3 mr-1" />
                  Add Task
                </Button>
                <span className="text-xs font-mono font-bold text-primary">
                  {tasks.filter((t) => t.completed).length} / {tasks.length} Done
                </span>
              </div>
            </div>

            {tasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  No checkpoints currently tracked for this work order.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInitializeDefaultTasks}
                  disabled={actionLoading}
                >
                  <CheckSquare className="size-3.5 mr-1" />
                  Initialize 4-Stage Shop Checkpoints
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                  >
                    <Checkbox
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                      id={task.id}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={task.id}
                        className={`text-xs font-medium cursor-pointer ${
                          task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                        }`}
                      >
                        {task.title}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Installation Section */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Site Delivery & Installation Schedule</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dispatch slot confirmed with customer facility management team.
              Field assembly lead assigned: <span className="font-semibold text-foreground">{workOrder.leadWorker}</span>.
            </p>
            <div className="grid grid-cols-2 gap-4 text-xs pt-2">
              <div className="rounded bg-muted p-2.5">
                <span className="text-muted-foreground">Shop Start Date:</span>
                <p className="font-semibold text-foreground mt-0.5">{workOrder.startDate}</p>
              </div>
              <div className="rounded bg-muted p-2.5">
                <span className="text-muted-foreground">Target Handover Date:</span>
                <p className="font-semibold text-foreground mt-0.5">{workOrder.deliveryDate}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Metadata & Timeline */}
        <div className="space-y-4">
          <Card className="p-5 space-y-3 text-xs">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Work Order Metadata
            </h3>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status in PostgreSQL:</span>
              <span className="font-mono font-bold text-foreground">{rawStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Stage:</span>
              <span className="font-semibold text-foreground">{workOrder.stage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Priority:</span>
              <span className="uppercase font-mono font-bold text-primary">{workOrder.priority}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quotation Ref:</span>
              <span className="font-mono text-foreground">{workOrder.quotationCode}</span>
            </div>
            {rawWorkOrder?.actual_start_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual Started:</span>
                <span className="font-mono text-foreground">{rawWorkOrder.actual_start_date}</span>
              </div>
            )}
            {rawWorkOrder?.actual_completion_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed Date:</span>
                <span className="font-mono text-success">{rawWorkOrder.actual_completion_date}</span>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Shop Floor Timeline</h3>
            <ActivityTimeline
              events={[
                {
                  id: '1',
                  title: `Status: ${rawStatus}`,
                  description: rawWorkOrder?.notes || 'Work order active on shop floor',
                  timeAgo: workOrder.deliveryDate,
                  tone: rawStatus === 'Completed' ? 'success' : rawStatus === 'Delayed' ? 'danger' : 'info',
                },
                {
                  id: '2',
                  title: `Checkpoints: ${tasks.filter((t) => t.completed).length}/${tasks.length} Completed`,
                  description: `Shop floor fabrication progress at ${workOrder.completionRate}%`,
                  timeAgo: 'Latest',
                  tone: 'primary',
                },
              ]}
            />
          </Card>
        </div>
      </div>

      {/* Record Delay Modal */}
      <Dialog
        open={delayModalOpen}
        onClose={() => setDelayModalOpen(false)}
        title="Record Production Delay"
        description="Flag manufacturing bottleneck and revise target customer handover date in PostgreSQL."
      >
        <div className="space-y-4">
          <Input
            label="Root Cause for Delay"
            placeholder="e.g. Upholstery fabric supplier delayed delivery by 4 days"
            required
            value={delayReason}
            onChange={(e) => setDelayReason(e.target.value)}
          />
          <Input
            type="date"
            label="Revised Delivery Date"
            required
            value={newTargetDate}
            onChange={(e) => setNewTargetDate(e.target.value)}
          />
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={() => setDelayModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-danger text-white hover:bg-danger/90"
              onClick={handleRecordDelay}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Confirm Delay
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add Task Modal */}
      <Dialog
        open={addTaskModalOpen}
        onClose={() => setAddTaskModalOpen(false)}
        title="Add Production Checkpoint"
        description="Record a specific manufacturing step or QA checkpoint for this work order."
      >
        <div className="space-y-4">
          <Input
            label="Task Description"
            placeholder="e.g. CNC profile routering & edge chamfering"
            required
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <Input
            type="number"
            label="Planned Labor Hours"
            min="1"
            value={newTaskHours}
            onChange={(e) => setNewTaskHours(Math.max(1, Number(e.target.value)))}
          />
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={() => setAddTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddTask} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Add Checkpoint
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Production Slot Allocation Modal */}
      <AllocateSlotModal
        open={slotModalOpen}
        onClose={() => {
          setSlotModalOpen(false)
          setEditingSlot(null)
        }}
        existingSlot={editingSlot}
        preselectedWorkOrderId={workOrder.id}
        onSaveSuccess={() => {
          refreshSlots()
        }}
      />

      {/* Slot Inspection Dialog */}
      <SlotDetailDialog
        open={!!inspectedSlot}
        onClose={() => setInspectedSlot(null)}
        slot={inspectedSlot}
        onEdit={(slot) => {
          setEditingSlot(slot)
          setSlotModalOpen(true)
        }}
        onDelete={(slotId) => {
          deleteProductionSlot(slotId)
          refreshSlots()
          setInspectedSlot(null)
          toast.success('Production Slot Removed', 'Slot de-allocated from work order.')
        }}
      />
    </PageContainer>
  )
}
