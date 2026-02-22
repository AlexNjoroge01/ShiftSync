import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { History, Filter, Download, User, Clock, FileText } from "lucide-react"
import type { AuditLog, User as PrismaUser } from "@prisma/client"

type AuditLogWithActor = AuditLog & {
  actor: Pick<PrismaUser, 'id' | 'name' | 'email' | 'role'>
}

export default async function ManagerAuditPage() {
  const session = await auth()
  
  // Get manager's locations
  const managerLocations = await prisma.locationAssignment.findMany({
    where: { managerId: session?.user?.id },
    select: { locationId: true },
  })
  const locationIds = managerLocations.map((l) => l.locationId)

  // Get shifts at manager's locations
  const shiftsAtLocations = await prisma.shift.findMany({
    where: { locationId: { in: locationIds } },
    select: { id: true },
  })
  const shiftIds = shiftsAtLocations.map((s) => s.id)

  // Get shift assignments for those shifts
  const shiftAssignments = await prisma.shiftAssignment.findMany({
    where: { shiftId: { in: shiftIds } },
    select: { id: true },
  })
  const shiftAssignmentIds = shiftAssignments.map((sa) => sa.id)

  // Get swap requests for those shifts
  const swapRequests = await prisma.swapRequest.findMany({
    where: { shiftId: { in: shiftIds } },
    select: { id: true },
  })
  const swapRequestIds = swapRequests.map((sr) => sr.id)

  // Get audit logs filtered by relevant entity IDs
  const auditLogs: AuditLogWithActor[] = await prisma.auditLog.findMany({
    where: {
      OR: [
        // Shifts at manager's locations
        {
          entityType: "Shift",
          entityId: { in: shiftIds },
        },
        // Shift assignments for those shifts
        {
          entityType: "ShiftAssignment",
          entityId: { in: shiftAssignmentIds },
        },
        // Swap requests for those shifts
        {
          entityType: "SwapRequest",
          entityId: { in: swapRequestIds },
        },
        // Location certifications at manager's locations
        {
          entityType: "LocationCertification",
        },
        // Availability changes
        {
          entityType: "Availability",
        },
      ],
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  // Further filter to only show relevant logs
  const relevantLogs = auditLogs.filter((log) => {
    if (log.entityType === "LocationCertification") {
      const locationId = (log.after as { locationId?: string })?.locationId || 
                         (log.before as { locationId?: string })?.locationId
      return locationId && locationIds.includes(locationId)
    }
    return true
  })

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-green-100 text-green-700 border-green-200"
      case "UPDATE":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "DELETE":
        return "bg-red-100 text-red-700 border-red-200"
      case "PUBLISH":
        return "bg-purple-100 text-purple-700 border-purple-200"
      case "UNPUBLISH":
        return "bg-orange-100 text-orange-700 border-orange-200"
      case "ASSIGN":
        return "bg-cyan-100 text-cyan-700 border-cyan-200"
      case "UNASSIGN":
        return "bg-amber-100 text-amber-700 border-amber-200"
      case "APPROVE":
        return "bg-emerald-100 text-emerald-700 border-emerald-200"
      case "CANCEL":
        return "bg-rose-100 text-rose-700 border-rose-200"
      case "REJECT":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-slate-100 text-slate-700 border-slate-200"
    }
  }

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date)
  }

  const getEntityLabel = (entityType: string) => {
    switch (entityType) {
      case "Shift":
        return "Shift"
      case "ShiftAssignment":
        return "Shift Assignment"
      case "SwapRequest":
        return "Swap Request"
      case "LocationCertification":
        return "Certification"
      case "Availability":
        return "Availability"
      case "User":
        return "User"
      case "Location":
        return "Location"
      default:
        return entityType
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Audit Trail</h1>
          <p className="text-slate-500 mt-1">Track changes to shifts and assignments at your locations</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-slate-200 text-slate-700">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button className="bg-slate-900 hover:bg-slate-800 text-white">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Showing last 100 actions for shifts at your locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {relevantLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No audit logs yet</p>
              <p className="text-slate-400 text-sm mt-1">Actions will appear here as they occur</p>
            </div>
          ) : (
            <div className="space-y-4">
              {relevantLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-slate-500" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900">{log.actor.name}</span>
                      <Badge variant="outline" className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                      <span className="text-slate-500 text-sm">
                        {getEntityLabel(log.entityType)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTimestamp(log.createdAt)}
                    </div>
                    {log.before || log.after ? (
                      <div className="mt-2 text-xs text-slate-400 font-mono bg-slate-50 p-2 rounded overflow-x-auto">
                        {log.before && (
                          <div className="truncate">Before: {JSON.stringify(log.before).slice(0, 100)}...</div>
                        )}
                        {log.after && (
                          <div className="truncate">After: {JSON.stringify(log.after).slice(0, 100)}...</div>
                        )}
                      </div>
                    ) : null}
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
