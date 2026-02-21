import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock, TrendingUp, DollarSign, User } from "lucide-react"
import type { User as PrismaUser, Shift, ShiftAssignment, Location } from "@prisma/client"

type StaffWithHours = PrismaUser & {
  certifications: {
    location: {
      id: string
      name: string
    }
  }[]
  shiftAssignments: (ShiftAssignment & {
    shift: Shift & {
      location: Location
    }
  })[]
}

export default async function ManagerOvertimePage() {
  const session = await auth()
  
  // Get manager's locations
  const managedLocations = await prisma.locationAssignment.findMany({
    where: { managerId: session?.user?.id },
    select: { locationId: true },
  })
  
  const locationIds = managedLocations.map((l) => l.locationId)
  
  // Get current week date range
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  // Get staff with their shifts for the current week
  const staff: StaffWithHours[] = await prisma.user.findMany({
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
      certifications: {
        where: {
          locationId: { in: locationIds },
          revokedAt: null,
        },
        include: {
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      shiftAssignments: {
        where: {
          status: "ASSIGNED",
          shift: {
            startTimeUtc: {
              gte: weekStart,
              lt: weekEnd,
            },
          },
        },
        include: {
          shift: {
            include: {
              location: true,
            },
          },
        },
      },
    },
  })

  // Calculate hours for each staff member
  const staffHours = staff.map((member) => {
    let totalMinutes = 0
    let premiumShifts = 0
    
    member.shiftAssignments.forEach((assignment) => {
      const duration = (assignment.shift.endTimeUtc.getTime() - assignment.shift.startTimeUtc.getTime()) / (1000 * 60)
      totalMinutes += duration
      if (assignment.shift.isPremium) {
        premiumShifts++
      }
    })
    
    const totalHours = totalMinutes / 60
    const overtimeHours = Math.max(0, totalHours - 40)
    
    return {
      ...member,
      totalHours,
      overtimeHours,
      premiumShifts,
      status: totalHours >= 40 ? "overtime" : totalHours >= 35 ? "warning" : "normal",
    }
  })

  // Sort by hours descending
  staffHours.sort((a, b) => b.totalHours - a.totalHours)

  const totalOvertimeHours = staffHours.reduce((sum, s) => sum + s.overtimeHours, 0)
  const staffInOvertime = staffHours.filter((s) => s.status === "overtime").length
  const staffNearOvertime = staffHours.filter((s) => s.status === "warning").length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Overtime Dashboard</h1>
        <p className="text-slate-500 mt-1">Monitor weekly hours and overtime costs</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Staff</p>
                <p className="text-2xl font-bold text-slate-900">{staffHours.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Near Overtime (35-40h)</p>
                <p className="text-2xl font-bold text-amber-600">{staffNearOvertime}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">In Overtime (40+h)</p>
                <p className="text-2xl font-bold text-red-600">{staffInOvertime}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Overtime Hours</p>
                <p className="text-2xl font-bold text-slate-900">{totalOvertimeHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Hours Table */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Weekly Hours by Staff</CardTitle>
          <CardDescription>
            Current week: {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {staffHours.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-slate-500">No staff data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {staffHours.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-100 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{member.name}</p>
                      <p className="text-sm text-slate-500">
                        {member.shiftAssignments.length} shifts • {member.premiumShifts} premium
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{member.totalHours.toFixed(1)}h</p>
                      <p className="text-xs text-slate-500">
                        Desired: {member.desiredHoursPerWeek || "—"}h
                      </p>
                    </div>
                    <div className="w-24">
                      {member.status === "overtime" ? (
                        <Badge className="bg-red-100 text-red-700 border-red-200 w-full justify-center">
                          Overtime
                        </Badge>
                      ) : member.status === "warning" ? (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 w-full justify-center">
                          Warning
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 border-green-200 w-full justify-center">
                          Normal
                        </Badge>
                      )}
                    </div>
                    <div className="w-32">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            member.status === "overtime"
                              ? "bg-red-500"
                              : member.status === "warning"
                              ? "bg-amber-500"
                              : "bg-green-500"
                          }`}
                          style={{ width: `${Math.min(100, (member.totalHours / 50) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
