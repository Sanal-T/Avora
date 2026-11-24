/**
 * Role-Based Access Control and Session Manager for Avora ERP.
 * Dynamically synchronizes user role and permissions from backend `/api/auth/me`.
 */

export type Permission =
  | 'dashboard'
  | 'enquiries'
  | 'designs'
  | 'quotations'
  | 'production'
  | 'feedback'
  | 'labour'
  | 'reports'
  | 'admin'

export interface UserSession {
  id?: string
  name: string
  role: string
  initials: string
  email?: string
  permissions: Permission[]
}

const DEFAULT_ADMIN_USER: UserSession = {
  name: 'Shiva Kumar',
  role: 'Administrator',
  initials: 'SK',
  permissions: [
    'dashboard',
    'enquiries',
    'designs',
    'quotations',
    'production',
    'feedback',
    'labour',
    'reports',
    'admin',
  ],
}

const USER_SESSION_KEY = 'avora_user_session'

function getStoredUser(): UserSession {
  try {
    const raw = localStorage.getItem(USER_SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.name) {
        return parsed as UserSession
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return DEFAULT_ADMIN_USER
}

export let currentUser: UserSession = getStoredUser()

export function setCurrentUser(user: Partial<UserSession>): UserSession {
  const updated: UserSession = {
    ...currentUser,
    ...user,
  }
  currentUser = updated
  try {
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updated))
  } catch {
    // Ignore storage quota error
  }
  return updated
}

export function clearCurrentUser(): void {
  currentUser = DEFAULT_ADMIN_USER
  try {
    localStorage.removeItem(USER_SESSION_KEY)
  } catch {
    // Ignore
  }
}

export function can(permission: Permission): boolean {
  if (currentUser.role.toLowerCase() === 'administrator') return true
  return currentUser.permissions.includes(permission)
}
