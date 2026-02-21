"use client"

import { useMemo } from "react"
import { AlertTriangle, DollarSign, Users, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface OvertimeStaffData {
  userId: string
  userName: string
  weeklyHours: number
  overtimeHours: number
  warnings: Array<{
    type: string
    message: string
    severity: "WARNING" | "BLOCK"
  }>
}

interface OvertimeDashboardProps {
  data: OvertimeStaffData[]
  weekStart: Date
  weekEnd: Date
  hourlyRate?: number
}

export function OvertimeDashboard({
  data,
  weekStart,
  weekEnd,
  hourlyRate = 15,
}: OvertimeDashboardProps) {
  const stats = useMemo(() => {
    const totalOvertimeHours = data.reduce((sum, d) => sum + d.overtimeHours, 0)
    const totalOvertimeCost = totalOvertimeHours * hourlyRate * 1.5
    const staffInOvertime = data.filter((d) => d.weeklyHours >= 40).length
    const staffApproachingOvertime = data.filter(
      (d) => d.weeklyHours >= 35 && d.weeklyHours < 40
    ).length
    const blockedStaff = data.filter((d) =>
      d.warnings.some((w) => w.severity === "BLOCK")
    ).length

    return {
      totalOvertimeHours,
      totalOvertimeCost,
      staffInOvertime,
      staffApproachingOvertime,
      blockedStaff,
    }
  }, [data, hourlyRate])

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.weeklyHours - a.weeklyHours)
  }, [data])

  const getHoursColor = (hours: number) => {
    if (hours >= 40) return "text-orange-600 dark:text-orange-500"
    if (hours >= 35) return "text-yellow-600 dark:text-yellow-500"
    return "text-green-600 dark:text-green-500"
  }

  const getHoursBgColor = (hours: number) => {
    if (hours >= 40) return "bg-orange-500"
    if (hours >= 35) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getHoursBarWidth = (hours: number) => {
    return Math.min((hours / 50) * 100, 100)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Overtime Dashboard
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Week of {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Overtime Hours</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {stats.totalOvertimeHours.toFixed(1)}h
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Overtime Cost</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              ${stats.totalOvertimeCost.toFixed(2)}
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">In Overtime</span>
            </div>
            <p className="text-2xl font-bold">{stats.staffInOvertime}</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">Approaching</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">
              {stats.staffApproachingOvertime}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Under 35h</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>35-40h</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span>40+h (overtime)</span>
          </div>
        </div>

        {/* Staff List */}
        <ScrollArea className="h-[350px]">
          <div className="space-y-2">
            {sortedData.map((staff) => (
              <div
                key={staff.userId}
                className="p-3 rounded-lg bg-muted/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {staff.userName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="font-medium">{staff.userName}</p>
                      {staff.overtimeHours > 0 && (
                        <p className="text-xs text-orange-600">
                          {staff.overtimeHours.toFixed(1)}h overtime
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={cn("text-lg font-bold", getHoursColor(staff.weeklyHours))}>
                      {staff.weeklyHours.toFixed(1)}h
                    </p>
                    {staff.weeklyHours >= 40 && (
                      <Badge variant="outline" className="text-orange-600 border-orange-500">
                        Overtime
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Hours Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0h</span>
                    <span>35h</span>
                    <span>40h</span>
                    <span>50h</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full transition-all", getHoursBgColor(staff.weeklyHours))}
                      style={{ width: `${getHoursBarWidth(staff.weeklyHours)}%` }}
                    />
                  </div>
                </div>

                {/* Warnings */}
                {staff.warnings.length > 0 && (
                  <div className="space-y-1">
                    {staff.warnings.map((warning, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-start gap-2 text-xs",
                          warning.severity === "BLOCK"
                            ? "text-red-600 dark:text-red-500"
                            : "text-yellow-600 dark:text-yellow-500"
                        )}
                      >
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{warning.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {sortedData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No staff data available
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
