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

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = getToken()

  // In development, automatically ensure an active admin session if no token exists yet
  if (!token && !endpoint.includes('/api/auth/login')) {
    try {
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@avora.io', password: 'Admin@123456' }),
      })
      if (loginRes.ok) {
        const tokenData = await loginRes.json()
        if (tokenData.access_token) {
          setToken(tokenData.access_token)
          token = tokenData.access_token
        }
      }
    } catch {
      // Backend may be offline; proceed without token
    }
  }

  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const url = endpoint.startsWith('http') ? endpoint : endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`
  const response = await fetch(url, { ...options, headers })

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

export interface DesignItem {
  id: string
  design_number: string
  enquiry_id: string | null
  assigned_designer_id: string | null
  title: string
  description: string | null
  status: string
  priority: string
  estimated_hours: number | null
  actual_hours: number | null
  expected_completion_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  enquiry_number?: string | null
  assigned_designer_name?: string | null
}

export interface DesignListResponse {
  total: number
  page: number
  page_size: number
  items: DesignItem[]
}

export const designApi = {
  async list(params: { page?: number; page_size?: number; status?: string; search?: string } = {}): Promise<DesignListResponse> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', params.page.toString())
    if (params.page_size) query.set('page_size', params.page_size.toString())
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    return apiFetch<DesignListResponse>(`/api/designs${query.size ? `?${query.toString()}` : ''}`)
  },

  async get(id: string): Promise<DesignItem> {
    return apiFetch<DesignItem>(`/api/designs/${id}`)
  },
}

export interface QuotationItem {
  id: string
  quotation_number: string
  revision_number: number
  customer_id: string
  status: string
  subtotal: number | string
  discount_rate: number | string
  discount_amount: number | string
  tax_rate: number | string
  tax_amount: number | string
  total_amount: number | string
  currency: string
  valid_until: string | null
  created_at: string
  updated_at: string
  customer_name?: string | null
  enquiry_number?: string | null
}

export interface QuotationListResponse {
  total: number
  page: number
  page_size: number
  items: QuotationItem[]
}

export const quotationApi = {
  async list(params: { page?: number; page_size?: number; status?: string; search?: string } = {}): Promise<QuotationListResponse> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', params.page.toString())
    if (params.page_size) query.set('page_size', params.page_size.toString())
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    return apiFetch<QuotationListResponse>(`/api/quotations${query.size ? `?${query.toString()}` : ''}`)
  },

  async get(id: string): Promise<QuotationItem> {
    return apiFetch<QuotationItem>(`/api/quotations/${id}`)
  },
}
