import { useEffect } from "react"
import { AlertCircle, X, Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import type { SubmissionResult } from "../../types"
import { getSubmissionContent } from "../../api/jobs"
import { SubmissionViewer } from "./SubmissionViewer"

interface FeedbackDrawerProps {
  result: SubmissionResult | null
  onClose: () => void
}

export const FeedbackDrawer = ({ result, onClose }: FeedbackDrawerProps) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const { data: submissionData, isLoading } = useQuery({
    queryKey: ["submission", result?.job_id, result?.submission_id],
    queryFn: () => getSubmissionContent(result!.job_id, result!.submission_id),
    enabled: !!result,
    staleTime: Infinity,
  })

  if (!result) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-[800px] max-w-[95vw] bg-surface-800 border-l border-surface-500 z-50 flex flex-col shadow-2xl overflow-hidden animate-fade-slide-up transform translate-y-0">
        <div className="flex items-center justify-between p-4 border-b border-surface-600 bg-surface-700 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-white">Submission Feedback</h3>
            <p className="text-xs font-mono text-surface-400 mt-1">
              ID: {result.submission_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-white p-2 hover:bg-surface-600 rounded-lg transition-colors"
            aria-label="Close details"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Left Column: AI Feedback */}
          <div className="w-1/2 overflow-y-auto p-5 pb-24 border-r border-surface-600">
            <div className="flex flex-col gap-6">
            
            {/* Score Summary */}
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-bold ${
                  result.final_score >= 60 ? 'text-brand-400' :
                  result.final_score >= 40 ? 'text-amber-400' : 'text-red-500'
                }`}>
                  {result.final_score.toFixed(1)}
                </span>
                <span className="text-surface-400 font-medium text-lg">/ 100</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  Top {Math.round(100 - result.percentile)}%
                </p>
                <p className="text-xs text-surface-400">
                  Ranked #{result.rank} of {result.total_in_cohort}
                </p>
              </div>
            </div>

            {/* Confidence Bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-surface-400">Confidence</span>
                <span className="text-white">{(result.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${result.confidence * 100}%` }}
                />
              </div>
            </div>

            {/* Flag Warning */}
            {result.flagged_for_review && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-amber-500 block mb-0.5">Flagged for review</span>
                    <span className="text-xs text-amber-200/70">{result.flag_reason || "Unusual patterns detected"}</span>
                  </div>
                </div>
              </div>
            )}

            <hr className="border-surface-600" />

            {/* Criteria Breakdown */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Criterion Breakdown</h4>
              <div className="flex flex-col gap-4">
                {result.criterion_scores.map((crit, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-surface-200 font-medium">{crit.criterion_name}</span>
                      <span className="text-white font-semibold">{crit.score.toFixed(1)} / {crit.max_score}</span>
                    </div>
                    <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-400 rounded-full"
                        style={{ width: `${(crit.score / crit.max_score) * 100}%` }}
                      />
                    </div>
                    {crit.reasoning && (
                      <p className="text-xs text-surface-400 italic mt-1 leading-relaxed">
                        "{crit.reasoning}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <hr className="border-surface-600" />

            {/* Narrative Feedback */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">Feedback</h4>
              <p className="text-sm leading-relaxed text-surface-200 whitespace-pre-wrap">
                {result.narrative_feedback}
              </p>
            </div>

            {/* Cohort Comp */}
            {result.cohort_comparison_summary && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-2">Cohort Standing</h4>
                <p className="text-sm leading-relaxed text-surface-300 bg-surface-700/50 p-3 rounded-lg">
                  {result.cohort_comparison_summary}
                </p>
              </div>
            )}
            
          </div>
        </div>

        {/* Right Column: Submission Content */}
        <div className="w-1/2 bg-surface-900/30 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-surface-400 gap-3">
              <Loader2 size={32} className="animate-spin text-brand-400" />
              <p>Loading submission...</p>
            </div>
          ) : submissionData ? (
            <SubmissionViewer
              content={submissionData.content}
              contentType={submissionData.content_type}
              metadata={submissionData.metadata_json}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-surface-400 gap-3">
              <AlertCircle size={32} className="text-surface-500" />
              <p>Submission content not available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  </>
  )
}
