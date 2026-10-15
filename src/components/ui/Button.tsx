import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost'
type Size = 'sm' | 'md' | 'icon'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  secondary: 'bg-muted text-foreground hover:bg-border',
  outline: 'border border-input bg-transparent text-foreground hover:bg-muted',
  ghost: 'text-foreground hover:bg-muted',
}

// Touch targets are 40px on small screens and tighten to 32/36px from md up.
const sizes: Record<Size, string> = {
  sm: 'h-10 px-3 text-sm md:h-8',
  md: 'h-10 px-4 text-sm md:h-9',
  icon: 'size-10 md:size-9',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
