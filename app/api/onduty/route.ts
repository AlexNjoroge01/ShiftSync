import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/onduty - Get currently on-duty staff by location
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()

    // Get all active shifts (shifts currently in progress)
    const activeShifts = await prisma.shift.findMany({
      where: {
        startTimeUtc: { lte: now },
        endTimeUtc: { gt: now },
        isPublished: true,
      },
      include: {
        location: {
          select: { id: true, name: true, timezone: true },
        },
        assignments: {
          where: { status: "ASSIGNED" },
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        requiredSkill: {
          select: { name: true },
        },
      },
      orderBy: { startTimeUtc: "asc" },
    })

    // Group by location
    const locationMap = new Map<
      string,
      {
        locationId: string
        locationName: string
        timezone: string
        staff: Array<{
          userId: string
          userName: string
          shiftId: string
          shiftStart: Date
          shiftEnd: Date
          skill?: string
        }>
      }
    >()

    for (const shift of activeShifts) {
      let locationData = locationMap.get(shift.location.id)

      if (!locationData) {
        locationData = {
          locationId: shift.location.id,
          locationName: shift.location.name,
          timezone: shift.location.timezone,
          staff: [],
        }
        locationMap.set(shift.location.id, locationData)
      }

      for (const assignment of shift.assignments) {
        locationData.staff.push({
          userId: assignment.user.id,
          userName: assignment.user.name,
          shiftId: shift.id,
          shiftStart: shift.startTimeUtc,
          shiftEnd: shift.endTimeUtc,
          skill: shift.requiredSkill?.name,
        })
      }
    }

    // Filter by manager's locations if applicable
    let locations = Array.from(locationMap.values())

    if (session.user.role === "MANAGER") {
      const managerLocationIds = session.user.locationIds
      locations = locations.filter((loc) =>
        managerLocationIds.includes(loc.locationId)
      )
    }

    return NextResponse.json({
      locations,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error("Error fetching on-duty data:", error)
    return NextResponse.json(
      { error: "Failed to fetch on-duty data" },
      { status: 500 }
    )
  }
}
