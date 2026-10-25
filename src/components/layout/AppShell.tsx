import { useState, type ReactNode } from 'react'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { ToastContainer } from '../shared/Toast'
import type { RangeKey } from '../../data/dashboard'

export function AppShell({
  children,
  rangeId,
  onRangeChange,
}: {
  children: ReactNode
  rangeId: RangeKey
  onRangeChange: (range: RangeKey) => void
}) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header Navigation */}
      <Topbar
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        rangeId={rangeId}
        onRangeChange={onRangeChange}
      />

      {/* Main Full-width Content */}
      <main className="flex-1 w-full overflow-x-hidden">
        {children}
      </main>

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  )
}
