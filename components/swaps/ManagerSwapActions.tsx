"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ManagerSwapActionsProps {
  swapRequestId: string
  status: string
  type: "SWAP" | "DROP"
}

export function ManagerSwapActions({ swapRequestId, status, type }: ManagerSwapActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleAction = async (action: "APPROVE" | "REJECT") => {
    setIsLoading(true)
    
    try {
      const response = await fetch("/api/swaps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          swapRequestId,
          action,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action.toLowerCase()} request`)
      }

      toast.success(`Request ${action.toLowerCase()}d successfully`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action.toLowerCase()} request`)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === "STAFF_ACCEPTED") {
    return (
      <div className="flex gap-2">
        <Button
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => handleAction("APPROVE")}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
          Approve
        </Button>
        <Button
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
          onClick={() => handleAction("REJECT")}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
          Reject
        </Button>
      </div>
    )
  }

  if (status === "PENDING" && type === "DROP") {
    return (
      <Button variant="outline" className="border-slate-200 text-slate-700" disabled>
        Awaiting Staff Claim
      </Button>
    )
  }

  return null
}
