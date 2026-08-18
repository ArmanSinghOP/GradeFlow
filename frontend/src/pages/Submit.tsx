import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { StepIndicator } from "../components/submit/StepIndicator"
import { SubmissionsStep } from "../components/submit/SubmissionsStep"
import { RubricStep } from "../components/submit/RubricStep"
import { AnchorStep } from "../components/submit/AnchorStep"
import { ReviewStep } from "../components/submit/ReviewStep"
import { submitBatch } from "../api/evaluate"
import { useAppStore } from "../store/useAppStore"
import { useToast } from "../hooks/useToast"
import type { SubmissionItem, RubricDefinition, ContentType } from "../types"

const STEPS = ["Submissions", "Rubric", "Anchor Set", "Review"]

export default function Submit() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addActiveJob } = useAppStore()
  const { toast } = useToast()

  const [currentStep, setCurrentStep] = useState(1)
  const [contentType, setContentType] = useState<ContentType>("essay")
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [rubric, setRubric] = useState<Partial<RubricDefinition>>({})
  const [anchorSetId, setAnchorSetId] = useState<string | undefined>()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleNext = () => {
    // Step 1 validation
    if (currentStep === 1) {
      if (submissions.length === 0) return
      if (submissions.some(s => !s.id.trim() || !s.content.trim())) return
      const ids = new Set(submissions.map(s => s.id))
      if (ids.size !== submissions.length) return
    }

    // Step 2 validation
    if (currentStep === 2) {
      if (!rubric.name?.trim()) return
      if (!rubric.criteria || rubric.criteria.length === 0) return
      if (rubric.criteria.some(c => !c.name.trim())) return
      
      const sum = rubric.criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0)
      if (Math.abs(sum - 1.0) >= 0.001) return
      if (rubric.criteria.some(c => (Number(c.weight) || 0) <= 0)) return
    }

    setCurrentStep(prev => Math.min(prev + 1, 4))
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const payload: BatchSubmitRequest = {
        content_type: contentType,
        submissions: submissions.map(s => ({
          id: s.id,
          content: s.content,
          content_type: contentType,
          metadata: s.metadata ?? {}
        })),
        rubric: {
          name: rubric.name!,
          description: rubric.description ?? "",
          criteria: (rubric.criteria ?? []).map(c => ({
            name: c.name,
            description: c.description ?? "",
            weight: parseFloat(c.weight.toString()),
            max_score: parseFloat((c.max_score ?? 10).toString())
          }))
        },
        anchor_set_id: (anchorSetId ?? null) as any
      }

      const response = await submitBatch(payload)
      addActiveJob(response.job_id)
      await queryClient.invalidateQueries({ queryKey: ["jobs"] })
      toast.success(`Batch submitted — ${response.submission_count} submissions queued`)
      navigate(`/jobs/${response.job_id}`)
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Submission failed. Please check your input and try again."
      setSubmitError(message)
      setIsSubmitting(false)
    }
  }

  // Calculate disabled state for Next button based on current step
  const isNextDisabled = () => {
    if (currentStep === 1) {
      if (submissions.length === 0) return true
      if (submissions.some(s => !s.id.trim() || !s.content.trim())) return true
      const ids = new Set(submissions.map(s => s.id))
      if (ids.size !== submissions.length) return true
    }
    if (currentStep === 2) {
      if (!rubric.name?.trim()) return true
      if (!rubric.criteria || rubric.criteria.length === 0) return true
      if (rubric.criteria.some(c => !c.name.trim())) return true
      const sum = rubric.criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0)
      if (Math.abs(sum - 1.0) >= 0.001) return true
      if (rubric.criteria.some(c => (Number(c.weight) || 0) <= 0)) return true
    }
    return false
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Submit Batch</h1>
        <p className="text-surface-400 text-sm mt-1">Configure and launch a new evaluation pipeline</p>
      </div>

      <StepIndicator currentStep={currentStep} steps={STEPS} />

      <div className="bg-surface-700 rounded-xl border border-surface-500 overflow-hidden flex flex-col">
        <div className="p-6">
          {currentStep === 1 && (
            <SubmissionsStep
              submissions={submissions}
              contentType={contentType}
              onChange={setSubmissions}
              onContentTypeChange={setContentType}
            />
          )}

          {currentStep === 2 && (
            <RubricStep
              rubric={rubric}
              onChange={setRubric}
            />
          )}

          {currentStep === 3 && (
            <AnchorStep
              anchorSetId={anchorSetId}
              onChange={setAnchorSetId}
            />
          )}

          {currentStep === 4 && (
            <ReviewStep
              submissions={submissions}
              rubric={rubric}
              anchorSetId={anchorSetId}
              contentType={contentType}
              isSubmitting={isSubmitting}
              error={submitError}
            />
          )}
        </div>

        <div className="bg-surface-800 p-4 border-t border-surface-600 flex justify-between items-center mt-auto">
          <div>
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="text-sm font-medium text-surface-300 hover:text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
              >
                Back
              </button>
            )}
          </div>
          <div>
            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={isNextDisabled()}
                className="bg-brand-400 hover:bg-brand-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 bg-brand-400 hover:bg-brand-600 text-white px-8 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Batch"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
