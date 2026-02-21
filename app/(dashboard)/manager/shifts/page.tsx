import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Plus, Clock, Users, MapPin, Edit, Eye } from "lucide-react"
import type { Shift, Location } from "@prisma/client"

type ShiftWithDetails = Shift & {
  location: Location
  assignments: {
    id: string
    status: string
    user: {
      id: string
      name: string
    }
  }[]
  requiredSkill: {
    id: string
    name: string
  } | null
  _count: {
    assignments: number
  }
}

export default async function ManagerShiftsPage() {
  const session = await auth()
  
  // Get manager's locations
  const managedLocations = await prisma.locationAssignment.findMany({
    where: { managerId: session?.user?.id },
    select: { locationId: true },
  })
  
  const locationIds = managedLocations.map((l) => l.locationId)
  
  const shifts: ShiftWithDetails[] = await prisma.shift.findMany({
    where: {
      locationId: { in: locationIds },
    },
    include: {
      location: true,
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      requiredSkill: true,
      _count: {
        select: { assignments: true },
      },
    },
    orderBy: [
      { date: "asc" },
      { startTimeUtc: "asc" },
    ],
    take: 50,
  })

  const formatShiftTime = (start: Date, end: Date, timezone: string) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    })
    return `${formatter.format(start)} - ${formatter.format(end)}`
  }

  const formatShiftDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const isOvernight = (start: Date, end: Date) => {
    return end.getDate() !== start.getDate()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Shift Management</h1>
          <p className="text-slate-500 mt-1">Create and manage shifts at your locations</p>
        </div>
        <Button className="bg-slate-900 hover:bg-slate-800 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Create Shift
        </Button>
      </div>

      <div className="grid gap-4">
        {shifts.length === 0 ? (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No shifts found</p>
              <p className="text-slate-400 text-sm mt-1">Create your first shift to get started</p>
            </CardContent>
          </Card>
        ) : (
          shifts.map((shift) => (
            <Card key={shift.id} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-xl bg-blue-50 flex flex-col items-center justify-center">
                        <span className="text-xs text-blue-600 font-medium">
                          {formatShiftDate(shift.date).split(" ")[0]}
                        </span>
                        <span className="text-lg font-bold text-blue-700">
                          {formatShiftDate(shift.date).split(" ")[2]}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">
                          {shift.location.name}
                        </h3>
                        {shift.isPremium && (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                            Premium
                          </Badge>
                        )}
                        {shift.isPublished ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            Published
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                            Draft
                          </Badge>
                        )}
                        {isOvernight(shift.startTimeUtc, shift.endTimeUtc) && (
                          <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                            Overnight
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          {formatShiftTime(shift.startTimeUtc, shift.endTimeUtc, shift.location.timezone)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {shift.location.address}
                        </div>
                      </div>
                      {shift.requiredSkill && (
                        <div className="mt-2">
                          <Badge variant="outline" className="border-slate-200 text-slate-600">
                            {shift.requiredSkill.name}
                          </Badge>
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {shift._count.assignments} / {shift.headcount} assigned
                        </span>
                        {shift.assignments.length > 0 && (
                          <div className="flex -space-x-2 ml-2">
                            {shift.assignments.slice(0, 3).map((a) => (
                              <div
                                key={a.id}
                                className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-600"
                              >
                                {a.user.name.charAt(0)}
                              </div>
                            ))}
                            {shift.assignments.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-600">
                                +{shift.assignments.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
