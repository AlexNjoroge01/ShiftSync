"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Clock } from "lucide-react"

interface EditDesiredHoursModalProps {
  currentHours?: number | null
}

export function EditDesiredHoursModal({ currentHours }: EditDesiredHoursModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [hours, setHours] = useState<string>(currentHours?.toString() || "")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const hoursValue = parseFloat(hours)
    if (isNaN(hoursValue) || hoursValue < 0 || hoursValue > 60) {
      toast.error("Please enter a valid number between 0 and 60")
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch("/api/users/me/desired-hours", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ desiredHoursPerWeek: hoursValue }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update desired hours")
      }

      toast.success("Desired hours updated successfully")
      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Error updating desired hours:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update desired hours")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-slate-200 text-slate-700">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Edit Desired Hours</DialogTitle>
          <DialogDescription className="text-slate-500">
            Set how many hours per week you would like to work.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="hours" className="text-slate-700">
                Hours per week
              </Label>
              <div className="relative">
                <Input
                  id="hours"
                  type="number"
                  step="0.5"
                  min="0"
                  max="60"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="e.g., 20"
                  className="pr-16 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-slate-400 text-sm">hrs/week</span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                This helps managers schedule you appropriately. Maximum 60 hours.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-slate-200 text-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
