import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'subtle'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs active:scale-[0.98]',
  secondary: 'bg-muted text-foreground hover:bg-border/80 shadow-xs active:scale-[0.98]',
  outline: 'border border-input bg-card/60 text-foreground hover:bg-muted hover:border-border shadow-xs active:scale-[0.98]',
  ghost: 'text-foreground hover:bg-muted active:scale-[0.98]',
  danger: 'bg-danger text-white hover:bg-danger/90 shadow-xs active:scale-[0.98]',
  subtle: 'bg-primary-soft text-primary-text hover:bg-primary/20 active:scale-[0.98]',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-md',
  md: 'h-9 px-3.5 text-sm rounded-lg',
  lg: 'h-11 px-5 text-base rounded-xl',
  icon: 'size-9 rounded-lg',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 font-medium transition-all duration-150 select-none disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
