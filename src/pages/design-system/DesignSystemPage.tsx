import { useState } from 'react'
import { PageContainer, PageHeader } from '../../components/shared/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { Sparkline } from '../../components/ui/Sparkline'
import { DEPARTMENT_ORDER, DEPARTMENT_META } from '../../lib/departments'
import { toast } from '../../lib/toast'

export function DesignSystemPage() {
  const [testInput, setTestInput] = useState('')

  return (
    <PageContainer>
      <PageHeader
        title="Avora Design System Guide"
        description="Core design tokens, semantic color pairs, typography hierarchy, and interactive primitive components."
      />

      {/* 1. Color Palette Tokens */}
      <section className="space-y-3">
        <h2 className="text-section font-semibold text-foreground">1. Department Accent Colors</h2>
        <p className="text-xs text-muted-foreground">
          Dedicated, restrained accent colors used strictly for department identity, icons, and chart strokes.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {DEPARTMENT_ORDER.map((id) => {
            const meta = DEPARTMENT_META[id]
            const Icon = meta.icon
            return (
              <Card key={id} className="p-4 flex items-center gap-3">
                <span
                  className="grid size-9 place-items-center rounded-lg"
                  style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 15%, transparent)`, color: meta.color }}
                >
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground">{meta.label}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{meta.color}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      {/* 2. Semantic Tones & Badges */}
      <section className="space-y-3">
        <h2 className="text-section font-semibold text-foreground">2. Semantic Badges & Status Mapping</h2>
        <p className="text-xs text-muted-foreground">
          WCAG 2.1 AA contrast verified pairs with soft background and high-contrast foreground text.
        </p>

        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">Neutral Tone</Badge>
            <Badge tone="primary">Primary Brand</Badge>
            <Badge tone="success">Success State</Badge>
            <Badge tone="warning">Warning / In-Review</Badge>
            <Badge tone="danger">Danger / Delayed</Badge>
            <Badge tone="info">Informational</Badge>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Sample Centralized Status Badges
            </h3>
            <div className="flex flex-wrap gap-2">
              <StatusBadge department="enquiries" status="pending" showIcon />
              <StatusBadge department="enquiries" status="qualified" showIcon />
              <StatusBadge department="enquiries" status="converted" showIcon />
              <StatusBadge department="quotations" status="approved" showIcon />
              <StatusBadge department="production" status="delayed" showIcon />
              <StatusBadge department="feedback" status="received" showIcon />
              <StatusBadge department="labour" status="available" showIcon />
            </div>
          </div>
        </Card>
      </section>

      {/* 3. Button Variants */}
      <section className="space-y-3">
        <h2 className="text-section font-semibold text-foreground">3. Button Variants & Interactive Controls</h2>
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => toast.success('Primary button clicked')}>
              Primary Action
            </Button>
            <Button variant="secondary" onClick={() => toast.info('Secondary button clicked')}>
              Secondary
            </Button>
            <Button variant="outline" onClick={() => toast.warning('Outline button clicked')}>
              Outline
            </Button>
            <Button variant="ghost" onClick={() => toast.info('Ghost button clicked')}>
              Ghost
            </Button>
            <Button variant="primary" disabled>
              Disabled Action
            </Button>
          </div>
        </Card>
      </section>

      {/* 4. Form Primitives */}
      <section className="space-y-3">
        <h2 className="text-section font-semibold text-foreground">4. Form & Input Primitives</h2>
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
            <Input
              label="Standard Text Input"
              placeholder="Enter some text…"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              helperText="Helper description text below field"
            />
            <Select
              label="Standard Dropdown Select"
              options={[
                { value: 'opt1', label: 'Option One (Verified)' },
                { value: 'opt2', label: 'Option Two (Pending)' },
              ]}
            />
          </div>
        </Card>
      </section>
    </PageContainer>
  )
}
