import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { createUtcDateTime, isPremiumShift } from "@/lib/timezone"

const createShiftSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid start time"),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid end time"),
  requiredSkillId: z.string().optional().nullable(),
  headcount: z.number().min(1).max(10).default(1),
})

// GET /api/shifts - List shifts
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get("locationId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const isPublished = searchParams.get("isPublished")

    const where: {
      locationId?: string
      startTimeUtc?: { gte?: Date; lte?: Date }
      isPublished?: boolean
    } = {}

    // Filter by location access
    if (session.user.role === "MANAGER") {
      const managerLocations = await prisma.locationAssignment.findMany({
        where: { managerId: session.user.id },
        select: { locationId: true },
      })
      const locationIds = managerLocations.map((l) => l.locationId)
      
      if (locationId && !locationIds.includes(locationId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      
      where.locationId = locationId || { in: locationIds }
    } else if (session.user.role === "STAFF") {
      // Staff can only see published shifts at their certified locations
      where.isPublished = true
      const certifications = await prisma.locationCertification.findMany({
        where: { userId: session.user.id, revokedAt: null },
        select: { locationId: true },
      })
      const locationIds = certifications.map((c) => c.locationId)
      where.locationId = locationId && locationIds.includes(locationId) ? locationId : { in: locationIds }
    } else if (locationId) {
      where.locationId = locationId
    }

    // Date range filter
    if (startDate || endDate) {
      where.startTimeUtc = {}
      if (startDate) {
        where.startTimeUtc.gte = new Date(startDate)
      }
      if (endDate) {
        where.startTimeUtc.lte = new Date(endDate)
      }
    }

    // Published filter
    if (isPublished !== null && isPublished !== undefined) {
      where.isPublished = isPublished === "true"
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        location: true,
        requiredSkill: true,
        createdBy: {
          select: { id: true, name: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { startTimeUtc: "asc" },
    })

    return NextResponse.json(shifts)
  } catch (error) {
    console.error("Error fetching shifts:", error)
    return NextResponse.json(
      { error: "Failed to fetch shifts" },
      { status: 500 }
    )
  }
}

// POST /api/shifts - Create a new shift
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createShiftSchema.parse(body)

    // Get location to check access and timezone
    const location = await prisma.location.findUnique({
      where: { id: validatedData.locationId },
    })

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    // Check manager access
    if (session.user.role === "MANAGER") {
      const assignment = await prisma.locationAssignment.findFirst({
        where: {
          managerId: session.user.id,
          locationId: validatedData.locationId,
        },
      })
      if (!assignment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Create UTC datetimes
    const startTimeUtc = createUtcDateTime(
      validatedData.date,
      validatedData.startTime,
      location.timezone
    )
    const endTimeUtc = createUtcDateTime(
      validatedData.date,
      validatedData.endTime,
      location.timezone
    )

    // Handle overnight shifts
    if (endTimeUtc <= startTimeUtc) {
      endTimeUtc.setDate(endTimeUtc.getDate() + 1)
    }

    // Check if premium shift
    const isPremium = isPremiumShift(startTimeUtc, location.timezone)

    // Create shift
    const shift = await prisma.shift.create({
      data: {
        locationId: validatedData.locationId,
        date: new Date(validatedData.date),
        startTimeUtc,
        endTimeUtc,
        requiredSkillId: validatedData.requiredSkillId || null,
        headcount: validatedData.headcount,
        isPremium,
        createdById: session.user.id,
      },
      include: {
        location: true,
        requiredSkill: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "CREATE",
        entityType: "Shift",
        entityId: shift.id,
        after: JSON.parse(JSON.stringify(shift)),
      },
    })

    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    console.error("Error creating shift:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create shift" },
      { status: 500 }
    )
  }
}
