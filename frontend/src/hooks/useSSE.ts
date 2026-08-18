import { useState, useEffect, useRef } from "react"
import { getStreamUrl } from "../api/results"
import type { SSEEvent } from "../types"

export const useSSE = (jobId: string | null) => {
  const [events, setEvents] = useState<SSEEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!jobId) {
      setEvents([])
      setIsConnected(false)
      setIsDone(false)
      setError(null)
      return
    }

    const url = getStreamUrl(jobId)
    const source = new EventSource(url)
    sourceRef.current = source

    source.onmessage = (e) => {
      try {
        const parsed: SSEEvent = JSON.parse(e.data)
        setEvents((prev) => [...prev, parsed])

        if (parsed.event === "connected" && !isConnected) {
          setIsConnected(true)
        }

        if (parsed.event === "done") {
          setIsDone(true)
          source.close()
        }
      } catch (err) {
        console.error("Failed to parse SSE event", err)
      }
    }

    source.onerror = () => {
      setError("SSE connection error")
      source.close()
    }

    return () => {
      source.close()
    }
  }, [jobId])

  return { events, isConnected, isDone, error }
}

export default useSSE
