"use client"

import { useEffect, useRef, useCallback } from "react"
import type { SSEEvent } from "@/types"

interface UseRealtimeOptions {
  onSchedulePublished?: (payload: SSEEvent["payload"]) => void
  onScheduleUpdated?: (payload: SSEEvent["payload"]) => void
  onSwapNew?: (payload: SSEEvent["payload"]) => void
  onSwapUpdated?: (payload: SSEEvent["payload"]) => void
  onAssignmentConflict?: (payload: SSEEvent["payload"]) => void
  onAssignmentNew?: (payload: SSEEvent["payload"]) => void
  onOndutyUpdate?: (payload: SSEEvent["payload"]) => void
  enabled?: boolean
}

/**
 * Hook for subscribing to real-time SSE events
 */
export function useRealtime(options: UseRealtimeOptions = {}) {
  const {
    onSchedulePublished,
    onScheduleUpdated,
    onSwapNew,
    onSwapUpdated,
    onAssignmentConflict,
    onAssignmentNew,
    onOndutyUpdate,
    enabled = true,
  } = options

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const callbacksRef = useRef({
    onSchedulePublished,
    onScheduleUpdated,
    onSwapNew,
    onSwapUpdated,
    onAssignmentConflict,
    onAssignmentNew,
    onOndutyUpdate,
  })

  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = {
      onSchedulePublished,
      onScheduleUpdated,
      onSwapNew,
      onSwapUpdated,
      onAssignmentConflict,
      onAssignmentNew,
      onOndutyUpdate,
    }
  }, [onSchedulePublished, onScheduleUpdated, onSwapNew, onSwapUpdated, onAssignmentConflict, onAssignmentNew, onOndutyUpdate])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    const connect = () => {
      if (eventSourceRef.current) return

      const eventSource = new EventSource("/api/realtime")
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log("SSE: Connected")
        reconnectAttempts.current = 0
      }

      eventSource.onerror = () => {
        console.error("SSE: Connection error")
        eventSource.close()
        eventSourceRef.current = null

        // Exponential backoff for reconnection
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
        reconnectAttempts.current++

        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, delay)
      }

      eventSource.onmessage = (event) => {
        try {
          const data: SSEEvent = JSON.parse(event.data)

          switch (data.type) {
            case "schedule:published":
              callbacksRef.current.onSchedulePublished?.(data.payload)
              break
            case "schedule:updated":
              callbacksRef.current.onScheduleUpdated?.(data.payload)
              break
            case "swap:new":
              callbacksRef.current.onSwapNew?.(data.payload)
              break
            case "swap:updated":
              callbacksRef.current.onSwapUpdated?.(data.payload)
              break
            case "assignment:conflict":
              callbacksRef.current.onAssignmentConflict?.(data.payload)
              break
            case "assignment:new":
              callbacksRef.current.onAssignmentNew?.(data.payload)
              break
            case "onduty:update":
              callbacksRef.current.onOndutyUpdate?.(data.payload)
              break
          }
        } catch (error) {
          console.error("SSE: Failed to parse event", error)
        }
      }
    }

    connect()

    return () => {
      disconnect()
    }
  }, [enabled, disconnect])

  const reconnect = useCallback(() => {
    disconnect()
    reconnectAttempts.current = 0
    
    // Small delay before reconnecting
    setTimeout(() => {
      if (enabled) {
        const eventSource = new EventSource("/api/realtime")
        eventSourceRef.current = eventSource
        
        eventSource.onopen = () => {
          console.log("SSE: Reconnected")
          reconnectAttempts.current = 0
        }
        
        eventSource.onerror = () => {
          console.error("SSE: Reconnection error")
          eventSource.close()
          eventSourceRef.current = null
        }
        
        eventSource.onmessage = (event) => {
          try {
            const data: SSEEvent = JSON.parse(event.data)
            switch (data.type) {
              case "schedule:published":
                callbacksRef.current.onSchedulePublished?.(data.payload)
                break
              case "schedule:updated":
                callbacksRef.current.onScheduleUpdated?.(data.payload)
                break
              case "swap:new":
                callbacksRef.current.onSwapNew?.(data.payload)
                break
              case "swap:updated":
                callbacksRef.current.onSwapUpdated?.(data.payload)
                break
              case "assignment:conflict":
                callbacksRef.current.onAssignmentConflict?.(data.payload)
                break
              case "assignment:new":
                callbacksRef.current.onAssignmentNew?.(data.payload)
                break
              case "onduty:update":
                callbacksRef.current.onOndutyUpdate?.(data.payload)
                break
            }
          } catch (error) {
            console.error("SSE: Failed to parse event", error)
          }
        }
      }
    }, 100)
  }, [enabled, disconnect])

  return {
    disconnect,
    reconnect,
  }
}
