import { prisma } from "@/lib/prisma"

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "PUBLISH"
  | "UNPUBLISH"
  | "ASSIGN"
  | "UNASSIGN"
  | "APPROVE"
  | "CANCEL"

export type EntityType =
  | "Shift"
  | "ShiftAssignment"
  | "SwapRequest"
  | "LocationCertification"
  | "User"
  | "Availability"
  | "Location"

interface AuditLogParams {
  actorId: string
  action: AuditAction
  entityType: EntityType
  entityId: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        before: params.before ? JSON.parse(JSON.stringify(params.before)) : null,
        after: params.after ? JSON.parse(JSON.stringify(params.after)) : null,
      },
    })
    return auditLog
  } catch (error) {
    console.error("Failed to create audit log:", error)
    // Don't throw - audit logging should not break the main operation
    return null
  }
}

// Helper function to capture entity state before changes
export async function captureEntityState(
  entityType: EntityType,
  entityId: string
): Promise<Record<string, unknown> | null> {
  try {
    switch (entityType) {
      case "Shift":
        return await prisma.shift.findUnique({
          where: { id: entityId },
          include: {
            location: true,
            requiredSkill: true,
          },
        }) as Record<string, unknown> | null

      case "ShiftAssignment":
        return await prisma.shiftAssignment.findUnique({
          where: { id: entityId },
          include: {
            user: { select: { id: true, name: true } },
            shift: { select: { id: true, date: true } },
          },
        }) as Record<string, unknown> | null

      case "SwapRequest":
        return await prisma.swapRequest.findUnique({
          where: { id: entityId },
        }) as Record<string, unknown> | null

      case "LocationCertification":
        return await prisma.locationCertification.findUnique({
          where: { id: entityId },
        }) as Record<string, unknown> | null

      case "User":
        return await prisma.user.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            desiredHoursPerWeek: true,
          },
        }) as Record<string, unknown> | null

      case "Availability":
        return await prisma.availability.findUnique({
          where: { id: entityId },
        }) as Record<string, unknown> | null

      case "Location":
        return await prisma.location.findUnique({
          where: { id: entityId },
        }) as Record<string, unknown> | null

      default:
        return null
    }
  } catch (error) {
    console.error(`Failed to capture ${entityType} state:`, error)
    return null
  }
}

// Convenience function for logging with before/after states
export async function logMutation(
  actorId: string,
  action: AuditAction,
  entityType: EntityType,
  entityId: string,
  beforeState: Record<string, unknown> | null,
  afterState: Record<string, unknown> | null
) {
  return createAuditLog({
    actorId,
    action,
    entityType,
    entityId,
    before: beforeState,
    after: afterState,
  })
}
