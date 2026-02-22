"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useRealtime } from "@/hooks/useRealtime"
import { useNotifications } from "@/hooks/useNotifications"
import { toast } from "sonner"

interface StaffDashboardClientProps {
  children: React.ReactNode
}

/**
 * Client component wrapper for staff dashboard that handles real-time updates
 */
export function StaffDashboardClient({ children }: StaffDashboardClientProps) {
  const router = useRouter()
  const { refetch: refetchNotifications } = useNotifications()

  useRealtime({
    onSchedulePublished: (payload) => {
      toast.success("Schedule Published", {
        description: "Your schedule has been updated. Refreshing...",
      })
      router.refresh()
      refetchNotifications()
    },
    onAssignmentNew: (payload) => {
      const shiftDetails = payload.shiftDetails as {
        locationName: string
        date: string
      } | undefined
      
      toast.success("New Shift Assignment", {
        description: shiftDetails 
          ? `You've been assigned to a shift at ${shiftDetails.locationName}`
          : "You've been assigned to a new shift",
      })
      router.refresh()
      refetchNotifications()
    },
    onSwapUpdated: (payload) => {
      toast.info("Swap Request Updated", {
        description: `Your swap request status: ${payload.status}`,
      })
      router.refresh()
      refetchNotifications()
    },
  })

  return <>{children}</>
}
