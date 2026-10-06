'use client'

import { cn } from '@/lib/utils'

const steps = [
  { key: 'pending', label: 'Requested' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'en_route', label: 'En route' },
  { key: 'arrived', label: 'On site' },
  { key: 'in_progress', label: 'Working' },
  { key: 'completed', label: 'Completed' },
]

const order = {
  pending: 0,
  accepted: 1,
  en_route: 2,
  arrived: 3,
  in_progress: 4,
  completed: 5,
  cancelled: -1,
}

export default function RequestTimeline({ status, currentStatus }) {
  const activeStatus = currentStatus || status || 'pending'

  if (activeStatus === 'cancelled') {
    return <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">Request cancelled</div>
  }

  const current = order[activeStatus] ?? 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 md:hidden">
        {steps.map((step, idx) => {
          const done = idx <= current
          const active = idx === current

          return (
            <div key={step.key} className="min-w-[92px] rounded-2xl border border-border bg-white px-3 py-3 text-center shadow-soft">
              <div className={cn('mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold', done ? 'bg-primary text-white' : 'bg-surfaceAlt text-muted', active && 'ring-4 ring-primary/10')}>
                {idx + 1}
              </div>
              <p className={cn('mt-2 text-[11px] font-semibold leading-tight', done ? 'text-foreground' : 'text-muted')}>
                {step.label}
              </p>
            </div>
          )
        })}
      </div>

      <div className="hidden gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-6">
        {steps.map((step, idx) => {
          const done = idx <= current
          const active = idx === current

          return (
            <div key={step.key} className="rounded-2xl border border-border bg-white p-3">
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold', done ? 'bg-primary text-white' : 'bg-surfaceAlt text-muted', active && 'ring-4 ring-primary/10')}>
                {idx + 1}
              </div>
              <p className={cn('mt-3 text-sm font-semibold', done ? 'text-foreground' : 'text-muted')}>
                {step.label}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted">
                {done ? 'Live update received' : 'Pending'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
