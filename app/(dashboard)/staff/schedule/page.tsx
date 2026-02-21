import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Users } from "lucide-react"

export default async function StaffSchedulePage() {
  const session = await auth()
  
  // Get current week date range
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 14) // Show 2 weeks

  // Get user's shifts
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      userId: session?.user?.id,
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
          requiredSkill: true,
        },
      },
    },
    orderBy: {
      shift: {
        startTimeUtc: "asc",
      },
    },
  })

  const formatShiftDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(date)
  }

  const formatShiftTime = (start: Date, end: Date, timezone: string) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    })
    return `${formatter.format(start)} - ${formatter.format(end)}`
  }

  const isOvernight = (start: Date, end: Date) => {
    return end.getDate() !== start.getDate()
  }

  // Group shifts by date
  const shiftsByDate = assignments.reduce((acc, assignment) => {
    const dateKey = assignment.shift.date.toDateString()
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(assignment)
    return acc
  }, {} as Record<string, typeof assignments>)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Schedule</h1>
        <p className="text-slate-500 mt-1">View your upcoming shifts</p>
      </div>

      {/* Week Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">This Week</p>
                <p className="text-2xl font-bold text-slate-900">{assignments.length} shifts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shifts List */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Upcoming Shifts</CardTitle>
          <CardDescription>
            Next 2 weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No upcoming shifts</p>
              <p className="text-slate-400 text-sm mt-1">Your scheduled shifts will appear here</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(shiftsByDate).map(([dateKey, dayAssignments]) => (
                <div key={dateKey}>
                  <h3 className="text-sm font-medium text-slate-500 mb-3">
                    {formatShiftDate(new Date(dateKey))}
                  </h3>
                  <div className="space-y-3">
                    {dayAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center">
                              <Clock className="h-5 w-5 text-slate-400" />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-slate-900">
                                {formatShiftTime(
                                  assignment.shift.startTimeUtc,
                                  assignment.shift.endTimeUtc,
                                  assignment.shift.location.timezone
                                )}
                              </span>
                              {assignment.shift.isPremium && (
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                                  Premium
                                </Badge>
                              )}
                              {isOvernight(assignment.shift.startTimeUtc, assignment.shift.endTimeUtc) && (
                                <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                                  Overnight
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                              <MapPin className="h-3.5 w-3.5" />
                              {assignment.shift.location.name}
                            </div>
                            {assignment.shift.requiredSkill && (
                              <Badge variant="outline" className="mt-2 border-slate-200 text-slate-600">
                                {assignment.shift.requiredSkill.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
