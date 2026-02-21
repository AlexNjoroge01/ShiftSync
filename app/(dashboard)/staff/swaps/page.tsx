import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeftRight, ArrowDownCircle, Clock, User, Plus, X } from "lucide-react"

export default async function StaffSwapsPage() {
  const session = await auth()
  
  // Get user's swap requests
  const myRequests = await prisma.swapRequest.findMany({
    where: {
      requesterId: session?.user?.id,
    },
    include: {
      shiftAssignment: {
        include: {
          shift: {
            include: {
              location: true,
            },
          },
        },
      },
      targetUser: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  // Get available drop requests that the user could claim
  const availableDrops = await prisma.swapRequest.findMany({
    where: {
      type: "DROP",
      status: "PENDING",
      requesterId: { not: session?.user?.id },
    },
    include: {
      shiftAssignment: {
        include: {
          shift: {
            include: {
              location: true,
            },
          },
        },
      },
      requester: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Swap & Drop</h1>
          <p className="text-slate-500 mt-1">Request shift swaps or drop shifts you can&apos;t work</p>
        </div>
        <Button className="bg-slate-900 hover:bg-slate-800 text-white">
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* My Requests */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">My Requests</h2>
          {myRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <ArrowLeftRight className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No swap requests</p>
              <p className="text-slate-400 text-sm mt-1">Request a swap or drop for your shifts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {request.type === "SWAP" ? (
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                          <ArrowLeftRight className="h-5 w-5 text-purple-600" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center">
                          <ArrowDownCircle className="h-5 w-5 text-cyan-600" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {request.type === "SWAP" ? "Swap" : "Drop"}
                        </span>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {formatShiftDate(request.shiftAssignment.shift.date)} • {" "}
                          {formatShiftTime(
                            request.shiftAssignment.shift.startTimeUtc,
                            request.shiftAssignment.shift.endTimeUtc,
                            request.shiftAssignment.shift.location.timezone
                          )}
                        </span>
                      </div>
                      {request.targetUser && (
                        <p className="text-sm text-slate-500 mt-1">
                          With {request.targetUser.name}
                        </p>
                      )}
                    </div>
                  </div>
                  {request.status === "PENDING" && (
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Drops */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Available Drops</h2>
          <p className="text-sm text-slate-500 mb-4">
            Claim shifts that other staff members have dropped
          </p>
          {availableDrops.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <ArrowDownCircle className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No available drops</p>
              <p className="text-slate-400 text-sm mt-1">Check back later for available shifts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableDrops.map((drop) => (
                <div
                  key={drop.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center">
                        <ArrowDownCircle className="h-5 w-5 text-cyan-600" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {drop.shiftAssignment.shift.location.name}
                        </span>
                        {drop.shiftAssignment.shift.isPremium && (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                            Premium
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {formatShiftDate(drop.shiftAssignment.shift.date)} • {" "}
                          {formatShiftTime(
                            drop.shiftAssignment.shift.startTimeUtc,
                            drop.shiftAssignment.shift.endTimeUtc,
                            drop.shiftAssignment.shift.location.timezone
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                        <User className="h-3.5 w-3.5" />
                        <span>Dropped by {drop.requester.name}</span>
                      </div>
                    </div>
                  </div>
                  <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    Claim
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
