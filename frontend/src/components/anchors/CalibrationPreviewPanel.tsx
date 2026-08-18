import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { X, ArrowRight } from "lucide-react"
import { previewCalibration } from "../../api/anchors"
import { LoadingSpinner } from "../ui/LoadingSpinner"
import { cn } from "../../utils/cn"

interface CalibrationPreviewPanelProps {
  anchorSetId: string
  onClose: () => void
}

function generateScores(baseValue: number): number[] {
  const diffs = [-30, -20, -10, 0, 10, 20, 30]
  return diffs.map(d => {
    const score = baseValue + d
    if (score < 0) return 0
    if (score > 100) return 100
    return score
  })
}

export function CalibrationPreviewPanel({ anchorSetId, onClose }: CalibrationPreviewPanelProps) {
  const [sliderValue, setSliderValue] = useState(50)
  const [sampleScores, setSampleScores] = useState<number[]>(generateScores(50))

  useEffect(() => {
    const timer = setTimeout(() => {
      setSampleScores(generateScores(sliderValue))
    }, 300)
    return () => clearTimeout(timer)
  }, [sliderValue])

  const { data, isLoading, error } = useQuery({
    queryKey: ["preview", anchorSetId, sampleScores.join(",")],
    queryFn: () => previewCalibration(anchorSetId, sampleScores),
    staleTime: 60_000,
  })

  return (
    <div className="bg-surface-700 rounded-xl border border-surface-500 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-medium text-white">Calibration Preview</h2>
          <p className="font-mono text-sm text-surface-400 mt-1">{anchorSetId}</p>
        </div>
        <button 
          onClick={onClose}
          className="text-surface-400 hover:text-white p-1 rounded hover:bg-surface-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <p className="text-sm text-surface-300 my-4">
        Adjust the sample cohort scores below to see how this anchor set would shift them.
      </p>

      <div className="mb-6">
        <label className="flex justify-between items-center text-sm font-medium text-surface-300 mb-2">
          <span>Cohort mean score: {sliderValue}</span>
        </label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          step="1" 
          value={sliderValue}
          onChange={(e) => setSliderValue(parseInt(e.target.value, 10))}
          className="w-full accent-brand-400 h-2 bg-surface-600 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="min-h-[250px] relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-700/50 backdrop-blur-sm z-10">
            <LoadingSpinner size="md" />
          </div>
        )}

        {error ? (
          <div className="text-red-400 text-sm bg-red-500/10 p-4 rounded-lg border border-red-500/20">
            Failed to load calibration preview. Please try again.
          </div>
        ) : data ? (
          <div className="animate-in fade-in duration-300">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-surface-800 rounded-lg p-4 border border-surface-600 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold text-white">{data.anchor_mean.toFixed(1)}</span>
                <span className="text-xs text-surface-400 uppercase tracking-wider mt-1">Anchor Mean</span>
              </div>
              <div className="bg-surface-800 rounded-lg p-4 border border-surface-600 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold text-white">{data.cohort_mean.toFixed(1)}</span>
                <span className="text-xs text-surface-400 uppercase tracking-wider mt-1">Cohort Mean</span>
              </div>
              <div className="bg-surface-800 rounded-lg p-4 border border-surface-600 flex flex-col items-center justify-center">
                <span className={cn(
                  "text-2xl font-semibold",
                  data.shift > 0 ? "text-brand-400" : data.shift < 0 ? "text-red-400" : "text-surface-300"
                )}>
                  {data.shift > 0 ? "+" : ""}{data.shift.toFixed(1)}
                </span>
                <span className="text-xs text-surface-400 uppercase tracking-wider mt-1">Score Shift</span>
              </div>
            </div>

            <div className="mt-4 bg-surface-600 rounded-lg p-3 border-l-2 border-brand-400">
              <p className="text-sm text-white">{data.interpretation}</p>
            </div>

            <div className="mt-4">
              <div className="grid grid-cols-2 gap-4 mb-2 px-2">
                <div className="text-xs font-medium text-surface-400 uppercase">Before</div>
                <div className="text-xs font-medium text-surface-400 uppercase pl-8">After</div>
              </div>
              <div className="flex flex-col gap-1">
                {data.sample_before.map((beforeScore, index) => {
                  const afterScore = data.sample_after[index]
                  const isHigher = afterScore > beforeScore
                  const isLower = afterScore < beforeScore
                  const arrowColor = isHigher ? "text-brand-400" : isLower ? "text-red-400" : "text-surface-500"
                  
                  return (
                    <div key={index} className="grid grid-cols-2 gap-4 items-center px-2 py-1.5 hover:bg-surface-600/50 rounded transition-colors">
                      <div className="font-mono text-xs text-surface-200">{beforeScore.toFixed(1)}</div>
                      <div className="flex items-center gap-4">
                        <ArrowRight size={14} className={arrowColor} />
                        <div className={cn("font-mono text-xs", 
                          isHigher ? "text-brand-300" : isLower ? "text-red-300" : "text-surface-300"
                        )}>
                          {afterScore.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
