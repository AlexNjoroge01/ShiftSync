import { prisma } from "@/lib/prisma"
import { calculateHours } from "@/lib/timezone"
import type { FairnessData } from "@/types"

/**
 * Calculate fairness metrics for staff at a location
 */
export async function calculateFairnessMetrics(
  locationId: string,
  startDate: Date,
  endDate: Date
): Promise<FairnessData[]> {
  // Get all shifts for the period at this location
  const shifts = await prisma.shift.findMany({
    where: {
      locationId,
      startTimeUtc: {
        gte: startDate,
        lt: endDate,
      },
      isPublished: true,
    },
    include: {
      assignments: {
        where: { status: "ASSIGNED" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
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
      desiredHours: number | null
      totalHours: number
      premiumShifts: number
      scheduledHours: number
    }
  >()

  for (const shift of shifts) {
    for (const assignment of shift.assignments) {
      const userId = assignment.user.id
      const hours = calculateHours(shift.startTimeUtc, shift.endTimeUtc)

      const existing = userMetrics.get(userId) || {
        userName: assignment.user.name,
        desiredHours: assignment.user.desiredHoursPerWeek,
        totalHours: 0,
        premiumShifts: 0,
        scheduledHours: 0,
      }

      existing.totalHours += hours
      existing.scheduledHours += hours

      if (shift.isPremium) {
        existing.premiumShifts++
      }

      userMetrics.set(userId, existing)
    }
  }

  // Calculate fairness scores
  const results: FairnessData[] = []

  userMetrics.forEach((metrics, userId) => {
    const premiumShiftPercentage =
      totalPremiumShifts > 0
        ? (metrics.premiumShifts / totalPremiumShifts) * 100
        : 0

    const gap = metrics.desiredHours
      ? metrics.desiredHours - metrics.scheduledHours
      : 0

    results.push({
      userId,
      userName: metrics.userName,
      totalHours: Math.round(metrics.totalHours * 10) / 10,
      premiumShifts: metrics.premiumShifts,
      desiredHours: metrics.desiredHours,
      scheduledHours: Math.round(metrics.scheduledHours * 10) / 10,
      gap: Math.round(gap * 10) / 10,
      fairnessScore: Math.round(premiumShiftPercentage * 10) / 10,
    })
  })

  // Sort by fairness score (lowest first to highlight under-represented)
  return results.sort((a, b) => a.fairnessScore - b.fairnessScore)
}

/**
 * Get staff who are under-represented in premium shifts
 */
export function getUnderRepresentedStaff(
  fairnessData: FairnessData[],
  threshold: number = 50
): FairnessData[] {
  if (fairnessData.length === 0) return []

  const avgScore =
    fairnessData.reduce((sum, d) => sum + d.fairnessScore, 0) /
    fairnessData.length

  const thresholdScore = (avgScore * threshold) / 100

  return fairnessData.filter((d) => d.fairnessScore < thresholdScore)
}

/**
 * Generate fairness report for export
 */
export function generateFairnessCSV(data: FairnessData[]): string {
  const headers = [
    "Staff Name",
    "Total Hours",
    "Premium Shifts",
    "Desired Hours",
    "Scheduled Hours",
    "Gap",
    "Fairness Score (%)",
  ]

  const rows = data.map((d) => [
    d.userName,
    d.totalHours.toString(),
    d.premiumShifts.toString(),
    d.desiredHours?.toString() || "N/A",
    d.scheduledHours.toString(),
    d.gap.toString(),
    d.fairnessScore.toString(),
  ])

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
}

/**
 * Get hours distribution by staff member
 */
export async function getHoursDistribution(
  locationId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<
  {
    userId: string
    userName: string
    hours: number
    isOvertime: boolean
  }[]
> {
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      status: "ASSIGNED",
      shift: {
        locationId,
        startTimeUtc: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
    },
    include: {
      user: { select: { id: true, name: true } },
      shift: true,
    },
  })

  const userHours = new Map<string, { userName: string; hours: number }>()

  for (const assignment of assignments) {
    const userId = assignment.user.id
    const hours = calculateHours(
      assignment.shift.startTimeUtc,
      assignment.shift.endTimeUtc
    )

    const existing = userHours.get(userId) || {
      userName: assignment.user.name,
      hours: 0,
    }
    existing.hours += hours
    userHours.set(userId, existing)
  }

  return Array.from(userHours.entries())
    .map(([userId, data]) => ({
      userId,
      userName: data.userName,
      hours: Math.round(data.hours * 10) / 10,
      isOvertime: data.hours > 40,
    }))
    .sort((a, b) => b.hours - a.hours)
}
