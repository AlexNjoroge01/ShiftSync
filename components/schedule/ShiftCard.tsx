"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Users, Clock, MapPin } from "lucide-react"
import { formatInTimezone, isOvernightShift } from "@/lib/timezone"
import type { ShiftWithDetails } from "@/types"
import { OvernightShiftBadge } from "./OvernightShiftBadge"

interface ShiftCardProps {
  shift: ShiftWithDetails
  onClick?: () => void
  compact?: boolean
}

export function ShiftCard({ shift, onClick, compact = false }: ShiftCardProps) {
  const isOvernight = isOvernightShift(
    shift.startTimeUtc,
    shift.endTimeUtc,
    shift.location.timezone
  )

  const assignedCount = shift.assignments.filter(
    (a) => a.status === "ASSIGNED"
  ).length

  const isFullyStaffed = assignedCount >= shift.headcount

  return (
    <Card
      className={`p-2 cursor-pointer transition-all hover:ring-2 hover:ring-blue-500 ${
        shift.isPremium
          ? "bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-600/50"
          : shift.isPublished
          ? "bg-slate-700/50 border-slate-600"
          : "bg-slate-800/50 border-slate-700 border-dashed"
      }`}
      onClick={onClick}
    >
      {/* Time */}
      <div className="flex items-center gap-1 text-xs text-slate-300 mb-1">
        <Clock className="h-3 w-3" />
        <span>
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
          className="text-xs border-blue-500/50 text-blue-400 mb-1"
        >
          {shift.requiredSkill.name}
        </Badge>
      )}

      {/* Staffing */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-slate-400" />
          <span
            className={`text-xs ${
              isFullyStaffed ? "text-green-400" : "text-yellow-400"
            }`}
          >
            {assignedCount}/{shift.headcount}
          </span>
        </div>

        {shift.isPremium && (
          <Badge className="text-xs bg-amber-600 text-white">Premium</Badge>
        )}

        {!shift.isPublished && (
          <Badge className="text-xs bg-slate-600 text-slate-300">Draft</Badge>
        )}
      </div>

      {/* Assigned staff names (if not compact) */}
      {!compact && shift.assignments.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-600">
          <div className="flex flex-wrap gap-1">
            {shift.assignments
              .filter((a) => a.status === "ASSIGNED")
              .map((assignment) => (
                <span
                  key={assignment.id}
                  className="text-xs text-slate-300 bg-slate-600/50 px-1.5 py-0.5 rounded"
                >
                  {assignment.user.name}
                </span>
              ))}
          </div>
        </div>
      )}
    </Card>
  )
}
