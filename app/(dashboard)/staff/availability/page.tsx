import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Calendar, AlertCircle } from "lucide-react"
import { AddAvailabilityModal } from "@/components/availability/AddAvailabilityModal"
import { AddExceptionModal } from "@/components/availability/AddExceptionModal"
import { DeleteAvailabilityButton } from "@/components/availability/DeleteAvailabilityButton"
import { EditAvailabilityModal } from "@/components/availability/EditAvailabilityModal"
import { EditDesiredHoursModal } from "@/components/availability/EditDesiredHoursModal"

export default async function StaffAvailabilityPage() {
  const session = await auth()
  
  // Get user's recurring availability
  const availability = await prisma.availability.findMany({
    where: { userId: session?.user?.id },
    orderBy: { dayOfWeek: "asc" },
  })

  // Get user's availability exceptions
  const exceptions = await prisma.availabilityException.findMany({
    where: { userId: session?.user?.id },
    orderBy: { date: "asc" },
    take: 10,
  })

  // Get user for timezone reference
  const user = await prisma.user.findUnique({
    where: { id: session?.user?.id },
    select: { desiredHoursPerWeek: true },
  })

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Availability</h1>
        <p className="text-slate-500 mt-1">Set your recurring weekly availability and exceptions</p>
      </div>

      {/* Desired Hours */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Desired Hours</CardTitle>
          <CardDescription>How many hours per week would you like to work?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-400" />
              <span className="text-2xl font-bold text-slate-900">
                {user?.desiredHoursPerWeek || "—"}
              </span>
              <span className="text-slate-500">hours/week</span>
            </div>
            <EditDesiredHoursModal currentHours={user?.desiredHoursPerWeek} />
          </div>
        </CardContent>
      </Card>

      {/* Recurring Availability */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-900">Weekly Availability</CardTitle>
              <CardDescription>Set your available times for each day of the week</CardDescription>
            </div>
            <AddAvailabilityModal />
          </div>
        </CardHeader>
        <CardContent>
          {availability.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No availability set</p>
              <p className="text-slate-400 text-sm mt-1">Add your available times to help managers schedule you</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dayNames.map((day, index) => {
                const dayAvailability = availability.filter((a) => a.dayOfWeek === index)
                return (
                  <div
                    key={day}
                    className="flex items-start gap-4 p-4 rounded-lg border border-slate-100"
                  >
                    <div className="w-24 flex-shrink-0">
                      <span className="font-medium text-slate-900">{day}</span>
                    </div>
                    <div className="flex-1">
                      {dayAvailability.length === 0 ? (
                        <span className="text-slate-400 text-sm">Not available</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {dayAvailability.map((slot) => (
                            <div key={slot.id} className="flex items-center gap-1">
                              <Badge
                                variant="outline"
                                className="border-green-200 text-green-700 bg-green-50"
                              >
                                {slot.startTime} - {slot.endTime}
                              </Badge>
                              <EditAvailabilityModal availability={slot} />
                              <DeleteAvailabilityButton id={slot.id} type="recurring" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <AddAvailabilityModal
                      trigger={
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900">
                          <Clock className="h-4 w-4" />
                        </Button>
                      }
                      defaultDay={index}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Availability Exceptions */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-900">Exceptions</CardTitle>
              <CardDescription>Specific dates when you're unavailable or have modified availability</CardDescription>
            </div>
            <AddExceptionModal />
          </div>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No exceptions</p>
              <p className="text-slate-400 text-sm mt-1">Add dates when you can't work</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exceptions.map((exception) => (
                <div
                  key={exception.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {exception.isUnavailable ? (
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-amber-500" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {new Intl.DateTimeFormat("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(exception.date)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {exception.isUnavailable
                          ? "Fully unavailable"
                          : exception.startTime && exception.endTime
                          ? `Available ${exception.startTime} - ${exception.endTime}`
                          : "Modified availability"}
                      </p>
                    </div>
                  </div>
                  <DeleteAvailabilityButton id={exception.id} type="exception" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
