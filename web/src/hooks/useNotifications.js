// web/src/hooks/useNotifications.js
// Centralized notification hook delegating to useNotificationStore.

import { useEffect } from 'react'
import {
  useNotificationStore,
  getNotificationHref,
  MAX_NOTIFICATIONS_CAP,
} from '@/stores/useNotificationStore'

export { getNotificationHref, MAX_NOTIFICATIONS_CAP }

export function useNotifications(userId) {
  const notifications = useNotificationStore((state) => state.notifications)
  const rawNotifications = useNotificationStore((state) => state.rawNotifications)
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const initialize = useNotificationStore((state) => state.initialize)
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications)
  const markAsRead = useNotificationStore((state) => state.markAsRead)
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead)
  const markJobNotificationsAsRead = useNotificationStore((state) => state.markJobNotificationsAsRead)

  useEffect(() => {
    if (userId) {
      initialize(userId)
    }
  }, [userId, initialize])

  return {
    notifications,
    rawNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    markJobNotificationsAsRead,
    getNotificationHref,
    refetch: fetchNotifications,
  }
}
