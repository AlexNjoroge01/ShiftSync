"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ShiftAssignment {
  id: string
  shift: {
    id: string
    date: Date
    startTimeUtc: Date
    endTimeUtc: Date
    location: {
      id: string
      name: string
      timezone: string
    }
  }
}

interface CreateSwapRequestModalProps {
  assignments: ShiftAssignment[]
}

export function CreateSwapRequestModal({ assignments }: CreateSwapRequestModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [requestType, setRequestType] = useState<"SWAP" | "DROP">("DROP")
  const [assignmentId, setAssignmentId] = useState("")
  const [targetUserId, setTargetUserId] = useState("")

  const resetForm = () => {
    setRequestType("DROP")
    setAssignmentId("")
    setTargetUserId("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!assignmentId) {
      toast.error("Please select a shift")
      return
    }

    if (requestType === "SWAP" && !targetUserId) {
      toast.error("Please select a staff member to swap with")
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch("/api/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: requestType,
          shiftAssignmentId: assignmentId,
          targetUserId: requestType === "SWAP" ? targetUserId : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create request")
      }

      toast.success(requestType === "SWAP" ? "Swap request created" : "Drop request created")
      setOpen(false)
      resetForm()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create request")
    } finally {
      setIsLoading(false)
    }
  }

  const formatShiftDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const formatShiftTime = (start: Date, end: Date, timezone: string) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    })
    return `${formatter.format(start)} - ${formatter.format(end)}`
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 hover:bg-slate-800 text-white">
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Swap/Drop Request</DialogTitle>
          <DialogDescription>
            Request to swap your shift with another staff member or drop it entirely.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Request Type */}
          <div className="space-y-2">
            <Label>Request Type</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={requestType === "DROP" ? "default" : "outline"}
                onClick={() => setRequestType("DROP")}
                className={requestType === "DROP" ? "bg-cyan-600 hover:bg-cyan-700" : ""}
              >
                Drop Shift
              </Button>
              <Button
                type="button"
                variant={requestType === "SWAP" ? "default" : "outline"}
                onClick={() => setRequestType("SWAP")}
                className={requestType === "SWAP" ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                Swap Shift
              </Button>
            </div>
          </div>

          {/* Shift Selection */}
          <div className="space-y-2">
            <Label htmlFor="shift">Select Your Shift *</Label>
            <Select value={assignmentId} onValueChange={setAssignmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a shift" />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((assignment) => (
                  <SelectItem key={assignment.id} value={assignment.id}>
                    {assignment.shift.location.name} - {formatShiftDate(assignment.shift.date)} ({formatShiftTime(assignment.shift.startTimeUtc, assignment.shift.endTimeUtc, assignment.shift.location.timezone)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target User (for SWAP) */}
          {requestType === "SWAP" && (
            <div className="space-y-2">
              <Label htmlFor="targetUser">Swap With (Optional)</Label>
              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {/* This would be populated with available staff */}
                  <SelectItem value="any">Any available staff</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Leave empty to let any qualified staff member accept.
              </p>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
