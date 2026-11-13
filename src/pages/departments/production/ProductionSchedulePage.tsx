import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Clock, UserCheck } from 'lucide-react'
import { PageContainer, PageHeader } from '../../../components/shared/PageHeader'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { mockWorkOrders } from '../../../data/mockData'

export function ProductionSchedulePage() {
  const navigate = useNavigate()
  const [currentWeek, setCurrentWeek] = useState('Nov 16 – Nov 22, 2026')

  const days = ['Monday (Nov 16)', 'Tuesday (Nov 17)', 'Wednesday (Nov 18)', 'Thursday (Nov 19)', 'Friday (Nov 20)', 'Saturday (Nov 21)']

  // Schedule slots per day
  const slotsByDay: Record<string, { time: string; job: string; client: string; bay: string; stage: string; color: string }[]> = {
    'Monday (Nov 16)': [
      { time: '08:00 – 12:00', job: 'WO-0842', client: 'Aster Interiors', bay: 'CNC Bay 1', stage: 'Edge Banding', color: 'border-l-primary' },
      { time: '13:00 – 17:00', job: 'WO-0839', client: 'Zen Living', bay: 'Finishing Booth', stage: 'PU Lacquer Spray', color: 'border-l-dept-production' },
    ],
    'Tuesday (Nov 17)': [
      { time: '08:00 – 12:00', job: 'WO-0839', client: 'Zen Living', bay: 'Assembly Line A', stage: 'Final Packing', color: 'border-l-success' },
      { time: '13:00 – 18:00', job: 'WO-0831', client: 'Skyline Cafe', bay: 'Joinery Bay 3', stage: 'Table Sizing', color: 'border-l-danger' },
    ],
    'Wednesday (Nov 18)': [
      { time: '09:00 – 16:00', job: 'WO-0842', client: 'Aster Interiors', bay: 'Electrical Bench', stage: 'Acoustic Core & Wiring', color: 'border-l-primary' },
    ],
    'Thursday (Nov 19)': [
      { time: '08:00 – 14:00', job: 'WO-0842', client: 'Aster Interiors', bay: 'Bay 2', stage: 'Pre-assembly QC', color: 'border-l-primary' },
      { time: '14:00 – 18:00', job: 'WO-0831', client: 'Skyline Cafe', bay: 'Upholstery Line', stage: 'Waiting Materials', color: 'border-l-danger' },
    ],
    'Friday (Nov 20)': [
      { time: '08:00 – 18:00', job: 'WO-0842', client: 'Aster Interiors', bay: 'Field Dispatch', stage: 'Site Glass Fitting', color: 'border-l-success' },
    ],
    'Saturday (Nov 21)': [
      { time: '09:00 – 13:00', job: 'Maintenance', client: 'Internal Factory', bay: 'All Bays', stage: 'Machine Calibration & Tooling', color: 'border-l-muted-foreground' },
    ],
  }

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
          const slots = slotsByDay[day] || []
          return (
            <Card key={day} className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold text-foreground">{day}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {slots.length} Slots
                </span>
              </div>

              <div className="space-y-2.5">
                {slots.map((slot, idx) => (
                  <div
                    key={idx}
                    className={`rounded-md border border-border bg-card p-3 shadow-2xs border-l-4 ${slot.color} space-y-1.5`}
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
