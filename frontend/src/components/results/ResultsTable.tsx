import { useState, useMemo } from "react"
import { Search, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react"
import type { SubmissionResult } from "../../types"

interface ResultsTableProps {
  results: SubmissionResult[]
  onSelectResult: (result: SubmissionResult) => void
}

type SortOption = 
  | "rank_asc" 
  | "rank_desc" 
  | "score_desc" 
  | "score_asc" 
  | "percentile_desc"

export const ResultsTable = ({ results, onSelectResult }: ResultsTableProps) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState<SortOption>("rank_asc")
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const filteredAndSortedResults = useMemo(() => {
    let filtered = results
    
    if (searchQuery) {
      filtered = filtered.filter(r => r.submission_id.toLowerCase().includes(searchQuery.toLowerCase()))
    }
    
    if (flaggedOnly) {
      filtered = filtered.filter(r => r.flagged_for_review)
    }

    const sorted = [...filtered]
    sorted.sort((a, b) => {
      switch (sortOption) {
        case "rank_asc": return a.rank - b.rank
        case "rank_desc": return b.rank - a.rank
        case "score_desc": return b.final_score - a.final_score
        case "score_asc": return a.final_score - b.final_score
        case "percentile_desc": return b.percentile - a.percentile
        default: return a.rank - b.rank
      }
    })

    return sorted
  }, [results, searchQuery, sortOption, flaggedOnly])

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, sortOption, flaggedOnly])

  const totalPages = Math.ceil(filteredAndSortedResults.length / itemsPerPage)
  const paginatedResults = filteredAndSortedResults.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  )

  const handlePrevPage = () => setCurrentPage(p => Math.max(1, p - 1))
  const handleNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1))

  return (
    <div className="w-full bg-surface-700 rounded-xl border border-surface-500 overflow-hidden flex flex-col">
      {/* Table controls */}
      <div className="p-4 border-b border-surface-500 flex items-center justify-between bg-surface-700">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">All Submissions</h2>
          <span className="bg-surface-600 text-surface-300 text-xs font-bold px-2.5 py-1 rounded-full">
            {filteredAndSortedResults.length}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Search by ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-600 border border-surface-400 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-400 w-48 transition-colors"
            />
          </div>
          
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="bg-surface-600 border border-surface-400 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-400 transition-colors"
          >
            <option value="rank_asc">Rank (best first)</option>
            <option value="rank_desc">Rank (worst first)</option>
            <option value="score_desc">Score (high-low)</option>
            <option value="score_asc">Score (low-high)</option>
            <option value="percentile_desc">Percentile</option>
          </select>
          
          <button
            onClick={() => setFlaggedOnly(!flaggedOnly)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              flaggedOnly 
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
                : "bg-surface-600 text-surface-400 border-surface-400 hover:text-white"
            }`}
          >
            Flagged only
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-800/50 border-b border-surface-500">
              <th className="px-4 py-3 text-xs font-medium text-surface-400 w-16">Rank</th>
              <th className="px-4 py-3 text-xs font-medium text-surface-400">Submission ID</th>
              <th className="px-4 py-3 text-xs font-medium text-surface-400 w-24">Score</th>
              <th className="px-4 py-3 text-xs font-medium text-surface-400 w-28">Percentile</th>
              <th className="px-4 py-3 text-xs font-medium text-surface-400 min-w-[160px]">Criteria Scores</th>
              <th className="px-4 py-3 text-xs font-medium text-surface-400 w-24">Confidence</th>
              <th className="px-4 py-3 text-xs font-medium text-surface-400 w-16">Flag</th>
              <th className="px-4 py-3 text-xs font-medium text-surface-400 w-20">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedResults.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <p className="text-surface-400 mb-4">No results match your filter</p>
                  <button 
                    onClick={() => {
                      setSearchQuery("")
                      setFlaggedOnly(false)
                      setSortOption("rank_asc")
                    }}
                    className="px-4 py-2 bg-surface-600 hover:bg-surface-500 text-white rounded-lg text-sm transition-colors"
                  >
                    Clear filters
                  </button>
                </td>
              </tr>
            ) : (
              paginatedResults.map((r) => (
                <tr 
                  key={r.submission_id}
                  onClick={() => onSelectResult(r)}
                  className={`h-12 border-b border-surface-500 hover:bg-surface-600 cursor-pointer transition-colors ${
                    r.flagged_for_review ? "border-l-2 border-l-amber-500/50" : "border-l-2 border-l-transparent"
                  }`}
                >
                  <td className={`px-4 text-sm font-medium ${r.rank <= 3 ? "text-brand-400" : "text-white"}`}>
                    #{r.rank}
                  </td>
                  <td className="px-4">
                    <span className="font-mono text-sm text-surface-200" title={r.submission_id}>
                      {r.submission_id.length > 20 ? r.submission_id.substring(0, 20) + "..." : r.submission_id}
                    </span>
                  </td>
                  <td className="px-4">
                    <span className={`text-base font-bold ${
                      r.final_score >= 80 ? "text-brand-400" : 
                      r.final_score >= 60 ? "text-amber-400" : 
                      r.final_score >= 40 ? "text-orange-400" : "text-red-500"
                    }`}>
                      {r.final_score.toFixed(1)}
                    </span>
                    <span className="text-xs text-surface-400 ml-1">/100</span>
                  </td>
                  <td className="px-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-surface-200">{r.percentile.toFixed(1)}th</span>
                      <div className="h-1 bg-surface-800 rounded-full w-full overflow-hidden">
                        <div className="h-full bg-brand-400" style={{ width: `${r.percentile}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4">
                    <div className="flex items-center gap-1.5">
                      {r.criterion_scores.slice(0, 3).map((c, i) => (
                        <div key={i} className="flex flex-col gap-0.5" title={`${c.criterion_name}: ${c.score.toFixed(1)}/${c.max_score}`}>
                          <span className="text-[10px] text-surface-400 leading-none truncate w-12 uppercase">{c.criterion_name.substring(0, 3)}</span>
                          <div className="h-1.5 w-12 bg-surface-800 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-400" style={{ width: `${(c.score / c.max_score) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                      {r.criterion_scores.length > 3 && (
                        <span className="text-xs text-surface-500 ml-1">+{r.criterion_scores.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 text-sm text-surface-200">
                    {(r.confidence * 100).toFixed(0)}%
                  </td>
                  <td className="px-4">
                    {r.flagged_for_review && (
                      <div title={r.flag_reason || "Flagged"} className="text-amber-500">
                        <AlertTriangle size={16} />
                      </div>
                    )}
                  </td>
                  <td className="px-4">
                    <button 
                      className="text-xs text-brand-400 border border-surface-500 hover:bg-surface-500 hover:text-brand-300 rounded px-2 py-1 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectResult(r)
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="p-4 border-t border-surface-500 flex items-center justify-between bg-surface-700">
          <span className="text-sm text-surface-400">
            Showing {(currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, filteredAndSortedResults.length)} of {filteredAndSortedResults.length} results
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-surface-400">Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md bg-surface-600 text-surface-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-500 hover:text-white transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md bg-surface-600 text-surface-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-500 hover:text-white transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
