import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateLocationSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  address: z.string().min(1, "Address is required").optional(),
  timezone: z.string().min(1, "Timezone is required").optional(),
})

// GET /api/locations/[id] - Get a specific location
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        managers: {
          include: {
            manager: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        certifications: {
          where: { revokedAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        shifts: {
          where: {
            startTimeUtc: { gte: new Date() },
          },
          take: 10,
          orderBy: { startTimeUtc: "asc" },
        },
      },
    })

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    // Check access for managers and staff
    if (session.user.role === "MANAGER") {
      const assignment = await prisma.locationAssignment.findFirst({
        where: {
          managerId: session.user.id,
          locationId: id,
        },
      })
      if (!assignment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else if (session.user.role === "STAFF") {
      const certification = await prisma.locationCertification.findFirst({
        where: {
          userId: session.user.id,
          locationId: id,
          revokedAt: null,
        },
      })
      if (!certification) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    return NextResponse.json(location)
  } catch (error) {
    console.error("Error fetching location:", error)
    return NextResponse.json(
      { error: "Failed to fetch location" },
      { status: 500 }
    )
  }
}

// PATCH /api/locations/[id] - Update a location
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateLocationSchema.parse(body)

    // Check if location exists
    const existingLocation = await prisma.location.findUnique({
      where: { id },
    })

    if (!existingLocation) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    // Update location
    const location = await prisma.location.update({
      where: { id },
      data: {
        name: validatedData.name,
        address: validatedData.address,
        timezone: validatedData.timezone,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "UPDATE",
        entityType: "Location",
        entityId: id,
        before: JSON.parse(JSON.stringify(existingLocation)),
        after: JSON.parse(JSON.stringify(location)),
      },
    })

    return NextResponse.json(location)
  } catch (error) {
    console.error("Error updating location:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    )
  }
}

// DELETE /api/locations/[id] - Delete a location
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check if location exists
    const existingLocation = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            shifts: true,
            managers: true,
            certifications: true,
          },
        },
      },
    })

    if (!existingLocation) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    // Check for dependencies
    if (existingLocation._count.shifts > 0) {
      return NextResponse.json(
        { error: "Cannot delete location with existing shifts. Please delete or reassign shifts first." },
        { status: 400 }
      )
    }

    // Delete location (this will cascade delete manager assignments and certifications)
    await prisma.location.delete({
      where: { id },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "DELETE",
        entityType: "Location",
        entityId: id,
        before: JSON.parse(JSON.stringify(existingLocation)),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting location:", error)
    return NextResponse.json(
      { error: "Failed to delete location" },
      { status: 500 }
    )
  }
}
