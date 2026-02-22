"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Users, MapPin, UserPlus } from "lucide-react"
import { useState } from "react"
import { EditShiftModal } from "@/components/shifts/EditShiftModal"
import { DeleteShiftButton } from "@/components/shifts/DeleteShiftButton"
import { AssignStaffModal } from "@/components/schedule/AssignStaffModal"
import type { ShiftWithDetails } from "@/types"

interface ShiftsListProps {
  shifts: ShiftWithDetails[]
  skills: { id: string; name: string }[]
}

export function ShiftsList({ shifts, skills }: ShiftsListProps) {
  const router = useRouter()
  const [assignModalShift, setAssignModalShift] = useState<ShiftWithDetails | null>(null)

  const formatShiftTime = (start: Date, end: Date, timezone: string) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    })
    return `${formatter.format(start)} - ${formatter.format(end)}`
  }

  const formatShiftDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const isOvernight = (start: Date, end: Date) => {
    return end.getDate() !== start.getDate()
  }

  const handleAssignmentChange = () => {
    router.refresh()
  }

  return (
    <>
      <div className="grid gap-4">
        {shifts.length === 0 ? (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No shifts found</p>
              <p className="text-slate-400 text-sm mt-1">Create your first shift to get started</p>
            </CardContent>
          </Card>
        ) : (
          shifts.map((shift) => {
            const assignedCount = shift.assignments.filter(a => a.status === "ASSIGNED").length
            const isFullyStaffed = assignedCount >= shift.headcount

            return (
              <Card key={shift.id} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 rounded-xl bg-blue-50 flex flex-col items-center justify-center">
                          <span className="text-xs text-blue-600 font-medium">
                            {formatShiftDate(shift.date).split(" ")[0]}
                          </span>
                          <span className="text-lg font-bold text-blue-700">
                            {formatShiftDate(shift.date).split(" ")[2]}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900">
                            {shift.location.name}
                          </h3>
                          {shift.isPremium && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                              Premium
                            </Badge>
                          )}
                          {shift.isPublished ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              Published
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                              Draft
                            </Badge>
                          )}
                          {isOvernight(shift.startTimeUtc, shift.endTimeUtc) && (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                              Overnight
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            {formatShiftTime(shift.startTimeUtc, shift.endTimeUtc, shift.location.timezone)}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" />
                            {shift.location.address}
                          </div>
                        </div>
                        {shift.requiredSkill && (
                          <div className="mt-2">
                            <Badge variant="outline" className="border-slate-200 text-slate-600">
                              {shift.requiredSkill.name}
                            </Badge>
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span className={`text-sm font-medium ${isFullyStaffed ? "text-green-600" : "text-yellow-600"}`}>
                            {assignedCount} / {shift.headcount} assigned
                          </span>
                          {shift.assignments.length > 0 && (
                            <div className="flex -space-x-2 ml-2">
                              {shift.assignments.slice(0, 3).map((a) => (
                                <div
                                  key={a.id}
                                  className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-600"
                                >
                                  {a.user.name.charAt(0)}
                                </div>
                              ))}
                              {shift.assignments.length > 3 && (
                                <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-600">
                                  +{shift.assignments.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Assigned staff names */}
                        {shift.assignments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {shift.assignments
                              .filter((a) => a.status === "ASSIGNED")
                              .map((assignment) => (
                                <span
                                  key={assignment.id}
                                  className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md"
                                >
                                  {assignment.user.name}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-1">
                        <EditShiftModal shift={shift} skills={skills} />
                        <DeleteShiftButton 
                          shiftId={shift.id} 
                          shiftInfo={`${shift.location.name} - ${formatShiftDate(shift.date)}`}
                          isPublished={shift.isPublished}
                        />
                      </div>
                      
                      {/* Assign Staff Button */}
                      <Button
                        size="sm"
                        variant={isFullyStaffed ? "ghost" : "outline"}
                        className={`text-xs ${isFullyStaffed ? "text-slate-500" : "border-blue-200 text-blue-600 hover:bg-blue-50"}`}
                        onClick={() => setAssignModalShift(shift)}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                        {isFullyStaffed ? "Manage" : "Assign Staff"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Assign Staff Modal */}
      {assignModalShift && (
        <AssignStaffModal
          shift={assignModalShift}
          onClose={() => setAssignModalShift(null)}
          onAssigned={handleAssignmentChange}
        />
      )}
    </>
  )
}
