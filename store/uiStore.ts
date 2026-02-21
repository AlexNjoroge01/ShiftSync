import { create } from "zustand"

type ViewMode = "week" | "day" | "list"
type Theme = "light" | "dark" | "system"

interface UIState {
  // Sidebar state
  isSidebarOpen: boolean
  toggleSidebar: () => void
  openSidebar: () => void
  closeSidebar: () => void

  // View mode for schedule
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // Theme
  theme: Theme
  setTheme: (theme: Theme) => void

  // Modal states
  activeModal: string | null
  openModal: (modalId: string) => void
  closeModal: () => void

  // Loading states
  globalLoading: boolean
  setGlobalLoading: (loading: boolean) => void

  // Toast container ref for programmatic toasts
  isHydrated: boolean
  setHydrated: (hydrated: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),

  viewMode: "week",
  setViewMode: (mode) => set({ viewMode: mode }),

  theme: "system",
  setTheme: (theme) => set({ theme }),

  activeModal: null,
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),

  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),

  isHydrated: false,
  setHydrated: (hydrated) => set({ isHydrated: hydrated }),
}))
