import { create } from "zustand"
import type { JobStatusResponse } from "../types"

export interface Toast {
  id: string
  message: string
  type: "success" | "error" | "info" | "warning"
  duration?: number
}

interface AppStore {
  activeJobIds: string[]
  recentJobs: JobStatusResponse[]
  toasts: Toast[]
  addActiveJob: (jobId: string) => void
  removeActiveJob: (jobId: string) => void
  setRecentJobs: (jobs: JobStatusResponse[]) => void
  addToast: (toast: Omit<Toast, "id"> & { id?: string }) => void
  removeToast: (id: string) => void
}

export const useAppStore = create<AppStore>((set) => ({
  activeJobIds: [],
  recentJobs: [],
  toasts: [],
  addActiveJob: (jobId) =>
    set((state) => ({
      activeJobIds: state.activeJobIds.includes(jobId)
        ? state.activeJobIds
        : [...state.activeJobIds, jobId],
    })),
  removeActiveJob: (jobId) =>
    set((state) => ({
      activeJobIds: state.activeJobIds.filter((id) => id !== jobId),
    })),
  setRecentJobs: (jobs) => set({ recentJobs: jobs }),
  addToast: (toastProps) => {
    const id = toastProps.id || Date.now().toString() + Math.random().toString()
    set((state) => ({
      toasts: [...state.toasts, { id, duration: 4000, ...toastProps }],
    }))
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

export default useAppStore
