import type { SubmissionResult } from "../types"

export function exportToCSV(
  results: SubmissionResult[],
  filename = "gradeflow-results.csv"
): void {
  if (results.length === 0) return

  // Build header row
  const baseHeaders = [
    "submission_id",
    "rank",
    "final_score",
    "max_possible_score",
    "percentile",
    "cluster_id",
    "confidence",
    "flagged_for_review",
    "flag_reason",
    "evaluated_at",
  ]
  
  // Extract criterion names from the first result
  const criterionNames = results[0].criterion_scores.map((c) => c.criterion_name)
  const criterionHeaders = criterionNames.map((name) => `${name}_score`)
  
  const headers = [...baseHeaders, ...criterionHeaders]

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return ""
    const stringValue = String(value)
    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  const rows = results.map((r) => {
    const baseData = [
      r.submission_id,
      r.rank,
      r.final_score,
      r.max_possible_score,
      r.percentile,
      r.cluster_id,
      r.confidence,
      r.flagged_for_review,
      r.flag_reason,
      r.evaluated_at,
    ]

    const scoreMap = new Map(r.criterion_scores.map(c => [c.criterion_name, c.score]))
    const criterionData = criterionNames.map(name => scoreMap.get(name) ?? "")

    return [...baseData, ...criterionData].map(escapeCSV).join(",")
  })

  const csvContent = [headers.join(","), ...rows].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
