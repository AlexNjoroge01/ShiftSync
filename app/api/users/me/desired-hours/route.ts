import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateDesiredHoursSchema = z.object({
  desiredHoursPerWeek: z.number().min(0).max(60, "Cannot exceed 60 hours per week"),
})

// PATCH /api/users/me/desired-hours - Update current user's desired hours
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateDesiredHoursSchema.parse(body)

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        desiredHoursPerWeek: validatedData.desiredHoursPerWeek,
      },
    })

    return NextResponse.json({ 
      success: true,
      desiredHoursPerWeek: user.desiredHoursPerWeek 
    })
  } catch (error) {
    console.error("Error updating desired hours:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to update desired hours" },
      { status: 500 }
    )
  }
}
