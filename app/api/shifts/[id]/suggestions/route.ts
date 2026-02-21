import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { findStaffSuggestions } from "@/lib/scheduling/suggestions"

// GET /api/shifts/[id]/suggestions - Get staff suggestions for a shift
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: shiftId } = await params

    // Get shift details
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        location: true,
        requiredSkill: true,
        assignments: {
          where: { status: "ASSIGNED" },
          select: { userId: true },
        },
      },
    })

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })
    }

    // Check access
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

    // Get already assigned user IDs
    const assignedUserIds = shift.assignments.map((a) => a.userId)

    // Get suggestions
    const suggestions = await findStaffSuggestions({
      shiftId: shift.id,
      locationId: shift.locationId,
      requiredSkillId: shift.requiredSkillId,
      startTimeUtc: shift.startTimeUtc,
      endTimeUtc: shift.endTimeUtc,
      excludeUserIds: assignedUserIds,
    })

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("Error fetching suggestions:", error)
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    )
  }
}
