import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Inbox,
  PenTool,
  FileText,
  Factory,
  MessageSquare,
  Users,
  BarChart3,
  Shield,
  KeyRound,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { can, type Permission } from '../../lib/auth'
import { DEPARTMENT_META, type DepartmentId } from '../../lib/departments'
import { cn } from '../../lib/cn'

type NavItem = {
  label: string
  to: string
  icon: LucideIcon
  permission?: Permission
  badge?: string
  accentColor?: string
}

type NavGroup = {
  title?: string
  items: NavItem[]
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobile = false,
  onCloseMobile,
}: {
  collapsed: boolean
  onToggleCollapse: () => void
  mobile?: boolean
  onCloseMobile?: () => void
}) {
  const location = useLocation()

  const navGroups: NavGroup[] = [
    {
      items: [
        {
          label: 'Overview',
          to: '/',
          icon: LayoutDashboard,
          permission: 'dashboard',
        },
      ],
    },
    {
      title: 'Departments',
      items: [
        {
          label: DEPARTMENT_META.enquiries.label,
          to: '/enquiries',
          icon: DEPARTMENT_META.enquiries.icon,
          permission: 'enquiries',
          accentColor: DEPARTMENT_META.enquiries.color,
        },
        {
          label: DEPARTMENT_META.designs.label,
          to: '/designs',
          icon: DEPARTMENT_META.designs.icon,
          permission: 'designs',
          accentColor: DEPARTMENT_META.designs.color,
        },
        {
          label: DEPARTMENT_META.quotations.label,
          to: '/quotations',
          icon: DEPARTMENT_META.quotations.icon,
          permission: 'quotations',
          accentColor: DEPARTMENT_META.quotations.color,
        },
        {
          label: DEPARTMENT_META.production.label,
          to: '/production',
          icon: DEPARTMENT_META.production.icon,
          permission: 'production',
          accentColor: DEPARTMENT_META.production.color,
        },
        {
          label: DEPARTMENT_META.feedback.label,
          to: '/feedback',
          icon: DEPARTMENT_META.feedback.icon,
          permission: 'feedback',
          accentColor: DEPARTMENT_META.feedback.color,
        },
        {
          label: DEPARTMENT_META.labour.label,
          to: '/labour',
          icon: DEPARTMENT_META.labour.icon,
          permission: 'labour',
          accentColor: DEPARTMENT_META.labour.color,
        },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        {
          label: 'Reports & Analytics',
          to: '/reports',
          icon: BarChart3,
          permission: 'reports',
        },
        {
          label: 'Design System',
          to: '/design-system',
          icon: Sparkles,
          badge: 'Tokens',
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        {
          label: 'Users & Staff',
          to: '/admin/users',
          icon: Users,
          permission: 'admin',
        },
        {
          label: 'Roles & Matrix',
          to: '/admin/roles',
          icon: KeyRound,
          permission: 'admin',
        },
        {
          label: 'Audit Trail',
          to: '/admin/audit',
          icon: History,
          permission: 'admin',
        },
        {
          label: 'System Settings',
          to: '/admin/settings',
          icon: Settings,
          permission: 'admin',
        },
      ],
    },
  ]

  const isItemActive = (to: string) => {
    if (to === '/') return location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 select-none z-30',
        mobile
          ? 'h-full w-64'
          : collapsed
            ? 'w-16 h-screen sticky top-0'
            : 'w-60 h-screen sticky top-0',
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <NavLink
          to="/"
          onClick={mobile ? onCloseMobile : undefined}
          className="flex items-center gap-2.5 overflow-hidden"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-base font-extrabold text-primary-foreground shadow-xs">
            A
          </span>
          {(!collapsed || mobile) && (
            <span className="font-display text-base font-bold tracking-tight text-white truncate">
              AVORA <span className="text-primary text-xs font-semibold uppercase tracking-wider ml-1">ERP</span>
            </span>
          )}
        </NavLink>

        {!mobile && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="grid size-7 place-items-center rounded-md text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition cursor-pointer"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        {navGroups.map((group, groupIdx) => {
          const visibleItems = group.items.filter((item) => !item.permission || can(item.permission))
          if (visibleItems.length === 0) return null

          return (
            <div key={groupIdx} className="space-y-1">
              {group.title && (!collapsed || mobile) && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/70">
                  {group.title}
                </p>
              )}

              {visibleItems.map((item) => {
                const Icon = item.icon
                const active = isItemActive(item.to)

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={mobile ? onCloseMobile : undefined}
                    title={collapsed && !mobile ? item.label : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer',
                      active
                        ? 'bg-sidebar-accent text-white font-semibold shadow-xs'
                        : 'text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                      collapsed && !mobile && 'justify-center px-0 py-2.5',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-5 place-items-center shrink-0 transition-colors',
                        active ? 'text-primary' : 'text-sidebar-muted group-hover:text-sidebar-foreground',
                      )}
                      style={item.accentColor && !active ? { color: item.accentColor } : undefined}
                    >
                      <Icon className="size-4" />
                    </span>

                    {(!collapsed || mobile) && (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}

                    {(!collapsed || mobile) && item.badge && (
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Footer / Status */}
      {(!collapsed || mobile) && (
        <div className="border-t border-sidebar-border p-3 text-[11px] text-sidebar-muted flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success" />
            Core v2.4 Online
          </span>
          <span className="font-mono text-[10px] opacity-70">PROD</span>
        </div>
      )}
    </aside>
  )
}
