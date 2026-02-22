"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Shift {
  id: string
  date: Date
  startTimeUtc: Date
  endTimeUtc: Date
  headcount: number
  requiredSkillId: string | null
  isPublished: boolean
  location: {
    id: string
    name: string
    timezone: string
  }
}

interface Skill {
  id: string
  name: string
}

interface EditShiftModalProps {
  shift: Shift
  skills: Skill[]
}

export function EditShiftModal({ shift, skills }: EditShiftModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Format dates for form inputs
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: shift.location.timezone,
    }).format(date)
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: shift.location.timezone,
    }).format(date)
  }
  
  // Form state
  const [date, setDate] = useState(formatDate(new Date(shift.date)))
  const [startTime, setStartTime] = useState(formatTime(new Date(shift.startTimeUtc)))
  const [endTime, setEndTime] = useState(formatTime(new Date(shift.endTimeUtc)))
  const [requiredSkillId, setRequiredSkillId] = useState<string>(shift.requiredSkillId || "")
  const [headcount, setHeadcount] = useState(shift.headcount.toString())

  useEffect(() => {
    setDate(formatDate(new Date(shift.date)))
    setStartTime(formatTime(new Date(shift.startTimeUtc)))
    setEndTime(formatTime(new Date(shift.endTimeUtc)))
    setRequiredSkillId(shift.requiredSkillId || "")
    setHeadcount(shift.headcount.toString())
  }, [shift])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!date || !startTime || !endTime) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/shifts/${shift.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          startTimeUtc: startTime,
          endTimeUtc: endTime,
          requiredSkillId: requiredSkillId || null,
          headcount: parseInt(headcount),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update shift")
      }

      toast.success("Shift updated successfully")
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update shift")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Shift</DialogTitle>
          <DialogDescription>
            Update shift details. Times are displayed in {shift.location.timezone} timezone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Location (read-only) */}
          <div className="space-y-2">
            <Label>Location</Label>
            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              {shift.location.name}
            </div>
          </div>

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

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Required Skill */}
          <div className="space-y-2">
            <Label htmlFor="skill">Required Skill (Optional)</Label>
            <Select value={requiredSkillId} onValueChange={setRequiredSkillId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a skill" />
              </SelectTrigger>
              <SelectContent>
                {skills.map((skill) => (
                  <SelectItem key={skill.id} value={skill.id}>
                    {skill.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Headcount */}
          <div className="space-y-2">
            <Label htmlFor="headcount">Number of Staff Needed</Label>
            <Input
              id="headcount"
              type="number"
              min="1"
              max="10"
              value={headcount}
              onChange={(e) => setHeadcount(e.target.value)}
            />
          </div>

          {/* Warning for published shifts */}
          {shift.isPublished && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              This shift is already published. Changes may affect staff schedules.
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
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
