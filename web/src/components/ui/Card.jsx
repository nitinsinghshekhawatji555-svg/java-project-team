import { cn } from '@/lib/utils'

export default function Card({
  children,
  className,
  onClick,
  variant = 'default',
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'w-full max-w-full min-w-0 box-border rounded-2xl border border-[#DCCDA9]/70 bg-white p-4 shadow-sm transition',
        variant === 'raised' && 'shadow-md border-[#DCCDA9]',
        variant === 'soft' && 'bg-[#FAF6EC] border-[#E8DFC6]',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-[#CDBD97] focus-ring',
        className
      )}
    >
      {children}
    </div>
  )
}