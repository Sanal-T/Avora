import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Factory,
  CheckSquare,
  AlertTriangle,
  Clock,
  UserCheck,
  Calendar,
  Truck,
  CheckCircle2,
} from 'lucide-react'
import { PageContainer } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Dialog } from '../../../components/ui/Dialog'
import { Input } from '../../../components/ui/Input'
import { Checkbox } from '../../../components/ui/Checkbox'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { ActivityTimeline } from '../../../components/shared/ActivityTimeline'
import { mockWorkOrders, type MockWorkOrder } from '../../../data/mockData'
import { toast } from '../../../lib/toast'

export function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [workOrder, setWorkOrder] = useState<MockWorkOrder | undefined>(() =>
    mockWorkOrders.find((w) => w.id === id || w.code === id) || mockWorkOrders[0],
  )
  const [tasks, setTasks] = useState(workOrder?.tasks || [])
  const [delayModalOpen, setDelayModalOpen] = useState(false)
  const [delayReason, setDelayReason] = useState('')
  const [newTargetDate, setNewTargetDate] = useState('2026-11-25')

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

  const toggleTask = (taskId: string) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    setTasks(updated)
    const completedCount = updated.filter((t) => t.completed).length
    const newProgress = Math.round((completedCount / updated.length) * 100)
    setWorkOrder({ ...workOrder, completionRate: newProgress })
    toast.success('Checklist Updated', `Work Order progress: ${newProgress}%`)
  }

  const handleRecordDelay = () => {
    if (!delayReason.trim()) {
      toast.warning('Reason required', 'Please provide cause of fabrication bottleneck.')
      return
    }
    setWorkOrder({
      ...workOrder,
      status: 'delayed',
      deliveryDate: newTargetDate,
    })
    setDelayModalOpen(false)
    toast.error('Delay Recorded', `New target handover: ${newTargetDate}`)
  }

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
          {workOrder.status !== 'delayed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDelayModalOpen(true)}
              className="text-danger hover:bg-danger-soft"
            >
              <AlertTriangle className="size-3.5 mr-1" />
              Record Delay
            </Button>
          )}
          {workOrder.status !== 'completed' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setWorkOrder({ ...workOrder, status: 'completed', completionRate: 100 })
                toast.success('Work Order Completed', 'Dispatched to customer feedback loop!')
              }}
            >
              <CheckCircle2 className="size-3.5 mr-1" />
              Complete Work Order
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
        {/* Left 2 Cols: Manufacturing Task Checklist */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Manufacturing Task Checklist</h3>
                <p className="text-xs text-muted-foreground">
                  Shop floor production checkpoints verified by QA supervisor.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-primary">
                {tasks.filter((t) => t.completed).length} / {tasks.length} Done
              </span>
            </div>

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

        {/* Right 1 Col: Assignment & Status */}
        <div className="space-y-4">
          <Card className="p-5 space-y-3 text-xs">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Work Order Metadata
            </h3>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lead Worker:</span>
              <span className="font-semibold text-foreground">{workOrder.leadWorker}</span>
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
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Shop Floor Timeline</h3>
            <ActivityTimeline
              events={[
                { id: '1', title: 'Task Progress Logged', description: 'Electrical conduit fitted', timeAgo: '3 hrs ago', tone: 'info' },
                { id: '2', title: 'Timber Cut List Machined', description: 'CNC edge banding passed QA', timeAgo: '1 day ago', tone: 'success' },
                { id: '3', title: 'Work Order Dispatched to Floor', description: 'Lead assigned: Ramesh Gowda', timeAgo: '5 days ago', tone: 'primary' },
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
        description="Flag manufacturing bottleneck and revise target customer handover date."
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
            <Button variant="primary" size="sm" className="bg-danger text-white hover:bg-danger/90" onClick={handleRecordDelay}>
              Confirm Delay
            </Button>
          </div>
        </div>
      </Dialog>
    </PageContainer>
  )
}
