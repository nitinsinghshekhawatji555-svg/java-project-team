// web/src/stores/useNotificationStore.js
// Centralized notification store: single owner of `notifications-${userId}` realtime channel.

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { NOTIFICATION_TYPE, USER_ROLE } from '@/lib/constants'

export const MAX_NOTIFICATIONS_CAP = 3

function parseRequestIdFromBody(body) {
  if (!body) return null
  const match = body.match(/\[req_id:\s*([a-f0-9-]{36})\]/i)
  return match ? match[1] : null
}

function cleanNotificationMessage(message) {
  if (!message) return ''
  return message.replace(/\[req_id:\s*[a-f0-9-]{36}\]/i, '').trim()
}

export function getNotificationHref(notification, role) {
  if (!notification) return null

  const requestId = notification.request_id || parseRequestIdFromBody(notification.body || notification.message)
  const userRole = role || USER_ROLE.DRIVER

  switch (notification.type) {
    case NOTIFICATION_TYPE.CHAT:
      return requestId
        ? userRole === USER_ROLE.MECHANIC
          ? `/dashboard/mechanic/job/${requestId}`
          : `/dashboard/driver/request/${requestId}`
        : null
    case NOTIFICATION_TYPE.NEW_REQUEST:
      return requestId && userRole === USER_ROLE.MECHANIC ? `/dashboard/mechanic/job/${requestId}` : null
    case NOTIFICATION_TYPE.MECHANIC_ACCEPTED:
    case NOTIFICATION_TYPE.MECHANIC_EN_ROUTE:
    case NOTIFICATION_TYPE.MECHANIC_ARRIVED:
    case NOTIFICATION_TYPE.JOB_COMPLETED:
    case NOTIFICATION_TYPE.REQUEST_CANCELLED:
      return requestId
        ? userRole === USER_ROLE.MECHANIC
          ? `/dashboard/mechanic/job/${requestId}`
          : `/dashboard/driver/request/${requestId}`
        : null
    default:
      return requestId
        ? userRole === USER_ROLE.MECHANIC
          ? `/dashboard/mechanic/job/${requestId}`
          : `/dashboard/driver/request/${requestId}`
        : null
  }
}

