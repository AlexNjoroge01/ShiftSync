import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, ArrowLeftRight, CheckCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { StaffDashboardClient } from "@/components/staff/StaffDashboardClient"

export default async function StaffPage() {
  const session = await auth()
  
  // Get staff's upcoming shifts
  const upcomingShifts = await prisma.shiftAssignment.findMany({
    where: {
      userId: session?.user?.id,
      status: "ASSIGNED",
      shift: {
        startTimeUtc: { gte: new Date() },
        isPublished: true,
      },
    },
    include: {
      shift: {
        include: {
          location: true,
          requiredSkill: true,
        },
      },
    },
    orderBy: {
      shift: {
        startTimeUtc: "asc",
      },
    },
    take: 5,
  })

  // Get pending swap requests
  const pendingSwaps = await prisma.swapRequest.count({
    where: {
      requesterId: session?.user?.id,
      status: { in: ["PENDING", "STAFF_ACCEPTED"] },
    },
  })

  // Get this week's hours
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const weekShifts = await prisma.shiftAssignment.findMany({
    where: {
      userId: session?.user?.id,
      status: "ASSIGNED",
      shift: {
        startTimeUtc: { gte: weekStart, lt: weekEnd },
        isPublished: true,
      },
    },
    include: {
      shift: true,
    },
  })

  const weeklyHours = weekShifts.reduce((total, assignment) => {
    const duration = (assignment.shift.endTimeUtc.getTime() - assignment.shift.startTimeUtc.getTime()) / (1000 * 60 * 60)
    return total + duration
  }, 0)

  const stats = [
    { label: "This Week Hours", value: Math.round(weeklyHours), icon: Clock, color: "bg-blue-50 text-blue-600" },
    { label: "Upcoming Shifts", value: upcomingShifts.length, icon: Calendar, color: "bg-green-50 text-green-600" },
    { label: "Pending Swaps", value: pendingSwaps, icon: ArrowLeftRight, color: "bg-yellow-50 text-yellow-600" },
  ]

  return (
    <StaffDashboardClient>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Staff Dashboard</h1>
          <p className="text-slate-500 mt-1">View your schedule and manage availability</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                      <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Upcoming Shifts</CardTitle>
            <CardDescription className="text-slate-500">
              Your next scheduled shifts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingShifts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-slate-500">No upcoming shifts scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingShifts.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {assignment.shift.location.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {assignment.shift.requiredSkill?.name || "General"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">
                        {assignment.shift.date.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-slate-500">
                        {assignment.shift.startTimeUtc.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: assignment.shift.location.timezone,
                        })}
                        {" - "}
                        {assignment.shift.endTimeUtc.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: assignment.shift.location.timezone,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Link
              href="/staff/availability"
              className="group flex items-center gap-4 p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900">Set Availability</p>
                <p className="text-sm text-slate-500">Update when you can work</p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
            </Link>
            <Link
              href="/staff/swaps"
              className="group flex items-center gap-4 p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center">
                <ArrowLeftRight className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900">Request Swap</p>
                <p className="text-sm text-slate-500">Swap or drop a shift</p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </StaffDashboardClient>
  )
}
