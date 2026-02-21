"use client"

import { useQuery } from "@tanstack/react-query"
import type { OvertimeResult, OvertimeWarning } from "@/types"

interface UseOvertimeCheckOptions {
  userId?: string
  weekStart?: string
  weekEnd?: string
  enabled?: boolean
}

interface LocationOvertimeStatus {
  userId: string
  userName: string
  weeklyHours: number
  overtimeHours: number
  warnings: OvertimeWarning[]
}

interface AssignmentPreview {
  currentWeekHours: number
  projectedWeekHours: number
  newOvertimeHours: number
  warnings: string[]
  premiumShifts: number
}

/**
 * Hook for checking overtime status and warnings
 */
export function useOvertimeCheck(options: UseOvertimeCheckOptions = {}) {
  const { userId, weekStart, weekEnd, enabled = true } = options

  const { data, isLoading, error, refetch } = useQuery<OvertimeResult>({
    queryKey: ["overtime", userId, weekStart, weekEnd],
    queryFn: async () => {
      if (!userId || !weekStart || !weekEnd) {
        throw new Error("Missing required parameters")
      }

      const params = new URLSearchParams({
        userId,
        weekStart,
        weekEnd,
      })

      const response = await fetch(`/api/overtime?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch overtime data")
      return response.json()
    },
    enabled: enabled && !!userId && !!weekStart && !!weekEnd,
    staleTime: 60000, // 1 minute
  })

  return {
    overtimeData: data,
    isLoading,
    error,
    refetch,
    weeklyHours: data?.weeklyHours ?? 0,
    dailyHours: data?.dailyHours ?? 0,
    consecutiveDays: data?.consecutiveDays ?? 0,
    warnings: data?.warnings ?? [],
    isBlocked: data?.isBlocked ?? false,
  }
}

/**
 * Hook for getting overtime status for all staff at a location
 */
export function useLocationOvertime(options: {
  locationId?: string
  weekStart?: string
  weekEnd?: string
  enabled?: boolean
}) {
  const { locationId, weekStart, weekEnd, enabled = true } = options

  const { data, isLoading, error, refetch } = useQuery<LocationOvertimeStatus[]>({
    queryKey: ["overtime", "location", locationId, weekStart, weekEnd],
    queryFn: async () => {
      if (!locationId || !weekStart || !weekEnd) {
        throw new Error("Missing required parameters")
      }

      const params = new URLSearchParams({
        locationId,
        weekStart,
        weekEnd,
      })

      const response = await fetch(`/api/overtime/location?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch location overtime data")
      return response.json()
    },
    enabled: enabled && !!locationId && !!weekStart && !!weekEnd,
    staleTime: 60000,
  })

  return {
    staffOvertime: data ?? [],
    isLoading,
    error,
    refetch,
  }
}

/**
 * Hook for getting assignment preview (What-If analysis)
 */
export function useAssignmentPreview(options: {
  userId?: string
  shiftId?: string
  enabled?: boolean
}) {
  const { userId, shiftId, enabled = true } = options

  const { data, isLoading, error, refetch } = useQuery<AssignmentPreview>({
    queryKey: ["assignment-preview", userId, shiftId],
    queryFn: async () => {
      if (!userId || !shiftId) {
        throw new Error("Missing required parameters")
      }

      const params = new URLSearchParams({
        userId,
        shiftId,
      })

      const response = await fetch(`/api/shifts/${shiftId}/preview?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch assignment preview")
      return response.json()
    },
    enabled: enabled && !!userId && !!shiftId,
    staleTime: 30000, // 30 seconds
  })

  return {
    preview: data,
    isLoading,
    error,
    refetch,
    currentWeekHours: data?.currentWeekHours ?? 0,
    projectedWeekHours: data?.projectedWeekHours ?? 0,
    newOvertimeHours: data?.newOvertimeHours ?? 0,
    warnings: data?.warnings ?? [],
    premiumShifts: data?.premiumShifts ?? 0,
  }
}
