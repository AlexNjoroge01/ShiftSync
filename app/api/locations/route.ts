import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  timezone: z.string().min(1, "Timezone is required"),
})

// GET /api/locations - List all locations
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let locations

    if (session.user.role === "ADMIN") {
      // Admins see all locations
      locations = await prisma.location.findMany({
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
            take: 5,
            orderBy: { startTimeUtc: "asc" },
          },
        },
        orderBy: { name: "asc" },
      })
    } else if (session.user.role === "MANAGER") {
      // Managers see only their assigned locations
      locations = await prisma.location.findMany({
        where: {
          managers: {
            some: {
              managerId: session.user.id,
            },
          },
        },
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
            take: 5,
            orderBy: { startTimeUtc: "asc" },
          },
        },
        orderBy: { name: "asc" },
      })
    } else {
      // Staff see locations they're certified at
      locations = await prisma.location.findMany({
        where: {
          certifications: {
            some: {
              userId: session.user.id,
              revokedAt: null,
            },
          },
        },
        include: {
          shifts: {
            where: {
              startTimeUtc: { gte: new Date() },
              isPublished: true,
            },
            take: 5,
            orderBy: { startTimeUtc: "asc" },
          },
        },
        orderBy: { name: "asc" },
      })
    }

    return NextResponse.json(locations)
  } catch (error) {
    console.error("Error fetching locations:", error)
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    )
  }
}

// POST /api/locations - Create a new location
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createLocationSchema.parse(body)

    const location = await prisma.location.create({
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
        action: "CREATE",
        entityType: "Location",
        entityId: location.id,
        after: JSON.parse(JSON.stringify(location)),
      },
    })

    return NextResponse.json(location, { status: 201 })
  } catch (error) {
    console.error("Error creating location:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    )
  }
}
