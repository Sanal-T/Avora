export type MockEnquiry = {
  id: string
  code: string
  customerName: string
  company: string
  email: string
  phone: string
  requirement: string
  source: string
  status: 'pending' | 'qualified' | 'converted'
  budget: string
  assignedTo: string
  createdAt: string
  updatedAt: string
}

export type MockDesign = {
  id: string
  code: string
  enquiryCode: string
  title: string
  client: string
  designer: string
  version: string
  status: 'pending' | 'in_progress' | 'completed'
  dueDate: string
  completionRate: number
  filesCount: number
}

export type MockLineItem = {
  id: string
  description: string
  quantity: number
  unitPrice: number
  discountPct: number
  taxPct: number
}

export type MockQuotation = {
  id: string
  code: string
  enquiryCode: string
  client: string
  title: string
  status: 'pending' | 'approved' | 'converted' | 'rejected'
  version: number
  subtotal: number
  discountTotal: number
  taxTotal: number
  grandTotal: number
  dueDate: string
  author: string
  items: MockLineItem[]
}

export type MockWorkOrder = {
  id: string
  code: string
  quotationCode: string
  client: string
  title: string
  status: 'active' | 'completed' | 'delayed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  stage: 'Cutting' | 'Assembly' | 'Finishing' | 'Quality Check' | 'Installation'
  completionRate: number
  leadWorker: string
  startDate: string
  deliveryDate: string
  tasks: { id: string; title: string; completed: boolean }[]
}

export type MockFeedback = {
  id: string
  code: string
  workOrderCode: string
  client: string
  category: 'Quality' | 'Timeliness' | 'Communication' | 'Installation' | 'Pricing'
  rating: number
  status: 'received' | 'awaiting'
  sentiment: 'positive' | 'neutral' | 'negative'
  comments: string
  date: string
}

export type MockWorker = {
  id: string
  code: string
  name: string
  trade: 'Carpenter' | 'Welder' | 'Electrician' | 'Painter' | 'Installer' | 'Supervisor'
  status: 'available' | 'assigned' | 'unavailable'
  currentAssignment?: string
  phone: string
  efficiencyRating: string
  totalHours: number
}

export type MockNotification = {
  id: string
  title: string
  description: string
  category: 'enquiries' | 'designs' | 'quotations' | 'production' | 'feedback' | 'labour'
  timeAgo: string
  read: boolean
  link: string
}

// ──────────────── DATA ARRAYS (MOCK REMOVED) ────────────────
export const mockEnquiries: MockEnquiry[] = []
export const mockDesigns: MockDesign[] = []
export const mockQuotations: MockQuotation[] = []
export const mockWorkOrders: MockWorkOrder[] = []
export const mockFeedback: MockFeedback[] = []
export const mockWorkers: MockWorker[] = []
export const mockNotifications: MockNotification[] = []
