import { prisma } from "@/lib/prisma"
import { checkConstraints } from "./constraints"

interface SuggestionResult {
  userId: string
  name: string
  currentWeekHours: number
  certifications: string[]
  skills: string[]
  score: number
  warnings: string[]
}

interface SuggestionParams {
  shiftId: string
  locationId: string
  requiredSkillId?: string | null
  startTimeUtc: Date
  endTimeUtc: Date
  excludeUserIds?: string[]
}

/**
 * Find staff members who are qualified and available for a shift.
 * Returns top suggestions sorted by score (fewest hours = highest priority).
 */
export async function findStaffSuggestions(
  params: SuggestionParams
): Promise<SuggestionResult[]> {
  const {
    shiftId,
    locationId,
    requiredSkillId,
    startTimeUtc,
    endTimeUtc,
    excludeUserIds = [],
  } = params

  // Get the ISO week for calculating current hours
  const weekStart = new Date(startTimeUtc)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  // Find staff who are certified at this location
  const certifiedStaff = await prisma.user.findMany({
    where: {
      role: "STAFF",
      certifications: {
        some: {
          locationId,
          revokedAt: null,
        },
      },
      id: { notIn: excludeUserIds },
    },
    include: {
      certifications: {
        where: { revokedAt: null },
        include: { location: true },
      },
      skills: {
        include: { skill: true },
      },
      shiftAssignments: {
        where: {
          status: "ASSIGNED",
          shift: {
            startTimeUtc: {
              gte: weekStart,
              lt: weekEnd,
            },
          },
        },
        include: {
          shift: true,
        },
      },
      availability: true,
      availabilityExceptions: {
        where: {
          date: startTimeUtc,
        },
      },
    },
  })

  const suggestions: SuggestionResult[] = []

  for (const staff of certifiedStaff) {
    // Check if they have the required skill
    if (requiredSkillId) {
      const hasSkill = staff.skills.some((s) => s.skillId === requiredSkillId)
      if (!hasSkill) continue
    }

    // Calculate current week hours
    let currentMinutes = 0
    for (const assignment of staff.shiftAssignments) {
      const duration =
        (assignment.shift.endTimeUtc.getTime() -
          assignment.shift.startTimeUtc.getTime()) /
        (1000 * 60)
      currentMinutes += duration
    }
    const currentWeekHours = currentMinutes / 60

    // Run constraint checks
    const constraintResult = await checkConstraints({
      userId: staff.id,
      shiftId,
      startTimeUtc,
      endTimeUtc,
      locationId,
    })

    if (constraintResult.violated) {
      // Skip staff with hard blocks
      const hasHardBlock = constraintResult.explanation?.includes("Cannot") ||
        constraintResult.explanation?.includes("required")
      if (hasHardBlock) continue
    }

    // Calculate score (lower hours = higher score)
    const score = Math.max(0, 40 - currentWeekHours)

    suggestions.push({
      userId: staff.id,
      name: staff.name,
      currentWeekHours,
      certifications: staff.certifications.map((c) => c.location.name),
      skills: staff.skills.map((s) => s.skill.name),
      score,
      warnings: constraintResult.violated
        ? [constraintResult.explanation || "Constraint violation"]
        : [],
    })
  }

  // Sort by score (highest first)
  suggestions.sort((a, b) => b.score - a.score)

  // Return top 5 suggestions
  return suggestions.slice(0, 5)
}

/**
 * Find alternative staff when a constraint fails.
 * This is called when a manager tries to assign someone who has a conflict.
 */
export async function findAlternatives(
  params: SuggestionParams,
  failedUserId: string,
  failedReason: string
): Promise<{
  suggestions: SuggestionResult[]
  message: string
}> {
  const suggestions = await findStaffSuggestions({
    ...params,
    excludeUserIds: [failedUserId],
  })

  let message = "Consider these alternatives:"
  if (suggestions.length === 0) {
    message = "No qualified alternatives available. You may need to adjust the shift or find coverage from another location."
  }

  return {
    suggestions,
    message,
  }
}

/**
 * Get a quick preview of what would happen if a staff member is assigned.
 * Used for the "What-If" panel.
 */
export async function getAssignmentPreview(
  userId: string,
  shiftId: string,
  startTimeUtc: Date,
  endTimeUtc: Date
): Promise<{
  currentWeekHours: number
  projectedWeekHours: number
  newOvertimeHours: number
  warnings: string[]
  premiumShifts: number
}> {
  // Get current week
  const weekStart = new Date(startTimeUtc)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  // Get current assignments
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
      shift: true,
    },
  })

  // Calculate current hours
  let currentMinutes = 0
  let premiumShifts = 0
  for (const assignment of assignments) {
    const duration =
      (assignment.shift.endTimeUtc.getTime() -
        assignment.shift.startTimeUtc.getTime()) /
      (1000 * 60)
    currentMinutes += duration
    if (assignment.shift.isPremium) premiumShifts++
  }

  const currentWeekHours = currentMinutes / 60

  // Calculate shift duration
  const shiftDuration =
    (endTimeUtc.getTime() - startTimeUtc.getTime()) / (1000 * 60 * 60)

  const projectedWeekHours = currentWeekHours + shiftDuration
  const newOvertimeHours = Math.max(0, projectedWeekHours - 40)

  // Generate warnings
  const warnings: string[] = []
  if (projectedWeekHours >= 40) {
    warnings.push("This will push the staff member into overtime")
  } else if (projectedWeekHours >= 35) {
    warnings.push("This will bring the staff member close to overtime (35+ hours)")
  }

  if (projectedWeekHours > 12) {
    warnings.push("Daily hours would exceed 12 hours")
  }

  // Run constraint check
  const constraintResult = await checkConstraints({
    userId,
    shiftId,
    startTimeUtc,
    endTimeUtc,
    locationId: "", // Will be filled by checkConstraints
  })

  if (constraintResult.violated) {
    warnings.push(constraintResult.explanation || "Constraint violation")
  }

  return {
    currentWeekHours,
    projectedWeekHours,
    newOvertimeHours,
    warnings,
    premiumShifts,
  }
}
