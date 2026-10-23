import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type TabItem = {
  id: string
  label: string
  count?: number | string
  icon?: ReactNode
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  className,
}: {
  tabs: TabItem[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <div className={cn('border-b border-border', className)}>
      <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group inline-flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              {tab.icon && (
                <span className={cn(isActive ? 'text-primary' : 'text-muted-foreground')}>
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'ml-1 rounded-full px-2 py-0.5 text-caption font-medium',
                    isActive ? 'bg-primary-soft text-primary-text' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
