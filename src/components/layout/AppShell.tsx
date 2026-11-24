import { useState, type ReactNode } from 'react'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { ToastContainer } from '../shared/Toast'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import type { RangeKey } from '../../data/dashboard'

interface AppShellProps {
  children: ReactNode
  rangeId: RangeKey
  onRangeChange: (range: RangeKey) => void
  onOpenCreateModal?: (type: 'enquiry' | 'design' | 'workOrder') => void
}

export function AppShell({
  children,
  rangeId,
  onRangeChange,
  onOpenCreateModal,
}: AppShellProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased selection:bg-primary selection:text-primary-foreground">
      {/* Top Header Navigation */}
      <Topbar
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        rangeId={rangeId}
        onRangeChange={onRangeChange}
        onOpenCreateModal={onOpenCreateModal}
      />

      {/* Main Full-width Viewport with Error Boundary */}
      <main className="flex-1 w-full overflow-x-hidden">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Global Toast Notifications */}
      <ToastContainer />
    </div>
  )
}
