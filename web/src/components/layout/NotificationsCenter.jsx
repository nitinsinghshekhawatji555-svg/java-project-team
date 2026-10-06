'use client'

import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Bell, Clock3, Filter, Inbox, RotateCcw } from 'lucide-react'
import { timeAgo, truncate } from '@/lib/utils'

export default function NotificationsCenter({ title, subtitle }) {
  const { profile } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(profile?.id)

  const pending = notifications.filter((item) => !item.is_read).length

  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] bg-slate-950 px-4 py-5 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">{title}</p>
            <h1 className="mt-1 text-2xl font-black">{subtitle || 'Manage and monitor all background updates and critical alerts.'}</h1>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-amber-300">
            <Bell size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">System Alerts</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{pending}</p>
          <p className="mt-1 text-xs text-slate-500">Active</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Unread</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{unreadCount}</p>
          <p className="mt-1 text-xs text-slate-500">Live feed</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Updates</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{notifications.length}</p>
          <p className="mt-1 text-xs text-slate-500">Total</p>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm">
          <Filter size={16} /> Filter
        </button>
        <Button variant="outline" size="sm" onClick={markAllAsRead} leftIcon={<RotateCcw size={16} />}>
          Mark all as read
        </Button>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card className="py-10 text-center text-sm text-slate-500">
            <Inbox className="mx-auto mb-3 text-slate-400" size={20} />
            No notifications yet.
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card key={notification.id} className={`p-4 ${notification.is_read ? 'opacity-80' : 'border-amber-200 bg-amber-50/40'}`} onClick={() => markAsRead(notification.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{notification.title || 'Dispatch update'}</p>
                    <Badge label={notification.type} variant={notification.type} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{truncate(notification.message, 120)}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Clock3 size={14} /> {timeAgo(notification.created_at)}
                  </div>
                </div>
                <div className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.is_read ? 'bg-slate-300' : 'bg-amber-400'}`} />
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}