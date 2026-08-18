import { WifiOff } from "lucide-react"

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  actionLabel?: string
  onAction?: () => void
}

export const ErrorState = ({
  title = "Failed to load",
  message = "There was an error communicating with the server. Please try again.",
  onRetry,
  actionLabel,
  onAction
}: ErrorStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <WifiOff size={40} className="text-red-400 mb-3 opacity-70" />
      <h3 className="text-base font-medium text-white">{title}</h3>
      <p className="text-sm text-surface-400 mt-1 max-w-xs">{message}</p>
      
      {(onRetry || onAction) && (
        <div className="flex items-center gap-2 mt-4">
          {onRetry && (
            <button
              onClick={onRetry}
              className="bg-brand-400/10 hover:bg-brand-400/20 text-brand-400 border border-brand-400/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          )}
          {onAction && actionLabel && (
            <button
              onClick={onAction}
              className="bg-surface-700 hover:bg-surface-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
