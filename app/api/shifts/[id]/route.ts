import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/shifts/[id] - Get a specific shift
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        location: true,
        requiredSkill: true,
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })
    }

    return NextResponse.json(shift)
  } catch (error) {
    console.error("Error fetching shift:", error)
    return NextResponse.json(
      { error: "Failed to fetch shift" },
      { status: 500 }
    )
  }
}

// PATCH /api/shifts/[id] - Update a shift
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existingShift = await prisma.shift.findUnique({
      where: { id },
    })

    if (!existingShift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })
    }

    // Check if within edit cutoff
    const now = new Date()
    const cutoffTime = new Date(existingShift.startTimeUtc.getTime() - existingShift.editCutoffHours * 60 * 60 * 1000)
    
    if (now > cutoffTime && existingShift.isPublished) {
      return NextResponse.json(
        { error: "Cannot edit shift within cutoff window" },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    
    if (body.date) updateData.date = new Date(body.date)
    if (body.startTimeUtc) updateData.startTimeUtc = new Date(body.startTimeUtc)
    if (body.endTimeUtc) updateData.endTimeUtc = new Date(body.endTimeUtc)
    if (body.headcount) updateData.headcount = body.headcount
    if (body.requiredSkillId !== undefined) updateData.requiredSkillId = body.requiredSkillId
    if (typeof body.isPublished === "boolean") {
      updateData.isPublished = body.isPublished
      if (body.isPublished && !existingShift.publishedAt) {
        updateData.publishedAt = now
      }
    }

    const updatedShift = await prisma.shift.update({
      where: { id },
      data: updateData,
      include: {
        location: true,
        requiredSkill: true,
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // Cancel any pending swap requests for this shift
    if (existingShift.isPublished) {
      await prisma.swapRequest.updateMany({
        where: {
          shiftAssignment: {
            shiftId: id,
          },
          status: { in: ["PENDING", "STAFF_ACCEPTED"] },
        },
        data: {
          status: "CANCELLED",
          cancelledReason: "Shift was modified",
        },
      })
    }

    return NextResponse.json(updatedShift)
  } catch (error) {
    console.error("Error updating shift:", error)
    return NextResponse.json(
      { error: "Failed to update shift" },
      { status: 500 }
    )
  }
}

// DELETE /api/shifts/[id] - Delete a shift
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const existingShift = await prisma.shift.findUnique({
      where: { id },
      include: {
        assignments: true,
      },
    })

    if (!existingShift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })
    }

    // Check if within edit cutoff
    const now = new Date()
    const cutoffTime = new Date(existingShift.startTimeUtc.getTime() - existingShift.editCutoffHours * 60 * 60 * 1000)
    
    if (now > cutoffTime && existingShift.isPublished) {
      return NextResponse.json(
        { error: "Cannot delete shift within cutoff window" },
        { status: 400 }
      )
    }

    // Delete assignments first
    await prisma.shiftAssignment.deleteMany({
      where: { shiftId: id },
    })

    // Delete the shift
    await prisma.shift.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting shift:", error)
    return NextResponse.json(
      { error: "Failed to delete shift" },
      { status: 500 }
    )
  }
}
