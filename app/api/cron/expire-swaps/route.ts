import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Force Node.js runtime (Prisma requires Node.js crypto module)
export const runtime = "nodejs"

// GET /api/cron/expire-swaps - Expire pending swap requests past their expiry time
// This endpoint is called by Vercel Cron Jobs every hour
export async function GET(request: Request) {
  try {
    // Verify this is a cron job request (Vercel sends a specific header)
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()

    // Find all pending swap requests that have expired
    const expiredRequests = await prisma.swapRequest.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: now,
        },
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
        shift: {
          include: { location: true },
        },
      },
    })

    // Update all expired requests
    const updatePromises = expiredRequests.map((expiredRequest) =>
      prisma.swapRequest.update({
        where: { id: expiredRequest.id },
        data: {
          status: "EXPIRED",
          cancelledReason: "Expired - no action taken before deadline",
        },
      })
    )

    await Promise.all(updatePromises)

    // Create notifications for each expired request
    const notificationPromises = expiredRequests.map((expiredRequest) =>
      prisma.notification.create({
        data: {
          userId: expiredRequest.requesterId,
          type: "SWAP_EXPIRED",
          title: "Swap Request Expired",
          message: `Your ${expiredRequest.type.toLowerCase()} request for the shift at ${expiredRequest.shift.location.name} has expired.`,
          meta: {
            swapRequestId: expiredRequest.id,
            shiftId: expiredRequest.shiftId,
          },
        },
      })
    )

    await Promise.all(notificationPromises)

    return NextResponse.json({
      success: true,
      expiredCount: expiredRequests.length,
      message: `Expired ${expiredRequests.length} swap requests`,
    })
  } catch (error) {
    console.error("Error expiring swap requests:", error)
    return NextResponse.json(
      { error: "Failed to expire swap requests" },
      { status: 500 }
    )
  }
}
