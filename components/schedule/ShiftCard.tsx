"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Clock, UserPlus, X } from "lucide-react"
import { formatInTimezone, isOvernightShift } from "@/lib/timezone"
import type { ShiftWithDetails } from "@/types"
import { OvernightShiftBadge } from "./OvernightShiftBadge"
import { AssignStaffModal } from "./AssignStaffModal"

interface ShiftCardProps {
  shift: ShiftWithDetails
  onClick?: () => void
  compact?: boolean
  showAssignButton?: boolean
  onAssignmentChange?: () => void
}

export function ShiftCard({ 
  shift, 
  onClick, 
  compact = false, 
  showAssignButton = false,
  onAssignmentChange 
}: ShiftCardProps) {
  const [showAssignModal, setShowAssignModal] = useState(false)

  const isOvernight = isOvernightShift(
    shift.startTimeUtc,
    shift.endTimeUtc,
    shift.location.timezone
  )

  const assignedCount = shift.assignments.filter(
    (a) => a.status === "ASSIGNED"
  ).length

  const isFullyStaffed = assignedCount >= shift.headcount

  const handleAssignClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowAssignModal(true)
  }

  const handleAssignmentChange = () => {
    onAssignmentChange?.()
  }

  return (
    <>
      <Card
        className={`p-3 transition-all hover:shadow-md border ${
          shift.isPremium
            ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 hover:border-amber-300"
            : shift.isPublished
            ? "bg-white border-slate-200 hover:border-slate-300"
            : "bg-slate-50 border-slate-200 border-dashed hover:border-slate-300"
        } ${onClick ? "cursor-pointer" : ""}`}
        onClick={onClick}
      >
        {/* Time */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-medium">
            {formatInTimezone(shift.startTimeUtc, shift.location.timezone, "h:mm a")}
            {" - "}
            {formatInTimezone(shift.endTimeUtc, shift.location.timezone, "h:mm a")}
          </span>
          {isOvernight && <OvernightShiftBadge />}
        </div>

        {/* Skill */}
        {shift.requiredSkill && !compact && (
          <Badge
            variant="outline"
            className="text-xs border-blue-200 text-blue-600 bg-blue-50 mb-2"
          >
            {shift.requiredSkill.name}
          </Badge>
        )}

        {/* Staffing */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <span
              className={`text-xs font-medium ${
                isFullyStaffed ? "text-green-600" : "text-yellow-600"
              }`}
            >
              {assignedCount}/{shift.headcount}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {shift.isPremium && (
              <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">Premium</Badge>
            )}

            {!shift.isPublished && (
              <Badge className="text-xs bg-slate-100 text-slate-600 border-slate-200">Draft</Badge>
            )}
          </div>
        </div>

        {/* Assigned staff names (if not compact) */}
        {!compact && shift.assignments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap gap-1.5">
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
          </div>
        )}

        {/* Assign Staff Button */}
        {showAssignButton && !isFullyStaffed && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={handleAssignClick}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Assign Staff
            </Button>
          </div>
        )}

        {/* Add More Staff Button (when partially staffed) */}
        {showAssignButton && isFullyStaffed && assignedCount > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-xs text-slate-500"
              onClick={handleAssignClick}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Manage Assignments
            </Button>
          </div>
        )}
      </Card>

      {/* Assign Staff Modal */}
      {showAssignModal && (
        <AssignStaffModal
          shift={shift}
          onClose={() => setShowAssignModal(false)}
          onAssigned={handleAssignmentChange}
        />
      )}
    </>
  )
}
