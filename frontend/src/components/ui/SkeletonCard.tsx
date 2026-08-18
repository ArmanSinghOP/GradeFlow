import { cn } from "../../utils/cn"

interface SkeletonCardProps {
  lines?: number
  showHeader?: boolean
  className?: string
}

export const SkeletonCard = ({
  lines = 3,
  showHeader = true,
  className
}: SkeletonCardProps) => {
  return (
    <div className={cn("bg-surface-700 rounded-xl border border-surface-500 p-5", className)}>
      {showHeader && (
        <div className="w-1/3 h-4 bg-surface-500 animate-pulse rounded mb-4" />
      )}
      
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => {
          // Alternating widths: w-full, w-4/5, w-3/5, w-full...
          const widthClass = i % 3 === 0 ? "w-full" : i % 3 === 1 ? "w-4/5" : "w-3/5"
          return (
            <div
              key={i}
              className={cn("h-3 rounded bg-surface-500 animate-pulse", widthClass)}
            />
          )
        })}
      </div>
    </div>
  )
}
