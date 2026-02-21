import { prisma } from "@/lib/prisma"
import { utcToTimezone, calculateHours } from "@/lib/timezone"
import type { OvertimeResult, OvertimeWarning } from "@/types"

/**
 * Calculate overtime metrics for a user
 */
export async function calculateOvertime(
  userId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<OvertimeResult> {
  // Get all assigned shifts for the user in the week
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      userId,
      status: "ASSIGNED",
      shift: {
        startTimeUtc: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
    },
    include: {
      shift: {
        include: { location: true },
      },
    },
  })

  // Calculate weekly hours
  let weeklyHours = 0
  const dailyHoursMap = new Map<string, number>()
  const workedDays = new Set<string>()

  for (const assignment of assignments) {
    const hours = calculateHours(
      assignment.shift.startTimeUtc,
      assignment.shift.endTimeUtc
    )
    weeklyHours += hours

    // Track daily hours
    const dateStr = utcToTimezone(
      assignment.shift.startTimeUtc,
      assignment.shift.location.timezone
    ).toISOString().split("T")[0]

    const currentDaily = dailyHoursMap.get(dateStr) || 0
    dailyHoursMap.set(dateStr, currentDaily + hours)

    // Track worked days
    workedDays.add(dateStr)
  }

  // Calculate consecutive days
  const consecutiveDays = calculateConsecutiveDays(workedDays)

  // Generate warnings
  const warnings: OvertimeWarning[] = []

  // Weekly hours warnings
  if (weeklyHours >= 40) {
    warnings.push({
      type: "WEEKLY_40",
      message: `Weekly hours at ${weeklyHours.toFixed(1)}h - overtime applies`,
      severity: "WARNING",
    })
  } else if (weeklyHours >= 35) {
    warnings.push({
      type: "WEEKLY_35",
      message: `Weekly hours at ${weeklyHours.toFixed(1)}h - approaching overtime`,
      severity: "WARNING",
    })
  }

  // Daily hours warnings
  for (const [date, hours] of dailyHoursMap) {
    if (hours > 12) {
      warnings.push({
        type: "DAILY_12",
        message: `${date}: ${hours.toFixed(1)}h - exceeds 12h daily limit`,
        severity: "BLOCK",
      })
    } else if (hours > 8) {
      warnings.push({
        type: "DAILY_8",
        message: `${date}: ${hours.toFixed(1)}h - exceeds 8h`,
        severity: "WARNING",
      })
    }
  }

  // Consecutive days warnings
  if (consecutiveDays >= 7) {
    warnings.push({
      type: "CONSECUTIVE_7",
      message: `7 consecutive days worked - requires override`,
      severity: "BLOCK",
    })
  } else if (consecutiveDays >= 6) {
    warnings.push({
      type: "CONSECUTIVE_6",
      message: `6 consecutive days worked`,
      severity: "WARNING",
    })
  }

  // Check for hard blocks
  const isBlocked = warnings.some((w) => w.severity === "BLOCK")

  return {
    weeklyHours,
    dailyHours: Math.max(...dailyHoursMap.values(), 0),
    consecutiveDays,
    warnings,
    isBlocked,
  }
}

/**
 * Calculate the longest streak of consecutive days
 */
function calculateConsecutiveDays(workedDays: Set<string>): number {
  if (workedDays.size === 0) return 0

  const sortedDays = Array.from(workedDays).sort()
  let maxStreak = 1
  let currentStreak = 1

  for (let i = 1; i < sortedDays.length; i++) {
    const prevDate = new Date(sortedDays[i - 1])
    const currDate = new Date(sortedDays[i])
    const diffDays = Math.round(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  return maxStreak
}

/**
 * Get overtime status for all staff at a location
 */
export async function getLocationOvertimeStatus(
  locationId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<
  {
    userId: string
    userName: string
    weeklyHours: number
    overtimeHours: number
    warnings: OvertimeWarning[]
  }[]
> {
  // Get all certified staff at the location
  const certifications = await prisma.locationCertification.findMany({
    where: {
      locationId,
      revokedAt: null,
    },
    include: {
      user: {
        include: {
          shiftAssignments: {
            where: {
              status: "ASSIGNED",
              shift: {
                startTimeUtc: {
                  gte: weekStart,
                  lt: weekEnd,
                },
                locationId,
              },
            },
            include: {
              shift: true,
            },
          },
        },
      },
    },
  })

  const results = certifications.map((cert) => {
    let weeklyHours = 0

    for (const assignment of cert.user.shiftAssignments) {
      weeklyHours += calculateHours(
        assignment.shift.startTimeUtc,
        assignment.shift.endTimeUtc
      )
    }

    const overtimeHours = Math.max(0, weeklyHours - 40)
    const warnings: OvertimeWarning[] = []

    if (weeklyHours >= 40) {
      warnings.push({
        type: "WEEKLY_40",
        message: `${weeklyHours.toFixed(1)}h scheduled`,
        severity: "WARNING",
      })
    } else if (weeklyHours >= 35) {
      warnings.push({
        type: "WEEKLY_35",
        message: `${weeklyHours.toFixed(1)}h scheduled`,
        severity: "WARNING",
      })
    }

    return {
      userId: cert.user.id,
      userName: cert.user.name,
      weeklyHours,
      overtimeHours,
      warnings,
    }
  })

  return results.sort((a, b) => b.weeklyHours - a.weeklyHours)
}

/**
 * Calculate projected overtime cost
 */
export function calculateOvertimeCost(
  overtimeHours: number,
  hourlyRate: number = 15 // Default hourly rate
): number {
  return overtimeHours * hourlyRate * 1.5 // Time and a half
}
