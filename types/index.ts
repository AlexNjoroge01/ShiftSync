import type { Role, NotificationType, SwapRequestStatus, ShiftAssignmentStatus } from "@prisma/client"

// User types
export interface UserWithRelations {
  id: string
  name: string
  email: string
  role: Role
  desiredHoursPerWeek: number | null
  notificationPreference: "IN_APP" | "IN_APP_EMAIL"
  createdAt: Date
  updatedAt: Date
  managedLocations?: {
    locationId: string
    location: {
      id: string
      name: string
      timezone: string
    }
  }[]
  certifications?: {
    id: string
    locationId: string
    location: {
      id: string
      name: string
      timezone: string
    }
    certifiedAt: Date
    revokedAt: Date | null
  }[]
  skills?: {
    skillId: string
    skill: {
      id: string
      name: string
    }
  }[]
}

// Shift types
export interface ShiftWithDetails {
  id: string
  locationId: string
  location: {
    id: string
    name: string
    timezone: string
    address: string
  }
  date: Date
  startTimeUtc: Date
  endTimeUtc: Date
  requiredSkillId: string | null
  requiredSkill: {
    id: string
    name: string
  } | null
  headcount: number
  isPublished: boolean
  publishedAt: Date | null
  editCutoffHours: number
  isPremium: boolean
  createdBy: {
    id: string
    name: string
  }
  assignments: ShiftAssignmentWithUser[]
}

export interface ShiftAssignmentWithUser {
  id: string
  shiftId: string
  userId: string
  status: ShiftAssignmentStatus
  assignedBy: string
  assignedAt: Date
  user: {
    id: string
    name: string
    email: string
    role: Role
  }
}

// Swap request types
export interface SwapRequestWithDetails {
  id: string
  type: "SWAP" | "DROP"
  status: SwapRequestStatus
  requesterId: string
  requester: {
    id: string
    name: string
    email: string
  }
  shiftId: string
  shift: {
    id: string
    date: Date
    startTimeUtc: Date
    endTimeUtc: Date
    location: {
      id: string
      name: string
      timezone: string
    }
  }
  shiftAssignmentId: string
  shiftAssignment: {
    id: string
    user: {
      id: string
      name: string
    }
  }
  targetUserId: string | null
  targetUser: {
    id: string
    name: string
    email: string
  } | null
  targetShiftAssignmentId: string | null
  targetShiftAssignment: {
    id: string
    shift: {
      id: string
      date: Date
      startTimeUtc: Date
      endTimeUtc: Date
    }
    user: {
      id: string
      name: string
    }
  } | null
  managerNote: string | null
  cancelledReason: string | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// Notification types
export interface NotificationWithUser {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  meta: Record<string, unknown> | null
  createdAt: Date
  user: {
    id: string
    name: string
    email: string
  }
}

// Availability types
export interface AvailabilityWithUser {
  id: string
  userId: string
  dayOfWeek: number // 0-6
  startTime: string // HH:mm
  endTime: string // HH:mm
  timezone: string
  user: {
    id: string
    name: string
  }
}

export interface AvailabilityExceptionWithUser {
  id: string
  userId: string
  date: Date
  isUnavailable: boolean
  startTime: string | null
  endTime: string | null
  user: {
    id: string
    name: string
  }
}

// Constraint check result
export interface ConstraintViolation {
  violated: boolean
  rule: string
  explanation: string
  suggestions: Suggestion[]
}

export interface Suggestion {
  userId: string
  name: string
  currentWeekHours: number
  skills: string[]
  isAvailable: boolean
  hasConflict: boolean
}

// Overtime calculation result
export interface OvertimeResult {
  weeklyHours: number
  dailyHours: number
  consecutiveDays: number
  warnings: OvertimeWarning[]
  isBlocked: boolean
}

export interface OvertimeWarning {
  type: "WEEKLY_35" | "WEEKLY_40" | "DAILY_8" | "DAILY_12" | "CONSECUTIVE_6" | "CONSECUTIVE_7"
  message: string
  severity: "WARNING" | "BLOCK"
}

// Fairness report types
export interface FairnessData {
  userId: string
  userName: string
  totalHours: number
  premiumShifts: number
  desiredHours: number | null
  scheduledHours: number
  gap: number
  fairnessScore: number
}

// SSE event types
export type SSEEventType =
  | "schedule:published"
  | "schedule:updated"
  | "swap:new"
  | "swap:updated"
  | "assignment:conflict"
  | "onduty:update"

export interface SSEEvent {
  type: SSEEventType
  payload: Record<string, unknown>
}

// Form schemas (using Zod)
import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]),
  desiredHoursPerWeek: z.number().min(0).max(60).optional(),
})

export const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).optional(),
  desiredHoursPerWeek: z.number().min(0).max(60).optional().nullable(),
  notificationPreference: z.enum(["IN_APP", "IN_APP_EMAIL"]).optional(),
})

export const createShiftSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid start time"),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid end time"),
  requiredSkillId: z.string().optional().nullable(),
  headcount: z.number().min(1).max(10),
})

export const createAvailabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
})

export const createAvailabilityExceptionSchema = z.object({
  date: z.string().min(1),
  isUnavailable: z.boolean(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
})

export const createSwapRequestSchema = z.object({
  type: z.enum(["SWAP", "DROP"]),
  shiftAssignmentId: z.string().min(1),
  targetUserId: z.string().optional().nullable(),
  targetShiftAssignmentId: z.string().optional().nullable(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type CreateShiftInput = z.infer<typeof createShiftSchema>
export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>
export type CreateAvailabilityExceptionInput = z.infer<typeof createAvailabilityExceptionSchema>
export type CreateSwapRequestInput = z.infer<typeof createSwapRequestSchema>