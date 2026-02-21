import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, Users, ArrowLeftRight, AlertTriangle, ArrowRight } from "lucide-react"
import Link from "next/link"

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
    { label: "Pending Swaps", value: pendingSwaps, icon: ArrowLeftRight, color: "bg-yellow-50 text-yellow-600" },
    { label: "Active Shifts", value: activeShifts, icon: Clock, color: "bg-green-50 text-green-600" },
    { label: "Staff Members", value: staffCount, icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "Upcoming Shifts", value: upcomingShifts, icon: Calendar, color: "bg-purple-50 text-purple-600" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manager Dashboard</h1>
        <p className="text-slate-500 mt-1">Manage schedules, shifts, and staff</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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

      {pendingSwaps > 0 && (
        <Card className="bg-yellow-50 border-yellow-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-yellow-800">
                {pendingSwaps} pending swap request{pendingSwaps > 1 ? "s" : ""} awaiting review
              </p>
              <Link href="/manager/swaps" className="text-sm text-yellow-600 hover:text-yellow-700 font-medium">
                View all swap requests →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Quick Actions</CardTitle>
          <CardDescription className="text-slate-500">
            Common management tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Link
            href="/manager/schedule"
            className="group flex items-center gap-4 p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">View Schedule</p>
              <p className="text-sm text-slate-500">Manage weekly schedules</p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
          </Link>
          <Link
            href="/manager/shifts"
            className="group flex items-center gap-4 p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">Manage Shifts</p>
              <p className="text-sm text-slate-500">Create and edit shifts</p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
          </Link>
          <Link
            href="/manager/staff"
            className="group flex items-center gap-4 p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">View Staff</p>
              <p className="text-sm text-slate-500">See staff details and availability</p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
