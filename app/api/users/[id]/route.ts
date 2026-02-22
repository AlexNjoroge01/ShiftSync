import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).optional(),
  desiredHoursPerWeek: z.number().min(0).max(60).optional(),
  locationIds: z.array(z.string()).optional(), // For managers
  skillIds: z.array(z.string()).optional(), // For staff
  certificationLocationIds: z.array(z.string()).optional(), // For staff
})

// GET /api/users/[id] - Get a specific user
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    
    if (!session?.user || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
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
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    )
  }
}

// PATCH /api/users/[id] - Update a user
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        managedLocations: true,
        certifications: { where: { revokedAt: null } },
        skills: true,
      },
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check email uniqueness if email is being changed
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email },
      })
      if (emailExists) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: {
      name?: string
      email?: string
      hashedPassword?: string
      role?: "ADMIN" | "MANAGER" | "STAFF"
      desiredHoursPerWeek?: number | null
    } = {}

    if (validatedData.name) updateData.name = validatedData.name
    if (validatedData.email) updateData.email = validatedData.email
    if (validatedData.password) {
      updateData.hashedPassword = await bcrypt.hash(validatedData.password, 10)
    }
    if (validatedData.role) updateData.role = validatedData.role
    if (validatedData.desiredHoursPerWeek !== undefined) {
      updateData.desiredHoursPerWeek = validatedData.desiredHoursPerWeek
    }

    // Update user with related data in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // Update basic user data
      const updatedUser = await tx.user.update({
        where: { id },
        data: updateData,
      })

      // Update manager locations if provided
      if (validatedData.locationIds && validatedData.role === "MANAGER") {
        // Delete existing assignments
        await tx.locationAssignment.deleteMany({
          where: { managerId: id },
        })
        // Create new assignments
        await tx.locationAssignment.createMany({
          data: validatedData.locationIds.map((locationId) => ({
            managerId: id,
            locationId,
          })),
        })
      }

      // Update staff skills if provided
      if (validatedData.skillIds) {
        // Delete existing skills
        await tx.userSkill.deleteMany({
          where: { userId: id },
        })
        // Create new skills
        if (validatedData.skillIds.length > 0) {
          await tx.userSkill.createMany({
            data: validatedData.skillIds.map((skillId) => ({
              userId: id,
              skillId,
            })),
          })
        }
      }

      // Update staff certifications if provided
      if (validatedData.certificationLocationIds) {
        // Revoke existing certifications
        await tx.locationCertification.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        // Create new certifications
        if (validatedData.certificationLocationIds.length > 0) {
          await tx.locationCertification.createMany({
            data: validatedData.certificationLocationIds.map((locationId) => ({
              userId: id,
              locationId,
            })),
          })
        }
      }

      return updatedUser
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "UPDATE",
        entityType: "User",
        entityId: id,
        before: JSON.parse(JSON.stringify(existingUser)),
        after: JSON.parse(JSON.stringify(user)),
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Delete user (cascades will handle related records)
    await prisma.user.delete({
      where: { id },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "DELETE",
        entityType: "User",
        entityId: id,
        before: JSON.parse(JSON.stringify(existingUser)),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}
