import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Anchor, ExternalLink, Check } from "lucide-react"
import { listAnchors, previewCalibration } from "../../api/anchors"
import { LoadingSpinner } from "../index"

interface AnchorStepProps {
  anchorSetId: string | undefined
  onChange: (id: string | undefined) => void
}

export function AnchorStep({ anchorSetId, onChange }: AnchorStepProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["anchors"],
    queryFn: listAnchors,
  })

  const [previewScores] = useState([20, 30, 40, 50, 60, 70, 80])

  const { data: previewData, isLoading: isLoadingPreview } = useQuery({
    queryKey: ["anchorPreview", anchorSetId],
    queryFn: () => previewCalibration(anchorSetId!, previewScores),
    enabled: !!anchorSetId,
  })

  // We are assuming `data` is `{ anchor_sets: [], total: number }` as defined in types/api based on Phase 4,
  // but looking at `listAnchors` in my earlier `view_file` it returns `{ anchor_sets, total }`.
  const anchors = data?.anchor_sets || []

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-64">
        <LoadingSpinner size="lg" />
        <p className="text-surface-400 mt-4 text-sm mt-4">Loading anchor sets...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-64 text-center">
        <div className="text-red-400 mb-2">Failed to load anchor sets</div>
        <button className="text-sm text-brand-400 hover:text-brand-300" onClick={() => onChange(undefined)}>
          Skip this step
        </button>
      </div>
    )
  }

  if (anchors.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col">
          <h2 className="text-lg font-medium text-white mb-1">Select an anchor set for score calibration</h2>
          <p className="text-sm text-surface-400">Optional — skip if no anchor sets are configured</p>
        </div>
        
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-surface-600 rounded-xl bg-surface-700/50">
          <Anchor size={40} className="text-surface-400 opacity-30 mb-4" />
          <p className="text-white font-medium mb-1">No anchor sets found</p>
          <p className="text-sm text-surface-400 mb-4">Create anchor sets in the Anchor Manager</p>
          <a
            href="/anchors"
            target="_blank"
            className="flex items-center gap-1.5 text-sm bg-surface-600 hover:bg-surface-500 text-white px-4 py-2 rounded-lg transition-colors border border-surface-500"
          >
            Go to Anchor Manager <ExternalLink size={14} />
          </a>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => onChange(undefined)}
            className="text-sm text-surface-300 hover:text-white px-4 py-2 rounded transition-colors"
          >
            Skip this step
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <h2 className="text-lg font-medium text-white mb-1">Select an anchor set for score calibration</h2>
        <p className="text-sm text-surface-400">Optional — skip if no anchor sets are configured</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {anchors.map((anchor) => {
          const isSelected = anchorSetId === anchor.anchor_set_id
          const difficultyColors: Record<string, string> = {
            weak: "bg-red-500",
            developing: "bg-amber-500",
            proficient: "bg-blue-500",
            strong: "bg-teal-500",
            exemplary: "bg-brand-400",
          }

          return (
            <div
              key={anchor.anchor_set_id}
              onClick={() => onChange(isSelected ? undefined : anchor.anchor_set_id)}
              className={`relative flex flex-col gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                 isSelected
                  ? "bg-brand-50/10 border-brand-400 shadow-[0_0_10px_rgba(var(--brand-400),0.2)]"
                  : "bg-surface-600 border-surface-500 hover:border-brand-400 hover:bg-surface-600/80"
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 text-brand-400">
                  <Check size={18} />
                </div>
              )}
              
              <div className="flex justify-between items-start pr-6">
                <span className="font-mono text-xs text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded">
                  {anchor.anchor_set_id}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-500 text-surface-200 uppercase tracking-widest">
                  {anchor.content_type}
                </span>
              </div>
              
              <p className="text-sm text-white line-clamp-2" title={anchor.description}>
                {anchor.description}
              </p>
              
              <div className="flex justify-between items-center text-xs text-surface-400 mt-1">
                <span>{anchor.anchor_count} anchors</span>
                
                {/* Distribution Mini Bar */}
                <div className="flex gap-0.5 h-3 w-20 rounded overflow-hidden opacity-80" title="Difficulty distribution">
                  {Object.entries(anchor.difficulty_distribution || {}).map(([level, count]) => (
                    count > 0 && (
                      <div
                        key={level}
                        className={`${difficultyColors[level] || "bg-surface-400"} h-full`}
                        style={{ flexGrow: count }}
                        title={`${level}: ${count}`}
                      ></div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {anchorSetId && (
        <div className="bg-surface-600 border-l-4 border-l-brand-400 rounded-lg p-5 mt-2 flex flex-col gap-3">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            Calibration Preview
            {isLoadingPreview && <LoadingSpinner size="sm" />}
          </h3>
          
          {previewData ? (
            <div className="flex flex-col gap-2 text-sm text-surface-200">
              <div className="flex justify-between">
                <span>Anchor mean</span>
                <span className="font-mono">{previewData.anchor_mean.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Expected shift</span>
                <span className={`font-mono font-medium ${previewData.shift > 0 ? "text-green-400" : previewData.shift < 0 ? "text-red-400" : "text-surface-300"}`}>
                  {previewData.shift > 0 ? "+" : ""}{previewData.shift.toFixed(2)} points
                </span>
              </div>
              <div className="pt-2 border-t border-surface-500 mt-1">
                <span className="text-surface-300 italic">{previewData.interpretation}</span>
              </div>
            </div>
          ) : !isLoadingPreview && (
            <div className="text-sm text-surface-400">Failed to load preview</div>
          )}
        </div>
      )}

      {!anchorSetId && (
        <div className="flex justify-end mt-4">
          <button
            onClick={() => onChange(undefined)}
            className="text-sm text-surface-300 hover:text-white px-4 py-2 rounded transition-colors"
          >
            Skip this step
          </button>
        </div>
      )}
    </div>
  )
}
