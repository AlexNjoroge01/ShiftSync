import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import type { Prisma, SwapRequestType, SwapRequestStatus } from "@prisma/client"

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

    const where: Prisma.SwapRequestWhereInput = {}

    // Filter by status
    if (status) {
      where.status = status as SwapRequestStatus
    }

    // Filter by type
    if (type) {
      where.type = type as SwapRequestType
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
      const locationIds = managerLocations.map((item: { locationId: string }) => item.locationId)
      
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
        { error: "Validation error", details: error.issues.map(e => e.message) },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create swap request" },
      { status: 500 }
    )
  }
}

// PUT /api/swaps - Update a swap request (claim, accept, approve, cancel)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { swapRequestId, action } = body

    if (!swapRequestId || !action) {
      return NextResponse.json(
        { error: "Missing swapRequestId or action" },
        { status: 400 }
      )
    }

    const swapRequest = await prisma.swapRequest.findUnique({
      where: { id: swapRequestId },
      include: {
        shiftAssignment: {
          include: {
            shift: {
              include: { location: true },
            },
          },
        },
        requester: { select: { id: true, name: true } },
      },
    })

    if (!swapRequest) {
      return NextResponse.json(
        { error: "Swap request not found" },
        { status: 404 }
      )
    }

    const userId = session.user.id
    const userRole = session.user.role

    switch (action) {
      case "CLAIM": {
        // Staff claims a drop request
        if (swapRequest.type !== "DROP") {
          return NextResponse.json(
            { error: "Can only claim DROP requests" },
            { status: 400 }
          )
        }

        if (swapRequest.status !== "PENDING") {
          return NextResponse.json(
            { error: "This request is no longer available" },
            { status: 400 }
          )
        }

        // Update the swap request with the claiming user
        const updated = await prisma.swapRequest.update({
          where: { id: swapRequestId },
          data: {
            targetUserId: userId,
            status: "STAFF_ACCEPTED",
          },
        })

        // Create audit log
        await prisma.auditLog.create({
          data: {
            actorId: userId,
            action: "UPDATE",
            entityType: "SwapRequest",
            entityId: swapRequestId,
            after: JSON.parse(JSON.stringify(updated)),
          },
        })

        return NextResponse.json(updated)
      }

      case "CANCEL": {
        // Requester cancels their own request
        if (swapRequest.requesterId !== userId) {
          return NextResponse.json(
            { error: "You can only cancel your own requests" },
            { status: 403 }
          )
        }

        if (swapRequest.status !== "PENDING") {
          return NextResponse.json(
            { error: "Can only cancel pending requests" },
            { status: 400 }
          )
        }

        const updated = await prisma.swapRequest.update({
          where: { id: swapRequestId },
          data: {
            status: "CANCELLED",
            cancelledReason: "Cancelled by requester",
          },
        })

        // Create audit log
        await prisma.auditLog.create({
          data: {
            actorId: userId,
            action: "CANCEL",
            entityType: "SwapRequest",
            entityId: swapRequestId,
            after: JSON.parse(JSON.stringify(updated)),
          },
        })

        return NextResponse.json(updated)
      }

      case "APPROVE": {
        // Manager approves a swap/drop
        if (userRole !== "MANAGER" && userRole !== "ADMIN") {
          return NextResponse.json(
            { error: "Only managers can approve requests" },
            { status: 403 }
          )
        }

        if (swapRequest.status !== "STAFF_ACCEPTED" && swapRequest.status !== "PENDING") {
          return NextResponse.json(
            { error: "This request cannot be approved" },
            { status: 400 }
          )
        }

        // Use a transaction to update everything atomically
        const result = await prisma.$transaction(async (tx) => {
          // For DROP: cancel original assignment and create new one
          if (swapRequest.type === "DROP" && swapRequest.targetUserId) {
            // Cancel original assignment
            await tx.shiftAssignment.update({
              where: { id: swapRequest.shiftAssignmentId },
              data: { status: "CANCELLED" },
            })

            // Create new assignment for the claiming user
            await tx.shiftAssignment.create({
              data: {
                shiftId: swapRequest.shiftId,
                userId: swapRequest.targetUserId,
                status: "ASSIGNED",
                assignedBy: userId,
              },
            })
          }

          // For SWAP: swap the assignments
          if (swapRequest.type === "SWAP" && swapRequest.targetShiftAssignmentId) {
            // Get target assignment
            const targetAssignment = await tx.shiftAssignment.findUnique({
              where: { id: swapRequest.targetShiftAssignmentId },
            })

            if (targetAssignment) {
              // Swap the user IDs
              await tx.shiftAssignment.update({
                where: { id: swapRequest.shiftAssignmentId },
                data: { userId: targetAssignment.userId },
              })

              await tx.shiftAssignment.update({
                where: { id: swapRequest.targetShiftAssignmentId },
                data: { userId: swapRequest.requesterId },
              })
            }
          }

          // Update swap request status
          return tx.swapRequest.update({
            where: { id: swapRequestId },
            data: { status: "MANAGER_APPROVED" },
          })
        })

        // Create audit log
        await prisma.auditLog.create({
          data: {
            actorId: userId,
            action: "APPROVE",
            entityType: "SwapRequest",
            entityId: swapRequestId,
            after: JSON.parse(JSON.stringify(result)),
          },
        })

        return NextResponse.json(result)
      }

      case "REJECT": {
        // Manager rejects a swap/drop
        if (userRole !== "MANAGER" && userRole !== "ADMIN") {
          return NextResponse.json(
            { error: "Only managers can reject requests" },
            { status: 403 }
          )
        }

        const updated = await prisma.swapRequest.update({
          where: { id: swapRequestId },
          data: {
            status: "CANCELLED",
            cancelledReason: "Rejected by manager",
          },
        })

        // Create audit log
        await prisma.auditLog.create({
          data: {
            actorId: userId,
            action: "REJECT",
            entityType: "SwapRequest",
            entityId: swapRequestId,
            after: JSON.parse(JSON.stringify(updated)),
          },
        })

        return NextResponse.json(updated)
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error updating swap request:", error)
    return NextResponse.json(
      { error: "Failed to update swap request" },
      { status: 500 }
    )
  }
}
