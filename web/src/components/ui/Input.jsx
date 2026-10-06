import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Eye, EyeOff } from 'lucide-react'

export default function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  className,
  id,
  type,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPasswordType = type === 'password'
  const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : type

  const inputId = id || props.name || label?.toLowerCase().replace(/\s+/g, '-')
  const describedBy = [error ? `${inputId}-error` : null, hint ? `${inputId}-hint` : null]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          type={inputType}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted shadow-sm transition focus-ring',
            leftIcon && 'pl-11',
            (rightIcon || isPasswordType) && 'pr-11',
            error && 'border-danger/50 ring-1 ring-danger/20',
            className
          )}
          {...props}
        />
        {isPasswordType ? (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-4 flex items-center text-muted hover:text-foreground focus:outline-none cursor-pointer z-10"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        ) : (
          rightIcon && (
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted">
              {rightIcon}
            </span>
          )
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}