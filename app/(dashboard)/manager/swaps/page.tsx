import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeftRight, ArrowDownCircle, Clock, User, AlertCircle } from "lucide-react"
import { ManagerSwapActions } from "@/components/swaps/ManagerSwapActions"

export default async function ManagerSwapsPage() {
  const session = await auth()
  const now = new Date()
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  
  // Get manager's locations
  const managedLocations = await prisma.locationAssignment.findMany({
    where: { managerId: session?.user?.id },
    select: { locationId: true },
  })
  
  const locationIds = managedLocations.map((l: { locationId: string }) => l.locationId)
  
  // Get swap requests for shifts at manager's locations
  const swapRequests = await prisma.swapRequest.findMany({
    where: {
      shiftAssignment: {
        shift: {
          locationId: { in: locationIds },
        },
      },
      status: { in: ["PENDING", "STAFF_ACCEPTED"] },
    },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      targetUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      shiftAssignment: {
        include: {
          shift: {
            include: {
              location: {
                select: {
                  id: true,
                  name: true,
                  timezone: true,
                },
              },
            },
          },
        },
      },
      targetShiftAssignment: {
        include: {
          shift: {
            include: {
              location: {
                select: {
                  id: true,
                  name: true,
                  timezone: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-100 text-amber-700 border-amber-200"
      case "STAFF_ACCEPTED":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "MANAGER_APPROVED":
        return "bg-green-100 text-green-700 border-green-200"
      case "CANCELLED":
        return "bg-slate-100 text-slate-700 border-slate-200"
      case "EXPIRED":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-slate-100 text-slate-700 border-slate-200"
    }
  }

  const formatShiftDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Swap Requests</h1>
        <p className="text-slate-500 mt-1">Review and approve shift swap and drop requests</p>
      </div>

      <div className="grid gap-4">
        {swapRequests.length === 0 ? (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <ArrowLeftRight className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No pending swap requests</p>
              <p className="text-slate-400 text-sm mt-1">New requests will appear here for approval</p>
            </CardContent>
          </Card>
        ) : (
          swapRequests.map((request) => (
            <Card key={request.id} className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                        {request.type === "SWAP" ? (
                          <div className="bg-purple-50 p-3 rounded-xl">
                            <ArrowLeftRight className="h-6 w-6 text-purple-600" />
                          </div>
                        ) : (
                          <div className="bg-cyan-50 p-3 rounded-xl">
                            <ArrowDownCircle className="h-6 w-6 text-cyan-600" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">
                          {request.type === "SWAP" ? "Swap Request" : "Drop Request"}
                        </h3>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.replace("_", " ")}
                        </Badge>
                      </div>
                      
                      <div className="mt-2 space-y-2">
                        {/* Requester info */}
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-600">
                            <span className="font-medium">{request.requester.name}</span> wants to {request.type === "SWAP" ? "swap" : "drop"}
                          </span>
                        </div>

                        {/* Original shift */}
                        {request.shiftAssignment && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-600">
                              {formatShiftDate(request.shiftAssignment.shift.date)} • {" "}
                              {formatShiftTime(
                                request.shiftAssignment.shift.startTimeUtc,
                                request.shiftAssignment.shift.endTimeUtc,
                                request.shiftAssignment.shift.location.timezone
                              )}
                            </span>
                            <Badge variant="outline" className="border-slate-200 text-slate-600 text-xs">
                              {request.shiftAssignment.shift.location.name}
                            </Badge>
                          </div>
                        )}

                        {/* Target user (for swaps) */}
                        {request.type === "SWAP" && request.targetUser && (
                          <div className="flex items-center gap-2 text-sm">
                            <ArrowLeftRight className="h-4 w-4 text-purple-400" />
                            <span className="text-slate-600">
                              With <span className="font-medium">{request.targetUser.name}</span>
                            </span>
                          </div>
                        )}

                        {/* Expiry warning */}
                        {request.expiresAt && new Date(request.expiresAt) < oneDayFromNow && (
                          <div className="flex items-center gap-2 text-sm text-amber-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>Expires soon</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <ManagerSwapActions
                    swapRequestId={request.id}
                    status={request.status}
                    type={request.type}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
