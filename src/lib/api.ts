/**
 * Unified API Client for Avora ERP Backend
 */

const TOKEN_KEY = 'avora_access_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  detail: any

  constructor(status: number, message: string, detail?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

let devLoginPromise: Promise<string | null> | null = null

async function getOrCreateDevToken(devEmail: string, devPassword: string): Promise<string | null> {
  const currentToken = getToken()
  if (currentToken) return currentToken
  if (devLoginPromise) return devLoginPromise

  devLoginPromise = (async () => {
    try {
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: devEmail, password: devPassword }),
      })
      if (loginRes.ok) {
        const tokenData = await loginRes.json()
        if (tokenData.access_token) {
          setToken(tokenData.access_token)
          return tokenData.access_token as string
        }
      }
    } catch {
      // Backend may be offline; proceed without token
    } finally {
      devLoginPromise = null
    }
    return null
  })()

  return devLoginPromise
}

const inFlightGetRequests = new Map<string, Promise<any>>()

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase()

  // For GET requests, deduplicate concurrent identical requests to prevent request storms
  if (method === 'GET' && !options.body) {
    const existing = inFlightGetRequests.get(endpoint)
    if (existing) {
      return existing as Promise<T>
    }
  }

  const executeFetch = async (): Promise<T> => {
    let token = getToken()

    // In development, optionally acquire an active dev session if environment variables are explicitly supplied
    const devEmail = import.meta.env.VITE_DEV_ADMIN_EMAIL || ''
    const devPassword = import.meta.env.VITE_DEV_ADMIN_PASSWORD || ''

    if (!token && !endpoint.includes('/api/auth/login') && devEmail && devPassword) {
      token = await getOrCreateDevToken(devEmail, devPassword)
    }

    const headers = new Headers(options.headers || {})

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json')
    }

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const url = endpoint.startsWith('http') ? endpoint : endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`
    
    // Add default 10-second timeout if signal not provided
    const controller = !options.signal ? new AbortController() : null
    const timeoutId = controller ? setTimeout(() => controller.abort(), 10000) : null
    const fetchOptions: RequestInit = {
      ...options,
      headers,
      signal: options.signal || controller?.signal,
    }

    let response: Response
    try {
      response = await fetch(url, fetchOptions)
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }

    // Auto-recover if token expired or invalid from database switch
    if (response.status === 401 && !endpoint.includes('/api/auth/login') && devEmail && devPassword) {
      removeToken()
      token = await getOrCreateDevToken(devEmail, devPassword)
      if (token) {
        const retryHeaders = new Headers(headers)
        retryHeaders.set('Authorization', `Bearer ${token}`)
        response = await fetch(url, { ...options, headers: retryHeaders })
      }
    }

    if (response.status === 204) {
      return {} as T
    }

    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const data = isJson ? await response.json() : await response.text()

    if (!response.ok) {
      const detail = typeof data === 'object' && data !== null && 'detail' in data ? (data as any).detail : data
      const message = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ') : `Request failed with status ${response.status}`)
      throw new ApiError(response.status, message, detail)
    }

    return data as T
  }

  const promise = executeFetch()

  if (method === 'GET' && !options.body) {
    inFlightGetRequests.set(endpoint, promise)
    promise.finally(() => {
      inFlightGetRequests.delete(endpoint)
    })
  }

  return promise
}

// ----------------------------------------------------
// Authentication
// ----------------------------------------------------
export interface UserProfile {
  id: string
  email: string
  full_name: string
  is_active: boolean
  is_superuser: boolean
  roles: string[]
  permissions: string[]
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export const authApi = {
  async login(email: string, password: string): Promise<TokenResponse> {
    const res = await apiFetch<TokenResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(res.access_token)
    return res
  },

  async getMe(): Promise<UserProfile> {
    return apiFetch<UserProfile>('/api/auth/me')
  },

  logout(): void {
    removeToken()
  },

  isAuthenticated(): boolean {
    return !!getToken()
  },
}

// ----------------------------------------------------
// Customers
// ----------------------------------------------------
export interface Customer {
  id: string
  customer_code: string
  name: string
  company_name: string | null
  email: string
  phone: string | null
  address: string | null
  tax_id: string | null
  created_at: string
}

export interface CustomerListResponse {
  total: number
  page: number
  page_size: number
  items: Customer[]
}

export interface CustomerCreateInput {
  customer_code?: string
  name: string
  company_name?: string | null
  email: string
  phone?: string | null
  address?: string | null
  tax_id?: string | null
  notes?: string | null
}

export const customerApi = {
  async list(params: { page?: number; page_size?: number; search?: string } = {}): Promise<CustomerListResponse> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', params.page.toString())
    if (params.page_size) query.set('page_size', params.page_size.toString())
    if (params.search) query.set('search', params.search)
    return apiFetch<CustomerListResponse>(`/api/customers${query.size ? `?${query.toString()}` : ''}`)
  },

  async create(data: CustomerCreateInput): Promise<Customer> {
    return apiFetch<Customer>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async get(id: string): Promise<Customer> {
    return apiFetch<Customer>(`/api/customers/${id}`)
  },
}

// ----------------------------------------------------
// Enquiries
// ----------------------------------------------------
export interface EnquiryStatusHistory {
  id: string
  from_status: string | null
  to_status: string
  notes: string | null
  created_at: string
  changed_by_name: string | null
}

export interface Enquiry {
  id: string
  enquiry_number: string
  customer_id: string
  customer_name?: string | null
  customer_company?: string | null
  status: string
  requirement_summary: string
  estimated_budget: number | null
  priority: string
  source: string | null
  assigned_employee_id: string | null
  assigned_employee_name?: string | null
  created_at: string
  updated_at: string
  status_history?: EnquiryStatusHistory[]
}

export interface EnquiryListResponse {
  total: number
  page: number
  page_size: number
  items: Enquiry[]
}

export interface EnquiryCreateInput {
  customer_id: string
  requirement_summary: string
  estimated_budget?: number | null
  priority?: string
  source?: string | null
  assigned_employee_id?: string | null
}

export const enquiryApi = {
  async list(params: { page?: number; page_size?: number; status?: string; search?: string } = {}): Promise<EnquiryListResponse> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', params.page.toString())
    if (params.page_size) query.set('page_size', params.page_size.toString())
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    return apiFetch<EnquiryListResponse>(`/api/enquiries${query.size ? `?${query.toString()}` : ''}`)
  },

  async create(data: EnquiryCreateInput): Promise<Enquiry> {
    return apiFetch<Enquiry>('/api/enquiries', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async get(id: string): Promise<Enquiry> {
    return apiFetch<Enquiry>(`/api/enquiries/${id}`)
  },

  async updateStatus(id: string, status: string, notes?: string): Promise<Enquiry> {
    return apiFetch<Enquiry>(`/api/enquiries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    })
  },
}

