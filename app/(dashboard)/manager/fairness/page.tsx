import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart3, TrendingUp, TrendingDown, Minus, User, Star, Download, RotateCcw } from "lucide-react"
import type { User as PrismaUser, ShiftAssignment, Shift } from "@prisma/client"
import { format, subDays } from "date-fns"
import Link from "next/link"
import { DateRangePickerWrapper } from "@/components/fairness/DateRangePickerWrapper"

type StaffWithFairness = PrismaUser & {
  shiftAssignments: (ShiftAssignment & {
    shift: Shift
  })[]
}

interface PageProps {
  searchParams: Promise<{
    from?: string
    to?: string
  }>
}

export default async function ManagerFairnessPage({ searchParams }: PageProps) {
  const session = await auth()
  const resolvedSearchParams = await searchParams
  
  // Get manager's locations
  const managedLocations = await prisma.locationAssignment.findMany({
    where: { managerId: session?.user?.id },
    select: { locationId: true },
  })
  
  const locationIds = managedLocations.map((l) => l.locationId)
  
  // Get date range from params or default to last 90 days
  const now = new Date()
  const defaultFrom = subDays(now, 90)
  
  const fromDate = resolvedSearchParams.from ? new Date(resolvedSearchParams.from) : defaultFrom
  const toDate = resolvedSearchParams.to ? new Date(resolvedSearchParams.to) : now
  
  // Calculate days in range for hours gap calculation
  const daysInRange = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
  const weeksInRange = daysInRange / 7

  // Get staff with their shifts
  const staff: StaffWithFairness[] = await prisma.user.findMany({
    where: {
      role: "STAFF",
      certifications: {
        some: {
          locationId: { in: locationIds },
          revokedAt: null,
        },
      },
    },
    include: {
      shiftAssignments: {
        where: {
          status: "ASSIGNED",
          shift: {
            locationId: { in: locationIds },
            startTimeUtc: {
              gte: fromDate,
              lte: toDate,
            },
          },
        },
        include: {
          shift: true,
        },
      },
    },
  })

  // Calculate fairness metrics
  const totalPremiumShifts = staff.reduce(
    (sum, member) => sum + member.shiftAssignments.filter((a) => a.shift.isPremium).length,
    0
  )

  const staffFairness = staff.map((member) => {
    const totalShifts = member.shiftAssignments.length
    const premiumShifts = member.shiftAssignments.filter((a) => a.shift.isPremium).length
    const premiumPercentage = totalPremiumShifts > 0 
      ? (premiumShifts / totalPremiumShifts) * 100 
      : 0
    
    let totalMinutes = 0
    member.shiftAssignments.forEach((assignment) => {
      const duration = (assignment.shift.endTimeUtc.getTime() - assignment.shift.startTimeUtc.getTime()) / (1000 * 60)
      totalMinutes += duration
    })
    const totalHours = totalMinutes / 60

    return {
      ...member,
      totalShifts,
      premiumShifts,
      premiumPercentage,
      totalHours,
      desiredHours: member.desiredHoursPerWeek,
      hoursGap: member.desiredHoursPerWeek 
        ? totalHours - (member.desiredHoursPerWeek * weeksInRange)
        : null,
    }
  })

  // Sort by premium percentage (lowest first to highlight under-represented)
  staffFairness.sort((a, b) => a.premiumPercentage - b.premiumPercentage)

  const avgPremiumPercentage = totalPremiumShifts > 0 
    ? 100 / staff.length 
    : 0

  // Build query string for export
  const exportQuery = new URLSearchParams()
  if (resolvedSearchParams.from) exportQuery.set("startDate", resolvedSearchParams.from)
  if (resolvedSearchParams.to) exportQuery.set("endDate", resolvedSearchParams.to)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Fairness Report</h1>
          <p className="text-slate-500 mt-1">Premium shift distribution and hours analysis</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/manager/fairness"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white shadow-sm hover:bg-slate-50 h-9 px-4 py-2 text-slate-700"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Link>
          <a
            href={`/api/analytics/fairness/export?${exportQuery.toString()}`}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white shadow-sm hover:bg-slate-50 h-9 px-4 py-2 text-slate-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <form method="GET" className="flex items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Date Range</label>
              <DateRangePickerWrapper 
                defaultFrom={fromDate} 
                defaultTo={toDate} 
              />
            </div>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <Star className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Premium Shifts</p>
                <p className="text-2xl font-bold text-slate-900">{totalPremiumShifts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Staff Analyzed</p>
                <p className="text-2xl font-bold text-slate-900">{staffFairness.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Avg Premium Share</p>
                <p className="text-2xl font-bold text-slate-900">{avgPremiumPercentage.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Period</p>
                <p className="text-2xl font-bold text-slate-900">{daysInRange} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fairness Table */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Premium Shift Distribution</CardTitle>
          <CardDescription>
            {format(fromDate, "MMM d, yyyy")} - {format(toDate, "MMM d, yyyy")} • Sorted by premium percentage (lowest first)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {staffFairness.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-slate-500">No staff data available for the selected period</p>
            </div>
          ) : (
            <div className="space-y-4">
              {staffFairness.map((member, index) => {
                const isUnderRepresented = member.premiumPercentage < avgPremiumPercentage * 0.5
                
                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isUnderRepresented 
                        ? "border-amber-200 bg-amber-50" 
                        : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 text-center text-sm text-slate-400">
                        #{index + 1}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{member.name}</p>
                          {isUnderRepresented && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                              Under-represented
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          {member.totalShifts} total shifts • {member.totalHours.toFixed(0)}h
                          {member.desiredHours && (
                            <span className="ml-2 text-slate-400">
                              (target: {(member.desiredHours * weeksInRange).toFixed(0)}h)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{member.premiumShifts}</p>
                        <p className="text-xs text-slate-500">Premium</p>
                      </div>
                      <div className="text-right w-20">
                        <p className="font-semibold text-slate-900">
                          {member.premiumPercentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-500">Share</p>
                      </div>
                      <div className="w-32">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isUnderRepresented
                                ? "bg-amber-500"
                                : member.premiumPercentage > avgPremiumPercentage
                                ? "bg-green-500"
                                : "bg-blue-500"
                            }`}
                            style={{ 
                              width: `${Math.min(100, (member.premiumPercentage / (avgPremiumPercentage * 2 || 1)) * 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                      <div className="w-8">
                        {member.premiumPercentage > avgPremiumPercentage ? (
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        ) : member.premiumPercentage < avgPremiumPercentage * 0.5 ? (
                          <TrendingDown className="h-5 w-5 text-amber-500" />
                        ) : (
                          <Minus className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
