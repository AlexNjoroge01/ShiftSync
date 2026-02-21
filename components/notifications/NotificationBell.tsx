"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/hooks/useNotifications"
import { useNotificationStore } from "@/store/notificationStore"

export function NotificationBell() {
  const { unreadCount } = useNotifications({ limit: 10 })
  const { isPanelOpen, togglePanel } = useNotificationStore()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={togglePanel}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
      <span className="sr-only">Toggle notifications</span>
    </Button>
  )
}
