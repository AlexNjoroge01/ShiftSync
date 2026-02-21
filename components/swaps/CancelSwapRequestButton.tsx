"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { X, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface CancelSwapRequestButtonProps {
  swapRequestId: string
}

export function CancelSwapRequestButton({ swapRequestId }: CancelSwapRequestButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleCancel = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch("/api/swaps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          swapRequestId,
          action: "CANCEL",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel request")
      }

      toast.success("Request cancelled")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel request")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-slate-400 hover:text-red-500"
      onClick={handleCancel}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <X className="h-4 w-4" />
      )}
    </Button>
  )
}
