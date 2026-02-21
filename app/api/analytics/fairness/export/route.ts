import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateHours } from "@/lib/timezone"

// GET /api/analytics/fairness/export - Export fairness report as CSV
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const locationId = searchParams.get("locationId")

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      )
    }

    // Check location access for managers
    if (session.user.role === "MANAGER" && locationId) {
      const assignment = await prisma.locationAssignment.findFirst({
        where: {
          managerId: session.user.id,
          locationId,
        },
      })
      if (!assignment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Build where clause
    const where: {
      locationId?: string
      startTimeUtc: { gte: Date; lt: Date }
      isPublished: boolean
    } = {
      startTimeUtc: {
        gte: new Date(startDate),
        lt: new Date(endDate),
      },
      isPublished: true,
    }

    if (locationId) where.locationId = locationId

    // Get all shifts for the period
    const shifts = await prisma.shift.findMany({
      where,
      include: {
        location: { select: { id: true, name: true } },
        assignments: {
          where: { status: "ASSIGNED" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                desiredHoursPerWeek: true,
              },
            },
          },
        },
      },
    })

    // Count total premium shifts
    const totalPremiumShifts = shifts.filter((s) => s.isPremium).length

    // Aggregate by user
    const userMetrics = new Map<
      string,
      {
        userName: string
        email: string
        desiredHours: number | null
        totalHours: number
        premiumShifts: number
        scheduledHours: number
        locations: Set<string>
      }
    >()

    for (const shift of shifts) {
      for (const assignment of shift.assignments) {
        const userId = assignment.user.id
        const hours = calculateHours(shift.startTimeUtc, shift.endTimeUtc)

        const existing = userMetrics.get(userId) || {
          userName: assignment.user.name,
          email: assignment.user.email,
          desiredHours: assignment.user.desiredHoursPerWeek,
          totalHours: 0,
          premiumShifts: 0,
          scheduledHours: 0,
          locations: new Set<string>(),
        }

        existing.totalHours += hours
        existing.scheduledHours += hours
        existing.locations.add(shift.location.name)

        if (shift.isPremium) {
          existing.premiumShifts++
        }

        userMetrics.set(userId, existing)
      }
    }

    // Calculate fairness scores and prepare data
    const results: Array<{
      userName: string
      email: string
      totalHours: number
      premiumShifts: number
      desiredHours: string
      scheduledHours: number
      gap: number
      fairnessScore: number
      locations: string
    }> = []

    userMetrics.forEach((metrics) => {
      const fairnessScore =
        totalPremiumShifts > 0
          ? (metrics.premiumShifts / totalPremiumShifts) * 100
          : 0

      const gap = metrics.desiredHours
        ? metrics.desiredHours - metrics.scheduledHours
        : 0

      results.push({
        userName: metrics.userName,
        email: metrics.email,
        totalHours: Math.round(metrics.totalHours * 10) / 10,
        premiumShifts: metrics.premiumShifts,
        desiredHours: metrics.desiredHours?.toString() || "N/A",
        scheduledHours: Math.round(metrics.scheduledHours * 10) / 10,
        gap: Math.round(gap * 10) / 10,
        fairnessScore: Math.round(fairnessScore * 10) / 10,
        locations: Array.from(metrics.locations).join("; "),
      })
    })

    // Sort by fairness score (lowest first)
    results.sort((a, b) => a.fairnessScore - b.fairnessScore)

    // Generate CSV
    const headers = [
      "Staff Name",
      "Email",
      "Total Hours",
      "Premium Shifts",
      "Desired Hours",
      "Scheduled Hours",
      "Gap",
      "Fairness Score (%)",
      "Locations",
    ]

    const rows = results.map((r) => [
      r.userName,
      r.email,
      r.totalHours.toString(),
      r.premiumShifts.toString(),
      r.desiredHours,
      r.scheduledHours.toString(),
      r.gap.toString(),
      r.fairnessScore.toString(),
      r.locations,
    ])

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    // Return as downloadable file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="fairness-report-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error exporting fairness report:", error)
    return NextResponse.json(
      { error: "Failed to export fairness report" },
      { status: 500 }
    )
  }
}
