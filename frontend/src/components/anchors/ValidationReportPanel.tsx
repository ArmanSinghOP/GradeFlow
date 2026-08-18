import { useQuery } from "@tanstack/react-query"
import { X, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { validateAnchor } from "../../api/anchors"
import { LoadingSpinner } from "../ui/LoadingSpinner"
import { cn } from "../../utils/cn"

interface ValidationReportPanelProps {
  anchorSetId: string
  onClose: () => void
}

export function ValidationReportPanel({ anchorSetId, onClose }: ValidationReportPanelProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["validate", anchorSetId],
    queryFn: () => validateAnchor(anchorSetId),
    staleTime: 60_000,
  })

  const difficultyColors: Record<string, string> = {
    weak: "#E24B4A",
    developing: "#EF9F27",
    proficient: "#378ADD",
    strong: "#5DCAA5",
    exemplary: "#1D9E75"
  }

  const levels = ["weak", "developing", "proficient", "strong", "exemplary"]

  const renderDistribution = () => {
    if (!data) return null
    const total = Object.values(data.difficulty_distribution).reduce((a, b) => a + b, 0)
    
    return (
      <div className="mt-6">
        <div className="text-xs text-surface-400 mb-2 uppercase tracking-wider font-medium">Difficulty Distribution</div>
        {total > 0 ? (
          <div className="flex h-2 rounded-full overflow-hidden w-full bg-surface-600 mb-3">
            {levels.map((level) => {
              const count = data.difficulty_distribution[level] || 0
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
          <div className="h-2 rounded-full w-full bg-surface-600 mb-3" />
        )}
        
        <div className="flex flex-col gap-1.5">
          {levels.map((level) => {
            const count = data.difficulty_distribution[level] || 0
            return (
              <div key={level} className="flex items-center justify-between text-sm py-1 border-b border-surface-600/50 last:border-0">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: difficultyColors[level] }} 
                  />
                  <span className="text-surface-200 capitalize">{level}</span>
                </div>
                <span className="bg-surface-600 text-surface-300 text-xs px-2 py-0.5 rounded-full font-mono">{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-700 rounded-xl border border-surface-500 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-medium text-white">Validation Report</h2>
          <p className="font-mono text-sm text-surface-400 mt-1">{anchorSetId}</p>
        </div>
        <button 
          onClick={onClose}
          className="text-surface-400 hover:text-white p-1 rounded hover:bg-surface-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="min-h-[250px] relative mt-4">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-700/50 backdrop-blur-sm z-10">
            <LoadingSpinner size="md" />
          </div>
        )}

        {error ? (
          <div className="text-red-400 text-sm bg-red-500/10 p-4 rounded-lg border border-red-500/20">
            Failed to load validation report. Please try again.
          </div>
        ) : data ? (
          <div className="animate-in fade-in duration-300">
            {data.is_valid ? (
              <div className="bg-brand-400/10 border border-brand-400 rounded-lg p-3 mb-4 flex items-start gap-3">
                <CheckCircle size={18} className="text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-brand-300">Anchor set is valid</h3>
                  <p className="text-xs text-brand-400/80 mt-0.5">{data.anchor_count} anchors, all checks passed</p>
                </div>
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex items-start gap-3">
                <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-300">Validation failed</h3>
                  <p className="text-xs text-red-400/80 mt-0.5">{data.errors.length} error(s) found</p>
                </div>
              </div>
            )}

            {data.errors && data.errors.length > 0 && (
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wider font-medium text-surface-400 mb-2">Errors</div>
                <div className="flex flex-col gap-2">
                  {data.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-red-400 py-1">
                      <XCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.warnings && data.warnings.length > 0 && (
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wider font-medium text-surface-400 mb-2">Warnings</div>
                <div className="flex flex-col gap-2">
                  {data.warnings.map((warn, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-amber-400 py-1">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.is_valid && (!data.warnings || data.warnings.length === 0) && (
              <div className="text-sm text-surface-400 italic">
                No issues found
              </div>
            )}

            {renderDistribution()}
          </div>
        ) : null}
      </div>
    </div>
  )
}
