import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/availability - Get user's availability
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || session.user.id

    // Managers can view other users' availability
    if (userId !== session.user.id && session.user.role === "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const availability = await prisma.availability.findMany({
      where: { userId },
      orderBy: { dayOfWeek: "asc" },
    })

    const exceptions = await prisma.availabilityException.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    })

    return NextResponse.json({
      availability,
      exceptions,
    })
  } catch (error) {
    console.error("Error fetching availability:", error)
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    )
  }
}

// POST /api/availability - Create availability entry
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { type, data } = body

    if (type === "recurring") {
      // Create recurring availability
      const availability = await prisma.availability.create({
        data: {
          userId: session.user.id,
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          timezone: data.timezone || "America/New_York",
        },
      })
      return NextResponse.json(availability)
    } else if (type === "exception") {
      // Create availability exception
      const exception = await prisma.availabilityException.create({
        data: {
          userId: session.user.id,
          date: new Date(data.date),
          isUnavailable: data.isUnavailable ?? true,
          startTime: data.startTime,
          endTime: data.endTime,
        },
      })
      return NextResponse.json(exception)
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error creating availability:", error)
    return NextResponse.json(
      { error: "Failed to create availability" },
      { status: 500 }
    )
  }
}

// PUT /api/availability - Update availability entry
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { type, id, data } = body

    if (type === "recurring") {
      const availability = await prisma.availability.update({
        where: {
          id,
          userId: session.user.id,
        },
        data: {
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
        },
      })
      return NextResponse.json(availability)
    } else if (type === "exception") {
      const exception = await prisma.availabilityException.update({
        where: {
          id,
          userId: session.user.id,
        },
        data: {
          date: data.date ? new Date(data.date) : undefined,
          isUnavailable: data.isUnavailable,
          startTime: data.startTime,
          endTime: data.endTime,
        },
      })
      return NextResponse.json(exception)
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error updating availability:", error)
    return NextResponse.json(
      { error: "Failed to update availability" },
      { status: 500 }
    )
  }
}

// DELETE /api/availability - Delete availability entry
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const id = searchParams.get("id")

    if (!type || !id) {
      return NextResponse.json({ error: "Missing type or id" }, { status: 400 })
    }

    if (type === "recurring") {
      await prisma.availability.delete({
        where: {
          id,
          userId: session.user.id,
        },
      })
    } else if (type === "exception") {
      await prisma.availabilityException.delete({
        where: {
          id,
          userId: session.user.id,
        },
      })
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting availability:", error)
    return NextResponse.json(
      { error: "Failed to delete availability" },
      { status: 500 }
    )
  }
}
