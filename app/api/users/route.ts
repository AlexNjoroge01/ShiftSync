import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import type { Prisma } from "@prisma/client"

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]),
  desiredHoursPerWeek: z.number().min(0).max(60).optional(),
  locationIds: z.array(z.string()).optional(), // For managers
  skillIds: z.array(z.string()).optional(), // For staff
  certificationLocationIds: z.array(z.string()).optional(), // For staff
})

// GET /api/users - List all users
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")
    const locationId = searchParams.get("locationId")

    const where: Prisma.UserWhereInput = {}

    if (role) {
      where.role = role as "ADMIN" | "MANAGER" | "STAFF"
    }

    // Managers can only see staff at their locations
    if (session.user.role === "MANAGER") {
      where.OR = [
        { role: "STAFF" },
        { id: session.user.id },
      ]
      
      if (locationId) {
        where.certifications = {
          some: {
            locationId,
            revokedAt: null,
          },
        }
      }
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        managedLocations: {
          include: {
            location: true,
          },
        },
        certifications: {
          where: { revokedAt: null },
          include: {
            location: true,
          },
        },
        skills: {
          include: {
            skill: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json()
    
    // Check if this is a public registration (no session) or admin creation
    const isPublicRegistration = !session?.user
    
    // For public registration, only allow STAFF role
    if (isPublicRegistration) {
      // Validate minimum required fields for registration
      const registerSchema = z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        role: z.literal("STAFF").optional(), // Only allow STAFF for public registration
      })
      
      const validatedData = registerSchema.parse(body)
      
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        )
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10)

      // Create user
      const user = await prisma.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          hashedPassword,
          role: "STAFF",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      })

      return NextResponse.json(user)
    }
    
    // Admin creation flow
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const validatedData = createUserSchema.parse(body)

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Create user with related data
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        hashedPassword,
        role: validatedData.role,
        desiredHoursPerWeek: validatedData.desiredHoursPerWeek,
        // Create manager location assignments
        managedLocations: validatedData.role === "MANAGER" && validatedData.locationIds
          ? {
              create: validatedData.locationIds.map((locationId) => ({
                locationId,
              })),
            }
          : undefined,
        // Create staff skills
        skills: validatedData.skillIds
          ? {
              create: validatedData.skillIds.map((skillId) => ({
                skillId,
              })),
            }
          : undefined,
        // Create staff certifications
        certifications: validatedData.certificationLocationIds
          ? {
              create: validatedData.certificationLocationIds.map((locationId) => ({
                locationId,
              })),
            }
          : undefined,
      },
      include: {
        managedLocations: true,
        certifications: true,
        skills: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "CREATE",
        entityType: "User",
        entityId: user.id,
        after: JSON.parse(JSON.stringify(user)),
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}
