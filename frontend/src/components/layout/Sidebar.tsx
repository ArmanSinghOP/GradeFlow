import { useEffect, useState } from "react"
import { NavLink } from "react-router-dom"
import { LayoutDashboard, Upload, Activity, Anchor, Box } from "lucide-react"
import { cn } from "../../utils/cn"
import { useAppStore } from "../../store/useAppStore"
import client from "../../api/client"

export const Sidebar = () => {
  const [isApiConnected, setIsApiConnected] = useState(false)
  const activeJobsCount = useAppStore((state) => state.activeJobIds.length)

  useEffect(() => {
    const checkApi = async () => {
      try {
        await client.get("/")
        setIsApiConnected(true)
      } catch {
        setIsApiConnected(false)
      }
    }
    
    checkApi()
    const interval = setInterval(checkApi, 30000)
    return () => clearInterval(interval)
  }, [])

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/submit", icon: Upload, label: "Submit Batch" },
    { to: "/jobs", icon: Activity, label: "Jobs", count: activeJobsCount },
    { to: "/anchors", icon: Anchor, label: "Anchors" },
  ]

  return (
    <div className="flex h-full w-60 flex-col bg-surface-800 border-r border-surface-500 border-opacity-50">
      <div className="flex items-center gap-3 p-6">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-brand-400 text-surface-900">
          <Box size={20} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">GradeFlow</span>
            <span className="rounded bg-brand-400/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-400">
              BETA
            </span>
          </div>
          <span className="text-xs font-medium text-surface-400">
            Cohort Evaluation Engine
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-4 py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border-l-2 border-transparent",
                  isActive
                    ? "bg-brand-50/5 border-l-brand-400 text-brand-400"
                    : "text-surface-400 hover:bg-surface-700 hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={isActive ? "text-brand-400" : "text-surface-400 group-hover:text-white"} />
                    {item.label}
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="flex h-5 items-center justify-center rounded-full bg-brand-400/20 px-2 text-[10px] font-bold text-brand-400">
                      {item.count}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-4 border-t border-surface-500 border-opacity-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-surface-400">
            <span className="relative flex h-2 w-2">
              {isApiConnected && (
                <span className="absolute inline-flex h-full w-full animate-pulse-slow rounded-full bg-brand-400 opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  isApiConnected ? "bg-brand-400" : "bg-red-500"
                )}
              />
            </span>
            {isApiConnected ? "API Connected" : "API Offline"}
          </div>
        </div>
        <div className="text-xs text-surface-400">v1.0.0</div>
      </div>
    </div>
  )
}
