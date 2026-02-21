import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/analytics - Get analytics data
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "overview"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const locationId = searchParams.get("locationId")

    // Get manager's locations for filtering
    let locationIds: string[] = []
    if (session.user.role === "MANAGER") {
      const managedLocations = await prisma.locationAssignment.findMany({
        where: { managerId: session.user.id },
        select: { locationId: true },
      })
      locationIds = managedLocations.map((l: { locationId: string }) => l.locationId)
    } else if (session.user.role === "ADMIN") {
      // Admin can see all or filter by locationId
      if (locationId) {
        locationIds = [locationId]
      } else {
        const allLocations = await prisma.location.findMany({
          select: { id: true },
        })
        locationIds = allLocations.map((l: { id: string }) => l.id)
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    switch (type) {
      case "overview":
        return await getOverviewAnalytics(locationIds, dateFilter)
      case "fairness":
        return await getFairnessAnalytics(locationIds, dateFilter)
      case "overtime":
        return await getOvertimeAnalytics(locationIds, dateFilter)
      default:
        return NextResponse.json({ error: "Invalid analytics type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}

async function getOverviewAnalytics(
  locationIds: string[],
  dateFilter: { gte?: Date; lte?: Date }
) {
  // Total shifts
  const totalShifts = await prisma.shift.count({
    where: {
      locationId: { in: locationIds },
      ...(Object.keys(dateFilter).length > 0 && {
        startTimeUtc: dateFilter,
      }),
    },
  })

  // Total assignments
  const totalAssignments = await prisma.shiftAssignment.count({
    where: {
      shift: {
        locationId: { in: locationIds },
        ...(Object.keys(dateFilter).length > 0 && {
          startTimeUtc: dateFilter,
        }),
      },
      status: "ASSIGNED",
    },
  })

  // Premium shifts
  const premiumShifts = await prisma.shift.count({
    where: {
      locationId: { in: locationIds },
      isPremium: true,
      ...(Object.keys(dateFilter).length > 0 && {
        startTimeUtc: dateFilter,
      }),
    },
  })

  // Pending swap requests
  const pendingSwaps = await prisma.swapRequest.count({
    where: {
      status: { in: ["PENDING", "STAFF_ACCEPTED"] },
      shiftAssignment: {
        shift: {
          locationId: { in: locationIds },
        },
      },
    },
  })

  // Total staff certified at locations
  const totalStaff = await prisma.locationCertification.count({
    where: {
      locationId: { in: locationIds },
      revokedAt: null,
    },
  })

  return NextResponse.json({
    totalShifts,
    totalAssignments,
    premiumShifts,
    pendingSwaps,
    totalStaff,
  })
}

async function getFairnessAnalytics(
  locationIds: string[],
  dateFilter: { gte?: Date; lte?: Date }
) {
  // Get all staff with their assignments
  const staff = await prisma.user.findMany({
    where: {
      role: "STAFF",
      certifications: {
        some: {
          locationId: { in: locationIds },
          revokedAt: null,
        },
      },
    },
    include: {
      shiftAssignments: {
        where: {
          status: "ASSIGNED",
          shift: {
            locationId: { in: locationIds },
            ...(Object.keys(dateFilter).length > 0 && {
              startTimeUtc: dateFilter,
            }),
          },
        },
        include: {
          shift: true,
        },
      },
    },
  })

  // Calculate fairness metrics
  const fairnessData = staff.map((member) => {
    const totalShifts = member.shiftAssignments.length
    const premiumShifts = member.shiftAssignments.filter(
      (a) => a.shift.isPremium
    ).length

    let totalMinutes = 0
    member.shiftAssignments.forEach((assignment) => {
      const duration =
        (assignment.shift.endTimeUtc.getTime() -
          assignment.shift.startTimeUtc.getTime()) /
        (1000 * 60)
      totalMinutes += duration
    })

    return {
      userId: member.id,
      name: member.name,
      totalShifts,
      premiumShifts,
      totalHours: totalMinutes / 60,
      desiredHours: member.desiredHoursPerWeek,
    }
  })

  // Calculate total premium shifts for percentage
  const totalPremiumShifts = fairnessData.reduce(
    (sum, s) => sum + s.premiumShifts,
    0
  )

  // Add premium percentage
  const dataWithPercentage = fairnessData.map((s) => ({
    ...s,
    premiumPercentage:
      totalPremiumShifts > 0
        ? (s.premiumShifts / totalPremiumShifts) * 100
        : 0,
  }))

  return NextResponse.json({
    staff: dataWithPercentage,
    totalPremiumShifts,
    averagePremiumPercentage:
      staff.length > 0 ? 100 / staff.length : 0,
  })
}

async function getOvertimeAnalytics(
  locationIds: string[],
  dateFilter: { gte?: Date; lte?: Date }
) {
  // Get current week if no date filter
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const filterStart = dateFilter.gte || weekStart
  const filterEnd = dateFilter.lte || weekEnd

  // Get staff with their hours
  const staff = await prisma.user.findMany({
    where: {
      role: "STAFF",
      certifications: {
        some: {
          locationId: { in: locationIds },
          revokedAt: null,
        },
      },
    },
    include: {
      shiftAssignments: {
        where: {
          status: "ASSIGNED",
          shift: {
            locationId: { in: locationIds },
            startTimeUtc: {
              gte: filterStart,
              lt: filterEnd,
            },
          },
        },
        include: {
          shift: true,
        },
      },
    },
  })

  // Calculate overtime metrics
  const overtimeData = staff.map((member) => {
    let totalMinutes = 0
    member.shiftAssignments.forEach((assignment) => {
      const duration =
        (assignment.shift.endTimeUtc.getTime() -
          assignment.shift.startTimeUtc.getTime()) /
        (1000 * 60)
      totalMinutes += duration
    })

    const totalHours = totalMinutes / 60
    const overtimeHours = Math.max(0, totalHours - 40)

    return {
      userId: member.id,
      name: member.name,
      totalHours,
      overtimeHours,
      status:
        totalHours >= 40
          ? "overtime"
          : totalHours >= 35
          ? "warning"
          : "normal",
    }
  })

  const totalOvertimeHours = overtimeData.reduce(
    (sum, s) => sum + s.overtimeHours,
    0
  )
  const staffInOvertime = overtimeData.filter(
    (s) => s.status === "overtime"
  ).length
  const staffNearOvertime = overtimeData.filter(
    (s) => s.status === "warning"
  ).length

  return NextResponse.json({
    staff: overtimeData,
    totalOvertimeHours,
    staffInOvertime,
    staffNearOvertime,
    periodStart: filterStart,
    periodEnd: filterEnd,
  })
}
