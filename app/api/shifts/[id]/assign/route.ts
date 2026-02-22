import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkAssignmentConstraints } from "@/lib/scheduling/constraints"
import { notifyNewAssignment } from "@/lib/realtime/sse"
import { z } from "zod"

const assignSchema = z.object({
  userId: z.string().min(1, "User is required"),
  overrideReason: z.string().optional(), // For overtime overrides
})

// POST /api/shifts/[id]/assign - Assign a staff member to a shift
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id: shiftId } = await params
    
    if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = assignSchema.parse(body)

    // Get shift details
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        location: true,
        assignments: {
          where: { status: "ASSIGNED" },
        },
      },
    })

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })
    }

    // Check manager access
    if (session.user.role === "MANAGER") {
      const assignment = await prisma.locationAssignment.findFirst({
        where: {
          managerId: session.user.id,
          locationId: shift.locationId,
        },
      })
      if (!assignment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Check if shift is full
    if (shift.assignments.length >= shift.headcount) {
      return NextResponse.json(
        { error: "Shift is already at full capacity" },
        { status: 400 }
      )
    }

    // Check if user is already assigned
    const existingAssignment = await prisma.shiftAssignment.findUnique({
      where: {
        shiftId_userId: {
          shiftId,
          userId: validatedData.userId,
        },
      },
    })

    if (existingAssignment) {
      return NextResponse.json(
        { error: "User is already assigned to this shift" },
        { status: 400 }
      )
    }

    // Run constraint checks
    const constraintResult = await checkAssignmentConstraints(
      validatedData.userId,
      shiftId,
      session.user.id
    )

    // Check for hard blocks
    const hardBlocks = constraintResult.violations.filter(
      (v) =>
        v.rule === "CERTIFICATION" ||
        v.rule === "DOUBLE_BOOKING" ||
        v.rule === "DAILY_HOURS_12" ||
        v.rule === "CONSECUTIVE_DAYS_7"
    )

    if (hardBlocks.length > 0 && !validatedData.overrideReason) {
      return NextResponse.json(
        {
          error: "Constraint violations detected",
          violations: constraintResult.violations,
          requiresOverride: true,
        },
        { status: 409 }
      )
    }

    // Use transaction with row-level locking for concurrent assignment protection
    const result = await prisma.$transaction(async (tx) => {
      // Lock the user's assignments to prevent concurrent modifications
      await tx.$queryRaw`
        SELECT id FROM shift_assignments 
        WHERE "userId" = ${validatedData.userId} 
        AND status = 'ASSIGNED'
        FOR UPDATE
      `

      // Create the assignment
      const assignment = await tx.shiftAssignment.create({
        data: {
          shiftId,
          userId: validatedData.userId,
          assignedBy: session.user.id,
          status: "ASSIGNED",
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          shift: {
            include: { location: true },
          },
        },
      })

      // Create overtime override if needed
      if (validatedData.overrideReason) {
        const overtimeViolations = constraintResult.violations.filter(
          (v) =>
            v.rule === "DAILY_HOURS_12" ||
            v.rule === "CONSECUTIVE_DAYS_7" ||
            v.rule === "WEEKLY_HOURS_40"
        )

        if (overtimeViolations.length > 0) {
          await tx.overtimeOverride.create({
            data: {
              shiftAssignmentId: assignment.id,
              managerId: session.user.id,
              reason: validatedData.overrideReason,
            },
          })
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "ASSIGN",
          entityType: "ShiftAssignment",
          entityId: assignment.id,
          after: JSON.parse(JSON.stringify(assignment)),
        },
      })

      return assignment
    })

    // Create in-app notification for the assigned staff
    await prisma.notification.create({
      data: {
        userId: validatedData.userId,
        type: "SHIFT_ASSIGNED",
        title: "New Shift Assignment",
        message: `You have been assigned to a shift at ${result.shift.location.name} on ${result.shift.date.toLocaleDateString()}`,
        meta: {
          shiftId,
          locationId: result.shift.locationId,
          date: result.shift.date.toISOString(),
        },
      },
    })

    // Send real-time notification
    notifyNewAssignment(validatedData.userId, shiftId, {
      locationName: result.shift.location.name,
      date: result.shift.date.toISOString(),
      startTime: result.shift.startTimeUtc.toISOString(),
      endTime: result.shift.endTimeUtc.toISOString(),
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error assigning shift:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to assign shift" },
      { status: 500 }
    )
  }
}

// DELETE /api/shifts/[id]/assign - Remove a staff member from a shift
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id: shiftId } = await params
    
    if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Get the assignment
    const assignment = await prisma.shiftAssignment.findUnique({
      where: {
        shiftId_userId: {
          shiftId,
          userId,
        },
      },
      include: {
        shift: {
          include: { location: true },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      )
    }

    // Check manager access
    if (session.user.role === "MANAGER") {
      const locationAssignment = await prisma.locationAssignment.findFirst({
        where: {
          managerId: session.user.id,
          locationId: assignment.shift.locationId,
        },
      })
      if (!locationAssignment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Cancel the assignment
    const updatedAssignment = await prisma.shiftAssignment.update({
      where: { id: assignment.id },
      data: { status: "CANCELLED" },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "UNASSIGN",
        entityType: "ShiftAssignment",
        entityId: assignment.id,
        before: JSON.parse(JSON.stringify(assignment)),
        after: JSON.parse(JSON.stringify(updatedAssignment)),
      },
    })

    return NextResponse.json(updatedAssignment)
  } catch (error) {
    console.error("Error unassigning shift:", error)
    return NextResponse.json(
      { error: "Failed to unassign shift" },
      { status: 500 }
    )
  }
}
