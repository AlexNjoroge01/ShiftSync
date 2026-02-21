import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createSSEResponse } from "@/lib/realtime/sse"

// GET /api/realtime - SSE endpoint for real-time updates
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Return SSE response
    return createSSEResponse(session.user.id)
  } catch (error) {
    console.error("SSE error:", error)
    return NextResponse.json(
      { error: "Failed to establish SSE connection" },
      { status: 500 }
    )
  }
}
