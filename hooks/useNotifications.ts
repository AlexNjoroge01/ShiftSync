"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

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

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

/**
 * Hook for managing notifications
 */
export function useNotifications(options?: { unreadOnly?: boolean; limit?: number }) {
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery<NotificationsResponse>({
    queryKey: ["notifications", options?.unreadOnly, options?.limit],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (options?.unreadOnly) params.set("unreadOnly", "true")
      if (options?.limit) params.set("limit", options.limit.toString())

      const response = await fetch(`/api/notifications?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch notifications")
      return response.json()
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  })

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds }),
      })
      if (!response.ok) throw new Error("Failed to mark notifications as read")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
    onError: (error) => {
      toast.error("Failed to mark notifications as read")
      console.error(error)
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      })
      if (!response.ok) throw new Error("Failed to mark all notifications as read")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      toast.success("All notifications marked as read")
    },
    onError: (error) => {
      toast.error("Failed to mark all notifications as read")
      console.error(error)
    },
  })

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  }
}
