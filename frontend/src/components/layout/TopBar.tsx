import { Code2 } from "lucide-react"
import { useAppStore } from "../../store/useAppStore"

export interface TopBarProps {
  title?: string
}

export const TopBar = ({ title = "" }: TopBarProps) => {
  const activeJobsCount = useAppStore((state) => state.activeJobIds.length)

  return (
    <div className="flex h-14 items-center justify-between border-b border-surface-500 border-opacity-50 bg-surface-800 px-6">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      
      <div className="flex items-center gap-6">
        {activeJobsCount > 0 && (
          <div className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500">
            {activeJobsCount} Active
          </div>
        )}
        
        <a 
          href={import.meta.env.VITE_GITHUB_URL || "#"} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-surface-400 hover:text-white transition-colors"
        >
          <Code2 size={20} />
        </a>
      </div>
    </div>
  )
}
