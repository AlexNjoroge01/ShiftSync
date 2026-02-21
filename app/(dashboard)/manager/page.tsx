import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, Users, ArrowLeftRight, AlertTriangle } from "lucide-react"

export default async function ManagerPage() {
  const session = await auth()
  
  // Get manager's locations
  const managerLocations = await prisma.locationAssignment.findMany({
    where: { managerId: session?.user?.id },
    select: { locationId: true },
  })
  const locationIds = managerLocations.map((l) => l.locationId)

  // Get stats for manager's locations
  const [pendingSwaps, activeShifts, staffCount, upcomingShifts] = await Promise.all([
    prisma.swapRequest.count({
      where: {
        status: "PENDING",
        shift: { locationId: { in: locationIds } },
      },
    }),
    prisma.shift.count({
      where: {
        locationId: { in: locationIds },
        startTimeUtc: { lte: new Date() },
        endTimeUtc: { gte: new Date() },
      },
    }),
    prisma.locationCertification.count({
      where: {
        locationId: { in: locationIds },
        revokedAt: null,
      },
    }),
    prisma.shift.count({
      where: {
        locationId: { in: locationIds },
        startTimeUtc: { gte: new Date() },
        isPublished: true,
      },
    }),
  ])

  const stats = [
    { label: "Pending Swaps", value: pendingSwaps, icon: ArrowLeftRight, color: "text-yellow-500" },
    { label: "Active Shifts", value: activeShifts, icon: Clock, color: "text-green-500" },
    { label: "Staff Members", value: staffCount, icon: Users, color: "text-blue-500" },
    { label: "Upcoming Shifts", value: upcomingShifts, icon: Calendar, color: "text-purple-500" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Manager Dashboard</h1>
        <p className="text-slate-400 mt-1">Manage schedules, shifts, and staff</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {pendingSwaps > 0 && (
        <Card className="bg-yellow-900/20 border-yellow-700">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="font-medium text-yellow-200">
                {pendingSwaps} pending swap request{pendingSwaps > 1 ? "s" : ""} awaiting review
              </p>
              <a href="/manager/swaps" className="text-sm text-yellow-400 hover:underline">
                View all swap requests
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
          <CardDescription className="text-slate-400">
            Common management tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <a
            href="/manager/schedule"
            className="flex items-center gap-3 p-4 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
          >
            <Calendar className="h-5 w-5 text-blue-500" />
            <div>
              <p className="font-medium text-white">View Schedule</p>
              <p className="text-sm text-slate-400">Manage weekly schedules</p>
            </div>
          </a>
          <a
            href="/manager/shifts"
            className="flex items-center gap-3 p-4 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
          >
            <Clock className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium text-white">Manage Shifts</p>
              <p className="text-sm text-slate-400">Create and edit shifts</p>
            </div>
          </a>
          <a
            href="/manager/staff"
            className="flex items-center gap-3 p-4 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
          >
            <Users className="h-5 w-5 text-purple-500" />
            <div>
              <p className="font-medium text-white">View Staff</p>
              <p className="text-sm text-slate-400">See staff details and availability</p>
            </div>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}