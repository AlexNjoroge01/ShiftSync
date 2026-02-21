"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function AddExceptionModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Form state
  const [date, setDate] = useState("")
  const [isUnavailable, setIsUnavailable] = useState(true)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")

  const resetForm = () => {
    setDate("")
    setIsUnavailable(true)
    setStartTime("")
    setEndTime("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!date) {
      toast.error("Please select a date")
      return
    }

    if (!isUnavailable && (!startTime || !endTime)) {
      toast.error("Please specify available hours")
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "exception",
          data: {
            date,
            isUnavailable,
            startTime: isUnavailable ? null : startTime,
            endTime: isUnavailable ? null : endTime,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add exception")
      }

      toast.success("Exception added successfully")
      setOpen(false)
      resetForm()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add exception")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 hover:bg-slate-800 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Exception
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Availability Exception</DialogTitle>
          <DialogDescription>
            Mark a specific date when you're unavailable or have modified availability.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Unavailable Toggle */}
          <div className="space-y-2">
            <Label>Availability Status</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={isUnavailable ? "default" : "outline"}
                onClick={() => setIsUnavailable(true)}
                className={isUnavailable ? "bg-red-500 hover:bg-red-600" : ""}
              >
                Fully Unavailable
              </Button>
              <Button
                type="button"
                variant={!isUnavailable ? "default" : "outline"}
                onClick={() => setIsUnavailable(false)}
                className={!isUnavailable ? "bg-green-500 hover:bg-green-600" : ""}
              >
                Partially Available
              </Button>
            </div>
          </div>

          {/* Time Range (only if partially available) */}
          {!isUnavailable && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Available From *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Available Until *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
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
              Add Exception
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}