import type { SSEEvent } from "../../types"

export interface StreamEventLogProps {
  events: SSEEvent[]
}

export const StreamEventLog = ({ events }: StreamEventLogProps) => {
  // Only take latest 50 events, they are passed chronologically so we reverse.
  // Wait, the prompt says: "Newest events at TOP. Show max 50 events (slice to last 50)."
  // We'll reverse the array to put newest first, and then slice the first 50.
  const latestEvents = [...events].reverse().slice(0, 50)

  return (
    <div className="bg-surface-700 rounded-xl border border-surface-500 h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-500 flex items-center justify-between bg-surface-800/50">
        <h3 className="text-sm font-medium text-white">Event Stream</h3>
        <span className="text-xs bg-surface-600 text-surface-200 px-2 py-0.5 rounded-full font-mono">
          {events.length} events
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {latestEvents.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-surface-400 text-sm italic">
            Waiting for events...
          </div>
        ) : (
          latestEvents.map((event, idx) => {
            const timeRaw = new Date(event.timestamp)
            const timeStr = isNaN(timeRaw.getTime()) ? "--:--:--" : timeRaw.toLocaleTimeString()

            let badgeClass = "bg-surface-500 text-white"
            if (event.event === "connected") badgeClass = "bg-surface-500 text-white"
            else if (event.event === "progress") badgeClass = "bg-blue-500/20 text-blue-400"
            else if (event.event === "result") badgeClass = "bg-brand-400/20 text-brand-400"
            else if (event.event === "error") badgeClass = "bg-red-500/20 text-red-500"
            else if (event.event === "done") badgeClass = "bg-brand-400 text-white"

            let message = "Unknown event"
            if (event.event === "connected") message = "Stream connected"
            else if (event.event === "progress") message = `Status: ${event.status} — ${event.completed_count}/${event.submission_count}`
            else if (event.event === "result") message = `Result: ${event.result?.submission_id.slice(0, 8)}... scored ${event.result?.final_score.toFixed(1)}/100`
            else if (event.event === "error") message = `Error: ${event.error_message}`
            else if (event.event === "done") message = `Stream complete — ${event.total_results || 0} results`

            return (
              <div key={`${event.timestamp}-${idx}`} className="flex items-start gap-3 bg-surface-800/50 p-2.5 rounded-lg border border-surface-600/50">
                <span className="text-[10px] text-surface-400 font-mono mt-0.5">
                  {timeStr}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col items-start gap-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${badgeClass}`}>
                      {event.event}
                    </span>
                    <span className="text-xs text-surface-200">
                      {message}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default StreamEventLog
