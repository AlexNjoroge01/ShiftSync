"use client"

import { useMemo } from "react"
import { format, addDays, startOfWeek, isSameDay } from "date-fns"
import { Card } from "@/components/ui/card"
import { ShiftCard } from "./ShiftCard"
import type { ShiftWithDetails } from "@/types"

interface WeekCalendarProps {
  shifts: ShiftWithDetails[]
  currentDate: Date
  onShiftClick?: (shift: ShiftWithDetails) => void
  showAssignButton?: boolean
  onAssignmentChange?: () => void
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function WeekCalendar({ shifts, currentDate, onShiftClick, showAssignButton, onAssignmentChange }: WeekCalendarProps) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [currentDate])

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, ShiftWithDetails[]>()
    
    for (const day of weekDays) {
      const dayStr = format(day, "yyyy-MM-dd")
      map.set(dayStr, [])
    }

    for (const shift of shifts) {
      const shiftDate = new Date(shift.date)
      const dayStr = format(shiftDate, "yyyy-MM-dd")
      const dayShifts = map.get(dayStr)
      if (dayShifts) {
        dayShifts.push(shift)
      }
    }

    return map
  }, [shifts, weekDays])

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        {/* Header */}
        <div className="grid grid-cols-7 gap-3 mb-4">
          {weekDays.map((day, index) => {
            const isToday = isSameDay(day, new Date())
            return (
              <div
                key={index}
                className={`text-center p-4 rounded-xl transition-colors ${
                  isToday
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600"
                }`}
              >
                <div className="text-xs font-medium uppercase tracking-wide">{DAYS[index]}</div>
                <div className="text-2xl font-bold mt-1">{format(day, "d")}</div>
                <div className="text-xs mt-0.5">{format(day, "MMM")}</div>
              </div>
            )
          })}
        </div>

        {/* Shifts Grid */}
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day, index) => {
            const dayStr = format(day, "yyyy-MM-dd")
            const dayShifts = shiftsByDay.get(dayStr) || []
            const isToday = isSameDay(day, new Date())

            return (
              <Card
                key={index}
                className={`min-h-[200px] p-3 transition-colors ${
                  isToday
                    ? "bg-blue-50 border-blue-200"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="space-y-2">
                  {dayShifts.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-8">
                      No shifts
                    </div>
                  ) : (
                    dayShifts
                      .sort((a, b) => a.startTimeUtc.getTime() - b.startTimeUtc.getTime())
                      .map((shift) => (
                        <ShiftCard
                          key={shift.id}
                          shift={shift}
                          onClick={() => onShiftClick?.(shift)}
                          showAssignButton={showAssignButton}
                          onAssignmentChange={onAssignmentChange}
                        />
                      ))
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
