import { AlertCircle, CheckCircle2, Info, XCircle, X } from "lucide-react"
import { cn } from "../../utils/cn"
import type { Toast as ToastType } from "../../store/useAppStore"

export interface ToastProps {
  toasts: ToastType[]
  onDismiss: (id: string) => void
}

const TYPE_CONFIG = {
  success: { icon: CheckCircle2, color: "text-brand-400", border: "border-l-brand-400" },
  error: { icon: XCircle, color: "text-red-500", border: "border-l-red-500" },
  warning: { icon: AlertCircle, color: "text-amber-500", border: "border-l-amber-500" },
  info: { icon: Info, color: "text-blue-500", border: "border-l-blue-500" },
}

export const Toast = ({ toasts, onDismiss }: ToastProps) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const config = TYPE_CONFIG[toast.type]
        const Icon = config.icon

        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex w-80 items-start gap-3 rounded shadow-lg animate-slide-in",
              "bg-surface-600 border border-surface-400 border-l-4 p-4",
              config.border
            )}
          >
            <Icon className={cn("mt-0.5 shrink-0", config.color)} size={18} />
            <p className="flex-1 text-sm font-medium text-white">{toast.message}</p>
            <button
              onClick={() => onDismiss(toast.id)}
              className="mt-0.5 shrink-0 rounded text-surface-400 hover:text-white transition-colors focus:outline-none"
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
