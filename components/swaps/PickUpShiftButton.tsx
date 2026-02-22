"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, CalendarPlus } from "lucide-react"
import { toast } from "sonner"

interface PickUpShiftButtonProps {
  shiftId: string
}

export function PickUpShiftButton({ shiftId }: PickUpShiftButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handlePickUp = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch("/api/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "DROP",
          shiftAssignmentId: null,
          shiftId: shiftId,
          action: "PICKUP",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to pick up shift")
      }

      toast.success("Shift picked up successfully! Waiting for manager approval.")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to pick up shift")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      className="bg-green-600 hover:bg-green-700 text-white"
      onClick={handlePickUp}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <CalendarPlus className="h-4 w-4 mr-2" />
      )}
      Pick Up
    </Button>
  )
}
