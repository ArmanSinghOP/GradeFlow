import { FileText, BarChart3, TrendingUp, AlertTriangle, Layers, Download, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { JobStatusResponse, SubmissionResult } from "../../types"
import { exportToCSV } from "../../utils/export"

interface ResultsHeaderProps {
  job: JobStatusResponse
  results: SubmissionResult[]
}

export const ResultsHeader = ({ job, results }: ResultsHeaderProps) => {
  const navigate = useNavigate()

  const totalEvaluated = results.length
  const meanScore = totalEvaluated > 0 
    ? (results.reduce((sum, r) => sum + r.final_score, 0) / totalEvaluated).toFixed(1) 
    : "0.0"
  const topScore = totalEvaluated > 0 
    ? Math.max(...results.map(r => r.final_score)).toFixed(1) 
    : "0.0"
  const flaggedCount = results.filter(r => r.flagged_for_review).length

  return (
    <div className="w-full bg-surface-700 border border-surface-500 rounded-xl px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Results Explorer</h1>
          <p className="text-sm font-mono text-surface-400 mt-1">Job ID: {job.job_id}</p>
        </div>
        
        <div className="flex items-center gap-4 ml-auto">
          <button
            onClick={() => exportToCSV(results)}
            className="flex items-center gap-2 text-surface-400 hover:text-white hover:bg-surface-600 px-3 py-2 rounded-lg transition-colors"
          >
            <Download size={18} />
            <span className="text-sm font-medium">Export CSV</span>
          </button>
          
          <button
            onClick={() => navigate(`/jobs/${job.job_id}`)}
            className="flex items-center gap-2 text-surface-400 hover:text-white hover:bg-surface-600 px-3 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Monitor</span>
          </button>
        </div>
      </div>

      <div className="flex gap-8 mt-6">
        <div className="flex flex-col gap-1 pr-8 border-r border-surface-500">
          <div className="flex items-center gap-2 text-xs text-surface-400 font-medium uppercase tracking-wider">
            <FileText size={14} /> Total Evaluated
          </div>
          <div className="text-2xl font-semibold text-white">{totalEvaluated}</div>
        </div>

        <div className="flex flex-col gap-1 pr-8 border-r border-surface-500">
          <div className="flex items-center gap-2 text-xs text-surface-400 font-medium uppercase tracking-wider">
            <BarChart3 size={14} className="text-brand-400" /> Mean Score
          </div>
          <div className="text-2xl font-semibold text-white">{meanScore}</div>
        </div>

        <div className="flex flex-col gap-1 pr-8 border-r border-surface-500">
          <div className="flex items-center gap-2 text-xs text-surface-400 font-medium uppercase tracking-wider">
            <TrendingUp size={14} className="text-brand-400" /> Top Score
          </div>
          <div className="text-2xl font-semibold text-white">{topScore}</div>
        </div>

        <div className="flex flex-col gap-1 pr-8 border-r border-surface-500">
          <div className="flex items-center gap-2 text-xs text-surface-400 font-medium uppercase tracking-wider">
            <AlertTriangle size={14} className={flaggedCount > 0 ? "text-amber-500" : "text-surface-400"} /> Flagged for Review
          </div>
          <div className={`text-2xl font-semibold ${flaggedCount > 0 ? "text-amber-500" : "text-white"}`}>{flaggedCount}</div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-surface-400 font-medium uppercase tracking-wider">
            <Layers size={14} /> Clusters
          </div>
          <div className="text-2xl font-semibold text-white">{job.cluster_count ?? "—"}</div>
        </div>
      </div>
    </div>
  )
}
