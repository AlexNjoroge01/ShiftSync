import { prisma } from "@/lib/prisma"
import { utcToTimezone, getDayOfWeekInTimezone, getTimeInTimezone, calculateHours } from "@/lib/timezone"
import type { Suggestion, ConstraintViolation } from "@/types"

export interface ConstraintCheckResult {
  passed: boolean
  violations: ConstraintViolation[]
}

/**
 * Run all constraint checks for a potential shift assignment
 */
export async function checkAssignmentConstraints(
  userId: string,
  shiftId: string,
  managerId: string
): Promise<ConstraintCheckResult> {
  const violations: ConstraintViolation[] = []

  // Get shift details with location
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      location: true,
      requiredSkill: true,
      assignments: {
        where: { status: "ASSIGNED" },
        include: {
          user: {
            include: {
              skills: { include: { skill: true } },
            },
          },
        },
      },
    },
  })

  if (!shift) {
    return {
      passed: false,
      violations: [{
        violated: true,
        rule: "SHIFT_NOT_FOUND",
        explanation: "Shift not found",
        suggestions: [],
      }],
    }
  }

  // Get user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      skills: { include: { skill: true } },
      certifications: {
        where: { revokedAt: null },
        include: { location: true },
      },
      availability: true,
      availabilityExceptions: {
        where: {
          date: shift.date,
        },
      },
      shiftAssignments: {
        where: { status: "ASSIGNED" },
        include: {
          shift: {
            include: { location: true },
          },
        },
      },
    },
  })

  if (!user) {
    return {
      passed: false,
      violations: [{
        violated: true,
        rule: "USER_NOT_FOUND",
        explanation: "User not found",
        suggestions: [],
      }],
    }
  }

  // 1. Skill check
  const skillViolation = await checkSkillRequirement(user, shift)
  if (skillViolation) violations.push(skillViolation)

  // 2. Certification check
  const certViolation = await checkCertification(user, shift)
  if (certViolation) violations.push(certViolation)

  // 3. Availability check
  const availViolation = await checkAvailability(user, shift)
  if (availViolation) violations.push(availViolation)

  // 4. Double-booking check
  const doubleBookingViolation = await checkDoubleBooking(user, shift)
  if (doubleBookingViolation) violations.push(doubleBookingViolation)

  // 5. Rest period check
  const restViolation = await checkRestPeriod(user, shift)
  if (restViolation) violations.push(restViolation)

  // 6. Daily hours check
  const dailyHoursViolation = await checkDailyHours(user, shift)
  if (dailyHoursViolation) violations.push(dailyHoursViolation)

  // 7. Weekly hours check
  const weeklyHoursViolation = await checkWeeklyHours(user, shift)
  if (weeklyHoursViolation) violations.push(weeklyHoursViolation)

  // 8. Consecutive days check
  const consecutiveDaysViolation = await checkConsecutiveDays(user, shift)
  if (consecutiveDaysViolation) violations.push(consecutiveDaysViolation)

  // Get suggestions for any violations
  const suggestions = violations.length > 0
    ? await getSuggestions(shift, user.id)
    : []

  // Add suggestions to all violations
  violations.forEach((v) => {
    v.suggestions = suggestions
  })

  // Check if any hard blocks
  const hasHardBlock = violations.some((v) =>
    v.rule === "CERTIFICATION" ||
    v.rule === "DOUBLE_BOOKING" ||
    v.rule === "DAILY_HOURS_12" ||
    v.rule === "CONSECUTIVE_DAYS_7"
  )

  return {
    passed: violations.length === 0,
    violations,
  }
}

/**
 * Check if user has the required skill
 */
async function checkSkillRequirement(
  user: {
    skills: { skillId: string; skill: { id: string; name: string } }[]
  },
  shift: {
    requiredSkillId: string | null
    requiredSkill: { id: string; name: string } | null
  }
): Promise<ConstraintViolation | null> {
  if (!shift.requiredSkillId) return null

  const hasSkill = user.skills.some((s) => s.skillId === shift.requiredSkillId)
  if (!hasSkill) {
    return {
      violated: true,
      rule: "SKILL",
      explanation: `User does not have the required skill: ${shift.requiredSkill?.name}`,
      suggestions: [],
    }
  }
  return null
}

/**
 * Check if user is certified at the location
 */
