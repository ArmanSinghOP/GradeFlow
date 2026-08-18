import { MoreVertical, Sliders, CheckCircle, Trash2, Anchor } from "lucide-react"
import { useState } from "react"
import type { AnchorSetSummary } from "../../types"
import { formatRelativeTime } from "../../utils/time"
import { cn } from "../../utils/cn"

interface AnchorSetCardProps {
  anchor: AnchorSetSummary
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onValidate: () => void
}

export function AnchorSetCard({
  anchor,
  isSelected,
  onSelect,
  onDelete,
  onValidate
}: AnchorSetCardProps) {
  const [showActions, setShowActions] = useState(false)

  const total = Object.values(anchor.difficulty_distribution).reduce((a, b) => a + b, 0)
  
  const difficultyColors: Record<string, string> = {
    weak: "#E24B4A",
    developing: "#EF9F27",
    proficient: "#378ADD",
    strong: "#5DCAA5",
    exemplary: "#1D9E75"
  }

  const levels = ["weak", "developing", "proficient", "strong", "exemplary"]

  return (
    <div 
      className={cn(
        "bg-surface-700 rounded-xl border border-surface-500 hover:border-surface-400 cursor-pointer p-5 transition-colors duration-150",
        isSelected && "border-brand-400 bg-surface-600"
      )}
      onClick={() => {
        // Toggle actions might be a bit annoying if it triggers onSelect but let's let onSelect be triggered by the card.
        // Wait, the prompt says "Selected: border-brand-400, bg-surface-600, Cursor: pointer".
        // And "Action row (shown when three-dot menu clicked)".
        // Wait, "Preview button ... onClick: onSelect()". So the card itself shouldn't trigger onSelect?
        // Actually, the card itself might trigger onSelect, or only the preview button?
        // The spec says:
        // Action row: Preview button ... onClick: onSelect()
      }}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1 items-start">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-white font-mono">{anchor.anchor_set_id}</span>
            <span className="bg-surface-500 text-surface-300 text-xs rounded-full px-2 py-0.5">v{anchor.version}</span>
          </div>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation()
            setShowActions(!showActions)
          }}
          className="text-surface-400 hover:text-white p-1 rounded hover:bg-surface-600 transition-colors"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      <p className="text-sm text-surface-300 mt-1 line-clamp-2" title={anchor.description}>
        {anchor.description}
      </p>

      <div className="mt-2 flex flex-col items-start gap-1">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-600 text-surface-200 capitalize">
          {anchor.content_type}
        </span>
        <span className="text-xs text-surface-400">Rubric: {anchor.rubric_name}</span>
      </div>

      <div className="mt-3 flex gap-4 text-xs text-surface-400">
        <div className="flex items-center gap-1.5">
          <Anchor size={12} />
          <span>{anchor.anchor_count} anchors</span>
        </div>
        <span>{formatRelativeTime(anchor.created_at)}</span>
      </div>

      <div className="mt-3">
        <div className="text-xs text-surface-400 mb-1.5">Difficulty spread</div>
        {total > 0 ? (
          <div className="flex h-2 rounded-full overflow-hidden w-full bg-surface-600">
            {levels.map((level) => {
              const count = anchor.difficulty_distribution[level] || 0
              if (count === 0) return null
              const width = `${(count / total) * 100}%`
              return (
                <div 
                  key={level} 
                  style={{ width, backgroundColor: difficultyColors[level] }}
                  title={`${level}: ${count} anchors`}
                  className="h-full hover:brightness-110 transition-all cursor-help"
                />
              )
            })}
          </div>
        ) : (
          <div className="h-2 rounded-full w-full bg-surface-600" />
        )}
        
        <div className="flex flex-wrap gap-2 mt-1.5">
          {levels.map((level) => {
            const count = anchor.difficulty_distribution[level] || 0
            if (count === 0) return null
            return (
              <div key={level} className="flex items-center gap-1.5">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: difficultyColors[level] }} 
                />
                <span className="text-xs text-surface-400 capitalize">{level} ({count})</span>
              </div>
            )
          })}
        </div>
      </div>

      {showActions && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-surface-500">
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            className="flex items-center gap-1.5 text-xs text-brand-400 border border-surface-500 rounded px-3 py-1.5 hover:bg-surface-600 transition-colors flex-1 justify-center"
          >
            <Sliders size={14} />
            Preview
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onValidate()
            }}
            className="flex items-center gap-1.5 text-xs text-brand-400 border border-surface-500 rounded px-3 py-1.5 hover:bg-surface-600 transition-colors flex-1 justify-center"
          >
            <CheckCircle size={14} />
            Validate
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="flex items-center gap-1.5 text-xs text-red-400 border border-red-500/30 rounded px-3 py-1.5 hover:bg-red-500/10 transition-colors flex-1 justify-center"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
