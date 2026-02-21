import { create } from "zustand"

interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  isRead: boolean
  meta: Record<string, unknown> | null
  createdAt: string
}

interface NotificationState {
  // Notifications list
  notifications: Notification[]
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void

  // Unread count
  unreadCount: number
  setUnreadCount: (count: number) => void
  decrementUnreadCount: () => void

  // Notification panel state
  isPanelOpen: boolean
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void

  // Toast notifications (ephemeral)
  toasts: Array<{
    id: string
    type: "info" | "success" | "warning" | "error"
    title: string
    message?: string
    duration?: number
  }>
  addToast: (toast: Omit<NotificationState["toasts"][0], "id">) => void
  removeToast: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  setNotifications: (notifications) => set({ notifications, unreadCount: notifications.filter((n) => !n.isRead).length }),
  addNotification: (notification) =>
    set((state) => {
      const newNotifications = [notification, ...state.notifications]
      const newUnreadCount = notification.isRead ? state.unreadCount : state.unreadCount + 1
      return { notifications: newNotifications, unreadCount: newUnreadCount }
    }),
  removeNotification: (id) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id)
      const newUnreadCount = notification && !notification.isRead ? state.unreadCount - 1 : state.unreadCount
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: Math.max(0, newUnreadCount),
      }
    }),
  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),

  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  decrementUnreadCount: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),

  isPanelOpen: false,
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))
