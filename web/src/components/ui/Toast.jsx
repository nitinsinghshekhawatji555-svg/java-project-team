'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { Check, X, Info, AlertTriangle } from 'lucide-react'

import { cn } from '@/lib/utils'

const ToastContext = createContext(null)

const iconMap = {
  success: Check,
  error: X,
  info: Info,
  warning: AlertTriangle,
}

const iconBadgeStyle = {
  success: 'bg-emerald-100 text-emerald-600',
  error: 'bg-rose-100 text-rose-600',
  info: 'bg-amber-100 text-amber-700',
  warning: 'bg-amber-100 text-amber-700',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback(({ message, type = 'info', duration = 4000, id: customId }) => {
    const id = customId || Date.now() + Math.random()
    setToasts((prev) => {
      // If toast with this id already exists, update its message and type rather than appending a duplicate
      const exists = prev.some((t) => t.id === id)
      if (exists) {
        return prev.map((t) => (t.id === id ? { id, message, type } : t))
      }
      return [...prev, { id, message, type }]
    })

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((current) => current.id !== id))
    }, duration)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        style={{ top: '1rem', right: '1rem', position: 'fixed', zIndex: 99999 }}
        className="flex w-[min(92vw,24rem)] flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toastItem) => {
          const IconComponent = iconMap[toastItem.type] || iconMap.info
          const badgeClass = iconBadgeStyle[toastItem.type] || iconBadgeStyle.info

          return (
            <div
              key={toastItem.id}
              style={{
                backgroundColor: '#ffffff',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              }}
              className={cn(
                'pointer-events-auto flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 animate-slide-up text-[#0f172a]'
              )}
            >
              <span className={cn('flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black shrink-0', badgeClass)}>
                <IconComponent size={15} strokeWidth={2.5} />
              </span>
              <p className="text-xs font-bold leading-relaxed text-[#0f172a]">
                {toastItem.message}
              </p>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider')
  }

  return context
}