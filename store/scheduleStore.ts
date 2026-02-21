import { create } from "zustand"
import type { ShiftWithDetails } from "@/types"

interface ScheduleState {
  // Selected week for viewing
  selectedWeekStart: Date | null
  setSelectedWeekStart: (date: Date | null) => void

  // Selected location filter
  selectedLocationId: string | null
  setSelectedLocationId: (id: string | null) => void

  // Shift being edited/assigned
  editingShiftId: string | null
  setEditingShiftId: (id: string | null) => void

  // Assign modal state
  isAssignModalOpen: boolean
  openAssignModal: (shiftId: string) => void
  closeAssignModal: () => void

  // Selected staff for assignment preview
  selectedStaffIdForPreview: string | null
  setSelectedStaffIdForPreview: (id: string | null) => void

  // Optimistic updates
  optimisticShifts: Map<string, ShiftWithDetails>
  setOptimisticShift: (shift: ShiftWithDetails) => void
  removeOptimisticShift: (shiftId: string) => void
  clearOptimisticShifts: () => void

  // Drag and drop state
  draggedShiftId: string | null
  setDraggedShiftId: (id: string | null) => void
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  selectedWeekStart: null,
  setSelectedWeekStart: (date) => set({ selectedWeekStart: date }),

  selectedLocationId: null,
  setSelectedLocationId: (id) => set({ selectedLocationId: id }),

  editingShiftId: null,
  setEditingShiftId: (id) => set({ editingShiftId: id }),

  isAssignModalOpen: false,
  openAssignModal: (shiftId) => set({ isAssignModalOpen: true, editingShiftId: shiftId }),
  closeAssignModal: () => set({ isAssignModalOpen: false, editingShiftId: null }),

  selectedStaffIdForPreview: null,
  setSelectedStaffIdForPreview: (id) => set({ selectedStaffIdForPreview: id }),

  optimisticShifts: new Map(),
  setOptimisticShift: (shift) =>
    set((state) => {
      const newMap = new Map(state.optimisticShifts)
      newMap.set(shift.id, shift)
      return { optimisticShifts: newMap }
    }),
  removeOptimisticShift: (shiftId) =>
    set((state) => {
      const newMap = new Map(state.optimisticShifts)
      newMap.delete(shiftId)
      return { optimisticShifts: newMap }
    }),
  clearOptimisticShifts: () => set({ optimisticShifts: new Map() }),

  draggedShiftId: null,
  setDraggedShiftId: (id) => set({ draggedShiftId: id }),
}))
