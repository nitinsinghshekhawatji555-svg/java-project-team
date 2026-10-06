import { cn } from '@/lib/utils'

const variantMap = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  muted: 'bg-slate-50 text-slate-500 border-slate-200',
  primary: 'bg-primary/12 text-primary border-primary/20',
  success: 'bg-success/12 text-success border-success/20',
  warning: 'bg-warning/12 text-warning border-warning/20',
  danger: 'bg-danger/12 text-danger border-danger/20',
  pending: 'bg-warning/12 text-warning border-warning/20',
  accepted: 'bg-sky-500/12 text-sky-700 border-sky-500/20',
  en_route: 'bg-indigo-500/12 text-indigo-700 border-indigo-500/20',
  arrived: 'bg-cyan-500/12 text-cyan-700 border-cyan-500/20',
  in_progress: 'bg-primary/12 text-primary border-primary/20',
  completed: 'bg-success/12 text-success border-success/20',
  cancelled: 'bg-danger/12 text-danger border-danger/20',
  verified: 'bg-success/12 text-success border-success/20',
  rejected: 'bg-danger/12 text-danger border-danger/20',
  driver: 'bg-primary/12 text-primary border-primary/20',
  mechanic: 'bg-sky-500/12 text-sky-700 border-sky-500/20',
  admin: 'bg-slate-900/10 text-slate-800 border-slate-300',
  low: 'bg-emerald-500/12 text-emerald-700 border-emerald-500/20',
  medium: 'bg-warning/12 text-warning border-warning/20',
  high: 'bg-orange-500/12 text-orange-700 border-orange-500/20',
  critical: 'bg-danger/12 text-danger border-danger/20',
}

export default function Badge({
  children,
  label,
  variant = 'default',
  dot = false,
  icon,
  className,
}) {
  const content = label ?? children

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wider leading-none select-none shrink-0',
        variantMap[variant] || variantMap.default,
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />}
      {icon && <span className="inline-flex items-center justify-center shrink-0">{icon}</span>}
      <span className="normal-case tracking-normal inline-flex items-center">{content}</span>
    </span>
  )
}