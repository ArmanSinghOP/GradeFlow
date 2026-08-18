import { useAppStore } from "../store/useAppStore"

export const useToast = () => {
  const toasts = useAppStore((state) => state.toasts)
  const addToastToStore = useAppStore((state) => state.addToast)
  const removeToast = useAppStore((state) => state.removeToast)

  const handleAddToast = (message: string, type: "success" | "error" | "info" | "warning") => {
    const id = Date.now().toString() + Math.random().toString()
    const duration = 4000
    addToastToStore({ id, message, type, duration })
    
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  const toast = {
    success: (message: string) => handleAddToast(message, "success"),
    error: (message: string) => handleAddToast(message, "error"),
    info: (message: string) => handleAddToast(message, "info"),
    warning: (message: string) => handleAddToast(message, "warning"),
  }

  const dismiss = (id: string) => removeToast(id)

  return { toasts, toast, dismiss }
}

export default useToast
