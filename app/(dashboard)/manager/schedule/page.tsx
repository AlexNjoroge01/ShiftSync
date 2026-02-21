import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronLeft, ChevronRight, Plus, Send } from "lucide-react"
import { WeekCalendar } from "@/components/schedule/WeekCalendar"
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns"

interface SchedulePageProps {
  searchParams: Promise<{ date?: string; location?: string }>
}

export default async function ManagerSchedulePage({ searchParams }: SchedulePageProps) {
  const session = await auth()
  const params = await searchParams
  
  // Get current week from URL or default to today
  const currentDate = params.date ? new Date(params.date) : new Date()
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  // Get manager's locations
  const managerLocations = await prisma.locationAssignment.findMany({
    where: { managerId: session?.user?.id },
    include: { location: true },
  })
  const locationIds = managerLocations.map((l) => l.locationId)

  // Get selected location or first location
  const selectedLocationId = params.location || locationIds[0] || null

  // Get shifts for the week
  const shifts = await prisma.shift.findMany({
    where: {
      locationId: selectedLocationId || undefined,
      startTimeUtc: {
        gte: weekStart,
        lt: weekEnd,
      },
    },
    include: {
      location: true,
      requiredSkill: true,
      createdBy: { select: { id: true, name: true } },
      assignments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { startTimeUtc: "asc" },
  })

  // Check if any shifts are unpublished
  const hasUnpublishedShifts = shifts.some((s) => !s.isPublished)

  // Navigation dates
  const prevWeek = subWeeks(currentDate, 1)
  const nextWeek = addWeeks(currentDate, 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Schedule</h1>
          <p className="text-slate-400 mt-1">
            Week of {format(weekStart, "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-slate-600 text-slate-300">
            <Plus className="h-4 w-4 mr-2" />
            Add Shift
          </Button>
          {hasUnpublishedShifts && (
            <Button className="bg-green-600 hover:bg-green-700">
              <Send className="h-4 w-4 mr-2" />
              Publish Week
            </Button>
          )}
        </div>
      </div>

      {/* Location selector */}
      {managerLocations.length > 1 && (
        <div className="flex gap-2">
          {managerLocations.map((ml) => (
            <a
              key={ml.locationId}
              href={`/manager/schedule?location=${ml.locationId}&date=${format(currentDate, "yyyy-MM-dd")}`}
            >
              <Badge
                variant={selectedLocationId === ml.locationId ? "default" : "outline"}
                className={`cursor-pointer ${
                  selectedLocationId === ml.locationId
                    ? "bg-blue-600"
                    : "border-slate-600 text-slate-300"
                }`}
              >
                {ml.location.name}
              </Badge>
            </a>
          ))}
        </div>
      )}

      {/* Week navigation */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="flex items-center justify-between py-4">
          <a
            href={`/manager/schedule?${selectedLocationId ? `location=${selectedLocationId}&` : ""}date=${format(prevWeek, "yyyy-MM-dd")}`}
          >
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </a>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <span className="text-white font-medium">
              {format(weekStart, "MMM d")} - {format(new Date(weekEnd.setDate(weekEnd.getDate() - 1)), "MMM d, yyyy")}
            </span>
          </div>
          <a
            href={`/manager/schedule?${selectedLocationId ? `location=${selectedLocationId}&` : ""}date=${format(nextWeek, "yyyy-MM-dd")}`}
          >
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* Week Calendar */}
      <WeekCalendar shifts={shifts} currentDate={currentDate} />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{shifts.length}</div>
            <p className="text-slate-400 text-sm">Total Shifts</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-400">
              {shifts.filter((s) => s.isPublished).length}
            </div>
            <p className="text-slate-400 text-sm">Published</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-400">
              {shifts.filter((s) => !s.isPublished).length}
            </div>
            <p className="text-slate-400 text-sm">Drafts</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-400">
              {shifts.filter((s) => s.isPremium).length}
            </div>
            <p className="text-slate-400 text-sm">Premium Shifts</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
