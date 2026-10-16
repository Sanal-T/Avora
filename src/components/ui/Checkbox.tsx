import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string
  description?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const checkId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          id={checkId}
          ref={ref}
          className={cn(
            'size-4 rounded border-input text-primary focus:ring-primary focus:ring-offset-background cursor-pointer mt-0.5',
            className,
          )}
          {...props}
        />
        {(label || description) && (
          <div className="grid gap-0.5 leading-none">
            {label && (
              <label htmlFor={checkId} className="text-sm font-medium text-foreground cursor-pointer select-none">
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </div>
    )
  },
)

Checkbox.displayName = 'Checkbox'
