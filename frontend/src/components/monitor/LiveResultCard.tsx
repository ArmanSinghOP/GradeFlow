import { ScoreCard } from "../ui/ScoreCard"
import type { SubmissionResult } from "../../types"

export interface LiveResultCardProps {
  result: SubmissionResult
  onClick: () => void
}

export const LiveResultCard = ({ result, onClick }: LiveResultCardProps) => {
  return (
    <div className="animate-fade-slide-up">
      <ScoreCard result={result} onClick={onClick} />
    </div>
  )
}

export default LiveResultCard
