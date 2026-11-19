import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowLeft,
  Factory,
  Clock,
  Layers,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  List,
  Grid,
  Sparkles,
  User,
} from 'lucide-react'
import { PageContainer, PageHeader } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { AllocateSlotModal } from './AllocateSlotModal'
import { SlotDetailDialog } from './SlotDetailDialog'
import {
  getProductionSlots,
  deleteProductionSlot,
  resetProductionSlots,
  type MockProductionSlot,
  PRODUCTION_BAYS,
} from '../../../data/productionSlots'

export function ProductionCalendarPage() {
  const navigate = useNavigate()

  // Slot store state
  const [slots, setSlots] = useState<MockProductionSlot[]>(() => getProductionSlots())

  // View switchers: 'month' | 'timeline' | 'list'
  const [viewMode, setViewMode] = useState<'month' | 'timeline' | 'list'>('month')

  // Calendar Date Navigation (default: November 2026 matching current simulated date)
  const [currentYear, setCurrentYear] = useState(2026)
  const [currentMonth, setCurrentMonth] = useState(10) // 0-indexed: 10 = November

  // Filter state
  const [selectedBay, setSelectedBay] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [allocateModalOpen, setAllocateModalOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<MockProductionSlot | null>(null)
  const [preselectedDate, setPreselectedDate] = useState<string | undefined>(undefined)
  const [detailSlot, setDetailSlot] = useState<MockProductionSlot | null>(null)

  // Reload slots from store
  const refreshSlots = () => {
    setSlots(getProductionSlots())
  }

  const handleDeleteSlot = (id: string) => {
    const updated = deleteProductionSlot(id)
    setSlots(updated)
    setDetailSlot(null)
  }

  const handleResetDefaults = () => {
    if (window.confirm('Reset all production slots to demo factory schedule?')) {
      const reset = resetProductionSlots()
      setSlots(reset)
    }
  }

  // Filtered slots
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (selectedBay !== 'all' && slot.bay !== selectedBay) return false
      if (selectedStatus !== 'all' && slot.status !== selectedStatus) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchCode = slot.code.toLowerCase().includes(q)
        const matchTitle = slot.title.toLowerCase().includes(q)
        const matchClient = slot.client.toLowerCase().includes(q)
        const matchWo = (slot.workOrderCode || '').toLowerCase().includes(q)
        const matchBay = slot.bay.toLowerCase().includes(q)
        if (!matchCode && !matchTitle && !matchClient && !matchWo && !matchBay) return false
      }
      return true
    })
  }, [slots, selectedBay, selectedStatus, searchQuery])

  // Top KPIs
  const totalSlotsCount = slots.length
  const activeBaysCount = new Set(slots.filter((s) => s.status !== 'completed').map((s) => s.bay)).size
  const totalScheduledHours = slots.reduce((acc, s) => acc + (s.capacityHours || 0), 0)
  const delayedSlotsCount = slots.filter((s) => s.status === 'delayed').length

  // Calendar Math for Current Month
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(currentYear, currentMonth, 1),
  )

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const handleGoToday = () => {
    setCurrentYear(2026)
    setCurrentMonth(10) // November 2026
  }

  // Build grid of days for the month view
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay() // 0 = Sun, 1 = Mon...
    // Convert to Monday-first: Mon=0, Tue=1 ... Sun=6
    const shift = (firstDayIndex + 6) % 7
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

    const days: {
      dateStr: string
      dayNum: number
      isCurrentMonth: boolean
      isToday: boolean
    }[] = []

    // Previous month filler days
    for (let i = shift - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
      const mStr = String(prevMonth + 1).padStart(2, '0')
      const dStr = String(d).padStart(2, '0')
      days.push({
        dateStr: `${prevYear}-${mStr}-${dStr}`,
        dayNum: d,
        isCurrentMonth: false,
        isToday: false,
      })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(currentMonth + 1).padStart(2, '0')
      const dStr = String(d).padStart(2, '0')
      const dateStr = `${currentYear}-${mStr}-${dStr}`
      // Today in simulated environment: 2026-11-19
      const isToday = currentYear === 2026 && currentMonth === 10 && d === 19
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday,
      })
    }

    // Next month filler days to complete trailing week
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
        const mStr = String(nextMonth + 1).padStart(2, '0')
        const dStr = String(d).padStart(2, '0')
        days.push({
          dateStr: `${nextYear}-${mStr}-${dStr}`,
          dayNum: d,
          isCurrentMonth: false,
          isToday: false,
        })
      }
    }

    return days
  }, [currentYear, currentMonth])

  // Helper to check if slot covers a date string
  const getSlotsForDate = (dateStr: string) => {
    return filteredSlots.filter((slot) => {
      return slot.startDate <= dateStr && dateStr <= slot.endDate
    })
  }

  // Week days for timeline view (simulated around Nov 16 - Nov 22, 2026)
  const timelineDates = [
    { label: 'Mon, Nov 16', dateStr: '2026-11-16' },
    { label: 'Tue, Nov 17', dateStr: '2026-11-17' },
    { label: 'Wed, Nov 18', dateStr: '2026-11-18' },
    { label: 'Thu, Nov 19 (Today)', dateStr: '2026-11-19', isToday: true },
    { label: 'Fri, Nov 20', dateStr: '2026-11-20' },
    { label: 'Sat, Nov 21', dateStr: '2026-11-21' },
    { label: 'Sun, Nov 22', dateStr: '2026-11-22' },
  ]

  const getSlotColorClass = (slot: MockProductionSlot) => {
    switch (slot.status) {
      case 'in_progress':
        return 'border-l-dept-production bg-dept-production/10 text-foreground hover:bg-dept-production/20'
      case 'completed':
        return 'border-l-success bg-success-soft text-foreground hover:bg-success/20'
      case 'delayed':
        return 'border-l-danger bg-danger-soft text-danger hover:bg-danger/20 font-bold'
      case 'maintenance':
        return 'border-l-muted-foreground bg-muted text-muted-foreground'
      default:
        return 'border-l-primary bg-primary-soft text-primary hover:bg-primary/20'
    }
  }

  return (
    <PageContainer>
      {/* Top back navigation breadcrumbs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/production/list')}>
            <ArrowLeft className="size-3.5 mr-1" />
            Work Orders
          </Button>
          <span className="text-muted-foreground/40">/</span>
          <Button variant="ghost" size="sm" onClick={() => navigate('/production')}>
            Production Overview
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleResetDefaults}
          className="text-xs text-muted-foreground hover:text-foreground"
          title="Reset factory schedule to defaults"
        >
          <RotateCcw className="size-3 mr-1" />
          Reset Demo Data
        </Button>
      </div>

      {/* Page Header with Action Button */}
      <PageHeader
        title="Production Calendar & Bay Allocations"
        description="Allocate start and end dates for manufacturing runs, reserve shop floor bays, and resolve production bottlenecks."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CalendarIcon className="size-3.5" />
                <span>Month</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'timeline'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="size-3.5" />
                <span>Bays Matrix</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className="size-3.5" />
                <span>All Slots ({filteredSlots.length})</span>
              </button>
            </div>

            {/* Allocate Production Slot Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingSlot(null)
                setPreselectedDate(undefined)
                setAllocateModalOpen(true)
              }}
            >
              <Plus className="size-4 mr-1" />
              Allocate Production Slot
            </Button>
          </div>
        }
      />

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Allocated Slots</span>
            <CalendarIcon className="size-4 text-primary" />
          </div>
          <p className="font-display text-2xl font-extrabold text-foreground">{totalSlotsCount}</p>
          <p className="text-[11px] text-muted-foreground">Active schedule reservations</p>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Bays in Operation</span>
            <Factory className="size-4 text-dept-production" />
          </div>
          <p className="font-display text-2xl font-extrabold text-foreground">
            {activeBaysCount} <span className="text-xs font-normal text-muted-foreground">/ 7 bays</span>
          </p>
          <p className="text-[11px] text-muted-foreground">Shop floor utilization</p>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Scheduled Hours</span>
            <Clock className="size-4 text-primary" />
          </div>
          <p className="font-display text-2xl font-extrabold text-foreground">{totalScheduledHours} hrs</p>
          <p className="text-[11px] text-muted-foreground">Fabrication & assembly capacity</p>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Delayed Runs</span>
            <AlertTriangle className="size-4 text-danger" />
          </div>
          <p className={`font-display text-2xl font-extrabold ${delayedSlotsCount > 0 ? 'text-danger' : 'text-foreground'}`}>
            {delayedSlotsCount}
          </p>
          <p className="text-[11px] text-muted-foreground">Requiring schedule re-allocation</p>
        </Card>
      </div>

      {/* Filters & Search Toolbar */}
      <Card className="p-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search slot code, work order, client…"
                leftIcon={<Search className="size-3.5" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Bay Filter */}
            <div className="w-44">
              <Select
                value={selectedBay}
                onChange={(e) => setSelectedBay(e.target.value)}
              >
                <option value="all">All Shop Bays (7)</option>
                {PRODUCTION_BAYS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-36">
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="allocated">Allocated</option>
                <option value="in_progress">In Progress</option>
                <option value="delayed">Delayed</option>
                <option value="completed">Completed</option>
                <option value="maintenance">Maintenance</option>
              </Select>
            </div>
          </div>

          {/* Month / Period Navigation */}
          {viewMode === 'month' && (
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button variant="outline" size="sm" onClick={handlePrevMonth} title="Previous month">
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-36 text-center font-display text-xs font-bold text-foreground">
                {monthName}
              </span>
              <Button variant="outline" size="sm" onClick={handleNextMonth} title="Next month">
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleGoToday} className="text-xs font-semibold">
                Today
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* VIEW 1: MONTH CALENDAR GRID */}
      {viewMode === 'month' && (
        <Card className="overflow-hidden border border-border shadow-xs">
          {/* Weekday Table Headers */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/60 text-center text-xs font-bold text-muted-foreground">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="py-2.5">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
            {calendarDays.map((day) => {
              const daySlots = getSlotsForDate(day.dateStr)

              return (
                <div
                  key={day.dateStr}
                  className={`group relative flex flex-col min-h-32 p-2 transition-colors ${
                    day.isCurrentMonth ? 'bg-card' : 'bg-muted/20 text-muted-foreground/60'
                  } ${day.isToday ? 'bg-primary-soft/10 ring-1 ring-inset ring-primary/40' : ''}`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`inline-grid size-6 place-items-center rounded-full text-xs font-bold ${
                        day.isToday
                          ? 'bg-primary text-primary-foreground font-mono'
                          : day.isCurrentMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground/50'
                      }`}
                    >
                      {day.dayNum}
                    </span>

                    {/* Quick Add Slot on this date button */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSlot(null)
                        setPreselectedDate(day.dateStr)
                        setAllocateModalOpen(true)
                      }}
                      title={`Allocate production slot starting ${day.dateStr}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity rounded bg-primary/10 text-primary p-0.5 hover:bg-primary hover:text-primary-foreground cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>

                  {/* Active Slots on this Day */}
                  <div className="flex-1 space-y-1.5 overflow-y-auto max-h-36 pr-0.5">
                    {daySlots.map((slot) => {
                      const isStart = slot.startDate === day.dateStr
                      const isEnd = slot.endDate === day.dateStr

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setDetailSlot(slot)}
                          className={`w-full text-left rounded border border-border/80 border-l-4 p-1.5 text-[11px] shadow-2xs transition hover:scale-[1.01] cursor-pointer ${getSlotColorClass(
                            slot,
                          )}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-bold truncate">{slot.code}</span>
                            <span className="text-[10px] opacity-75 font-mono truncate">{slot.bay}</span>
                          </div>
                          <p className="truncate font-semibold text-foreground/90 mt-0.5">
                            {slot.client}: {slot.title}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5 pt-0.5 border-t border-border/30">
                            <span>{slot.stage}</span>
                            <span className="font-mono">{slot.startTime || '08:00'}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* VIEW 2: SHOP FLOOR BAYS MATRIX (TIMELINE) */}
      {viewMode === 'timeline' && (
        <Card className="overflow-x-auto border border-border">
          <div className="min-w-[900px]">
            {/* Header: Dates */}
            <div className="grid grid-cols-8 border-b border-border bg-muted/60 text-xs font-bold text-foreground">
              <div className="p-3 border-r border-border text-muted-foreground">Shop Floor Bay / Line</div>
              {timelineDates.map((td) => (
                <div
                  key={td.dateStr}
                  className={`p-3 text-center border-r border-border last:border-r-0 ${
                    td.isToday ? 'bg-primary-soft text-primary font-bold' : ''
                  }`}
                >
                  <p>{td.label}</p>
                  <p className="text-[10px] font-mono text-muted-foreground font-normal">{td.dateStr}</p>
                </div>
              ))}
            </div>

            {/* Bay Rows */}
            <div className="divide-y divide-border">
              {PRODUCTION_BAYS.map((bayName) => {
                const baySlots = slots.filter((s) => s.bay === bayName)

                return (
                  <div key={bayName} className="grid grid-cols-8 min-h-24">
                    {/* Bay Label */}
                    <div className="p-3 border-r border-border bg-card/60 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Factory className="size-3.5 text-primary" />
                          {bayName}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {baySlots.length} Total Runs
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[11px] h-6 px-1.5 self-start text-primary"
                        onClick={() => {
                          setEditingSlot(null)
                          setPreselectedDate('2026-11-19')
                          setAllocateModalOpen(true)
                        }}
                      >
                        + Book Bay
                      </Button>
                    </div>

                    {/* Day Cells for this Bay */}
                    {timelineDates.map((td) => {
                      const activeInBay = baySlots.filter(
                        (s) => s.startDate <= td.dateStr && td.dateStr <= s.endDate,
                      )

                      return (
                        <div
                          key={td.dateStr}
                          className={`p-2 border-r border-border last:border-r-0 flex flex-col gap-1.5 transition-colors ${
                            td.isToday ? 'bg-primary-soft/10' : 'bg-card'
                          }`}
                        >
                          {activeInBay.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground/40 italic">
                              Free Slot
                            </div>
                          ) : (
                            activeInBay.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setDetailSlot(s)}
                                className={`w-full text-left rounded border border-border border-l-4 p-1.5 text-[11px] shadow-2xs cursor-pointer ${getSlotColorClass(
                                  s,
                                )}`}
                              >
                                <div className="flex items-center justify-between font-mono font-bold text-[10px]">
                                  <span>{s.code}</span>
                                  <span>{s.stage}</span>
                                </div>
                                <p className="font-semibold text-foreground truncate mt-0.5">{s.client}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{s.title}</p>
                                <div className="mt-1 flex items-center gap-1 text-[9px] text-muted-foreground font-mono">
                                  <Clock className="size-2.5" />
                                  <span>
                                    {s.startTime || '08:00'} – {s.endTime || '17:00'}
                                  </span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* VIEW 3: SLOT REGISTRY (TABLE) */}
      {viewMode === 'list' && (
        <Card className="overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/70 text-muted-foreground border-b border-border font-bold">
                <tr>
                  <th className="p-3">Slot Code</th>
                  <th className="p-3">Work Order & Client</th>
                  <th className="p-3">Manufacturing Bay</th>
                  <th className="p-3">Stage</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">End Date</th>
                  <th className="p-3">Shift / Hours</th>
                  <th className="p-3">Supervisor</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSlots.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground">
                      No production slots match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredSlots.map((slot) => {
                    const startD = new Date(slot.startDate)
                    const endD = new Date(slot.endDate)
                    const days =
                      !isNaN(startD.getTime()) && !isNaN(endD.getTime())
                        ? Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1)
                        : 1

                    return (
                      <tr key={slot.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-primary">
                          <button
                            type="button"
                            onClick={() => setDetailSlot(slot)}
                            className="hover:underline cursor-pointer"
                          >
                            {slot.code}
                          </button>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-foreground">{slot.client}</p>
                          <p className="text-[11px] text-muted-foreground truncate max-w-xs">{slot.title}</p>
                          {slot.workOrderCode && (
                            <span className="font-mono text-[10px] text-primary">{slot.workOrderCode}</span>
                          )}
                        </td>
                        <td className="p-3 font-medium text-foreground">{slot.bay}</td>
                        <td className="p-3">
                          <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                            {slot.stage}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-semibold text-foreground">{slot.startDate}</td>
                        <td className="p-3 font-mono font-semibold text-foreground">{slot.endDate}</td>
                        <td className="p-3 font-mono text-muted-foreground">
                          {days}d · {slot.capacityHours}h
                        </td>
                        <td className="p-3 text-foreground">{slot.leadWorker}</td>
                        <td className="p-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
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
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingSlot(slot)
                                setAllocateModalOpen(true)
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDetailSlot(slot)}
                            >
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Allocate / Edit Slot Modal */}
      <AllocateSlotModal
        open={allocateModalOpen}
        onClose={() => {
          setAllocateModalOpen(false)
          setEditingSlot(null)
          setPreselectedDate(undefined)
        }}
        existingSlot={editingSlot}
        preselectedDate={preselectedDate}
        onSaveSuccess={() => {
          refreshSlots()
        }}
      />

      {/* Slot Details Dialog */}
      <SlotDetailDialog
        open={!!detailSlot}
        onClose={() => setDetailSlot(null)}
        slot={detailSlot}
        onEdit={(slot) => {
          setEditingSlot(slot)
          setAllocateModalOpen(true)
        }}
        onDelete={handleDeleteSlot}
      />
    </PageContainer>
  )
}
