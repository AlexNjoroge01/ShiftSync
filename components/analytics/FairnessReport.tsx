"use client"

import { useState, useMemo } from "react"
import { Download, TrendingDown, TrendingUp, Minus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { FairnessData } from "@/types"

interface FairnessReportProps {
  data: FairnessData[]
  dateRange: { start: Date; end: Date }
  locationName?: string
}

export function FairnessReport({ data, dateRange, locationName }: FairnessReportProps) {
  const [sortBy, setSortBy] = useState<"name" | "hours" | "premium" | "fairness">("fairness")

  const sortedData = useMemo(() => {
    const sorted = [...data]
    switch (sortBy) {
      case "name":
        return sorted.sort((a, b) => a.userName.localeCompare(b.userName))
      case "hours":
        return sorted.sort((a, b) => b.totalHours - a.totalHours)
      case "premium":
        return sorted.sort((a, b) => b.premiumShifts - a.premiumShifts)
      case "fairness":
      default:
        return sorted.sort((a, b) => a.fairnessScore - b.fairnessScore)
    }
  }, [data, sortBy])

  const avgFairness = useMemo(() => {
    if (data.length === 0) return 0
    return data.reduce((sum, d) => sum + d.fairnessScore, 0) / data.length
  }, [data])

  const underRepresented = useMemo(() => {
    const threshold = avgFairness * 0.5
    return data.filter((d) => d.fairnessScore < threshold)
  }, [data, avgFairness])

  const exportCSV = () => {
    const headers = [
      "Staff Name",
      "Total Hours",
      "Premium Shifts",
      "Desired Hours",
      "Scheduled Hours",
      "Gap",
      "Fairness Score (%)",
    ]
    const rows = sortedData.map((d) => [
      d.userName,
      d.totalHours.toString(),
      d.premiumShifts.toString(),
      d.desiredHours?.toString() || "N/A",
      d.scheduledHours.toString(),
      d.gap.toString(),
      d.fairnessScore.toString(),
    ])

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `fairness-report-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getFairnessColor = (score: number) => {
    if (score < avgFairness * 0.5) return "text-red-600 dark:text-red-500"
    if (score < avgFairness * 0.75) return "text-yellow-600 dark:text-yellow-500"
    return "text-green-600 dark:text-green-500"
  }

  const getFairnessBgColor = (score: number) => {
    if (score < avgFairness * 0.5) return "bg-red-500"
    if (score < avgFairness * 0.75) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getTrendIcon = (gap: number) => {
    if (gap > 5) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (gap < -5) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Fairness Report</CardTitle>
          {locationName && (
            <p className="text-sm text-muted-foreground">{locationName}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{avgFairness.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Avg Fairness Score</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{data.length}</p>
            <p className="text-xs text-muted-foreground">Staff Members</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{underRepresented.length}</p>
            <p className="text-xs text-muted-foreground">Under-represented</p>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          {[
            { key: "fairness", label: "Fairness" },
            { key: "name", label: "Name" },
            { key: "hours", label: "Hours" },
            { key: "premium", label: "Premium" },
          ].map((option) => (
            <Button
              key={option.key}
              variant={sortBy === option.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setSortBy(option.key as typeof sortBy)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Staff List */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {sortedData.map((staff) => (
              <div
                key={staff.userId}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {staff.userName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="font-medium">{staff.userName}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{staff.totalHours.toFixed(1)}h</span>
                      <span>•</span>
                      <span>{staff.premiumShifts} premium</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Gap indicator */}
                  <div className="flex items-center gap-1">
                    {getTrendIcon(staff.gap)}
                    <span className="text-sm">
                      {staff.gap > 0 ? "+" : ""}
                      {staff.gap.toFixed(1)}h
                    </span>
                  </div>

                  {/* Fairness score */}
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getFairnessColor(staff.fairnessScore)}`}>
                      {staff.fairnessScore.toFixed(1)}%
                    </p>
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getFairnessBgColor(staff.fairnessScore)}`}
                        style={{ width: `${Math.min(staff.fairnessScore, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Under-represented badge */}
                  {staff.fairnessScore < avgFairness * 0.5 && (
                    <Badge variant="destructive" className="text-xs">
                      Under-represented
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
