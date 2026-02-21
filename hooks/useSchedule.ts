"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ShiftWithDetails } from "@/types"

interface UseScheduleOptions {
  locationId?: string
  startDate?: string
  endDate?: string
  isPublished?: boolean
}

interface CreateShiftInput {
  locationId: string
  date: string
  startTime: string
  endTime: string
  requiredSkillId?: string | null
  headcount?: number
}

interface AssignStaffInput {
  shiftId: string
  userId: string
  overrideReason?: string
}

/**
 * Hook for managing shifts and schedules
 */
export function useSchedule(options: UseScheduleOptions = {}) {
  const queryClient = useQueryClient()

  // Build query params
  const queryParams = new URLSearchParams()
  if (options.locationId) queryParams.set("locationId", options.locationId)
  if (options.startDate) queryParams.set("startDate", options.startDate)
  if (options.endDate) queryParams.set("endDate", options.endDate)
  if (options.isPublished !== undefined) queryParams.set("isPublished", String(options.isPublished))

  const { data, isLoading, error, refetch } = useQuery<ShiftWithDetails[]>({
    queryKey: ["shifts", options],
    queryFn: async () => {
      const response = await fetch(`/api/shifts?${queryParams.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch shifts")
      return response.json()
    },
    staleTime: 60000, // 1 minute
  })

  const createShiftMutation = useMutation({
    mutationFn: async (input: CreateShiftInput) => {
      const response = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create shift")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] })
      toast.success("Shift created successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create shift")
    },
  })

  const updateShiftMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateShiftInput> }) => {
      const response = await fetch(`/api/shifts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update shift")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] })
      toast.success("Shift updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update shift")
    },
  })

  const deleteShiftMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/shifts/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete shift")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] })
      toast.success("Shift deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete shift")
    },
  })

  const assignStaffMutation = useMutation({
    mutationFn: async (input: AssignStaffInput) => {
      const response = await fetch(`/api/shifts/${input.shiftId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: input.userId,
          overrideReason: input.overrideReason,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to assign staff")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] })
      toast.success("Staff assigned successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign staff")
    },
  })

  const unassignStaffMutation = useMutation({
    mutationFn: async ({ shiftId, userId }: { shiftId: string; userId: string }) => {
      const response = await fetch(`/api/shifts/${shiftId}/assign`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to unassign staff")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] })
      toast.success("Staff unassigned successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unassign staff")
    },
  })

  return {
    shifts: data ?? [],
    isLoading,
    error,
    refetch,
    createShift: createShiftMutation.mutate,
    updateShift: updateShiftMutation.mutate,
    deleteShift: deleteShiftMutation.mutate,
    assignStaff: assignStaffMutation.mutate,
    unassignStaff: unassignStaffMutation.mutate,
    isCreating: createShiftMutation.isPending,
    isUpdating: updateShiftMutation.isPending,
    isDeleting: deleteShiftMutation.isPending,
    isAssigning: assignStaffMutation.isPending,
  }
}
