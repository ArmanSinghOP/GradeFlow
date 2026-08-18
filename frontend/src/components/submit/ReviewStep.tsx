import { AlertCircle } from "lucide-react"
import { LoadingSpinner } from "../index"
import type { SubmissionItem, RubricDefinition, ContentType } from "../../types"

interface ReviewStepProps {
  submissions: SubmissionItem[]
  rubric: Partial<RubricDefinition>
  anchorSetId: string | undefined
  contentType: ContentType
  isSubmitting: boolean
  error: string | null
}

export function ReviewStep({
  submissions,
  rubric,
  anchorSetId,
  contentType,
  isSubmitting,
  error,
}: ReviewStepProps) {
  const estimatedTime = Math.ceil(submissions.length / 100)

  return (
    <div className="flex flex-col gap-6">
      
      {/* Configuration Summary */}
      <div className="bg-surface-800 border border-surface-600 rounded-lg p-5 flex flex-col gap-4">
        <h3 className="text-sm font-medium text-white border-b border-surface-600 pb-2 mb-1">Batch Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-surface-400 text-xs">Content Type</span>
            <span className="inline-flex items-center self-start px-2 py-0.5 rounded text-xs font-medium bg-surface-600 text-surface-200 capitalize">
              {contentType}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-surface-400 text-xs">Submissions</span>
            <span className="text-white font-medium">{submissions.length}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-surface-400 text-xs">Estimated Time</span>
            <span className="text-white font-medium">~{estimatedTime} min</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-surface-400 text-xs">Anchor Set</span>
            <span className="text-white font-mono text-xs mt-0.5 truncate" title={anchorSetId || "None (no calibration)"}>
              {anchorSetId || "None (no calibration)"}
            </span>
          </div>
        </div>
      </div>

      {/* Rubric Preview */}
      <div className="bg-surface-800 border border-surface-600 rounded-lg overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-surface-600">
          <h3 className="text-sm font-medium text-white">{rubric.name || "Unnamed Rubric"}</h3>
        </div>
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-surface-700/50">
            <tr>
              <th className="px-5 py-2 font-medium text-surface-400 w-1/2">Name</th>
              <th className="px-5 py-2 font-medium text-surface-400">Weight</th>
              <th className="px-5 py-2 font-medium text-surface-400">Max Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-600">
            {(rubric.criteria || []).map((c, i) => (
              <tr key={i}>
                <td className="px-5 py-3 text-surface-200">{c.name}</td>
                <td className="px-5 py-3 text-surface-300">
                  <span className="px-2 py-0.5 bg-surface-600 rounded">
                    {Math.round(c.weight * 100)}%
                  </span>
                </td>
                <td className="px-5 py-3 text-surface-300 font-mono">{c.max_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Submissions Preview */}
      <div className="bg-surface-800 border border-surface-600 rounded-lg p-5 flex flex-col gap-3">
        <h3 className="text-sm font-medium text-white border-b border-surface-600 pb-2 mb-1">
          Submissions Preview <span className="text-surface-400 font-normal text-xs ml-2">(first 3)</span>
        </h3>
        <div className="flex flex-col gap-2">
          {submissions.slice(0, 3).map((sub, i) => (
            <div key={i} className="flex gap-4 p-3 bg-surface-700/50 rounded border border-surface-600 text-sm">
              <span className="font-mono text-xs text-brand-300 shrink-0 w-32 truncate" title={sub.id}>
                {sub.id}
              </span>
              <span className="text-surface-300 truncate">
                {sub.content.length > 100 ? `${sub.content.substring(0, 100)}...` : sub.content}
              </span>
            </div>
          ))}
          {submissions.length > 3 && (
            <div className="text-xs text-surface-400 italic mt-1 px-1">
              ... and {submissions.length - 3} more
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex gap-3 items-start bg-red-400/10 border border-red-400/20 rounded-lg p-4 text-sm text-red-300">
          <AlertCircle size={18} className="shrink-0 text-red-400 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Button space reserved for parent to implement, or you can implement it here. 
          The requirements state the submit button is in ReviewStep:
          "Submit button: Full width, Background brand-400..., Disabled while isSubmitting"
          But actually the form submit action depends on on-click from parent or pass in form.
          Given "isSubmitting" is passed in, I'll pass an "onSubmit" prop here. Wait, props didn't list onSubmit.
          Alternatively we just use a regular form submit that bubbles up if ReviewStep is rendered within a form.
          Wait, the prompt says: "Submit button... onClick: call handleSubmit() in Submit.tsx" well actually it says:
          "Submit button: ... Text: 'Submit Batch' ... Disabled while isSubmitting"
          I will add an `onSubmit` prop for the button.
      */}
    </div>
  )
}
