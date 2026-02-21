"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface HoursDistributionData {
  userId: string
  userName: string
  hours: number
  isOvertime: boolean
}

interface HoursDistributionChartProps {
  data: HoursDistributionData[]
  title?: string
}

export function HoursDistributionChart({
  data,
  title = "Hours Distribution",
}: HoursDistributionChartProps) {
  const maxHours = useMemo(() => {
    return Math.max(...data.map((d) => d.hours), 50)
  }, [data])

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.hours - a.hours)
  }, [data])

  const getBarColor = (hours: number, isOvertime: boolean) => {
    if (isOvertime || hours >= 40) return "bg-orange-500"
    if (hours >= 35) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getTextColor = (hours: number, isOvertime: boolean) => {
    if (isOvertime || hours >= 40) return "text-orange-600 dark:text-orange-500"
    if (hours >= 35) return "text-yellow-600 dark:text-yellow-500"
    return "text-green-600 dark:text-green-500"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedData.map((staff) => (
            <div key={staff.userId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium truncate max-w-[150px]">
                  {staff.userName}
                </span>
                <span className={cn("font-bold", getTextColor(staff.hours, staff.isOvertime))}>
                  {staff.hours.toFixed(1)}h
                </span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    getBarColor(staff.hours, staff.isOvertime)
                  )}
                  style={{ width: `${(staff.hours / maxHours) * 100}%` }}
                />
              </div>
            </div>
          ))}

          {sortedData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No data available
            </div>
          )}
        </div>

        {/* Summary */}
        {sortedData.length > 0 && (
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-muted-foreground">Total Hours</p>
              <p className="font-bold">
                {sortedData.reduce((sum, d) => sum + d.hours, 0).toFixed(1)}h
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Average</p>
              <p className="font-bold">
                {(sortedData.reduce((sum, d) => sum + d.hours, 0) / sortedData.length).toFixed(1)}h
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Overtime Staff</p>
              <p className="font-bold text-orange-600">
                {sortedData.filter((d) => d.isOvertime || d.hours >= 40).length}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
