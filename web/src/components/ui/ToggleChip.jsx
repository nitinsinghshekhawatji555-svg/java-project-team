import { cn } from '@/lib/utils'

export default function ToggleChip({
  label,
  checked,
  onChange,
  disabled = false,
  readOnly = false,
  className,
  icon,
  ...props
}) {
  const isInteractive = !disabled && !readOnly

  let stateClasses = ''

  if (!isInteractive) {
    // Locked / Read-Only / Disabled state
    if (checked) {
      // Locked + Active: soft cream/gold tint background, dark neutral readable text
      stateClasses = 'bg-[#EAE0C7] text-[#433C2B] border-[#C8BC9E] cursor-default'
    } else {
      // Locked + Inactive: soft slate/neutral background, muted but readable gray text
      stateClasses = 'bg-[#F1F5F9]/60 text-[#475569] border-[#E2E8F0] cursor-default'
    }
  } else {
    // Editable interactive states
    if (checked) {
      // Editable + Active: brand gold background, dark ink text, hover state
      stateClasses = 'bg-primary text-slate-900 border-primary hover:bg-primary-dark cursor-pointer shadow-xs active:scale-95'
    } else {
      // Editable + Inactive: outlined cream border, transparent bg, dark clickable text, hover tint
      stateClasses = 'bg-transparent text-[#433C2B] border-border hover:bg-primary/5 cursor-pointer active:scale-95'
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || readOnly}
      onClick={isInteractive ? onChange : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all select-none outline-none',
        stateClasses,
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </button>
  )
}
