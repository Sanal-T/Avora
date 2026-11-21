import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  Factory,
} from 'lucide-react'
import { PageContainer, PageHeader } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { productionApi, type WorkOrder } from '../../../lib/api'
import { getProductionSlots, type MockProductionSlot } from '../../../data/productionSlots'

interface ScheduleItem {
  id: string
  time: string
  job: string
  client: string
  bay: string
  stage: string
  color: string
}

export function ProductionSchedulePage() {
  const navigate = useNavigate()
  const [currentWeek, setCurrentWeek] = useState('Nov 16 – Nov 22, 2026')
  const [loading, setLoading] = useState(false)
  const [liveWorkOrders, setLiveWorkOrders] = useState<WorkOrder[]>([])
  const [slots, setSlots] = useState<MockProductionSlot[]>(() => getProductionSlots())

  const days = [
    'Monday (Nov 16)',
    'Tuesday (Nov 17)',
    'Wednesday (Nov 18)',
    'Thursday (Nov 19)',
    'Friday (Nov 20)',
    'Saturday (Nov 21)',
  ]

  const fetchSchedule = () => {
    setLoading(true)
    setSlots(getProductionSlots())
    productionApi
      .listWorkOrders({ page_size: 100 })
      .then((res) => {
        if (res.items) {
          setLiveWorkOrders(res.items)
        }
      })
      .catch((err) => {
        console.warn('Could not load live work orders for schedule:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchSchedule()
  }, [])

  // Build scheduled items per day by combining live work orders and allocated production slots
  const slotsByDay = useMemo(() => {
    const defaultSchedule: Record<string, ScheduleItem[]> = {
      'Monday (Nov 16)': [
        {
          id: 's-1',
          time: '08:00 – 12:00',
          job: 'WO-0842',
          client: 'Aster Interiors',
          bay: 'CNC Bay 1',
          stage: 'Edge Banding',
          color: 'border-l-primary',
        },
        {
          id: 's-2',
          time: '13:00 – 17:00',
          job: 'WO-0839',
          client: 'Zen Living',
          bay: 'Finishing Booth',
          stage: 'PU Lacquer Spray',
          color: 'border-l-dept-production',
        },
      ],
      'Tuesday (Nov 17)': [
        {
          id: 's-3',
          time: '08:00 – 12:00',
          job: 'WO-0839',
          client: 'Zen Living',
          bay: 'Assembly Line A',
          stage: 'Final Packing',
          color: 'border-l-success',
        },
        {
          id: 's-4',
          time: '13:00 – 18:00',
          job: 'WO-0831',
          client: 'Skyline Cafe',
          bay: 'Joinery Bay 3',
          stage: 'Table Sizing',
          color: 'border-l-danger',
        },
      ],
      'Wednesday (Nov 18)': [
        {
          id: 's-5',
          time: '09:00 – 16:00',
          job: 'WO-0842',
          client: 'Aster Interiors',
          bay: 'Electrical Bench',
          stage: 'Acoustic Core & Wiring',
          color: 'border-l-primary',
        },
      ],
      'Thursday (Nov 19)': [
        {
          id: 's-6',
          time: '08:00 – 14:00',
          job: 'WO-0842',
          client: 'Aster Interiors',
          bay: 'Bay 2',
          stage: 'Pre-assembly QC',
          color: 'border-l-primary',
        },
        {
          id: 's-7',
          time: '14:00 – 18:00',
          job: 'WO-0831',
          client: 'Skyline Cafe',
          bay: 'Upholstery Line',
          stage: 'Waiting Materials',
          color: 'border-l-danger',
        },
      ],
      'Friday (Nov 20)': [
        {
          id: 's-8',
          time: '08:00 – 18:00',
          job: 'WO-0842',
          client: 'Aster Interiors',
          bay: 'Field Dispatch',
          stage: 'Site Glass Fitting',
          color: 'border-l-success',
        },
      ],
      'Saturday (Nov 21)': [
        {
          id: 's-9',
          time: '09:00 – 13:00',
          job: 'Maintenance',
          client: 'Internal Factory',
          bay: 'All Bays',
          stage: 'Machine Calibration & Tooling',
          color: 'border-l-muted-foreground',
        },
      ],
    }

    // Map any active live work orders from PostgreSQL into the schedule
    if (liveWorkOrders.length > 0) {
      liveWorkOrders.forEach((wo, idx) => {
        const targetDay = days[idx % (days.length - 1)] // exclude maintenance day
        const clientName = wo.customer_company || wo.customer_name || 'Commercial Client'
        const isAlreadyIn = defaultSchedule[targetDay].some((s) => s.job === wo.work_order_number)
        if (!isAlreadyIn) {
          defaultSchedule[targetDay].unshift({
            id: `live-${wo.id}`,
            time: '09:00 – 17:00',
            job: wo.work_order_number,
            client: clientName,
            bay: 'CNC Bay 1',
            stage: wo.status === 'Completed' ? 'Installation' : 'Assembly',
            color:
              wo.status === 'Completed'
                ? 'border-l-success'
                : wo.status === 'Delayed'
                ? 'border-l-danger'
                : 'border-l-primary',
          })
        }
      })
    }

    return defaultSchedule
  }, [liveWorkOrders, slots])

  return (
    <PageContainer>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/production/list')}>
          <ArrowLeft className="size-3.5 mr-1" />
          Work Orders Registry
        </Button>
      </div>

      <PageHeader
        title="Production Schedule & Shop Bays"
        description="Daily operational time slots, machine bay allocations, and assembly line routing."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchSchedule} disabled={loading}>
              <RefreshCw className={`size-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/production/calendar')}
            >
              <Calendar className="size-3.5 mr-1" />
              <span>Production Calendar</span>
            </Button>
            <Button variant="outline" size="sm">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs font-semibold font-mono px-2">{currentWeek}</span>
            <Button variant="outline" size="sm">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        }
      />

      {/* Daily Slots Timeline Calendar Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {days.map((day) => {
          const daySlots = slotsByDay[day] || []
          return (
            <Card key={day} className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold text-foreground">{day}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {daySlots.length} Slots
                </span>
              </div>

              <div className="space-y-2.5">
                {daySlots.map((slot) => (
                  <div
                    key={slot.id}
                    onClick={() => {
                      const wo = liveWorkOrders.find((w) => w.work_order_number === slot.job)
                      if (wo) {
                        navigate(`/production/${wo.id}`)
                      } else {
                        navigate('/production/list')
                      }
                    }}
                    className={`rounded-md border border-border bg-card p-3 shadow-2xs border-l-4 ${slot.color} space-y-1.5 cursor-pointer hover:border-primary transition-colors`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground">{slot.job}</span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="size-3" />
                        {slot.time}
                      </span>
                    </div>
                    <p className="text-xs text-foreground font-semibold truncate">{slot.client}</p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                      <span>{slot.bay}</span>
                      <span className="font-medium text-foreground">{slot.stage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>
    </PageContainer>
  )
}
