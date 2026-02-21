"use client"

import { useEffect } from "react"
import { X, Check, BellOff, Calendar, Users, AlertTriangle, ArrowRightLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications } from "@/hooks/useNotifications"
import { useNotificationStore } from "@/store/notificationStore"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

const notificationIcons: Record<string, React.ReactNode> = {
  SHIFT_ASSIGNED: <Calendar className="h-4 w-4" />,
  SHIFT_CHANGED: <Calendar className="h-4 w-4" />,
  SHIFT_CANCELLED: <Calendar className="h-4 w-4" />,
  SCHEDULE_PUBLISHED: <Calendar className="h-4 w-4" />,
  SCHEDULE_UNPUBLISHED: <Calendar className="h-4 w-4" />,
  SWAP_REQUESTED: <ArrowRightLeft className="h-4 w-4" />,
  SWAP_ACCEPTED: <ArrowRightLeft className="h-4 w-4" />,
  SWAP_APPROVED: <ArrowRightLeft className="h-4 w-4" />,
  SWAP_CANCELLED: <ArrowRightLeft className="h-4 w-4" />,
  SWAP_EXPIRED: <ArrowRightLeft className="h-4 w-4" />,
  DROP_AVAILABLE: <Users className="h-4 w-4" />,
  DROP_CLAIMED: <Users className="h-4 w-4" />,
  OVERTIME_WARNING: <AlertTriangle className="h-4 w-4" />,
  AVAILABILITY_CHANGED: <Calendar className="h-4 w-4" />,
}

const notificationColors: Record<string, string> = {
  SHIFT_ASSIGNED: "bg-blue-500",
  SHIFT_CHANGED: "bg-yellow-500",
  SHIFT_CANCELLED: "bg-red-500",
  SCHEDULE_PUBLISHED: "bg-green-500",
  SCHEDULE_UNPUBLISHED: "bg-yellow-500",
  SWAP_REQUESTED: "bg-purple-500",
  SWAP_ACCEPTED: "bg-blue-500",
  SWAP_APPROVED: "bg-green-500",
  SWAP_CANCELLED: "bg-red-500",
  SWAP_EXPIRED: "bg-gray-500",
  DROP_AVAILABLE: "bg-orange-500",
  DROP_CLAIMED: "bg-blue-500",
  OVERTIME_WARNING: "bg-red-500",
  AVAILABILITY_CHANGED: "bg-blue-500",
}

export function NotificationCenter() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications()
  const { isPanelOpen, closePanel } = useNotificationStore()

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest("[data-notification-center]")) {
        closePanel()
      }
    }

    if (isPanelOpen) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [isPanelOpen, closePanel])

  if (!isPanelOpen) return null

  return (
    <Card
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-50 shadow-lg"
      data-notification-center
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Notifications
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {unreadCount} new
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={closePanel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <BellOff className="h-8 w-8 mb-2" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                    !notification.isRead && "bg-muted/30"
                  )}
                  onClick={() => {
                    if (!notification.isRead) {
                      markAsRead([notification.id])
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-full text-white",
                        notificationColors[notification.type] || "bg-gray-500"
                      )}
                    >
                      {notificationIcons[notification.type] || <BellOff className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{notification.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
