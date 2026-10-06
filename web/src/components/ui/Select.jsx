import { cn } from '@/lib/utils'

export default function Select({
  label,
  error,
  hint,
  options = [],
  className = '',
  id,
  ...props
}) {
  const selectId = id || props.name || label?.toLowerCase().replace(/\s+/g, '-')
  const describedBy = [error ? `${selectId}-error` : null, hint ? `${selectId}-hint` : null]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <select
        id={selectId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn(
          'w-full appearance-none rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground shadow-sm transition focus-ring cursor-pointer',
          error && 'border-danger/50 ring-1 ring-danger/20',
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${selectId}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}