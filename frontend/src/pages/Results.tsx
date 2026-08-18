import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Loader2, AlertCircle } from "lucide-react"

import { getJob } from "../api/jobs"
import { getResults } from "../api/results"
import type { SubmissionResult } from "../types"

import { ResultsHeader } from "../components/results/ResultsHeader"
import { ScoreDistributionChart } from "../components/results/ScoreDistributionChart"
import { PercentileChart } from "../components/results/PercentileChart"
import { ResultsTable } from "../components/results/ResultsTable"
import { FeedbackDrawer } from "../components"

const Results = () => {
  const { id: jobId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [selectedResult, setSelectedResult] = useState<SubmissionResult | null>(null)

  const { data: job, isLoading: isJobLoading, isError: isJobError } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJob(jobId!),
    enabled: !!jobId,
    staleTime: 30_000,
  })

  const { data: resultsResponse, isLoading: isResultsLoading, isError: isResultsError } = useQuery({
    queryKey: ["results", jobId],
    queryFn: () => getResults(jobId!, 1000, 0),
    enabled: !!jobId,
    staleTime: 60_000,
  })

  if (!jobId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Job not found</h2>
        <button
          onClick={() => navigate("/")}
          className="bg-surface-700 hover:bg-surface-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  if (isJobLoading || isResultsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-surface-400">
        <Loader2 size={40} className="animate-spin text-brand-400" />
        <p className="font-medium">Loading results...</p>
      </div>
    )
  }

  if (isJobError || isResultsError || !job || !resultsResponse) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Failed to load results</h2>
        <p className="text-surface-400 mb-6">There was an error fetching the job results.</p>
        <button
          onClick={() => navigate("/")}
          className="bg-surface-700 hover:bg-surface-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  if (job.status !== "completed") {
    return (
      <div className="p-6">
        <div className="bg-surface-700 border border-surface-500 rounded-xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-amber-500/20 p-2 rounded-full text-amber-500">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Evaluation In Progress</h3>
              <p className="text-surface-400">
                This job has not completed yet. Results are not fully available.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/jobs/${jobId}`)}
            className="bg-surface-600 hover:bg-surface-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Go to Job Monitor
          </button>
        </div>
      </div>
    )
  }

  const results = resultsResponse.results

  return (
    <div className="p-6 flex flex-col gap-6">
      <ResultsHeader job={job} results={results} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <ScoreDistributionChart results={results} />
        <PercentileChart results={results} />
      </div>
      
      <ResultsTable results={results} onSelectResult={setSelectedResult} />

      {/* Feedback Drawer */}
      <FeedbackDrawer
        result={selectedResult}
        onClose={() => setSelectedResult(null)}
      />
    </div>
  )
}

export default Results
