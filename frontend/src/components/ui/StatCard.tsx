import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react"
import { cn } from "../../utils/cn"

export interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: number; label: string }
  color?: "brand" | "blue" | "purple" | "amber"
}

export const StatCard = ({ label, value, icon: Icon, trend, color = "brand" }: StatCardProps) => {
  const isUp = trend?.value && trend.value >= 0

  const colorStyles = {
    brand: "bg-brand-400/10 text-brand-400",
    blue: "bg-blue-500/10 text-blue-500",
    purple: "bg-purple-500/10 text-purple-500",
    amber: "bg-amber-500/10 text-amber-500",
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-surface-500 bg-surface-700 p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-surface-400">{label}</span>
        <div className={cn("flex items-center justify-center rounded-full p-2.5", colorStyles[color])}>
          <Icon size={20} />
        </div>
      </div>
      
      <div className="flex items-end gap-3">
        <span className="text-2xl font-medium tracking-tight text-white">{value}</span>
        {trend && (
          <div className={cn("flex flex-col mb-1", isUp ? "text-brand-400" : "text-red-500")}>
            <div className="flex items-center gap-1 text-sm font-medium">
              {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {Math.abs(trend.value)}%
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
