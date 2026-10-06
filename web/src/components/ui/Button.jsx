
import { cn } from '@/lib/utils'
import Spinner from '@/components/ui/Spinner'

const variantMap = {
  primary: 'bg-primary text-slate-950 shadow-soft hover:bg-primaryDark hover:shadow-lift',
  secondary: 'bg-accent text-white hover:bg-slate-800 shadow-soft',
  dark: 'bg-slate-900 text-white hover:bg-slate-800 shadow-soft',
  warning: 'bg-amber-500 text-slate-950 hover:bg-amber-600 shadow-soft',
  outline: 'border border-border bg-white text-foreground hover:border-primary/40 hover:bg-surfaceAlt',
  ghost: 'bg-transparent text-foreground hover:bg-surfaceAlt',
  danger: 'bg-danger text-white hover:bg-red-700',
}

const sizeMap = {
  sm: 'min-h-[36px] h-9 px-3.5 text-xs rounded-xl font-bold',
  md: 'min-h-[42px] h-[42px] px-4 text-xs font-bold rounded-xl',
  lg: 'min-h-[46px] h-[46px] px-6 text-sm font-bold rounded-xl',
}

export default function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all select-none focus-ring disabled:cursor-not-allowed disabled:opacity-60 shrink-0',
        fullWidth && 'w-full',
        variantMap[variant] || variantMap.primary,
        sizeMap[size] || sizeMap.md,
        className
      )}
      {...props}
    >
      {loading && <Spinner size="sm" className="text-current shrink-0" />}
      {!loading && leftIcon && <span className="inline-flex items-center justify-center shrink-0">{leftIcon}</span>}
      <span className="inline-flex items-center justify-center leading-none">{children}</span>
      {!loading && rightIcon && <span className="inline-flex items-center justify-center shrink-0">{rightIcon}</span>}
    </button>
  )
}