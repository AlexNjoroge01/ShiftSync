/**
 * Server-Sent Events Manager
 * 
 * Note: This is an in-memory implementation for single-instance deployments.
 * For horizontal scaling, this would need to be replaced with Redis pub/sub.
 */

type SSEEventType =
  | "schedule:published"
  | "schedule:updated"
  | "swap:new"
  | "swap:updated"
  | "assignment:conflict"
  | "onduty:update"

interface SSEEvent {
  type: SSEEventType
  payload: Record<string, unknown>
}

// Map of userId to Response objects
const clients = new Map<string, Set<Response>>()

/**
 * Add a client connection
 */
export function addClient(userId: string, response: Response): void {
  if (!clients.has(userId)) {
    clients.set(userId, new Set())
  }
  clients.get(userId)?.add(response)
  console.log(`SSE: Client connected for user ${userId}. Total clients: ${getClientCount()}`)
}

/**
 * Remove a client connection
 */
export function removeClient(userId: string, response: Response): void {
  clients.get(userId)?.delete(response)
  if (clients.get(userId)?.size === 0) {
    clients.delete(userId)
  }
  console.log(`SSE: Client disconnected for user ${userId}. Total clients: ${getClientCount()}`)
}

/**
 * Get total number of connected clients
 */
export function getClientCount(): number {
  let count = 0
  clients.forEach((set) => {
    count += set.size
  })
  return count
}

/**
 * Broadcast an event to specific users
 */
export function broadcast(userIds: string[], event: SSEEvent): void {
  const data = `data: ${JSON.stringify(event)}\n\n`
  
  for (const userId of userIds) {
    const userClients = clients.get(userId)
    if (userClients) {
      userClients.forEach((response) => {
        try {
          // @ts-expect-error - We're accessing the internal writer
          const writer = response.body?.writer
          if (writer) {
            writer.write(new TextEncoder().encode(data))
          }
        } catch (error) {
          console.error(`SSE: Error sending to user ${userId}:`, error)
        }
      })
    }
  }
}

/**
 * Broadcast an event to all connected clients
 */
export function broadcastAll(event: SSEEvent): void {
  const userIds = Array.from(clients.keys())
  broadcast(userIds, event)
}

/**
 * Create a new SSE response for a client
 */
export function createSSEResponse(userId: string): Response {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      
      // Send initial connection message
      controller.enqueue(encoder.encode(": connected\n\n"))
      
      // Send keepalive every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"))
        } catch {
          clearInterval(keepAlive)
        }
      }, 30000)

      // Create a response object to track this connection
      const response = new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      })

      // Store the controller for later use
      // @ts-expect-error - We're attaching the controller to the response
      response.body = { writer: controller }

      addClient(userId, response)

      // Cleanup on close
      const cleanup = () => {
        clearInterval(keepAlive)
        removeClient(userId, response)
      }

      // Handle client disconnect
      // @ts-expect-error - accessing internal property
      response.onclose = cleanup
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}

/**
 * Notify managers about a new swap request
 */
export function notifySwapRequest(
  managerIds: string[],
  swapRequestId: string,
  requesterName: string,
  shiftDetails: string
): void {
  broadcast(managerIds, {
    type: "swap:new",
    payload: {
      swapRequestId,
      requesterName,
      shiftDetails,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Notify about swap status update
 */
export function notifySwapUpdate(
  userIds: string[],
  swapRequestId: string,
  status: string
): void {
  broadcast(userIds, {
    type: "swap:updated",
    payload: {
      swapRequestId,
      status,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Notify about schedule publication
 */
export function notifySchedulePublished(
  locationId: string,
  weekStart: string,
  staffIds: string[]
): void {
  broadcast(staffIds, {
    type: "schedule:published",
    payload: {
      locationId,
      weekStart,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Notify about assignment conflict
 */
export function notifyAssignmentConflict(
  managerIds: string[],
  userId: string,
  userName: string,
  shiftId: string
): void {
  broadcast(managerIds, {
    type: "assignment:conflict",
    payload: {
      userId,
      userName,
      shiftId,
      timestamp: new Date().toISOString(),
    },
  })
}
