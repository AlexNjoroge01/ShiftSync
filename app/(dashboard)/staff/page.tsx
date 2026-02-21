import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, ArrowLeftRight, CheckCircle } from "lucide-react"

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
    { label: "This Week Hours", value: Math.round(weeklyHours), icon: Clock, color: "text-blue-500" },
    { label: "Upcoming Shifts", value: upcomingShifts.length, icon: Calendar, color: "text-green-500" },
    { label: "Pending Swaps", value: pendingSwaps, icon: ArrowLeftRight, color: "text-yellow-500" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Staff Dashboard</h1>
        <p className="text-slate-400 mt-1">View your schedule and manage availability</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  {stat.label}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Upcoming Shifts</CardTitle>
          <CardDescription className="text-slate-400">
            Your next scheduled shifts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingShifts.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No upcoming shifts scheduled</p>
          ) : (
            <div className="space-y-3">
              {upcomingShifts.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {assignment.shift.location.name}
                      </p>
                      <p className="text-sm text-slate-400">
                        {assignment.shift.requiredSkill?.name || "General"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white">
                      {assignment.shift.date.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-slate-400">
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

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <a
            href="/staff/availability"
            className="flex items-center gap-3 p-4 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
          >
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium text-white">Set Availability</p>
              <p className="text-sm text-slate-400">Update when you can work</p>
            </div>
          </a>
          <a
            href="/staff/swaps"
            className="flex items-center gap-3 p-4 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeftRight className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="font-medium text-white">Request Swap</p>
              <p className="text-sm text-slate-400">Swap or drop a shift</p>
            </div>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}