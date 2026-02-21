"use client"

import { useMemo } from "react"
import { format, addDays, startOfWeek, isSameDay } from "date-fns"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShiftCard } from "./ShiftCard"
import type { ShiftWithDetails } from "@/types"

interface WeekCalendarProps {
  shifts: ShiftWithDetails[]
  currentDate: Date
  onShiftClick?: (shift: ShiftWithDetails) => void
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function WeekCalendar({ shifts, currentDate, onShiftClick }: WeekCalendarProps) {
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
        <div className="grid grid-cols-7 gap-2 mb-4">
          {weekDays.map((day, index) => {
            const isToday = isSameDay(day, new Date())
            return (
              <div
                key={index}
                className={`text-center p-3 rounded-lg ${
                  isToday
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                <div className="text-xs font-medium">{DAYS[index]}</div>
                <div className="text-lg font-bold">{format(day, "d")}</div>
                <div className="text-xs">{format(day, "MMM")}</div>
              </div>
            )
          })}
        </div>

        {/* Shifts Grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const dayStr = format(day, "yyyy-MM-dd")
            const dayShifts = shiftsByDay.get(dayStr) || []
            const isToday = isSameDay(day, new Date())

            return (
              <Card
                key={index}
                className={`min-h-[200px] p-2 ${
                  isToday
                    ? "bg-blue-950/30 border-blue-700"
                    : "bg-slate-800/50 border-slate-700"
                }`}
              >
                <div className="space-y-2">
                  {dayShifts.length === 0 ? (
                    <div className="text-center text-slate-500 text-sm py-8">
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
