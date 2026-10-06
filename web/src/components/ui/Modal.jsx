
'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
}

const emptySubscribe = () => () => {}

export default function Modal({
  isOpen,
  open,
  onClose,
  title,
  children,
  actions,
  size = 'md',
}) {
  const isVisible = open ?? isOpen
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false)

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    if (isVisible) {
      document.addEventListener('keydown', onKeyDown)
    }

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isVisible, onClose])

  if (!isVisible || !isClient) return null

  const modalContent = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <button
        aria-label="Close modal"
        className="absolute inset-0 cursor-default bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-[1001] w-full overflow-hidden rounded-2xl border border-[#DCCDA9] bg-white shadow-lift',
          sizeMap[size] || sizeMap.md
        )}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-2">
            <div>
              {title && <h3 className="text-lg font-black tracking-tight text-[#1F1B10]">{title}</h3>}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#DCCDA9]/60 text-[#7C6B44] hover:bg-[#F6F2E7] hover:text-[#1F1B10] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        <div className="px-6 py-4">{children}</div>

        {actions && (
          <div className="flex flex-wrap items-center justify-end gap-3 px-6 pb-6 pt-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}