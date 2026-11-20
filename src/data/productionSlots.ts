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

export const initialProductionSlots: MockProductionSlot[] = []

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