// ----------------------------------------------------
// Labour & Workers
// ----------------------------------------------------
export interface Worker {
  id: string
  worker_code: string
  first_name: string
  last_name: string
  phone: string | null
  skill_category: string
  status: string
  daily_rate: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkerListResponse {
  total: number
  page: number
  page_size: number
  items: Worker[]
}

export interface WorkerCreateInput {
  worker_code?: string
  first_name: string
  last_name: string
  phone?: string | null
  skill_category?: string
  status?: string
  daily_rate?: number | null
}

export interface WorkerUpdateInput {
  first_name?: string
  last_name?: string
  phone?: string | null
  skill_category?: string
  status?: string
  daily_rate?: number | null
  is_active?: boolean
}

export interface LabourAssignment {
  id: string
  labour_request_id?: string | null
  worker_id: string
  worker_name?: string | null
  work_order_id?: string | null
  start_date: string
  end_date?: string | null
  status: string
  created_at: string
}

export interface LabourRequest {
  id: string
  request_number: string
  work_order_id?: string | null
  department_id?: string | null
  required_workers_count: number
  required_date: string
  skill_category: string
  status: string
  notes?: string | null
  created_at: string
  updated_at: string
  assignments?: LabourAssignment[]
}

export interface LabourRequestListResponse {
  total: number
  page: number
  page_size: number
  items: LabourRequest[]
}

export interface LabourSummaryResponse {
  total_workers: number
  available_workers: number
  assigned_workers: number
  pending_requests: number
  utilization_rate: number
}

export const labourApi = {
  async listWorkers(params: { page?: number; page_size?: number; status?: string; search?: string } = {}): Promise<WorkerListResponse> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', params.page.toString())
    if (params.page_size) query.set('page_size', params.page_size.toString())
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    return apiFetch<WorkerListResponse>(`/api/labour/workers${query.size ? `?${query.toString()}` : ''}`)
  },

  async getWorker(id: string): Promise<Worker> {
    return apiFetch<Worker>(`/api/labour/workers/${id}`)
  },