let activeChannel = null
let reconnectTimeoutId = null
let reconnectDelayMs = 1000
let listenersAttached = false

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  rawNotifications: [],
  unreadCount: 0,
  userId: null,
  isInitialized: false,

  fetchNotifications: async () => {
    const { userId } = get()
    if (!userId) return

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      if (data) {
        const mapped = data.map((n) => ({
          ...n,
          message: cleanNotificationMessage(n.body),
        }))
        set({
          rawNotifications: mapped,
          notifications: mapped.slice(0, MAX_NOTIFICATIONS_CAP),
          unreadCount: mapped.length,
        })
      }
    } catch (err) {
      console.warn('[useNotificationStore] fetchNotifications error:', err.message)
    }
  },

  initialize: (userId) => {
    if (!userId) return

    const currentUserId = get().userId
    if (currentUserId === userId && get().isInitialized) {
      return
    }

    // Clean up previous channel if user changed
    if (activeChannel) {
      try {
        const supabase = createClient()
        supabase.removeChannel(activeChannel)
      } catch (e) {
        // ignore
      }
      activeChannel = null
    }

    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId)
      reconnectTimeoutId = null
    }

    set({ userId, isInitialized: true })
    get().fetchNotifications()

    const setupSubscription = () => {
      const supabase = createClient()
      const channel = supabase.channel(`notifications-${userId}`)

      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `profile_id=eq.${userId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newNotification = payload.new
              if (!newNotification.is_read) {
                const mapped = {
                  ...newNotification,
                  message: cleanNotificationMessage(newNotification.body),
                }
                const prevRaw = get().rawNotifications
                const updated = [mapped, ...prevRaw.filter((n) => n.id !== mapped.id)]
                set({
                  rawNotifications: updated,
                  notifications: updated.slice(0, MAX_NOTIFICATIONS_CAP),
                  unreadCount: updated.length,
                })
              }
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new
              if (updated.is_read) {
                const prevRaw = get().rawNotifications.filter((n) => n.id !== updated.id)
                set({
                  rawNotifications: prevRaw,
                  notifications: prevRaw.slice(0, MAX_NOTIFICATIONS_CAP),
                  unreadCount: Math.max(0, prevRaw.length),
                })
              } else {
                const mapped = {
                  ...updated,
                  message: cleanNotificationMessage(updated.body),
                }
                const prevRaw = get().rawNotifications.map((n) => (n.id === mapped.id ? mapped : n))
                set({
                  rawNotifications: prevRaw,
                  notifications: prevRaw.slice(0, MAX_NOTIFICATIONS_CAP),
                })
              }
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old?.id
              if (deletedId) {
                const prevRaw = get().rawNotifications.filter((n) => n.id !== deletedId)
                set({
                  rawNotifications: prevRaw,
                  notifications: prevRaw.slice(0, MAX_NOTIFICATIONS_CAP),
                  unreadCount: Math.max(0, prevRaw.length),
                })
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            reconnectDelayMs = 1000 // Reset backoff on success
          } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
            console.warn(`[useNotificationStore] Channel status: ${status}. Reconnecting in ${reconnectDelayMs}ms...`)
            if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId)
            reconnectTimeoutId = setTimeout(() => {
              get().fetchNotifications()
              if (activeChannel) {
                try {
                  supabase.removeChannel(activeChannel)
                } catch (e) {}
                activeChannel = null
              }
              setupSubscription()
              reconnectDelayMs = Math.min(reconnectDelayMs * 2, 16000)
            }, reconnectDelayMs)
          }
        })

      activeChannel = channel
    }

    setupSubscription()

    // Global visibilitychange & online event listeners (attached once)
    if (typeof window !== 'undefined' && !listenersAttached) {
      listenersAttached = true

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          get().fetchNotifications()
        }
      })

      window.addEventListener('online', () => {
        get().fetchNotifications()
      })
    }
  },

  markAsRead: async (notificationId) => {
    if (!notificationId) return

    const prevRaw = get().rawNotifications.filter((n) => n.id !== notificationId)
    set({
      rawNotifications: prevRaw,
      notifications: prevRaw.slice(0, MAX_NOTIFICATIONS_CAP),
      unreadCount: Math.max(0, prevRaw.length),
    })

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) throw error
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
      get().fetchNotifications()
    }
  },

  markAllAsRead: async () => {
    const { userId } = get()
    if (!userId) return

    set({
      notifications: [],
      rawNotifications: [],
      unreadCount: 0,
    })

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('profile_id', userId)
        .eq('is_read', false)

      if (error) throw error
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
      get().fetchNotifications()
    }
  },

  markJobNotificationsAsRead: async (requestId, type = null) => {
    const { userId, rawNotifications } = get()
    if (!userId || !requestId) return

    const remaining = rawNotifications.filter((n) => {
      const nReqId = n.request_id || parseRequestIdFromBody(n.body || n.message)
      const matchesReq = nReqId === requestId
      const matchesType = type ? n.type === type : true
      return !(matchesReq && matchesType)
    })

    set({
      rawNotifications: remaining,
      notifications: remaining.slice(0, MAX_NOTIFICATIONS_CAP),
      unreadCount: remaining.length,
    })

    try {
      const supabase = createClient()
      let query = supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('profile_id', userId)
        .eq('is_read', false)

      if (requestId) {
        query = query.eq('request_id', requestId)
      }
      if (type) {
        query = query.eq('type', type)
      }

      const { error } = await query
      if (error) throw error
    } catch (err) {
      console.error('Failed to mark job notifications as read:', err)
    }
  },
}))
