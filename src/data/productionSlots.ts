import {
  productionApi,
  type ApiProductionSlot,
  type ProductionSlotCreateInput,
  type ProductionSlotUpdateInput,
} from '../lib/api'

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

export type ProductionSlot = {
  id: string
  code: string // e.g. "SLOT-101"
  workOrderId?: string // e.g. UUID
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
export type MockProductionSlot = ProductionSlot

export function mapApiSlotToUiSlot(slot: ApiProductionSlot): ProductionSlot {
  return {
    id: slot.id,
    code: slot.code,
    workOrderId: slot.work_order_id ?? undefined,
    workOrderCode: slot.work_order_code ?? undefined,
    client: slot.client,
    title: slot.title,
    bay: slot.bay,
    stage: slot.stage as ProductionStage,
    startDate: slot.start_date,
    endDate: slot.end_date,
    startTime: slot.start_time,
    endTime: slot.end_time,
    leadWorker: slot.lead_worker,
    status: slot.status,
    capacityHours: slot.capacity_hours,
    priority: slot.priority,
    notes: slot.notes ?? undefined,
  }
}

export async function fetchProductionSlots(params?: {
  bay?: string
  status?: string
  work_order_id?: string
  date_from?: string
  date_to?: string
}): Promise<ProductionSlot[]> {
  const res = await productionApi.listSlots(params)
  return (res.items || []).map(mapApiSlotToUiSlot)
}

export async function saveProductionSlotToApi(
  input: ProductionSlotCreateInput & { id?: string },
): Promise<ProductionSlot> {
  const { id, ...payload } = input
  const saved = id
    ? await productionApi.updateSlot(id, payload as ProductionSlotUpdateInput)
    : await productionApi.createSlot(payload)
  return mapApiSlotToUiSlot(saved)
}

export async function removeProductionSlotFromApi(slotId: string): Promise<void> {
  await productionApi.deleteSlot(slotId)
}
