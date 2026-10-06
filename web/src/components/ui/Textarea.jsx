import { cn } from '@/lib/utils'

export default function Textarea({
  label,
  error,
  hint,
  className,
  id,
  ...props
}) {
  const textareaId = id || props.name || label?.toLowerCase().replace(/\s+/g, '-')
  const describedBy = [error ? `${textareaId}-error` : null, hint ? `${textareaId}-hint` : null]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn(
          'min-h-30 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground shadow-sm transition placeholder:text-muted focus-ring resize-none',
          error && 'border-danger/50 ring-1 ring-danger/20',
          className
        )}
        {...props}
      />
      {error && (
        <p id={`${textareaId}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${textareaId}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}