import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/audit/export - Export audit logs as CSV
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const locationId = searchParams.get("locationId")
    const entityType = searchParams.get("entityType")
    const actorId = searchParams.get("actorId")

    // Build where clause
    const where: {
      createdAt?: { gte?: Date; lte?: Date }
      entityType?: string
      actorId?: string
    } = {}

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    if (entityType) where.entityType = entityType
    if (actorId) where.actorId = actorId

    // Managers can only see audit logs for their locations
    if (session.user.role === "MANAGER" && locationId) {
      const assignment = await prisma.locationAssignment.findFirst({
        where: {
          managerId: session.user.id,
          locationId,
        },
      })
      if (!assignment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Fetch audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10000, // Limit to prevent memory issues
    })

    // Generate CSV
    const headers = [
      "Timestamp",
      "Actor Name",
      "Actor Email",
      "Action",
      "Entity Type",
      "Entity ID",
      "Before (JSON)",
      "After (JSON)",
    ]

    const rows = auditLogs.map((log) => [
      log.createdAt.toISOString(),
      log.actor.name,
      log.actor.email,
      log.action,
      log.entityType,
      log.entityId,
      log.before ? JSON.stringify(log.before).replace(/"/g, '""') : "",
      log.after ? JSON.stringify(log.after).replace(/"/g, '""') : "",
    ])

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    // Return as downloadable file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error exporting audit logs:", error)
    return NextResponse.json(
      { error: "Failed to export audit logs" },
      { status: 500 }
    )
  }
}
