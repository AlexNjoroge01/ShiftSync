"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, TrendingUp, Clock, DollarSign } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface WhatIfPanelProps {
  userId: string
  shiftId: string
  startTimeUtc: Date | string
  endTimeUtc: Date | string
}

interface AssignmentPreview {
  currentWeekHours: number
  projectedWeekHours: number
  newOvertimeHours: number
  warnings: string[]
  premiumShifts: number
}

export function WhatIfPanel({ userId, shiftId, startTimeUtc, endTimeUtc }: WhatIfPanelProps) {
  const [preview, setPreview] = useState<AssignmentPreview | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPreview = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          userId,
          shiftId,
          startTimeUtc: new Date(startTimeUtc).toISOString(),
          endTimeUtc: new Date(endTimeUtc).toISOString(),
        })

        const response = await fetch(`/api/shifts/${shiftId}/preview?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setPreview(data)
        }
      } catch (error) {
        console.error("Failed to fetch preview:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPreview()
  }, [userId, shiftId, startTimeUtc, endTimeUtc])

  if (isLoading) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!preview) return null

  const shiftDuration =
    (new Date(endTimeUtc).getTime() - new Date(startTimeUtc).getTime()) / (1000 * 60 * 60)

  const hasWarnings = preview.warnings.length > 0
  const isOvertime = preview.projectedWeekHours >= 40
  const isApproachingOvertime = preview.projectedWeekHours >= 35 && preview.projectedWeekHours < 40

  // Calculate overtime cost (assuming $15/hour base rate)
  const overtimeCost = preview.newOvertimeHours * 15 * 1.5

  return (
    <Card
      className={cn(
        hasWarnings
          ? "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20"
          : "bg-muted/50"
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">What-If Analysis</span>
          {hasWarnings && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-500">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Warning
            </Badge>
          )}
        </div>

        {/* Hours Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Current Week</p>
            <p className="text-lg font-semibold">{preview.currentWeekHours.toFixed(1)}h</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">After Assignment</p>
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  "text-lg font-semibold",
                  isOvertime && "text-orange-600",
                  isApproachingOvertime && "text-yellow-600"
                )}
              >
                {preview.projectedWeekHours.toFixed(1)}h
              </p>
              <TrendingUp
                className={cn(
                  "h-4 w-4",
                  isOvertime && "text-orange-600",
                  isApproachingOvertime && "text-yellow-600"
                )}
              />
            </div>
          </div>
        </div>

        {/* Shift Duration */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>+{shiftDuration.toFixed(1)} hours from this shift</span>
        </div>

        {/* Overtime Cost */}
        {preview.newOvertimeHours > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-orange-600" />
            <span className="text-orange-600">
              Projected overtime cost: ${overtimeCost.toFixed(2)} ({preview.newOvertimeHours.toFixed(1)}h
              × $22.50)
            </span>
          </div>
        )}

        {/* Premium Shifts */}
        {preview.premiumShifts > 0 && (
          <div className="text-sm text-muted-foreground">
            Premium shifts this week: {preview.premiumShifts}
          </div>
        )}

        {/* Warnings */}
        {preview.warnings.length > 0 && (
          <div className="space-y-1">
            {preview.warnings.map((warning, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm text-yellow-600 dark:text-yellow-500"
              >
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Visual Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0h</span>
            <span>35h</span>
            <span>40h</span>
            <span>50h</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                isOvertime
                  ? "bg-orange-500"
                  : isApproachingOvertime
                  ? "bg-yellow-500"
                  : "bg-green-500"
              )}
              style={{ width: `${Math.min((preview.projectedWeekHours / 50) * 100, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