async function checkCertification(
  user: {
    certifications: {
      locationId: string
      revokedAt: Date | null
      location: { id: string; name: string }
    }[]
  },
  shift: {
    locationId: string
    location: { id: string; name: string }
  }
): Promise<ConstraintViolation | null> {
  const isCertified = user.certifications.some(
    (c) => c.locationId === shift.locationId && !c.revokedAt
  )
  if (!isCertified) {
    return {
      violated: true,
      rule: "CERTIFICATION",
      explanation: `User is not certified at ${shift.location.name}`,
      suggestions: [],
    }
  }
  return null
}

/**
 * Check if user is available during the shift
 */
async function checkAvailability(
  user: {
    availability: {
      dayOfWeek: number
      startTime: string
      endTime: string
      timezone: string
    }[]
    availabilityExceptions: {
      date: Date
      isUnavailable: boolean
      startTime: string | null
      endTime: string | null
    }[]
  },
  shift: {
    startTimeUtc: Date
    endTimeUtc: Date
    location: { timezone: string }
  }
): Promise<ConstraintViolation | null> {
  // Check for availability exception first
  const exception = user.availabilityExceptions[0]
  if (exception) {
    if (exception.isUnavailable && !exception.startTime) {
      return {
        violated: true,
        rule: "AVAILABILITY_EXCEPTION",
        explanation: "User has marked this date as unavailable",
        suggestions: [],
      }
    }
    // Partial availability - check if shift fits
    if (exception.startTime && exception.endTime) {
      const shiftStart = getTimeInTimezone(shift.startTimeUtc, shift.location.timezone)
      const shiftEnd = getTimeInTimezone(shift.endTimeUtc, shift.location.timezone)
      if (shiftStart < exception.startTime || shiftEnd > exception.endTime) {
        return {
          violated: true,
          rule: "AVAILABILITY_EXCEPTION",
          explanation: `Shift is outside user's available window (${exception.startTime} - ${exception.endTime})`,
          suggestions: [],
        }
      }
    }
    return null // Exception allows the shift
  }

  // Check recurring availability
  const shiftDayOfWeek = getDayOfWeekInTimezone(shift.startTimeUtc, shift.location.timezone)
  const dayAvailability = user.availability.filter((a) => a.dayOfWeek === shiftDayOfWeek)

  if (dayAvailability.length === 0) {
    return {
      violated: true,
      rule: "AVAILABILITY",
      explanation: "User has no availability set for this day",
      suggestions: [],
    }
  }

  const shiftStart = getTimeInTimezone(shift.startTimeUtc, shift.location.timezone)
  const shiftEnd = getTimeInTimezone(shift.endTimeUtc, shift.location.timezone)

  const isWithinAvailability = dayAvailability.some((a) => {
    return shiftStart >= a.startTime && shiftEnd <= a.endTime
  })

  if (!isWithinAvailability) {
    return {
      violated: true,
      rule: "AVAILABILITY",
      explanation: `Shift time (${shiftStart} - ${shiftEnd}) is outside user's availability`,
      suggestions: [],
    }
  }

  return null
}

/**
 * Check for double-booking
 */
async function checkDoubleBooking(
  user: {
    shiftAssignments: {
      shift: {
        id: string
        startTimeUtc: Date
        endTimeUtc: Date
        location: { name: string }
      }
    }[]
  },
  shift: {
    id: string
    startTimeUtc: Date
    endTimeUtc: Date
  }
): Promise<ConstraintViolation | null> {
  const hasOverlap = user.shiftAssignments.some((assignment) => {
    const existingStart = assignment.shift.startTimeUtc
    const existingEnd = assignment.shift.endTimeUtc
    
    return (
      shift.startTimeUtc < existingEnd &&
      shift.endTimeUtc > existingStart
    )
  })

  if (hasOverlap) {
    const overlapping = user.shiftAssignments.find((assignment) => {
      const existingStart = assignment.shift.startTimeUtc
      const existingEnd = assignment.shift.endTimeUtc
      return shift.startTimeUtc < existingEnd && shift.endTimeUtc > existingStart
    })

    return {
      violated: true,
      rule: "DOUBLE_BOOKING",
      explanation: `User has an overlapping shift at ${overlapping?.shift.location.name}`,
      suggestions: [],
    }
  }

  return null
}

/**
 * Check rest period (10 hours between shifts)
 */
