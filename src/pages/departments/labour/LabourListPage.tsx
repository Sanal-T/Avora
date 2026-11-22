import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Users,
  UserCheck,
  Phone,
  Wrench,
  Plus,
  RefreshCw,
  Loader2,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  UserPlus,
} from 'lucide-react'
import { PageContainer, PageHeader } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Dialog } from '../../../components/ui/Dialog'
import { DataTable, type ColumnDef, type QuickFilterTab } from '../../../components/shared/DataTable'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import type { MockWorker } from '../../../data/mockData'
import {
  labourApi,
  productionApi,
  type Worker,
  type LabourRequest,
  type LabourSummaryResponse,
  type WorkOrder,
} from '../../../lib/api'
import { toast } from '../../../lib/toast'

function toUiWorker(w: Worker): MockWorker {
  const tradeMap: Record<string, MockWorker['trade']> = {
    Carpentry: 'Carpenter',
    Finishing: 'Painter',
    Installation: 'Installer',
    Welding: 'Welder',
    Electrical: 'Electrician',
  }
  const trade = tradeMap[w.skill_category] || (w.skill_category as any) || 'Carpenter'
  const st = (w.status || '').toLowerCase()
  const status: MockWorker['status'] = st === 'assigned' ? 'assigned' : 'available'

  return {
    id: w.id,
    code: w.worker_code,
    name: `${w.first_name} ${w.last_name}`.trim(),
    trade,
    status,
    currentAssignment: undefined,
    phone: w.phone || '—',
    efficiencyRating: '—',
    totalHours: 0,
  }
}

