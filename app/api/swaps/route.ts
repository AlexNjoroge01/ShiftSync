import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSwapRequestSchema = z.object({
  type: z.enum(["SWAP", "DROP"]),
  shiftAssignmentId: z.string().min(1, "Shift assignment is required"),
  targetUserId: z.string().optional().nullable(),
  targetShiftAssignmentId: z.string().optional().nullable(),
})

// GET /api/swaps - List swap requests
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const type = searchParams.get("type")

    const where: {
      status?: string
      type?: string
      OR?: Array<{ requesterId?: string; targetUserId?: string; shift?: { locationId: { in: string[] } } }>
    } = {}

    // Filter by status
    if (status) {
      where.status = status
    }

    // Filter by type
    if (type) {
      where.type = type
    }

    // Role-based filtering
    if (session.user.role === "STAFF") {
      // Staff see their own requests and requests targeting them
      where.OR = [
        { requesterId: session.user.id },
        { targetUserId: session.user.id },
      ]
    } else if (session.user.role === "MANAGER") {
      // Managers see requests for shifts at their locations
      const managerLocations = await prisma.locationAssignment.findMany({
        where: { managerId: session.user.id },
        select: { locationId: true },
      })
      const locationIds = managerLocations.map((l) => l.locationId)
      
      where.OR = [
        { shift: { locationId: { in: locationIds } } },
      ]
    }
    // Admins see all requests

    const swapRequests = await prisma.swapRequest.findMany({
      where,
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
        targetUser: {
          select: { id: true, name: true, email: true },
        },
        shift: {
          include: {
            location: true,
            requiredSkill: true,
          },
        },
        shiftAssignment: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        targetShiftAssignment: {
          include: {
            shift: {
              include: { location: true },
            },
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(swapRequests)
  } catch (error) {
    console.error("Error fetching swap requests:", error)
    return NextResponse.json(
      { error: "Failed to fetch swap requests" },
      { status: 500 }
    )
  }
}

// POST /api/swaps - Create a swap request
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createSwapRequestSchema.parse(body)

    // Get the shift assignment
    const shiftAssignment = await prisma.shiftAssignment.findUnique({
      where: { id: validatedData.shiftAssignmentId },
      include: {
        shift: {
          include: { location: true },
        },
      },
    })

    if (!shiftAssignment) {
      return NextResponse.json(
        { error: "Shift assignment not found" },
        { status: 404 }
      )
    }

    // Verify the user owns this assignment
    if (shiftAssignment.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only request swaps for your own shifts" },
        { status: 403 }
      )
    }

    // Check for pending request limit (max 3)
    const pendingCount = await prisma.swapRequest.count({
      where: {
        requesterId: session.user.id,
        status: "PENDING",
      },
    })

    if (pendingCount >= 3) {
      return NextResponse.json(
        { error: "You have reached the maximum of 3 pending swap requests" },
        { status: 400 }
      )
    }

    // Calculate expiry time (24 hours before shift start)
    const expiresAt = new Date(shiftAssignment.shift.startTimeUtc)
    expiresAt.setHours(expiresAt.getHours() - 24)

    // Create the swap request
    const swapRequest = await prisma.swapRequest.create({
      data: {
        type: validatedData.type,
        requesterId: session.user.id,
        shiftId: shiftAssignment.shiftId,
        shiftAssignmentId: validatedData.shiftAssignmentId,
        targetUserId: validatedData.targetUserId,
        targetShiftAssignmentId: validatedData.targetShiftAssignmentId,
        expiresAt,
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
        shift: {
          include: {
            location: true,
          },
        },
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "CREATE",
        entityType: "SwapRequest",
        entityId: swapRequest.id,
        after: JSON.parse(JSON.stringify(swapRequest)),
      },
    })

    // TODO: Send notification to manager (for DROP) or target user (for SWAP)

    return NextResponse.json(swapRequest, { status: 201 })
  } catch (error) {
    console.error("Error creating swap request:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create swap request" },
      { status: 500 }
    )
  }
}
