export type ProductionSlotStatus =
  | 'allocated'
  | 'in_progress'
  | 'completed'
  | 'delayed'
  | 'maintenance'

export type ProductionStage =
  | 'Cutting'
  | 'Assembly'
  | 'Finishing'
  | 'Quality Check'
  | 'Installation'

export type ProductionBay =
  | 'CNC Bay 1'
  | 'Joinery Bay 2'
  | 'Assembly Line A'
  | 'Assembly Line B'
  | 'Finishing Booth 1'
  | 'Electrical & QC Bench'
  | 'Field Installation Bay'

export const PRODUCTION_BAYS: ProductionBay[] = [
  'CNC Bay 1',
  'Joinery Bay 2',
  'Assembly Line A',
  'Assembly Line B',
  'Finishing Booth 1',
  'Electrical & QC Bench',
  'Field Installation Bay',
]

export const PRODUCTION_STAGES: ProductionStage[] = [
  'Cutting',
  'Assembly',
  'Finishing',
  'Quality Check',
  'Installation',
]

export type MockProductionSlot = {
  id: string
  code: string // e.g. "SLOT-101"
  workOrderId?: string // e.g. "wo-1"
  workOrderCode?: string // e.g. "WO-0842"
  client: string
  title: string
  bay: ProductionBay | string
  stage: ProductionStage
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  startTime?: string // e.g. "08:00"
  endTime?: string // e.g. "17:00"
  leadWorker: string
  status: ProductionSlotStatus
  capacityHours: number
  notes?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

export const initialProductionSlots: MockProductionSlot[] = [
  {
    id: 'slot-1',
    code: 'SLOT-101',
    workOrderId: 'wo-1',
    workOrderCode: 'WO-0842',
    client: 'Aster Interiors',
    title: 'Executive Conference Pods - CNC Machining & Edge Banding',
    bay: 'CNC Bay 1',
    stage: 'Cutting',
    startDate: '2026-11-12',
    endDate: '2026-11-15',
    startTime: '08:00',
    endTime: '17:00',
    leadWorker: 'Ramesh Gowda',
    status: 'completed',
    capacityHours: 32,
    priority: 'high',
    notes: 'High-precision MDF milling and veneer edge-banding completed on schedule.',
  },
  {
    id: 'slot-2',
    code: 'SLOT-102',
    workOrderId: 'wo-1',
    workOrderCode: 'WO-0842',
    client: 'Aster Interiors',
    title: 'Acoustic Core Lining & Power Conduit Wiring',
    bay: 'Electrical & QC Bench',
    stage: 'Assembly',
    startDate: '2026-11-16',
    endDate: '2026-11-18',
    startTime: '09:00',
    endTime: '17:00',
    leadWorker: 'Ramesh Gowda',
    status: 'completed',
    capacityHours: 24,
    priority: 'high',
    notes: 'Power ducting verified with electrical bench meter.',
  },
  {
    id: 'slot-3',
    code: 'SLOT-103',
    workOrderId: 'wo-1',
    workOrderCode: 'WO-0842',
    client: 'Aster Interiors',
    title: 'Site Delivery & Glass Fitting Installation',
    bay: 'Field Installation Bay',
    stage: 'Installation',
    startDate: '2026-11-19',
    endDate: '2026-11-21',
    startTime: '08:00',
    endTime: '18:00',
    leadWorker: 'Ramesh Gowda',
    status: 'in_progress',
    capacityHours: 24,
    priority: 'urgent',
    notes: 'Active field crew assembling modular glass pods at Aster client site.',
  },
  {
    id: 'slot-4',
    code: 'SLOT-104',
    workOrderId: 'wo-2',
    workOrderCode: 'WO-0839',
    client: 'Zen Living',
    title: 'Acoustic Oak Slatted Panels Veneer & PU Coating',
    bay: 'Finishing Booth 1',
    stage: 'Finishing',
    startDate: '2026-11-09',
    endDate: '2026-11-13',
    startTime: '08:30',
    endTime: '16:30',
    leadWorker: 'Murugan S',
    status: 'completed',
    capacityHours: 35,
    priority: 'medium',
    notes: 'Matte lacquer finish applied with 2 coats.',
  },
  {
    id: 'slot-5',
    code: 'SLOT-105',
    workOrderId: 'wo-2',
    workOrderCode: 'WO-0839',
    client: 'Zen Living',
    title: 'Final QC Inspection & Protective Packaging',
    bay: 'Assembly Line A',
    stage: 'Quality Check',
    startDate: '2026-11-14',
    endDate: '2026-11-16',
    startTime: '09:00',
    endTime: '15:00',
    leadWorker: 'Murugan S',
    status: 'completed',
    capacityHours: 16,
    priority: 'medium',
    notes: 'Packaging passed transport inspection with zero defects.',
  },
  {
    id: 'slot-6',
    code: 'SLOT-106',
    workOrderId: 'wo-3',
    workOrderCode: 'WO-0831',
    client: 'Skyline Cafe',
    title: 'Teak Tables Tenon Joinery & Base Assembly',
    bay: 'Joinery Bay 2',
    stage: 'Assembly',
    startDate: '2026-11-16',
    endDate: '2026-11-24',
    startTime: '08:00',
    endTime: '17:00',
    leadWorker: 'Murugan S',
    status: 'delayed',
    capacityHours: 48,
    priority: 'urgent',
    notes: 'Delayed due to supplier bottleneck on custom velvet upholstery fabric.',
  },
  {
    id: 'slot-7',
    code: 'SLOT-107',
    workOrderId: undefined,
    workOrderCode: 'FACTORY-MAINT',
    client: 'Internal Facility',
    title: 'Bi-Weekly CNC Bay Calibration & Spindle Tooling',
    bay: 'CNC Bay 1',
    stage: 'Cutting',
    startDate: '2026-11-22',
    endDate: '2026-11-22',
    startTime: '08:00',
    endTime: '13:00',
    leadWorker: 'Kavita Nair',
    status: 'allocated',
    capacityHours: 5,
    priority: 'medium',
    notes: 'Scheduled preventive maintenance and tool realignment.',
  },
  {
    id: 'slot-8',
    code: 'SLOT-108',
    workOrderId: 'wo-1',
    workOrderCode: 'WO-0842',
    client: 'Aster Interiors',
    title: 'Commissioning Sign-off & Client Snag Rectification',
    bay: 'Field Installation Bay',
    stage: 'Installation',
    startDate: '2026-11-23',
    endDate: '2026-11-25',
    startTime: '09:00',
    endTime: '16:00',
    leadWorker: 'Ramesh Gowda',
    status: 'allocated',
    capacityHours: 14,
    priority: 'high',
    notes: 'Buffer slot for any client acoustic adjustments.',
  },
  {
    id: 'slot-9',
    code: 'SLOT-109',
    workOrderId: 'wo-3',
    workOrderCode: 'WO-0831',
    client: 'Skyline Cafe',
    title: 'Epoxy Coat Resurfacing & Booth Upholstery Fitting',
    bay: 'Finishing Booth 1',
    stage: 'Finishing',
    startDate: '2026-11-24',
    endDate: '2026-11-27',
    startTime: '08:00',
    endTime: '18:00',
    leadWorker: 'Murugan S',
    status: 'allocated',
    capacityHours: 32,
    priority: 'urgent',
    notes: 'Rescheduled finishing slot once fabric arrives.',
  },
]

const STORAGE_KEY = 'avora_production_slots_v1'

export function getProductionSlots(): MockProductionSlot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err) {
    console.error('Failed to read production slots from localStorage:', err)
  }
  return initialProductionSlots
}

export function saveProductionSlot(slot: MockProductionSlot): MockProductionSlot[] {
  const current = getProductionSlots()
  const index = current.findIndex((s) => s.id === slot.id)
  let updated: MockProductionSlot[]
  if (index >= 0) {
    updated = [...current]
    updated[index] = slot
  } else {
    updated = [slot, ...current]
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('Failed to save production slot to localStorage:', err)
  }
  return updated
}

export function deleteProductionSlot(slotId: string): MockProductionSlot[] {
  const current = getProductionSlots()
  const updated = current.filter((s) => s.id !== slotId)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('Failed to delete production slot from localStorage:', err)
  }
  return updated
}

export function resetProductionSlots(): MockProductionSlot[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialProductionSlots))
  } catch (err) {
    console.error('Failed to reset production slots:', err)
  }
  return initialProductionSlots
}
