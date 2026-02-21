"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Send, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface PublishWeekButtonProps {
  shiftIds: string[]
  locationId: string
  weekStart: string
}

export function PublishWeekButton({ shiftIds, locationId, weekStart }: PublishWeekButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handlePublish = async () => {
    if (shiftIds.length === 0) {
      toast.error("No shifts to publish")
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch("/api/shifts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftIds,
          locationId,
          weekStart,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to publish shifts")
      }

      toast.success(`${data.publishedCount} shifts published successfully`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish shifts")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      className="bg-green-600 hover:bg-green-700 text-white rounded-full px-5"
      onClick={handlePublish}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Send className="h-4 w-4 mr-2" />
      )}
      Publish Week
    </Button>
  )
}
