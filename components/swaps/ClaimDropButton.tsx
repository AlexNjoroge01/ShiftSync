"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ClaimDropButtonProps {
  swapRequestId: string
}

export function ClaimDropButton({ swapRequestId }: ClaimDropButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleClaim = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch("/api/swaps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          swapRequestId,
          action: "CLAIM",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to claim shift")
      }

      toast.success("Shift claimed successfully! Waiting for manager approval.")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to claim shift")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      className="bg-cyan-600 hover:bg-cyan-700 text-white"
      onClick={handleClaim}
      disabled={isLoading}
    >
      {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      Claim
    </Button>
  )
}
