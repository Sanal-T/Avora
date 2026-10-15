/**
 * Prototype permission model. Real permissions will come from the backend after login;
 * until then the signed-in user is an administrator, so everything is visible.
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

export const currentUser = {
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
  ] as Permission[],
}

export const can = (permission: Permission) => currentUser.permissions.includes(permission)
