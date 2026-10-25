import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'

export type Step = {
  id: string
  label: string
}

export function WorkflowStepper({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: Step[]
  currentStep: string
  onStepClick?: (id: string) => void
}) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep)

  return (
    <nav aria-label="Workflow progress" className="w-full">
      <ol className="flex items-center w-full">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isFuture = index > currentIndex

          return (
            <li
              key={step.id}
              className={cn(
                'relative flex items-center',
                index !== steps.length - 1 ? 'flex-1' : '',
              )}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!onStepClick || isFuture}
                  onClick={() => onStepClick?.(step.id)}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'grid size-7 place-items-center rounded-full text-xs font-semibold transition-colors',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'border-2 border-primary bg-background text-primary font-bold',
                    isFuture && 'border border-border bg-muted text-muted-foreground',
                    onStepClick && !isFuture && 'cursor-pointer hover:ring-2 hover:ring-primary/20',
                  )}
                >
                  {isCompleted ? <Check className="size-3.5 stroke-[3]" /> : index + 1}
                </button>
                <span
                  className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    isCurrent ? 'text-foreground font-semibold' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index !== steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-full mx-3 transition-colors',
                    index < currentIndex ? 'bg-primary' : 'bg-border',
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
