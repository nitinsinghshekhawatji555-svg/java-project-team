'use client'

import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { createClient } from '@/lib/supabase/client'
import { timeAgo, truncate } from '@/lib/utils'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

export default function Notifications() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const { profile } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead, getNotificationHref } = useNotifications(profile?.id)
  const supabase = createClient()

  useEffect(() => {
    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((prev) => !prev)}>
        Notifications
        {unreadCount > 0 && <span className="ml-2 rounded-full bg-danger px-2 py-0.5 text-[10px] text-white">{unreadCount}</span>}
      </Button>

      {open && (
        <div className="absolute right-0 mt-3 w-[min(92vw,24rem)] overflow-hidden rounded-3xl border border-border bg-white shadow-lift">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted">Realtime events</p>
            </div>
            {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs font-semibold text-primary">Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted">No notifications yet</div>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={getNotificationHref(notification, profile?.role) || '#'}
                  aria-disabled={!getNotificationHref(notification, profile?.role)}
                  onClick={async (event) => {
                    const href = getNotificationHref(notification, profile?.role)
                    if (!href) {
                      event.preventDefault()
                    }
                    await markAsRead(notification.id)
                    setOpen(false)
                  }}
                  className={`block w-full border-b border-border px-4 py-3 text-left transition hover:bg-surfaceAlt ${notification.is_read ? 'opacity-70' : 'bg-primary/5'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{notification.title || 'Update'}</p>
                        <Badge label={notification.type} variant={notification.type} />
                      </div>
                      <p className="mt-1 text-sm text-muted">{truncate(notification.message, 110)}</p>
                      <p className="mt-2 text-[11px] text-muted">{timeAgo(notification.created_at)}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