async function checkRestPeriod(
  user: {
    shiftAssignments: {
      shift: {
        id: string
        startTimeUtc: Date
        endTimeUtc: Date
        location: { name: string }
      }
    }[]
  },
  shift: {
    id: string
    startTimeUtc: Date
    endTimeUtc: Date
  }
): Promise<ConstraintViolation | null> {
  const MIN_REST_HOURS = 10

  for (const assignment of user.shiftAssignments) {
    const existingEnd = assignment.shift.endTimeUtc
    const existingStart = assignment.shift.startTimeUtc

    // Check rest before this shift
    if (shift.startTimeUtc > existingEnd) {
      const hoursBetween = calculateHours(existingEnd, shift.startTimeUtc)
      if (hoursBetween < MIN_REST_HOURS) {
        return {
          violated: true,
          rule: "REST_PERIOD",
          explanation: `Only ${hoursBetween.toFixed(1)} hours rest before this shift (minimum: ${MIN_REST_HOURS}h)`,
          suggestions: [],
        }
      }
    }

    // Check rest after this shift
    if (shift.endTimeUtc < existingStart) {
      const hoursBetween = calculateHours(shift.endTimeUtc, existingStart)
      if (hoursBetween < MIN_REST_HOURS) {
        return {
          violated: true,
          rule: "REST_PERIOD",
          explanation: `Only ${hoursBetween.toFixed(1)} hours rest after this shift (minimum: ${MIN_REST_HOURS}h)`,
          suggestions: [],
        }
      }
    }
  }

  return null
}

/**
 * Check daily hours (warn at 8h, block at 12h)
 */
async function checkDailyHours(
  user: {
    shiftAssignments: {
      shift: {
        id: string
        startTimeUtc: Date
        endTimeUtc: Date
        location: { timezone: string }
      }
    }[]
  },
  shift: {
    startTimeUtc: Date
    endTimeUtc: Date
    location: { timezone: string }
  }
): Promise<ConstraintViolation | null> {
  const shiftDate = utcToTimezone(shift.startTimeUtc, shift.location.timezone)
  const shiftDateStr = shiftDate.toISOString().split("T")[0]

  // Calculate current hours for this day
  let dailyHours = calculateHours(shift.startTimeUtc, shift.endTimeUtc)

  for (const assignment of user.shiftAssignments) {
    const assignmentDate = utcToTimezone(
      assignment.shift.startTimeUtc,
      assignment.shift.location.timezone
    )
    const assignmentDateStr = assignmentDate.toISOString().split("T")[0]

    if (assignmentDateStr === shiftDateStr) {
      dailyHours += calculateHours(
        assignment.shift.startTimeUtc,
        assignment.shift.endTimeUtc
      )
    }
  }

  if (dailyHours > 12) {
    return {
      violated: true,
      rule: "DAILY_HOURS_12",
      explanation: `This would push daily hours to ${dailyHours.toFixed(1)}h (maximum: 12h)`,
      suggestions: [],
    }
  }

  if (dailyHours > 8) {
    return {
      violated: true,
      rule: "DAILY_HOURS_8",
      explanation: `Warning: This would push daily hours to ${dailyHours.toFixed(1)}h`,
      suggestions: [],
    }
  }

  return null
}

/**
 * Check weekly hours (warn at 35h, warn more at 40h)
 */
