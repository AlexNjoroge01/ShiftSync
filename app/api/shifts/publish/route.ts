import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { notifySchedulePublished } from "@/lib/realtime/sse"

const publishSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  action: z.enum(["publish", "unpublish"]),
})

// POST /api/shifts/publish - Publish or unpublish a week's shifts
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = publishSchema.parse(body)

    // Check manager access to location
    if (session.user.role === "MANAGER") {
      const assignment = await prisma.locationAssignment.findFirst({
        where: {
          managerId: session.user.id,
          locationId: validatedData.locationId,
        },
      })
      if (!assignment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Calculate week range
    const weekStart = new Date(validatedData.weekStart)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    // Get all shifts for the week
    const shifts = await prisma.shift.findMany({
      where: {
        locationId: validatedData.locationId,
        startTimeUtc: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      include: {
        assignments: {
          where: { status: "ASSIGNED" },
          include: { user: { select: { id: true } } },
        },
      },
    })

    if (shifts.length === 0) {
      return NextResponse.json(
        { error: "No shifts found for this week" },
        { status: 400 }
      )
    }

    // For unpublish, check edit cutoff
    if (validatedData.action === "unpublish") {
      const earliestShift = shifts.reduce((earliest, shift) =>
        shift.startTimeUtc < earliest.startTimeUtc ? shift : earliest
      )

      const cutoffTime = new Date(earliestShift.startTimeUtc)
      cutoffTime.setHours(cutoffTime.getHours() - earliestShift.editCutoffHours)

      if (new Date() > cutoffTime) {
        return NextResponse.json(
          { error: "Cannot unpublish - within edit cutoff window" },
          { status: 400 }
        )
      }
    }

    // Update all shifts
    const isPublished = validatedData.action === "publish"
    const publishedAt = isPublished ? new Date() : null

    await prisma.shift.updateMany({
      where: {
        id: { in: shifts.map((s) => s.id) },
      },
      data: {
        isPublished,
        publishedAt,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: isPublished ? "PUBLISH" : "UNPUBLISH",
        entityType: "Shift",
        entityId: validatedData.locationId,
        after: {
          locationId: validatedData.locationId,
          weekStart: validatedData.weekStart,
          shiftCount: shifts.length,
          isPublished,
        },
      },
    })

    // Get all affected staff IDs
    const staffIds = new Set<string>()
    shifts.forEach((shift) => {
      shift.assignments.forEach((assignment) => {
        staffIds.add(assignment.user.id)
      })
    })

    // Send real-time notification
    notifySchedulePublished(
      validatedData.locationId,
      validatedData.weekStart,
      Array.from(staffIds)
    )

    // Create notifications for affected staff
    if (isPublished) {
      await prisma.notification.createMany({
        data: Array.from(staffIds).map((userId) => ({
          userId,
          type: "SCHEDULE_PUBLISHED",
          title: "Schedule Published",
          message: `Your schedule for the week of ${weekStart.toLocaleDateString()} has been published.`,
          meta: {
            locationId: validatedData.locationId,
            weekStart: validatedData.weekStart,
          },
        })),
      })
    } else {
      await prisma.notification.createMany({
        data: Array.from(staffIds).map((userId) => ({
          userId,
          type: "SCHEDULE_UNPUBLISHED",
          title: "Schedule Unpublished",
          message: `The schedule for the week of ${weekStart.toLocaleDateString()} has been unpublished.`,
          meta: {
            locationId: validatedData.locationId,
            weekStart: validatedData.weekStart,
          },
        })),
      })
    }

    return NextResponse.json({
      success: true,
      action: validatedData.action,
      shiftCount: shifts.length,
      affectedStaff: staffIds.size,
    })
  } catch (error) {
    console.error("Error publishing shifts:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to publish shifts" },
      { status: 500 }
    )
  }
}
