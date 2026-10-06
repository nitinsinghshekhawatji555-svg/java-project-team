
import { cn } from '@/lib/utils'

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
}

export default function Spinner({ size = 'md', className }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent text-primary',
        sizeMap[size] || sizeMap.md,
        className
      )}
    />
  )
}