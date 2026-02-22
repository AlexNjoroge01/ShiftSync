import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronLeft, ChevronRight, Send } from "lucide-react"
import { WeekCalendar } from "@/components/schedule/WeekCalendar"
import { CreateShiftModal } from "@/components/shifts/CreateShiftModal"
import { PublishWeekButton } from "@/components/schedule/PublishWeekButton"
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns"
import type { ShiftWithDetails } from "@/types"

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
  const selectedLocation = managerLocations.find((ml) => ml.locationId === selectedLocationId)?.location

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
        where: { status: "ASSIGNED" },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
    },
    orderBy: { startTimeUtc: "asc" },
  })

  // Transform shifts to match ShiftWithDetails type
  const transformedShifts: ShiftWithDetails[] = shifts.map((shift) => ({
    id: shift.id,
    locationId: shift.locationId,
    location: {
      id: shift.location.id,
      name: shift.location.name,
      timezone: shift.location.timezone,
      address: shift.location.address,
    },
    date: shift.date,
    startTimeUtc: shift.startTimeUtc,
    endTimeUtc: shift.endTimeUtc,
    requiredSkillId: shift.requiredSkillId,
    requiredSkill: shift.requiredSkill,
    headcount: shift.headcount,
    isPublished: shift.isPublished,
    publishedAt: shift.publishedAt,
    editCutoffHours: shift.editCutoffHours,
    isPremium: shift.isPremium,
    createdBy: shift.createdBy,
    assignments: shift.assignments.map((a) => ({
      id: a.id,
      shiftId: shift.id,
      userId: a.userId,
      status: a.status as "ASSIGNED" | "CANCELLED" | "SWAPPED",
      assignedBy: "",
      assignedAt: new Date(),
      user: a.user,
    })),
  }))

  // Check if any shifts are unpublished
  const hasUnpublishedShifts = shifts.some((s) => !s.isPublished)
  const unpublishedShiftIds = shifts.filter((s) => !s.isPublished).map((s) => s.id)

  // Navigation dates
  const prevWeek = subWeeks(currentDate, 1)
  const nextWeek = addWeeks(currentDate, 1)

  // Get skills for the modal
  const skills = await prisma.skill.findMany({
    select: { id: true, name: true },
  })

  // Get locations for the modal
  const locations = managerLocations.map((ml) => ml.location)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Schedule</h1>
          <p className="text-slate-500 mt-1">
            Week of {format(weekStart, "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CreateShiftModal locations={locations} skills={skills} />
          {hasUnpublishedShifts && selectedLocationId && (
            <PublishWeekButton
              shiftIds={unpublishedShiftIds}
              locationId={selectedLocationId}
              weekStart={format(weekStart, "yyyy-MM-dd")}
            />
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
                className={`cursor-pointer px-4 py-1.5 rounded-full transition-colors ${
                  selectedLocationId === ml.locationId
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {ml.location.name}
              </Badge>
            </a>
          ))}
        </div>
      )}

      {/* Week navigation */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="flex items-center justify-between py-4">
          <a
            href={`/manager/schedule?${selectedLocationId ? `location=${selectedLocationId}&` : ""}date=${format(prevWeek, "yyyy-MM-dd")}`}
          >
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </a>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-slate-900 font-medium">
              {format(weekStart, "MMM d")} - {format(new Date(weekEnd.setDate(weekEnd.getDate() - 1)), "MMM d, yyyy")}
            </span>
          </div>
          <a
            href={`/manager/schedule?${selectedLocationId ? `location=${selectedLocationId}&` : ""}date=${format(nextWeek, "yyyy-MM-dd")}`}
          >
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* Week Calendar */}
      <WeekCalendar 
        shifts={transformedShifts} 
        currentDate={currentDate} 
        showAssignButton={true}
      />

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <p className="text-3xl font-bold text-slate-900">{shifts.length}</p>
            <p className="text-slate-500 text-sm mt-1">Total Shifts</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <p className="text-3xl font-bold text-green-600">
              {shifts.filter((s) => s.isPublished).length}
            </p>
            <p className="text-slate-500 text-sm mt-1">Published</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <p className="text-3xl font-bold text-yellow-600">
              {shifts.filter((s) => !s.isPublished).length}
            </p>
            <p className="text-slate-500 text-sm mt-1">Drafts</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <p className="text-3xl font-bold text-amber-600">
              {shifts.filter((s) => s.isPremium).length}
            </p>
            <p className="text-slate-500 text-sm mt-1">Premium Shifts</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
