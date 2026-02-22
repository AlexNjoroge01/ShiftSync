import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import type { Prisma, SwapRequestType, SwapRequestStatus } from "@prisma/client"

const createSwapRequestSchema = z.object({
  type: z.enum(["SWAP", "DROP"]),
  shiftAssignmentId: z.string().optional().nullable(),
  shiftId: z.string().optional().nullable(),
  targetUserId: z.string().optional().nullable(),
  targetShiftAssignmentId: z.string().optional().nullable(),
  action: z.enum(["PICKUP"]).optional(),
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

    // Handle PICKUP action for unassigned shifts
    if (validatedData.action === "PICKUP" && validatedData.shiftId) {
      // Get the shift
      const shift = await prisma.shift.findUnique({
        where: { id: validatedData.shiftId },
        include: {
          location: true,
          requiredSkill: true,
        },
      })

      if (!shift) {
        return NextResponse.json(
          { error: "Shift not found" },
          { status: 404 }
        )
      }

      // Check if user is certified for this location
      const certification = await prisma.locationCertification.findUnique({
        where: {
          userId_locationId: {
            userId: session.user.id,
            locationId: shift.locationId,
          },
        },
      })

      if (!certification) {
        return NextResponse.json(
          { error: "You are not certified to work at this location" },
          { status: 403 }
        )
      }

      // Check if user has the required skill (only if shift requires a skill)
      if (shift.requiredSkillId) {
        const userSkill = await prisma.userSkill.findUnique({
          where: {
            userId_skillId: {
              userId: session.user.id,
              skillId: shift.requiredSkillId,
            },
          },
        })

        if (!userSkill) {
          return NextResponse.json(
            { error: "You do not have the required skill for this shift" },
            { status: 403 }
          )
        }
      }

      // Check constraints
      const { checkAssignmentConstraints } = await import("@/lib/scheduling/constraints")
      const constraintCheck = await checkAssignmentConstraints(
        session.user.id,
        shift.id,
        session.user.id
      )

      // Check for hard blocks
      const hardBlocks = constraintCheck.violations.filter(
        (v) =>
          v.rule === "CERTIFICATION" ||
          v.rule === "DOUBLE_BOOKING" ||
          v.rule === "DAILY_HOURS_12" ||
          v.rule === "CONSECUTIVE_DAYS_7"
      )

      if (hardBlocks.length > 0) {
        return NextResponse.json(
          {
            error: "Cannot pick up this shift due to constraint violations",
            violations: hardBlocks,
          },
          { status: 400 }
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

      // Create a swap request to track this pickup (no shiftAssignmentId since it's unassigned)
      const swapRequest = await prisma.swapRequest.create({
        data: {
          type: "DROP",
          requesterId: session.user.id,
          shiftId: shift.id,
          shiftAssignmentId: undefined, // Undefined for pickup requests (unassigned shifts)
          targetUserId: session.user.id, // The user picking up
          status: "STAFF_ACCEPTED", // Skip to staff accepted since they're claiming it
          expiresAt: new Date(shift.startTimeUtc.getTime() - 24 * 60 * 60 * 1000),
        },
        include: {
          shift: {
            include: { location: true },
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

      // Notify managers about the pickup request
      const managers = await prisma.locationAssignment.findMany({
        where: { locationId: shift.locationId },
        include: {
          manager: {
            select: { id: true, name: true, email: true, notificationPreference: true },
          },
        },
      })

      const requester = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      })

      for (const assignment of managers) {
        await prisma.notification.create({
          data: {
            userId: assignment.managerId,
            type: "DROP_CLAIMED",
            title: "Shift Pickup Request",
            message: `${requester?.name || "Someone"} wants to pick up an unassigned shift at ${shift.location.name} on ${shift.date.toLocaleDateString()}. Approval needed.`,
            meta: {
              swapRequestId: swapRequest.id,
              shiftId: shift.id,
              locationId: shift.locationId,
              claimedBy: session.user.id,
            },
          },
        })
      }

      // Broadcast SSE event
      const { notifySwapUpdate } = await import("@/lib/realtime/sse")
      notifySwapUpdate(
        managers.map((m) => m.managerId),
        swapRequest.id,
        "STAFF_ACCEPTED"
      )

      return NextResponse.json(swapRequest, { status: 201 })
    }

    // Regular swap/drop request flow
    if (!validatedData.shiftAssignmentId) {
      return NextResponse.json(
        { error: "Shift assignment is required" },
        { status: 400 }
      )
    }

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

    // For bilateral SWAP, check constraints for both parties
    if (validatedData.type === "SWAP" && validatedData.targetShiftAssignmentId) {
      const { checkAssignmentConstraints } = await import("@/lib/scheduling/constraints")
      
      // Get target shift assignment
      const targetShiftAssignment = await prisma.shiftAssignment.findUnique({
        where: { id: validatedData.targetShiftAssignmentId },
        include: {
          shift: {
            include: { location: true },
          },
        },
      })

      if (!targetShiftAssignment) {
        return NextResponse.json(
          { error: "Target shift assignment not found" },
          { status: 404 }
        )
      }

      // Check if requester can work the target's shift
      const requesterConstraints = await checkAssignmentConstraints(
        session.user.id,
        targetShiftAssignment.shiftId,
        session.user.id
      )

      // Check if target can work the requester's shift
      const targetConstraints = await checkAssignmentConstraints(
        targetShiftAssignment.userId,
        shiftAssignment.shiftId,
        session.user.id
      )

      // Collect all violations
      const allViolations = [
        ...requesterConstraints.violations.map(v => ({ party: "requester", ...v })),
        ...targetConstraints.violations.map(v => ({ party: "target", ...v })),
      ]

      // Check for hard blocks (certification, double-booking)
      const hardBlocks = allViolations.filter(
        (v) =>
          v.rule === "CERTIFICATION" ||
          v.rule === "DOUBLE_BOOKING" ||
          v.rule === "DAILY_HOURS_12" ||
          v.rule === "CONSECUTIVE_DAYS_7"
      )

      if (hardBlocks.length > 0) {
        return NextResponse.json(
          {
            error: "Swap cannot be completed due to constraint violations",
            violations: hardBlocks,
          },
          { status: 400 }
        )
      }
    }

    // Calculate expiry time (24 hours before shift start)
    const expiresAt = new Date(shiftAssignment.shift.startTimeUtc)
    expiresAt.setHours(expiresAt.getHours() - 24)

    // Sanitize targetUserId - ensure it's a valid user ID or null
    // Empty strings, "any", or undefined should be null
    const sanitizedTargetUserId = validatedData.targetUserId && 
      validatedData.targetUserId !== "any" && 
      validatedData.targetUserId.trim() !== "" 
      ? validatedData.targetUserId 
      : null

    // Create the swap request
    const swapRequest = await prisma.swapRequest.create({
      data: {
        type: validatedData.type,
        requesterId: session.user.id,
        shiftId: shiftAssignment.shiftId,
        shiftAssignmentId: validatedData.shiftAssignmentId,
        targetUserId: sanitizedTargetUserId,
        targetShiftAssignmentId: validatedData.targetShiftAssignmentId || null,
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

    // Send notification to manager (for DROP) or target user (for SWAP)
    if (validatedData.type === "DROP") {
      // Get managers for this location
      const managers = await prisma.locationAssignment.findMany({
        where: { locationId: shiftAssignment.shift.locationId },
        include: {
          manager: {
            select: { id: true, name: true, email: true, notificationPreference: true },
          },
        },
      })

      // Create notifications for each manager
      for (const assignment of managers) {
        await prisma.notification.create({
          data: {
            userId: assignment.managerId,
            type: "DROP_AVAILABLE",
            title: "New Drop Request",
            message: `${session.user.name} has dropped a shift at ${shiftAssignment.shift.location.name} on ${shiftAssignment.shift.date.toLocaleDateString()}`,
            meta: {
              swapRequestId: swapRequest.id,
              shiftId: shiftAssignment.shiftId,
              locationId: shiftAssignment.shift.locationId,
            },
          },
        })

        // Send email if preference is IN_APP_EMAIL
        if (assignment.manager.notificationPreference === "IN_APP_EMAIL") {
          const { sendSwapRequestEmail } = await import("@/lib/email")
          await sendSwapRequestEmail(assignment.manager.email, assignment.manager.name, {
            requesterName: session.user.name || "A staff member",
            shiftDetails: `${shiftAssignment.shift.location.name} on ${shiftAssignment.shift.date.toLocaleDateString()}`,
            type: "DROP",
          })
        }
      }

      // Broadcast SSE event to managers
      const { notifySwapRequest } = await import("@/lib/realtime/sse")
      notifySwapRequest(
        managers.map((m) => m.managerId),
        swapRequest.id,
        session.user.name || "A staff member",
        `${shiftAssignment.shift.location.name} on ${shiftAssignment.shift.date.toLocaleDateString()}`
      )
    } else if (validatedData.type === "SWAP" && validatedData.targetUserId) {
      // Notify the target user
      const targetUser = await prisma.user.findUnique({
        where: { id: validatedData.targetUserId },
        select: { id: true, name: true, email: true, notificationPreference: true },
      })

      if (targetUser) {
        await prisma.notification.create({
          data: {
            userId: targetUser.id,
            type: "SWAP_REQUESTED",
            title: "New Swap Request",
            message: `${session.user.name} wants to swap shifts with you`,
            meta: {
              swapRequestId: swapRequest.id,
              shiftId: shiftAssignment.shiftId,
            },
          },
        })

        // Send email if preference is IN_APP_EMAIL
        if (targetUser.notificationPreference === "IN_APP_EMAIL") {
          const { sendSwapRequestEmail } = await import("@/lib/email")
          await sendSwapRequestEmail(targetUser.email, targetUser.name || "Staff", {
            requesterName: session.user.name || "A staff member",
            shiftDetails: `${shiftAssignment.shift.location.name} on ${shiftAssignment.shift.date.toLocaleDateString()}`,
            type: "SWAP",
          })
        }
      }
    }

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
        shift: {
          include: { location: true },
        },
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

        // Check if user is qualified for this shift
        const { checkAssignmentConstraints } = await import("@/lib/scheduling/constraints")
        const constraintCheck = await checkAssignmentConstraints(
          userId,
          swapRequest.shiftId,
          userId
        )

        // Check for hard blocks
        const hardBlocks = constraintCheck.violations.filter(
          (v) =>
            v.rule === "CERTIFICATION" ||
            v.rule === "DOUBLE_BOOKING" ||
            v.rule === "DAILY_HOURS_12" ||
            v.rule === "CONSECUTIVE_DAYS_7"
        )

        if (hardBlocks.length > 0) {
          return NextResponse.json(
            {
              error: "You are not qualified to pick up this shift",
              violations: hardBlocks,
            },
            { status: 400 }
          )
        }

        // Get claiming user info
        const claimingUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true, notificationPreference: true },
        })

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

        // Notify managers about the claim
        const locationId = swapRequest.shiftAssignment?.shift.locationId ?? swapRequest.shift.locationId
        const locationName = swapRequest.shiftAssignment?.shift.location.name ?? swapRequest.shift.location.name
        const shiftDate = swapRequest.shiftAssignment?.shift.date ?? swapRequest.shift.date

        const managers = await prisma.locationAssignment.findMany({
          where: { locationId },
          include: {
            manager: {
              select: { id: true, name: true, email: true, notificationPreference: true },
            },
          },
        })

        for (const assignment of managers) {
          await prisma.notification.create({
            data: {
              userId: assignment.managerId,
              type: "DROP_CLAIMED",
              title: "Drop Request Claimed",
              message: `${claimingUser?.name || "Someone"} has claimed the drop request for ${locationName} on ${shiftDate.toLocaleDateString()}. Approval needed.`,
              meta: {
                swapRequestId,
                shiftId: swapRequest.shiftId,
                locationId,
                claimedBy: userId,
              },
            },
          })
        }

        // Notify the original requester that someone claimed their drop
        await prisma.notification.create({
          data: {
            userId: swapRequest.requesterId,
            type: "DROP_CLAIMED",
            title: "Your Drop Request Was Claimed",
            message: `${claimingUser?.name || "Someone"} has claimed your drop request for ${locationName}. Waiting for manager approval.`,
            meta: {
              swapRequestId,
              shiftId: swapRequest.shiftId,
              claimedBy: userId,
            },
          },
        })

        // Broadcast SSE event
        const { notifySwapUpdate } = await import("@/lib/realtime/sse")
        notifySwapUpdate(
          [...managers.map((m) => m.managerId), swapRequest.requesterId],
          swapRequestId,
          "STAFF_ACCEPTED"
        )

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
          // For DROP with no shiftAssignmentId (pickup from unassigned): create new assignment
          if (swapRequest.type === "DROP" && !swapRequest.shiftAssignmentId && swapRequest.targetUserId) {
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
          // For regular DROP: cancel original assignment and create new one
          else if (swapRequest.type === "DROP" && swapRequest.shiftAssignmentId && swapRequest.targetUserId) {
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
          if (swapRequest.type === "SWAP" && swapRequest.targetShiftAssignmentId && swapRequest.shiftAssignmentId) {
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

        // Notify all parties about the approval
        const notifyUserIds = [swapRequest.requesterId]
        
        // For DROP, notify the person who claimed it
        if (swapRequest.type === "DROP" && swapRequest.targetUserId) {
          notifyUserIds.push(swapRequest.targetUserId)
        }
        
        // For SWAP, notify the target user
        if (swapRequest.type === "SWAP" && swapRequest.targetUserId) {
          notifyUserIds.push(swapRequest.targetUserId)
        }

        // Get requester info for notifications
        const requester = await prisma.user.findUnique({
          where: { id: swapRequest.requesterId },
          select: { name: true, email: true, notificationPreference: true },
        })

        // Create notifications for all parties
        for (const notifyUserId of notifyUserIds) {
          const isRequester = notifyUserId === swapRequest.requesterId

          await prisma.notification.create({
            data: {
              userId: notifyUserId,
              type: "SWAP_APPROVED",
              title: isRequester ? "Your Request Approved" : "Swap Request Approved",
              message: `The ${swapRequest.type.toLowerCase()} request for ${swapRequest.shiftAssignment?.shift?.location?.name || "the shift"} has been approved by the manager.`,
              meta: {
                swapRequestId,
                shiftId: swapRequest.shiftId,
              },
            },
          })
        }

        // Broadcast SSE event
        const { notifySwapUpdate } = await import("@/lib/realtime/sse")
        notifySwapUpdate(notifyUserIds, swapRequestId, "MANAGER_APPROVED")

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

        // Notify all parties about the rejection
        const notifyUserIds = [swapRequest.requesterId]
        
        // For DROP, notify the person who claimed it
        if (swapRequest.type === "DROP" && swapRequest.targetUserId) {
          notifyUserIds.push(swapRequest.targetUserId)
        }
        
        // For SWAP, notify the target user
        if (swapRequest.type === "SWAP" && swapRequest.targetUserId) {
          notifyUserIds.push(swapRequest.targetUserId)
        }

        // Create notifications for all parties
        for (const notifyUserId of notifyUserIds) {
          const isRequester = notifyUserId === swapRequest.requesterId

          await prisma.notification.create({
            data: {
              userId: notifyUserId,
              type: "SWAP_CANCELLED",
              title: isRequester ? "Your Request Rejected" : "Swap Request Rejected",
              message: `The ${swapRequest.type.toLowerCase()} request for ${swapRequest.shiftAssignment?.shift?.location?.name || "the shift"} has been rejected by the manager.`,
              meta: {
                swapRequestId,
                shiftId: swapRequest.shiftId,
              },
            },
          })
        }

        // Broadcast SSE event
        const { notifySwapUpdate } = await import("@/lib/realtime/sse")
        notifySwapUpdate(notifyUserIds, swapRequestId, "CANCELLED")

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