  async createWorker(data: WorkerCreateInput): Promise<Worker> {
    return apiFetch<Worker>('/api/labour/workers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateWorker(id: string, data: WorkerUpdateInput): Promise<Worker> {
    return apiFetch<Worker>(`/api/labour/workers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async listRequests(params: { page?: number; page_size?: number; status?: string } = {}): Promise<LabourRequestListResponse> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', params.page.toString())
    if (params.page_size) query.set('page_size', params.page_size.toString())
    if (params.status && params.status !== 'all') query.set('status', params.status)
    return apiFetch<LabourRequestListResponse>(`/api/labour/requests${query.size ? `?${query.toString()}` : ''}`)
  },

  async createRequest(data: {
    work_order_id?: string | null
    department_id?: string | null
    required_workers_count: number
    required_date: string
    skill_category: string
    notes?: string
  }): Promise<LabourRequest> {
    return apiFetch<LabourRequest>('/api/labour/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateRequestStatus(id: string, data: { status: string }): Promise<LabourRequest> {
    return apiFetch<LabourRequest>(`/api/labour/requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async assignWorker(
    requestId: string,
    data: { worker_id: string; work_order_id?: string | null; start_date: string; end_date?: string | null },
  ): Promise<LabourRequest> {
    return apiFetch<LabourRequest>(`/api/labour/requests/${requestId}/assign`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getLabourSummary(): Promise<LabourSummaryResponse> {
    return apiFetch<LabourSummaryResponse>('/api/labour/summary')
  },
}

// ----------------------------------------------------
// Production / Work Orders
// ----------------------------------------------------
export interface ProductionTask {
  id: string
  work_order_id: string
  task_name: string
  sequence_order: number
  status: string
  assigned_employee_id?: string | null
  assigned_employee_name?: string | null
  planned_hours?: number | null
  actual_hours?: number | null
  completion_notes?: string | null
}

export interface WorkOrder {
  id: string
  work_order_number: string
  quotation_id: string | null
  customer_id: string
  title: string
  priority: string
  status: string
  planned_start_date: string | null
  planned_end_date: string | null
  actual_start_date: string | null
  actual_completion_date: string | null
  notes: string | null
  customer_name?: string | null
  customer_company?: string | null
  tasks?: ProductionTask[]
  created_at: string
  updated_at: string
}

export interface WorkOrderListResponse {
  total: number
  page: number
  page_size: number
  items: WorkOrder[]
}

export interface ProductionTaskCreateInput {
  task_name: string
  sequence_order?: number
  status?: string
  assigned_employee_id?: string | null
  planned_hours?: number | null
  actual_hours?: number | null
  completion_notes?: string | null
}

export interface ProductionTaskUpdateInput {
  status?: string
  actual_hours?: number | null
  completion_notes?: string | null
}

export interface WorkOrderUpdateInput {
  title?: string
  priority?: string
  planned_start_date?: string | null
  planned_end_date?: string | null
  actual_start_date?: string | null
  notes?: string | null
}

export interface ProductionSummaryResponse {
  total_work_orders: number
  active_work_orders: number
  completed_work_orders: number
  delayed_work_orders: number
  on_time_completion_rate: number
}

export interface WorkOrderCreateInput {
  title: string
  priority?: string
  planned_start_date?: string | null
  planned_end_date?: string | null
  notes?: string | null
  customer_id: string
  quotation_id?: string | null
}

export const productionApi = {
  async listWorkOrders(params: { page?: number; page_size?: number; status?: string; search?: string } = {}): Promise<WorkOrderListResponse> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', params.page.toString())
    if (params.page_size) query.set('page_size', params.page_size.toString())
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    return apiFetch<WorkOrderListResponse>(`/api/production${query.size ? `?${query.toString()}` : ''}`)
  },

  async createWorkOrder(data: WorkOrderCreateInput): Promise<WorkOrder> {
    return apiFetch<WorkOrder>('/api/production', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateWorkOrder(id: string, data: WorkOrderUpdateInput): Promise<WorkOrder> {
    return apiFetch<WorkOrder>(`/api/production/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async updateWorkOrderStatus(id: string, data: { status: string; notes?: string }): Promise<WorkOrder> {
    return apiFetch<WorkOrder>(`/api/production/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async addProductionTask(id: string, data: ProductionTaskCreateInput): Promise<WorkOrder> {
    return apiFetch<WorkOrder>(`/api/production/${id}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateTaskStatus(workOrderId: string, taskId: string, data: ProductionTaskUpdateInput): Promise<WorkOrder> {
    return apiFetch<WorkOrder>(`/api/production/${workOrderId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async getProductionSummary(params: { date_from?: string; date_to?: string } = {}): Promise<ProductionSummaryResponse> {
    const query = new URLSearchParams()
    if (params.date_from) query.set('date_from', params.date_from)
    if (params.date_to) query.set('date_to', params.date_to)
    return apiFetch<ProductionSummaryResponse>(`/api/production/summary${query.size ? `?${query.toString()}` : ''}`)
  },

  async getWorkOrder(id: string): Promise<WorkOrder> {
    return apiFetch<WorkOrder>(`/api/production/${id}`)
  },
}

// ----------------------------------------------------
// Designs
// ----------------------------------------------------
export interface DesignVersion {
  id: string
  version_number: number
  file_name: string
  file_url: string
  change_notes?: string | null
  is_approved: boolean
  created_at: string
}

export interface Design {
  id: string
  design_number: string
  enquiry_id: string | null
  enquiry_number?: string | null
  assigned_designer_id: string | null
  assigned_designer_name?: string | null
  title: string
  description: string | null
  priority: string
  status: string
  estimated_hours: number | null
  actual_hours: number | null
  expected_completion_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  versions?: DesignVersion[]
}

export interface DesignListResponse {
  total: number
  page: number
  page_size: number
  items: Design[]
}

export interface DesignCreateInput {
  title: string
  description?: string | null
  priority?: string
  enquiry_id?: string | null
  assigned_designer_id?: string | null
  estimated_hours?: number | null
  expected_completion_date?: string | null
}

export const designApi = {
  async listDesigns(params: { page?: number; page_size?: number; status?: string; search?: string } = {}): Promise<DesignListResponse> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', params.page.toString())
    if (params.page_size) query.set('page_size', params.page_size.toString())
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    return apiFetch<DesignListResponse>(`/api/designs${query.size ? `?${query.toString()}` : ''}`)
  },

  async createDesign(data: DesignCreateInput): Promise<Design> {
    return apiFetch<Design>('/api/designs', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getDesign(id: string): Promise<Design> {
    return apiFetch<Design>(`/api/designs/${id}`)
  },
}

// ----------------------------------------------------
// Quotations
// ----------------------------------------------------
export interface QuotationItemRead {
  id: string
  item_code?: string | null
  description: string
  quantity: number | string
  unit: string
  unit_price: number | string
  total_price: number | string
  sort_order: number
}

export interface QuotationRevisionRead {
  id: string
  revision_number: number
  total_amount: number | string
  change_summary?: string | null
  created_at: string
}

export interface QuotationFollowUpRead {
  id: string
  scheduled_date: string
  notes: string
  outcome?: string | null
  assigned_employee_id?: string | null
  assigned_employee_name?: string | null
  is_completed: boolean
  completed_date?: string | null
  created_at: string
}

export interface QuotationItemCreateInput {
  item_code?: string | null
  description: string
  quantity: number
  unit?: string
  unit_price: number
  sort_order?: number
}

export interface QuotationCreateInput {
  enquiry_id?: string | null
  customer_id: string
  discount_rate?: number
  tax_rate?: number
  valid_until?: string | null
  currency?: string
  items: QuotationItemCreateInput[]
}

export interface QuotationUpdateInput {
  discount_rate?: number
  tax_rate?: number
  valid_until?: string | null
  currency?: string
  items?: QuotationItemCreateInput[]
}

export interface QuotationRevisionCreateInput {
  change_summary: string
  items: QuotationItemCreateInput[]
  discount_rate?: number
  tax_rate?: number
}

export interface QuotationStatusUpdateInput {
  status: string
  rejection_reason?: string | null
  notes?: string | null
}

export interface Quotation {
  id: string
  quotation_number: string
  revision_number: number
  enquiry_id: string | null
  enquiry_number?: string | null
  customer_id: string
  customer_name?: string | null
  customer_company?: string | null
  status: string
  subtotal: number | string
  discount_rate: number | string
  discount_amount: number | string
  tax_rate: number | string
  tax_amount: number | string
  total_amount: number | string
  valid_until: string | null
  approved_at?: string | null
  rejection_reason?: string | null
  currency: string
  created_at: string
  updated_at: string
  items?: QuotationItemRead[]
  revisions?: QuotationRevisionRead[]
  follow_ups?: QuotationFollowUpRead[]
  has_work_order?: boolean
}

export interface QuotationListResponse {
  total: number
  page: number
  page_size: number
  items: Quotation[]
}

export const quotationApi = {
  async listQuotations(params: { page?: number; page_size?: number; status?: string; search?: string } = {}): Promise<QuotationListResponse> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', params.page.toString())
    if (params.page_size) query.set('page_size', params.page_size.toString())
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    return apiFetch<QuotationListResponse>(`/api/quotations${query.size ? `?${query.toString()}` : ''}`)
  },

  async getQuotation(id: string): Promise<Quotation> {
    return apiFetch<Quotation>(`/api/quotations/${id}`)
  },

  async createQuotation(data: QuotationCreateInput): Promise<Quotation> {
    return apiFetch<Quotation>('/api/quotations', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateQuotation(id: string, data: QuotationUpdateInput): Promise<Quotation> {
    return apiFetch<Quotation>(`/api/quotations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async updateQuotationStatus(id: string, data: QuotationStatusUpdateInput): Promise<Quotation> {
    return apiFetch<Quotation>(`/api/quotations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async createRevision(id: string, data: QuotationRevisionCreateInput): Promise<Quotation> {
    return apiFetch<Quotation>(`/api/quotations/${id}/revisions`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async convertToWorkOrder(id: string): Promise<{ message: string; work_order_id: string; work_order_number: string }> {
    return apiFetch<{ message: string; work_order_id: string; work_order_number: string }>(`/api/quotations/${id}/convert-to-work-order`, {
      method: 'POST',
    })
  },

  async addFollowUp(id: string, data: { scheduled_date: string; notes: string; outcome?: string; assigned_employee_id?: string }): Promise<Quotation> {
    return apiFetch<Quotation>(`/api/quotations/${id}/follow-ups`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// ----------------------------------------------------
// Feedback
// ----------------------------------------------------
export interface Feedback {
  id: string
  customer_id: string
  customer_name?: string | null
  customer_company?: string | null
  work_order_id: string | null
  work_order_number?: string | null
  category: string
  rating: number | null
  comments: string | null
  status: string
  resolution_notes?: string | null
  received_at: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface FeedbackCreateInput {
  customer_id: string
  work_order_id?: string | null
  category?: string
  rating?: number | null
  comments?: string | null
}

export interface FeedbackUpdateInput {
  status?: string
  rating?: number | null
  comments?: string | null
  resolution_notes?: string | null
}

export interface FeedbackListResponse {
  total: number
  page: number
  page_size: number
  items: Feedback[]
}

export interface FeedbackSummaryResponse {
  total_feedback: number
  received_feedback: number
  awaiting_feedback: number
  response_rate: number
}

export const feedbackApi = {
  async listFeedback(params: { page?: number; page_size?: number; status?: string; category?: string } = {}): Promise<FeedbackListResponse> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', params.page.toString())
    if (params.page_size) query.set('page_size', params.page_size.toString())
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.category) query.set('category', params.category)
    return apiFetch<FeedbackListResponse>(`/api/feedback${query.size ? `?${query.toString()}` : ''}`)
  },

  async getFeedback(id: string): Promise<Feedback> {
    return apiFetch<Feedback>(`/api/feedback/${id}`)
  },

  async createFeedback(data: FeedbackCreateInput): Promise<Feedback> {
    return apiFetch<Feedback>('/api/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateFeedback(id: string, data: FeedbackUpdateInput): Promise<Feedback> {
    return apiFetch<Feedback>(`/api/feedback/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async getFeedbackSummary(): Promise<FeedbackSummaryResponse> {
    return apiFetch<FeedbackSummaryResponse>('/api/feedback/summary')
  },
}

export interface AppNotification {
  id: string
  recipient_id: string
  title: string
  message: string
  link?: string | null
  is_read: boolean
  category: string
  created_at: string
}

export interface NotificationListResponse {
  total: number
  items: AppNotification[]
}

export const notificationsApi = {
  async listNotifications(unreadOnly = false): Promise<NotificationListResponse> {
    return apiFetch<NotificationListResponse>(`/api/notifications${unreadOnly ? '?unread_only=true' : ''}`)
  },

  async markRead(id: string): Promise<AppNotification> {
    return apiFetch<AppNotification>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    })
  },

  async markAllRead(): Promise<{ status: string; marked_read: number }> {
    return apiFetch<{ status: string; marked_read: number }>('/api/notifications/read-all', {
      method: 'PATCH',
    })
  },
}