async function checkWeeklyHours(
  user: {
    id: string
    shiftAssignments: {
      shift: {
        id: string
        startTimeUtc: Date
        endTimeUtc: Date
        location: { timezone: string }
      }
    }[]
  },
  shift: {
    startTimeUtc: Date
    endTimeUtc: Date
    location: { timezone: string }
  }
): Promise<ConstraintViolation | null> {
  // Get the ISO week for this shift
  const shiftDate = new Date(shift.startTimeUtc)
  const weekStart = new Date(shiftDate)
  weekStart.setDate(shiftDate.getDate() - shiftDate.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  // Calculate current week hours
  let weeklyHours = calculateHours(shift.startTimeUtc, shift.endTimeUtc)

  for (const assignment of user.shiftAssignments) {
    if (
      assignment.shift.startTimeUtc >= weekStart &&
      assignment.shift.startTimeUtc < weekEnd
    ) {
      weeklyHours += calculateHours(
        assignment.shift.startTimeUtc,
        assignment.shift.endTimeUtc
      )
    }
  }

  if (weeklyHours >= 40) {
    return {
      violated: true,
      rule: "WEEKLY_HOURS_40",
      explanation: `This would push weekly hours to ${weeklyHours.toFixed(1)}h (overtime territory)`,
      suggestions: [],
    }
  }

  if (weeklyHours >= 35) {
    return {
      violated: true,
      rule: "WEEKLY_HOURS_35",
      explanation: `Warning: This would push weekly hours to ${weeklyHours.toFixed(1)}h`,
      suggestions: [],
    }
  }

  return null
}

/**
 * Check consecutive days (warn at 6, block at 7)
 */
async function checkConsecutiveDays(
  user: {
    shiftAssignments: {
      shift: {
        id: string
        startTimeUtc: Date
        location: { timezone: string }
      }
    }[]
  },
  shift: {
    startTimeUtc: Date
    location: { timezone: string }
  }
): Promise<ConstraintViolation | null> {
  // Get all worked days
  const workedDays = new Set<string>()
  
  for (const assignment of user.shiftAssignments) {
    const date = utcToTimezone(
      assignment.shift.startTimeUtc,
      assignment.shift.location.timezone
    )
    workedDays.add(date.toISOString().split("T")[0])
  }

  // Add the new shift date
  const newShiftDate = utcToTimezone(shift.startTimeUtc, shift.location.timezone)
  workedDays.add(newShiftDate.toISOString().split("T")[0])

  // Find longest consecutive streak
  const sortedDays = Array.from(workedDays).sort()
  let maxStreak = 1
  let currentStreak = 1

  for (let i = 1; i < sortedDays.length; i++) {
    const prevDate = new Date(sortedDays[i - 1])
    const currDate = new Date(sortedDays[i])
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  if (maxStreak >= 7) {
    return {
      violated: true,
      rule: "CONSECUTIVE_DAYS_7",
      explanation: `This would be the 7th consecutive day worked (requires override)`,
      suggestions: [],
    }
  }

  if (maxStreak >= 6) {
    return {
      violated: true,
      rule: "CONSECUTIVE_DAYS_6",
      explanation: `Warning: This would be the 6th consecutive day worked`,
      suggestions: [],
    }
  }

  return null
}

/**
 * Get alternative staff suggestions
 */
async function getSuggestions(
  shift: {
    id: string
    locationId: string
    requiredSkillId: string | null
    startTimeUtc: Date
    endTimeUtc: Date
    location: { timezone: string }
  },
  excludeUserId: string
): Promise<Suggestion[]> {
  // Find staff who:
  // 1. Have the required skill (if any)
  // 2. Are certified at the location
  // 3. Are available during the shift
  // 4. Have no conflicts

  const candidates = await prisma.user.findMany({
    where: {
      id: { not: excludeUserId },
      role: "STAFF",
      certifications: {
        some: {
          locationId: shift.locationId,
          revokedAt: null,
        },
      },
      ...(shift.requiredSkillId && {
        skills: {
          some: {
            skillId: shift.requiredSkillId,
          },
        },
      }),
    },
    include: {
      skills: { include: { skill: true } },
      shiftAssignments: {
        where: { status: "ASSIGNED" },
        include: { shift: true },
      },
    },
  })

  // Calculate current week hours for each candidate
  const weekStart = new Date(shift.startTimeUtc)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const suggestions: Suggestion[] = candidates
    .map((candidate) => {
      const currentWeekHours = candidate.shiftAssignments
        .filter((a) => {
          return (
            a.shift.startTimeUtc >= weekStart &&
            a.shift.startTimeUtc < weekEnd
          )
        })
        .reduce((total, a) => {
          return total + calculateHours(a.shift.startTimeUtc, a.shift.endTimeUtc)
        }, 0)

      const hasConflict = candidate.shiftAssignments.some((a) => {
        return (
          shift.startTimeUtc < a.shift.endTimeUtc &&
          shift.endTimeUtc > a.shift.startTimeUtc
        )
      })

      return {
        userId: candidate.id,
        name: candidate.name,
        currentWeekHours,
        skills: candidate.skills.map((s) => s.skill.name),
        isAvailable: !hasConflict, // Simplified - should check actual availability
        hasConflict,
      }
    })
    .filter((s) => !s.hasConflict)
    .sort((a, b) => a.currentWeekHours - b.currentWeekHours)
    .slice(0, 5)

  return suggestions
}