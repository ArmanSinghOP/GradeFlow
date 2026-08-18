export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return "unknown"
  
  const now = new Date()
  const diffMs = Math.max(0, now.getTime() - date.getTime())
  
  const diffSecs = Math.floor(diffMs / 1000)
  if (diffSecs < 60) return "just now"
  
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins} min ago`
  
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs} hr ago`
  
  const diffDays = Math.floor(diffHrs / 24)
  return `${diffDays} days ago`
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return "< 1 min"
  if (minutes === 1) return "~1 min"
  return `~${minutes} mins`
}