export function LabourListPage() {
  const navigate = useNavigate()

  // Main tabs: 'roster' | 'requests'
  const [activeMainView, setActiveMainView] = useState<'roster' | 'requests'>('roster')

  // Workers state
  const [data, setData] = useState<MockWorker[]>([])
  const [activeFilterTab, setActiveFilterTab] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<LabourSummaryResponse | null>(null)

  // Requests state
  const [requests, setRequests] = useState<LabourRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)

  // Work orders list for assignment linking
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])

  // Register worker modal
  const [workerModalOpen, setWorkerModalOpen] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [skillCategory, setSkillCategory] = useState('Carpentry')
  const [dailyRate, setDailyRate] = useState<number>(1200)
  const [registering, setRegistering] = useState(false)

  // Assign worker modal
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<LabourRequest | null>(null)
  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Create request modal
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [reqWorkOrderId, setReqWorkOrderId] = useState('')
  const [reqDeptId, setReqDeptId] = useState('production')
  const [reqCount, setReqCount] = useState(2)
  const [reqDate, setReqDate] = useState('2026-11-25')
  const [reqSkill, setReqSkill] = useState('Carpentry')
  const [reqNotes, setReqNotes] = useState('')
  const [creatingRequest, setCreatingRequest] = useState(false)

  const fetchWorkersAndSummary = () => {
    setLoading(true)
    labourApi
      .listWorkers({ page_size: 100 })
      .then((res) => {
        if (res.items && res.items.length > 0) {
          setData(res.items.map(toUiWorker))
        } else if (res.items) {
          setData([])
        }
      })
      .catch((err) => {
        console.warn('Could not load live workers from PostgreSQL:', err)
        setData([])
      })
      .finally(() => {
        setLoading(false)
      })

    labourApi
      .getLabourSummary()
      .then((s) => setSummary(s))
      .catch(() => {})
  }

  const fetchRequests = () => {
    setRequestsLoading(true)
    labourApi
      .listRequests({ page_size: 100 })
      .then((res) => {
        if (res.items) {
          setRequests(res.items)
        }
      })
      .catch((err) => {
        console.warn('Could not load labour requests from PostgreSQL:', err)
      })
      .finally(() => {
        setRequestsLoading(false)
      })
  }

  useEffect(() => {
    fetchWorkersAndSummary()
    fetchRequests()
    productionApi
      .listWorkOrders({ page_size: 100 })
      .then((res) => {
        if (res.items) setWorkOrders(res.items)
      })
      .catch(() => {})
  }, [])

  // Quick filter tabs for Workers table
  const filterTabs: QuickFilterTab[] = [
    { id: 'all', label: 'All Workers', count: data.length },
    { id: 'available', label: 'Available Standby', count: data.filter((w) => w.status === 'available').length },
    { id: 'assigned', label: 'Currently Assigned', count: data.filter((w) => w.status === 'assigned').length },
  ]

  const filteredData =
    activeFilterTab === 'all' ? data : data.filter((w) => w.status === activeFilterTab)

  // Toggle allocation in PostgreSQL
  const handleToggleWorkerStatus = async (row: MockWorker) => {
    const isCurrentlyAvailable = row.status === 'available'
    const nextStatus = isCurrentlyAvailable ? 'Assigned' : 'Available'

    // Optimistic local update
    setData((prev) =>
      prev.map((w) =>
        w.id === row.id
          ? {
              ...w,
              status: isCurrentlyAvailable ? 'assigned' : 'available',
              currentAssignment: isCurrentlyAvailable ? 'WO-0842 (On-Site Team)' : undefined,
            }
          : w,
      ),
    )

    try {
      await labourApi.updateWorker(row.id, { status: nextStatus })
      toast.success(
        isCurrentlyAvailable ? 'Worker Allocated' : 'Worker Released',
        `${row.name} status updated to ${nextStatus} in PostgreSQL.`,
      )
      fetchWorkersAndSummary()
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Could not update worker status')
      fetchWorkersAndSummary()
    }
  }

  // Register New Worker into PostgreSQL
  const handleRegisterWorker = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.warning('Name Required', 'Please enter first and last name.')
      return
    }

    setRegistering(true)
    try {
      const created = await labourApi.createWorker({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        skill_category: skillCategory,
        daily_rate: dailyRate,
        status: 'Available',
      })
      toast.success(
        'Worker Registered',
        `${created.first_name} ${created.last_name} (${created.worker_code}) added to PostgreSQL.`,
      )
      setWorkerModalOpen(false)
      setFirstName('')
      setLastName('')
      setPhone('')
      fetchWorkersAndSummary()
    } catch (err: any) {
      toast.error('Registration Failed', err.message || 'Could not register worker')
    } finally {
      setRegistering(false)
    }
  }

  // Create Labour Request in PostgreSQL
  const handleCreateRequest = async () => {
    setCreatingRequest(true)
    try {
      const res = await labourApi.createRequest({
        work_order_id: reqWorkOrderId || null,
        department_id: reqDeptId,
        required_workers_count: Number(reqCount),
        required_date: reqDate,
        skill_category: reqSkill,
        notes: reqNotes.trim() || undefined,
      })
      toast.success(
        'Labour Request Created',
        `Request ${res.request_number} logged for ${res.required_workers_count} ${res.skill_category} craftsman(s).`,
      )
      setRequestModalOpen(false)
      fetchRequests()
      fetchWorkersAndSummary()
    } catch (err: any) {
      toast.error('Failed to create request', err.message)
    } finally {
      setCreatingRequest(false)
    }
  }

  // Assign Worker to Request in PostgreSQL
  const handleAssignWorkerToRequest = async () => {
    if (!selectedRequest || !selectedWorkerId) {
      toast.warning('Selection Required', 'Please select a worker to deploy.')
      return
    }

    setAssigning(true)
    try {
      await labourApi.assignWorker(selectedRequest.id, {
        worker_id: selectedWorkerId,
        work_order_id: selectedRequest.work_order_id || null,
        start_date: selectedRequest.required_date,
      })
      toast.success('Worker Deployed', 'Assignment recorded in PostgreSQL and worker status set to Assigned.')
      setAssignModalOpen(false)
      setSelectedWorkerId('')
      setSelectedRequest(null)
      fetchRequests()
      fetchWorkersAndSummary()
    } catch (err: any) {
      toast.error('Assignment Failed', err.message)
    } finally {
      setAssigning(false)
    }
  }

  const columns: ColumnDef<MockWorker>[] = [
    {
      key: 'code',
      header: 'Worker ID',
      sortable: true,
      cell: (row) => <span className="font-mono font-bold text-foreground">{row.code}</span>,
    },
    {
      key: 'name',
      header: 'Full Name & Trade',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-semibold text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.trade}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Deployment Status',
      sortable: true,
      cell: (row) => <StatusBadge department="labour" status={row.status} showIcon />,
    },
    {
      key: 'currentAssignment',
      header: 'Current Assignment / Line',
      cell: (row) => (
        <span className="text-xs text-foreground font-medium">
          {row.currentAssignment || 'Standby for deployment'}
        </span>
      ),
    },
    {
      key: 'efficiencyRating',
      header: 'Efficiency Rating',
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
          {row.efficiencyRating}
        </span>
      ),
    },
    {
      key: 'totalHours',
      header: 'Hours Logged',
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {row.totalHours} hrs
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Contact',
      cell: (row) => <span className="text-xs text-muted-foreground font-mono">{row.phone}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleToggleWorkerStatus(row)}
          className={row.status === 'available' ? 'text-primary' : 'text-muted-foreground'}
        >
          {row.status === 'available' ? 'Allocate' : 'Release'}
        </Button>
      ),
    },
  ]

  const availableWorkersForModal = data.filter((w) => w.status === 'available')

  return (
    <PageContainer>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/labour')}>
          <ArrowLeft className="size-3.5 mr-1" />
          Labour Dashboard
        </Button>
      </div>

      <PageHeader
        title="Workforce & Labour Operations"
        description="Craftsmen allocation, certified trades, field installation dispatches, and shift tracking."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchWorkersAndSummary()
                fetchRequests()
              }}
              disabled={loading || requestsLoading}
            >
              <RefreshCw className={`size-3.5 mr-1 ${loading || requestsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRequestModalOpen(true)}>
              <Plus className="size-3.5 mr-1" />
              <span>Request Labour</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setWorkerModalOpen(true)}>
              <UserPlus className="size-3.5 mr-1" />
              <span>Register Worker</span>
            </Button>
          </div>
        }
      />

      {/* Live PostgreSQL Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 flex items-center justify-between bg-card">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Total Workforce</p>
            <p className="text-xl font-bold font-mono text-foreground mt-0.5">
              {summary ? summary.total_workers : data.length}
            </p>
          </div>
          <Users className="size-5 text-primary opacity-80" />
        </Card>

        <Card className="p-3.5 flex items-center justify-between bg-card">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Available Standby</p>
            <p className="text-xl font-bold font-mono text-success mt-0.5">
              {summary ? summary.available_workers : data.filter((w) => w.status === 'available').length}
            </p>
          </div>
          <UserCheck className="size-5 text-success opacity-80" />
        </Card>

        <Card className="p-3.5 flex items-center justify-between bg-card">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Deployed on Floor</p>
            <p className="text-xl font-bold font-mono text-primary mt-0.5">
              {summary ? summary.assigned_workers : data.filter((w) => w.status === 'assigned').length}
            </p>
          </div>
          <Wrench className="size-5 text-primary opacity-80" />
        </Card>

        <Card className="p-3.5 flex items-center justify-between bg-card">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Utilization Rate</p>
            <p className="text-xl font-bold font-mono text-foreground mt-0.5">
              {summary ? `${summary.utilization_rate}%` : '66.7%'}
            </p>
          </div>
          <Clock className="size-5 text-muted-foreground opacity-80" />
        </Card>
      </div>

      {/* Main View Switcher Tabs */}
      <div className="flex border-b border-border gap-4 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveMainView('roster')}
          className={`pb-2.5 px-1 border-b-2 transition-colors cursor-pointer ${
            activeMainView === 'roster'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Workforce Craftsmen Roster ({data.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveMainView('requests')}
          className={`pb-2.5 px-1 border-b-2 transition-colors cursor-pointer ${
            activeMainView === 'requests'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Labour Requests & Field Dispatches ({requests.length})
        </button>
      </div>

      {/* View 1: Workers DataTable */}
      {activeMainView === 'roster' && (
        <DataTable
          data={filteredData}
          loading={loading}
          columns={columns}
          keyExtractor={(row) => row.id}
          searchPlaceholder="Search workers by name, trade or assignment…"
          filterTabs={filterTabs}
          activeFilterTab={activeFilterTab}
          onFilterTabChange={setActiveFilterTab}
          exportFilename="avora_workforce_roster.csv"
        />
      )}

      {/* View 2: Labour Requests Grid */}
      {activeMainView === 'requests' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Internal requests for shop-floor craftsmen or on-site installation teams.
            </p>
            <Button variant="outline" size="sm" onClick={() => setRequestModalOpen(true)}>
              <Plus className="size-3.5 mr-1" />
              Create Request
            </Button>
          </div>

          {requests.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground text-xs space-y-2">
              <p>No active labour requests found in PostgreSQL.</p>
              <Button variant="outline" size="sm" onClick={() => setRequestModalOpen(true)}>
                Submit First Request
              </Button>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {requests.map((req) => {
                const assignedCount = req.assignments?.length || 0
                const isFulfilled = req.status === 'Fulfilled' || assignedCount >= req.required_workers_count

                return (
                  <Card key={req.id} className="p-4 space-y-3 bg-card border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">{req.request_number}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              isFulfilled
                                ? 'bg-success text-white'
                                : req.status === 'Approved'
                                ? 'bg-primary text-white'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            {isFulfilled ? 'Fulfilled' : req.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-foreground mt-1">
                          {req.required_workers_count}x {req.skill_category} Specialist(s)
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {req.required_date}
                      </span>
                    </div>

                    <div className="rounded bg-muted/40 p-2.5 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Department:</span>
                        <span className="font-medium text-foreground uppercase">{req.department_id || 'Production'}</span>
                      </div>
                      {req.work_order_id && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Work Order:</span>
                          <span className="font-mono text-primary font-bold">Linked</span>
                        </div>
                      )}
                      {req.notes && (
                        <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/40">
                          "{req.notes}"
                        </p>
                      )}
                    </div>

                    {req.assignments && req.assignments.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Deployed Craftsmen:
                        </span>
                        {req.assignments.map((a) => (
                          <div key={a.id} className="flex justify-between text-xs font-medium text-foreground">
                            <span>{a.worker_name || 'Assigned Worker'}</span>
                            <span className="text-muted-foreground text-[10px]">{a.status}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {!isFulfilled && (
                      <div className="pt-2 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => {
                            setSelectedRequest(req)
                            setAssignModalOpen(true)
                          }}
                        >
                          <UserPlus className="size-3 mr-1" />
                          Deploy Craftsman ({assignedCount}/{req.required_workers_count})
                        </Button>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Register Worker Modal */}
      <Dialog
        open={workerModalOpen}
        onClose={() => setWorkerModalOpen(false)}
        title="Register New Craftsman"
        description="Add a verified worker profile to the internal factory and field deployment roster."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="e.g. Ramesh"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              placeholder="e.g. Gowda"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              placeholder="+91 98450 12345"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Skill / Trade Tier
              </label>
              <select
                value={skillCategory}
                onChange={(e) => setSkillCategory(e.target.value)}
                className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Carpentry">Carpentry & Joinery</option>
                <option value="Finishing">Finishing & PU Spray</option>
                <option value="Installation">Site Installation</option>
                <option value="Welding">Metal & Welding</option>
                <option value="Electrical">Electrical & Cabling</option>
                <option value="CNC">CNC Bay Operator</option>
                <option value="General">General Assembly</option>
              </select>
            </div>
          </div>

          <Input
            type="number"
            label="Daily Billing Rate (₹)"
            min="500"
            step="50"
            value={dailyRate}
            onChange={(e) => setDailyRate(Number(e.target.value))}
          />

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={() => setWorkerModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleRegisterWorker} disabled={registering}>
              {registering ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Register to PostgreSQL
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Create Labour Request Modal */}
      <Dialog
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title="Submit Labour Request"
        description="Request craftsmen allocation for a production work order or installation shift."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Linked Work Order (Optional)
            </label>
            <select
              value={reqWorkOrderId}
              onChange={(e) => setReqWorkOrderId(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">-- General Factory Request --</option>
              {workOrders.map((wo) => (
                <option key={wo.id} value={wo.id}>
                  {wo.work_order_number} - {wo.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Trade / Skill Needed
              </label>
              <select
                value={reqSkill}
                onChange={(e) => setReqSkill(e.target.value)}
                className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Carpentry">Carpentry & Joinery</option>
                <option value="Finishing">Finishing & Spray</option>
                <option value="Installation">Site Installation</option>
                <option value="Welding">Welding</option>
                <option value="Electrical">Electrical</option>
                <option value="General">General Helper</option>
              </select>
            </div>
            <Input
              type="number"
              min="1"
              max="20"
              label="Workers Count"
              value={reqCount}
              onChange={(e) => setReqCount(Math.max(1, Number(e.target.value)))}
            />
          </div>

          <Input
            type="date"
            label="Required By Date"
            value={reqDate}
            onChange={(e) => setReqDate(e.target.value)}
          />

          <Input
            label="Operational Notes / Station"
            placeholder="e.g. 2 joinery craftsmen for CNC bay sizing run"
            value={reqNotes}
            onChange={(e) => setReqNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={() => setRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateRequest} disabled={creatingRequest}>
              {creatingRequest ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Submit Request
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Assign Worker Modal */}
      <Dialog
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Deploy Craftsman to Request"
        description={
          selectedRequest
            ? `Select an available ${selectedRequest.skill_category} worker for ${selectedRequest.request_number}.`
            : 'Select worker'
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Available Standby Worker *
            </label>
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">-- Select Available Worker --</option>
              {availableWorkersForModal.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.trade} - {w.code})
                </option>
              ))}
            </select>
          </div>

          {availableWorkersForModal.length === 0 && (
            <p className="text-xs text-danger">
              No workers currently in 'Available' standby status. Please release an assigned worker or register a new one.
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAssignWorkerToRequest}
              disabled={assigning || !selectedWorkerId}
            >
              {assigning ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Confirm Assignment
            </Button>
          </div>
        </div>
      </Dialog>
    </PageContainer>
  )
}
